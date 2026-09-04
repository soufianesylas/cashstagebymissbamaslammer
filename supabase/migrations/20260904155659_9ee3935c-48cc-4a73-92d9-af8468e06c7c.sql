
-- 1. Play dedup
CREATE TABLE IF NOT EXISTS public.track_plays (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null,
  user_id uuid not null,
  play_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (track_id, user_id, play_date)
);
GRANT SELECT ON public.track_plays TO authenticated;
GRANT ALL ON public.track_plays TO service_role;
ALTER TABLE public.track_plays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own plays" ON public.track_plays;
CREATE POLICY "Users see own plays" ON public.track_plays FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.increment_play_count(_track_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _owner uuid; _uid uuid := auth.uid(); _ins int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT user_id INTO _owner FROM public.tracks WHERE id = _track_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'Track not found'; END IF;
  IF _owner = _uid THEN RAISE EXCEPTION 'Owners cannot play-count their own track'; END IF;

  INSERT INTO public.track_plays (track_id, user_id)
  VALUES (_track_id, _uid)
  ON CONFLICT (track_id, user_id, play_date) DO NOTHING;
  GET DIAGNOSTICS _ins = ROW_COUNT;
  IF _ins = 0 THEN RETURN; END IF;

  PERFORM set_config('session_replication_role', 'replica', true);
  UPDATE public.tracks SET play_count = play_count + 1 WHERE id = _track_id;
  PERFORM set_config('session_replication_role', 'origin', true);
  PERFORM public.consume_boost_play(_track_id);
END; $$;

-- 2. Score reward farming
DELETE FROM public.track_scores a USING public.track_scores b
  WHERE a.ctid < b.ctid AND a.judge_id = b.judge_id AND a.track_id = b.track_id;
CREATE UNIQUE INDEX IF NOT EXISTS track_scores_judge_track_uniq
  ON public.track_scores (judge_id, track_id);

CREATE OR REPLACE FUNCTION public.submit_track_score(_track_id uuid, _score integer, _feature_worthy boolean DEFAULT NULL::boolean, _favorite_bars text DEFAULT NULL::text, _needs_improvement text DEFAULT NULL::text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _id uuid; _listened boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  -- Reward only when a server-recorded play exists for this judge today.
  SELECT EXISTS (
    SELECT 1 FROM public.track_plays
     WHERE track_id = _track_id AND user_id = auth.uid() AND play_date = CURRENT_DATE
  ) INTO _listened;

  INSERT INTO public.track_scores (
    track_id, judge_id, score, feature_worthy,
    favorite_bars, needs_improvement, fully_listened
  ) VALUES (
    _track_id, auth.uid(), _score, _feature_worthy,
    _favorite_bars, _needs_improvement, _listened
  )
  RETURNING id INTO _id;

  PERFORM public.consume_boost_vote(_track_id);
  RETURN _id;
END; $$;

-- 3. Restrict readable tables
DROP POLICY IF EXISTS "Members viewable by authenticated users" ON public.crew_members;
CREATE POLICY "Crew members view their crew roster" ON public.crew_members
  FOR SELECT TO authenticated
  USING (public.is_crew_member(crew_id, auth.uid()) OR user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Payouts are viewable by signed-in users" ON public.daily_rank_payouts;
CREATE POLICY "Users view own payouts" ON public.daily_rank_payouts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Tickets are viewable by signed-in users" ON public.rally_tickets;
CREATE POLICY "Users view own tickets" ON public.rally_tickets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- 4. Revoke anon EXECUTE on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.add_ticket_to_pot() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.bump_entry_share(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.daily_solo_rank() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.enforce_artist_room_caps() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.enforce_collab_member_cap() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_artist_room() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_collab() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_collab_member(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_room_member(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.spin_wheel_boost(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.bump_entry_share(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.daily_solo_rank() TO authenticated;
GRANT EXECUTE ON FUNCTION public.spin_wheel_boost(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_collab_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_room_member(uuid, uuid) TO authenticated;
