
-- Featured tracks
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_tracks_featured ON public.tracks(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_tracks_play_count ON public.tracks(play_count DESC, created_at DESC);

-- Add judge role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'judge';

-- Judging sessions
CREATE TABLE IF NOT EXISTS public.judging_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | open | closed
  opens_at TIMESTAMPTZ NOT NULL,
  closes_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.judging_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Judging sessions viewable by everyone"
  ON public.judging_sessions FOR SELECT USING (true);
CREATE POLICY "Admins/mods manage judging sessions"
  ON public.judging_sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE TRIGGER trg_judging_sessions_updated
  BEFORE UPDATE ON public.judging_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Judging panel
CREATE TABLE IF NOT EXISTS public.judging_panel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.judging_sessions(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, judge_id)
);
ALTER TABLE public.judging_panel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Panel viewable by everyone"
  ON public.judging_panel FOR SELECT USING (true);
CREATE POLICY "Admins/mods manage panel"
  ON public.judging_panel FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

-- Judging scores
CREATE TABLE IF NOT EXISTS public.judging_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.judging_sessions(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL,
  judge_id UUID NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, entry_id, judge_id)
);
ALTER TABLE public.judging_scores ENABLE ROW LEVEL SECURITY;

-- Validate score range and session window via trigger (CHECK constraints can't reference now())
CREATE OR REPLACE FUNCTION public.validate_judging_score()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _status TEXT; _opens TIMESTAMPTZ; _closes TIMESTAMPTZ; _is_judge BOOLEAN;
BEGIN
  IF NEW.score < 1 OR NEW.score > 10 THEN
    RAISE EXCEPTION 'Score must be between 1 and 10';
  END IF;
  SELECT status, opens_at, closes_at INTO _status, _opens, _closes
    FROM public.judging_sessions WHERE id = NEW.session_id;
  IF _status <> 'open' THEN RAISE EXCEPTION 'Judging session is not open'; END IF;
  IF now() < _opens OR now() > _closes THEN
    RAISE EXCEPTION 'Outside judging window';
  END IF;
  SELECT EXISTS(SELECT 1 FROM public.judging_panel
    WHERE session_id = NEW.session_id AND judge_id = NEW.judge_id) INTO _is_judge;
  IF NOT _is_judge THEN RAISE EXCEPTION 'You are not on this judging panel'; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_judging_score
  BEFORE INSERT OR UPDATE ON public.judging_scores
  FOR EACH ROW EXECUTE FUNCTION public.validate_judging_score();

CREATE POLICY "Judges can submit own scores"
  ON public.judging_scores FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = judge_id);
CREATE POLICY "Judges can update own scores"
  ON public.judging_scores FOR UPDATE TO authenticated
  USING (auth.uid() = judge_id) WITH CHECK (auth.uid() = judge_id);
CREATE POLICY "Judges see own scores; admins see all"
  ON public.judging_scores FOR SELECT TO authenticated
  USING (auth.uid() = judge_id
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'moderator'));
