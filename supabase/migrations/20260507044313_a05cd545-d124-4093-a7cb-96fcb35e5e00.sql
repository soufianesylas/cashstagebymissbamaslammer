
-- Beat submissions from producers
CREATE TABLE public.contest_beats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID NOT NULL,
  title TEXT NOT NULL,
  audio_path TEXT NOT NULL,
  bpm INTEGER,
  vibe TEXT,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contest_beats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved beats viewable by everyone"
  ON public.contest_beats FOR SELECT
  USING (approved = true OR producer_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Producers can submit beats"
  ON public.contest_beats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = producer_id);

CREATE POLICY "Producers can update own beats"
  ON public.contest_beats FOR UPDATE
  TO authenticated
  USING (auth.uid() = producer_id);

CREATE POLICY "Admins/mods can manage beats"
  ON public.contest_beats FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE TRIGGER trg_contest_beats_updated
  BEFORE UPDATE ON public.contest_beats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Daily contests (Mon-Fri)
CREATE TABLE public.daily_contests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_date DATE NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'open', -- open | voting | closed
  winner_beat_id UUID REFERENCES public.contest_beats(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_contests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contests viewable by everyone"
  ON public.daily_contests FOR SELECT USING (true);

CREATE POLICY "Admins/mods manage contests"
  ON public.daily_contests FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE TRIGGER trg_daily_contests_updated
  BEFORE UPDATE ON public.daily_contests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- The 30 director-picked beats per contest
CREATE TABLE public.contest_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL REFERENCES public.daily_contests(id) ON DELETE CASCADE,
  beat_id UUID NOT NULL REFERENCES public.contest_beats(id) ON DELETE CASCADE,
  slot INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contest_id, beat_id),
  UNIQUE(contest_id, slot)
);

ALTER TABLE public.contest_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entries viewable by everyone"
  ON public.contest_entries FOR SELECT USING (true);

CREATE POLICY "Admins/mods manage entries"
  ON public.contest_entries FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Anonymous votes (only the voter can see their own row)
CREATE TABLE public.contest_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL REFERENCES public.daily_contests(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES public.contest_entries(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contest_id, voter_id)
);

ALTER TABLE public.contest_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voters see only their own vote"
  ON public.contest_votes FOR SELECT
  TO authenticated
  USING (auth.uid() = voter_id);

CREATE POLICY "Authenticated users can vote"
  ON public.contest_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = voter_id);

-- Aggregated, anonymous tallies (no voter ids exposed)
CREATE OR REPLACE VIEW public.contest_vote_tallies
WITH (security_invoker = true) AS
SELECT
  e.id AS entry_id,
  e.contest_id,
  e.beat_id,
  e.slot,
  COUNT(v.id)::int AS vote_count
FROM public.contest_entries e
LEFT JOIN public.contest_votes v ON v.entry_id = e.id
GROUP BY e.id, e.contest_id, e.beat_id, e.slot;

GRANT SELECT ON public.contest_vote_tallies TO anon, authenticated;
