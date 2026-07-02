
-- Extend chatrooms for artist-owned rooms with hard caps
ALTER TABLE public.chatrooms ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.chatrooms DROP CONSTRAINT IF EXISTS chatrooms_kind_check;
ALTER TABLE public.chatrooms ADD CONSTRAINT chatrooms_kind_check
  CHECK (kind IN ('public','crew','artist_public','artist_private'));

CREATE INDEX IF NOT EXISTS idx_chatrooms_owner ON public.chatrooms(owner_id) WHERE owner_id IS NOT NULL;

-- Per-room membership (used for artist_private access)
CREATE TABLE IF NOT EXISTS public.room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.chatrooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.room_members TO authenticated;
GRANT ALL ON public.room_members TO service_role;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_room_member(_room_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.room_members WHERE room_id=_room_id AND user_id=_user_id);
$$;

CREATE POLICY "Members see own memberships" ON public.room_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.chatrooms r WHERE r.id = room_id AND r.owner_id = auth.uid())
  );
CREATE POLICY "Owner adds members" ON public.room_members
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.chatrooms r WHERE r.id = room_id AND r.owner_id = auth.uid()));
CREATE POLICY "Owner or self removes" ON public.room_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.chatrooms r WHERE r.id = room_id AND r.owner_id = auth.uid())
  );

-- Enforce per-artist caps: 3 artist_public + 2 artist_private, no reset
CREATE OR REPLACE FUNCTION public.enforce_artist_room_caps()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _count int;
BEGIN
  IF NEW.kind = 'artist_public' THEN
    IF NEW.owner_id IS NULL THEN RAISE EXCEPTION 'owner_id required'; END IF;
    SELECT COUNT(*) INTO _count FROM public.chatrooms
      WHERE owner_id = NEW.owner_id AND kind = 'artist_public';
    IF _count >= 3 THEN
      RAISE EXCEPTION 'Limit reached: 3 public rooms per artist. This cap does not reset.';
    END IF;
  ELSIF NEW.kind = 'artist_private' THEN
    IF NEW.owner_id IS NULL THEN RAISE EXCEPTION 'owner_id required'; END IF;
    SELECT COUNT(*) INTO _count FROM public.chatrooms
      WHERE owner_id = NEW.owner_id AND kind = 'artist_private';
    IF _count >= 2 THEN
      RAISE EXCEPTION 'Limit reached: 2 private rooms per artist. This cap does not reset.';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_enforce_artist_room_caps ON public.chatrooms;
CREATE TRIGGER trg_enforce_artist_room_caps
BEFORE INSERT ON public.chatrooms
FOR EACH ROW EXECUTE FUNCTION public.enforce_artist_room_caps();

-- Auto-add owner as a member of their room + allow authenticated users to create their own rooms
CREATE OR REPLACE FUNCTION public.handle_new_artist_room()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.kind IN ('artist_public','artist_private') AND NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.room_members(room_id, user_id) VALUES (NEW.id, NEW.owner_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_handle_new_artist_room ON public.chatrooms;
CREATE TRIGGER trg_handle_new_artist_room
AFTER INSERT ON public.chatrooms
FOR EACH ROW EXECUTE FUNCTION public.handle_new_artist_room();

-- Allow authenticated users to insert their own artist rooms
DROP POLICY IF EXISTS "Artists create own rooms" ON public.chatrooms;
CREATE POLICY "Artists create own rooms" ON public.chatrooms
  FOR INSERT TO authenticated
  WITH CHECK (
    kind IN ('artist_public','artist_private')
    AND owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "Owner deletes own room" ON public.chatrooms;
CREATE POLICY "Owner deletes own room" ON public.chatrooms
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- Broaden read policy to include artist rooms
DROP POLICY IF EXISTS "Public rooms visible to all; crew rooms only to members" ON public.chatrooms;
CREATE POLICY "Room visibility" ON public.chatrooms
  FOR SELECT TO authenticated
  USING (
    kind IN ('public','artist_public')
    OR (kind = 'crew' AND is_crew_member(crew_id, auth.uid()))
    OR (kind = 'artist_private' AND (owner_id = auth.uid() OR is_room_member(id, auth.uid())))
  );

-- Update chat_messages policies to cover artist rooms
DROP POLICY IF EXISTS "Read public room messages" ON public.chat_messages;
CREATE POLICY "Read room messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chatrooms r WHERE r.id = room_id AND (
      r.kind IN ('public','artist_public')
      OR (r.kind = 'crew' AND is_crew_member(r.crew_id, auth.uid()))
      OR (r.kind = 'artist_private' AND (r.owner_id = auth.uid() OR is_room_member(r.id, auth.uid())))
    )
  ));

DROP POLICY IF EXISTS "Post to allowed rooms" ON public.chat_messages;
CREATE POLICY "Post to allowed rooms" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM public.chatrooms r WHERE r.id = room_id AND (
        r.kind IN ('public','artist_public')
        OR (r.kind = 'crew' AND is_crew_member(r.crew_id, auth.uid()))
        OR (r.kind = 'artist_private' AND (r.owner_id = auth.uid() OR is_room_member(r.id, auth.uid())))
      )
    )
  );
