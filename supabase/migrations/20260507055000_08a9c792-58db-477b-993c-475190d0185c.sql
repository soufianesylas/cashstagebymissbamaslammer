
CREATE TABLE IF NOT EXISTS public.track_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  pack TEXT NOT NULL,
  plays_remaining INTEGER NOT NULL DEFAULT 0,
  votes_remaining INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_track_boosts_track ON public.track_boosts(track_id);

ALTER TABLE public.track_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Boosts visible to everyone"
  ON public.track_boosts FOR SELECT USING (true);

CREATE POLICY "Owner can purchase boosts for own track"
  ON public.track_boosts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND t.user_id = auth.uid())
  );

CREATE TRIGGER trg_track_boosts_updated
  BEFORE UPDATE ON public.track_boosts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.track_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL,
  judge_id UUID NOT NULL,
  score INTEGER NOT NULL,
  score_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (track_id, judge_id, score_date)
);

ALTER TABLE public.track_scores ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_track_score()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _owner UUID;
BEGIN
  IF NEW.score < 1 OR NEW.score > 10 THEN
    RAISE EXCEPTION 'Score must be between 1 and 10';
  END IF;
  SELECT user_id INTO _owner FROM public.tracks WHERE id = NEW.track_id;
  IF _owner = NEW.judge_id THEN
    RAISE EXCEPTION 'You cannot score your own track';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_track_score
  BEFORE INSERT OR UPDATE ON public.track_scores
  FOR EACH ROW EXECUTE FUNCTION public.validate_track_score();

CREATE POLICY "Anyone signed in can submit scores"
  ON public.track_scores FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = judge_id);

CREATE POLICY "Judges see own scores only"
  ON public.track_scores FOR SELECT TO authenticated
  USING (auth.uid() = judge_id);

CREATE OR REPLACE VIEW public.track_score_tallies
WITH (security_invoker = true) AS
SELECT track_id, COUNT(*)::int AS score_count, ROUND(AVG(score)::numeric, 2) AS avg_score
FROM public.track_scores GROUP BY track_id;

GRANT SELECT ON public.track_score_tallies TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_boost_play(_track_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.track_boosts SET plays_remaining = plays_remaining - 1
  WHERE id = (SELECT id FROM public.track_boosts
               WHERE track_id = _track_id AND plays_remaining > 0
               ORDER BY created_at ASC LIMIT 1);
END; $$;
REVOKE EXECUTE ON FUNCTION public.consume_boost_play(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_boost_play(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.consume_boost_vote(_track_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.track_boosts SET votes_remaining = votes_remaining - 1
  WHERE id = (SELECT id FROM public.track_boosts
               WHERE track_id = _track_id AND votes_remaining > 0
               ORDER BY created_at ASC LIMIT 1);
END; $$;
REVOKE EXECUTE ON FUNCTION public.consume_boost_vote(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_boost_vote(UUID) TO authenticated;
