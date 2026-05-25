
-- 1) judging_panel: restrict SELECT to admins/mods only (hide judge identities)
DROP POLICY IF EXISTS "Judges and staff can view panel" ON public.judging_panel;
CREATE POLICY "Only staff can view judging panel"
  ON public.judging_panel FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

-- Provide a security-definer helper so a judge can check their own panel membership
-- without being able to enumerate the table.
CREATE OR REPLACE FUNCTION public.is_panel_judge(_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.judging_panel
    WHERE session_id = _session_id AND judge_id = auth.uid()
  );
$$;

-- 2) track_scores: add a restrictive policy that blocks any client UPDATE/DELETE,
--    documenting that fully_listened/reward_paid are server-side only.
DROP POLICY IF EXISTS "Block client updates on track_scores" ON public.track_scores;
CREATE POLICY "Block client updates on track_scores"
  ON public.track_scores AS RESTRICTIVE
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Block client deletes on track_scores" ON public.track_scores;
CREATE POLICY "Block client deletes on track_scores"
  ON public.track_scores AS RESTRICTIVE
  FOR DELETE
  TO anon, authenticated
  USING (false);

-- 3) crew_members: restrict SELECT to authenticated users only
DROP POLICY IF EXISTS "Members viewable by everyone" ON public.crew_members;
CREATE POLICY "Members viewable by authenticated users"
  ON public.crew_members FOR SELECT
  TO authenticated
  USING (true);
