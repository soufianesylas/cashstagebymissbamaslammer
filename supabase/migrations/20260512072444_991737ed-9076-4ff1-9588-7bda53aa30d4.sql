
-- Fix: boost_arbitrary_credits — remove direct client INSERT on track_boosts.
-- Edge function verify-purchase uses service_role and bypasses RLS, so legit purchases keep working.
DROP POLICY IF EXISTS "Owner can purchase boosts for own track" ON public.track_boosts;

-- Fix: fully_listened_csb_abuse — forbid client from setting fully_listened/reward_paid on direct insert.
DROP POLICY IF EXISTS "Anyone signed in can submit scores" ON public.track_scores;
CREATE POLICY "Authenticated can insert pending scores"
ON public.track_scores
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = judge_id
  AND fully_listened = false
  AND reward_paid = false
);

-- Server-controlled RPC that flips fully_listened=true and consumes a boost vote.
CREATE OR REPLACE FUNCTION public.submit_track_score(
  _track_id uuid,
  _score int,
  _feature_worthy boolean DEFAULT NULL,
  _favorite_bars text DEFAULT NULL,
  _needs_improvement text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  INSERT INTO public.track_scores (
    track_id, judge_id, score, feature_worthy,
    favorite_bars, needs_improvement, fully_listened
  ) VALUES (
    _track_id, auth.uid(), _score, _feature_worthy,
    _favorite_bars, _needs_improvement, true
  )
  RETURNING id INTO _id;

  PERFORM public.consume_boost_vote(_track_id);
  RETURN _id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_track_score(uuid, int, boolean, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_track_score(uuid, int, boolean, text, text) TO authenticated;

-- Fix: judging_scores_any_judge_insert — require panel membership in RLS (defense-in-depth on top of trigger).
DROP POLICY IF EXISTS "Judges can submit own scores" ON public.judging_scores;
CREATE POLICY "Panel judges can submit scores"
ON public.judging_scores
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = judge_id
  AND EXISTS (
    SELECT 1 FROM public.judging_panel jp
    WHERE jp.session_id = judging_scores.session_id
      AND jp.judge_id = auth.uid()
  )
);

-- Fix: consume_boost_drain — restrict consume_boost_* helpers to service_role / definer callers.
REVOKE EXECUTE ON FUNCTION public.consume_boost_play(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_boost_vote(uuid) FROM PUBLIC, anon, authenticated;

-- Move the boost-play consumption inside increment_play_count so legitimate plays still drain credits.
CREATE OR REPLACE FUNCTION public.increment_play_count(_track_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _owner uuid;
BEGIN
  SELECT user_id INTO _owner FROM public.tracks WHERE id = _track_id;
  IF _owner IS NULL THEN
    RAISE EXCEPTION 'Track not found';
  END IF;
  IF _owner = auth.uid() THEN
    RAISE EXCEPTION 'Owners cannot play-count their own track';
  END IF;
  PERFORM set_config('session_replication_role', 'replica', true);
  UPDATE public.tracks SET play_count = play_count + 1 WHERE id = _track_id;
  PERFORM set_config('session_replication_role', 'origin', true);
  PERFORM public.consume_boost_play(_track_id);
END;
$$;

-- Fix: crew_members_realtime_no_rls_select_scope — drop crew_members from realtime publication.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'crew_members'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.crew_members';
  END IF;
END $$;
