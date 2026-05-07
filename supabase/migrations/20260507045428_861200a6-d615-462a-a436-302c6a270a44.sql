
-- ============ Crews ============
CREATE TABLE public.crews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  tag TEXT NOT NULL UNIQUE CHECK (char_length(tag) BETWEEN 2 AND 8),
  leader_id UUID NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.crew_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader','admin','member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(crew_id, user_id),
  UNIQUE(user_id) -- a user can only be in ONE crew
);
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;

-- Helper: is user in crew? (security definer to avoid recursion in policies)
CREATE OR REPLACE FUNCTION public.is_crew_member(_crew_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.crew_members WHERE crew_id = _crew_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.crew_role(_crew_id UUID, _user_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.crew_members WHERE crew_id = _crew_id AND user_id = _user_id;
$$;

REVOKE EXECUTE ON FUNCTION public.is_crew_member(UUID,UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.crew_role(UUID,UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_crew_member(UUID,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crew_role(UUID,UUID) TO authenticated;

-- Enforce: max 20 members; max 1 leader; max 2 admins
CREATE OR REPLACE FUNCTION public.enforce_crew_limits()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _count INT; _leaders INT; _admins INT;
BEGIN
  SELECT COUNT(*) INTO _count FROM public.crew_members WHERE crew_id = NEW.crew_id;
  IF _count >= 20 THEN RAISE EXCEPTION 'Crew is full (20 members max)'; END IF;
  IF NEW.role = 'leader' THEN
    SELECT COUNT(*) INTO _leaders FROM public.crew_members WHERE crew_id = NEW.crew_id AND role = 'leader';
    IF _leaders >= 1 THEN RAISE EXCEPTION 'Crew already has a leader'; END IF;
  END IF;
  IF NEW.role = 'admin' THEN
    SELECT COUNT(*) INTO _admins FROM public.crew_members WHERE crew_id = NEW.crew_id AND role = 'admin';
    IF _admins >= 2 THEN RAISE EXCEPTION 'Crew already has 2 admins'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_enforce_crew_limits BEFORE INSERT ON public.crew_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_crew_limits();

-- Crews RLS
CREATE POLICY "Crews viewable by everyone" ON public.crews FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create crews" ON public.crews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = leader_id);
CREATE POLICY "Leader can update crew" ON public.crews FOR UPDATE TO authenticated
  USING (auth.uid() = leader_id);
CREATE POLICY "Leader can delete crew" ON public.crews FOR DELETE TO authenticated
  USING (auth.uid() = leader_id);

-- Auto-add leader as crew_member on crew creation, and create crew chatroom
CREATE OR REPLACE FUNCTION public.handle_new_crew()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.crew_members (crew_id, user_id, role) VALUES (NEW.id, NEW.leader_id, 'leader');
  INSERT INTO public.chatrooms (kind, crew_id, title) VALUES ('crew', NEW.id, NEW.name || ' Chat');
  RETURN NEW;
END;
$$;

-- Crew members RLS
CREATE POLICY "Members viewable by everyone" ON public.crew_members FOR SELECT USING (true);
CREATE POLICY "Users join as member only" ON public.crew_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND role = 'member');
CREATE POLICY "Users can leave" ON public.crew_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Leader/admin can kick or change role" ON public.crew_members FOR DELETE TO authenticated
  USING (public.crew_role(crew_id, auth.uid()) IN ('leader','admin') AND user_id <> auth.uid());
CREATE POLICY "Leader can change roles" ON public.crew_members FOR UPDATE TO authenticated
  USING (public.crew_role(crew_id, auth.uid()) = 'leader');

CREATE TRIGGER trg_crews_updated BEFORE UPDATE ON public.crews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Chatrooms ============
CREATE TABLE public.chatrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('public','crew')),
  crew_id UUID UNIQUE REFERENCES public.crews(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((kind = 'public' AND crew_id IS NULL) OR (kind = 'crew' AND crew_id IS NOT NULL))
);
ALTER TABLE public.chatrooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public rooms visible to all; crew rooms only to members"
  ON public.chatrooms FOR SELECT
  USING (kind = 'public' OR (kind = 'crew' AND public.is_crew_member(crew_id, auth.uid())));

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chatrooms(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX chat_messages_room_created_idx ON public.chat_messages (room_id, created_at DESC);

-- Read: anyone for public, only members for crew
CREATE POLICY "Read public room messages" ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chatrooms r WHERE r.id = room_id AND (
        r.kind = 'public' OR (r.kind = 'crew' AND public.is_crew_member(r.crew_id, auth.uid()))
      )
    )
  );

-- Post: signed-in for public; crew members for crew
CREATE POLICY "Post to allowed rooms" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND EXISTS (
      SELECT 1 FROM public.chatrooms r WHERE r.id = room_id AND (
        r.kind = 'public' OR (r.kind = 'crew' AND public.is_crew_member(r.crew_id, auth.uid()))
      )
    )
  );

-- Author or admin/mod can delete
CREATE POLICY "Author or mod can delete message" ON public.chat_messages FOR DELETE TO authenticated
  USING (
    auth.uid() = author_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  );

CREATE TRIGGER trg_handle_new_crew AFTER INSERT ON public.crews
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_crew();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crew_members;

-- Seed default public rooms
INSERT INTO public.chatrooms (kind, title) VALUES
  ('public', 'Global'),
  ('public', 'Battles'),
  ('public', 'Collabs');
