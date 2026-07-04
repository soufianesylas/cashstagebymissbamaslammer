
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS genre TEXT;

ALTER TABLE public.chatrooms DROP CONSTRAINT IF EXISTS chatrooms_kind_check;
ALTER TABLE public.chatrooms ADD CONSTRAINT chatrooms_kind_check
  CHECK (kind IN ('public','crew','artist_public','artist_private','collab'));
ALTER TABLE public.chatrooms ADD COLUMN IF NOT EXISTS collab_id UUID;

CREATE TABLE public.collabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 80),
  genre TEXT,
  beat_track_id UUID REFERENCES public.tracks(id) ON DELETE SET NULL,
  max_members INT NOT NULL DEFAULT 4 CHECK (max_members BETWEEN 2 AND 12),
  is_open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collabs TO authenticated;
GRANT SELECT ON public.collabs TO anon;
GRANT ALL ON public.collabs TO service_role;
ALTER TABLE public.collabs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view collabs" ON public.collabs FOR SELECT USING (true);
CREATE POLICY "Auth users create collabs" ON public.collabs FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners update their collab" ON public.collabs FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners delete their collab" ON public.collabs FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE TRIGGER trg_collabs_updated_at BEFORE UPDATE ON public.collabs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.collab_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collab_id UUID NOT NULL REFERENCES public.collabs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (collab_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.collab_members TO authenticated;
GRANT ALL ON public.collab_members TO service_role;
ALTER TABLE public.collab_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_collab_member(_collab_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.collab_members WHERE collab_id=_collab_id AND user_id=_user_id);
$$;

CREATE POLICY "View collab members" ON public.collab_members FOR SELECT USING (true);
CREATE POLICY "Users can join open collabs" ON public.collab_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.collabs c WHERE c.id = collab_id AND c.is_open = true));
CREATE POLICY "Users can leave collabs" ON public.collab_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.enforce_collab_member_cap()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cap INT; _count INT;
BEGIN
  SELECT max_members INTO _cap FROM public.collabs WHERE id = NEW.collab_id;
  SELECT COUNT(*) INTO _count FROM public.collab_members WHERE collab_id = NEW.collab_id;
  IF _count >= _cap THEN RAISE EXCEPTION 'Collab is full (% members max)', _cap; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_collab_member_cap BEFORE INSERT ON public.collab_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_collab_member_cap();

CREATE OR REPLACE FUNCTION public.handle_new_collab()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.chatrooms (kind, collab_id, owner_id, title)
    VALUES ('collab', NEW.id, NEW.owner_id, NEW.title || ' — Chat');
  INSERT INTO public.collab_members (collab_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_handle_new_collab AFTER INSERT ON public.collabs
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_collab();

DROP POLICY IF EXISTS "View chatrooms" ON public.chatrooms;
CREATE POLICY "View chatrooms" ON public.chatrooms FOR SELECT USING (
  kind IN ('public','artist_public') OR
  (kind = 'crew' AND crew_id IS NOT NULL AND public.is_crew_member(crew_id, auth.uid())) OR
  (kind = 'artist_private' AND (owner_id = auth.uid() OR public.is_room_member(id, auth.uid()))) OR
  (kind = 'collab' AND collab_id IS NOT NULL AND public.is_collab_member(collab_id, auth.uid()))
);

DROP POLICY IF EXISTS "View chat messages" ON public.chat_messages;
CREATE POLICY "View chat messages" ON public.chat_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chatrooms r WHERE r.id = room_id AND (
      r.kind IN ('public','artist_public') OR
      (r.kind = 'crew' AND public.is_crew_member(r.crew_id, auth.uid())) OR
      (r.kind = 'artist_private' AND (r.owner_id = auth.uid() OR public.is_room_member(r.id, auth.uid()))) OR
      (r.kind = 'collab' AND public.is_collab_member(r.collab_id, auth.uid()))
    )
  )
);

CREATE TABLE public.wheel_spins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  genre TEXT,
  partner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stake_kind TEXT NOT NULL DEFAULT 'boost_pack',
  boost_id UUID REFERENCES public.track_boosts(id) ON DELETE SET NULL,
  stake_plays INT NOT NULL DEFAULT 0,
  stake_votes INT NOT NULL DEFAULT 0,
  won BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.wheel_spins TO authenticated;
GRANT ALL ON public.wheel_spins TO service_role;
ALTER TABLE public.wheel_spins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their spins" ON public.wheel_spins FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = partner_id);
CREATE POLICY "Users insert own spins" ON public.wheel_spins FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.spin_wheel_boost(_boost_id UUID)
RETURNS TABLE (won BOOLEAN, partner_id UUID, new_plays INT, new_votes INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _boost RECORD;
  _genre TEXT;
  _partner UUID;
  _won BOOLEAN;
  _new_plays INT;
  _new_votes INT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT tb.*, t.user_id AS track_owner INTO _boost
    FROM public.track_boosts tb JOIN public.tracks t ON t.id = tb.track_id
   WHERE tb.id = _boost_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Boost not found'; END IF;
  IF _boost.track_owner <> _uid THEN RAISE EXCEPTION 'Not your boost'; END IF;
  IF _boost.plays_remaining <= 0 AND _boost.votes_remaining <= 0 THEN
    RAISE EXCEPTION 'Boost is already empty';
  END IF;

  SELECT genre INTO _genre FROM public.profiles WHERE id = _uid;
  SELECT id INTO _partner FROM public.profiles
    WHERE id <> _uid AND (_genre IS NULL OR genre = _genre)
    ORDER BY random() LIMIT 1;

  _won := (random() < 0.5);
  IF _won THEN
    _new_plays := _boost.plays_remaining * 2;
    _new_votes := _boost.votes_remaining * 2;
  ELSE
    _new_plays := 0;
    _new_votes := 0;
  END IF;

  UPDATE public.track_boosts
     SET plays_remaining = _new_plays, votes_remaining = _new_votes, updated_at = now()
   WHERE id = _boost_id;

  INSERT INTO public.wheel_spins (user_id, genre, partner_id, stake_kind, boost_id, stake_plays, stake_votes, won)
    VALUES (_uid, _genre, _partner, 'boost_pack', _boost_id, _boost.plays_remaining, _boost.votes_remaining, _won);

  won := _won; partner_id := _partner; new_plays := _new_plays; new_votes := _new_votes;
  RETURN NEXT;
END; $$;

REVOKE ALL ON FUNCTION public.spin_wheel_boost(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.spin_wheel_boost(UUID) TO authenticated;
