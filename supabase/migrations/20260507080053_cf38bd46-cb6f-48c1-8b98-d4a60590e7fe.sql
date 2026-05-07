
-- track_reports
CREATE TABLE public.track_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL,
  reporter_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('copyright','hate','sexual','violence','ai_generated','other')),
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','dismissed','actioned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.track_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporters can file reports" ON public.track_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id AND length(coalesce(detail,'')) <= 1000);

CREATE POLICY "Reporter or staff can view" ON public.track_reports
  FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));

CREATE POLICY "Staff can update reports" ON public.track_reports
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));

CREATE INDEX idx_track_reports_status ON public.track_reports(status, created_at DESC);
CREATE INDEX idx_track_reports_track ON public.track_reports(track_id);
CREATE TRIGGER trg_track_reports_updated BEFORE UPDATE ON public.track_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- moderation_actions
CREATE TABLE public.moderation_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL,
  moderator_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('hide','unhide','warn','remove')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage moderation actions" ON public.moderation_actions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));

-- is_hidden flag on tracks
ALTER TABLE public.tracks ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX idx_tracks_visibility ON public.tracks(is_hidden, created_at DESC);
