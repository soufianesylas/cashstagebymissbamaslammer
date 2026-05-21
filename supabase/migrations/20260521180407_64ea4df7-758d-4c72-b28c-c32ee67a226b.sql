-- 1. judging_panel: restrict SELECT to judge + staff
DROP POLICY IF EXISTS "Panel viewable by everyone" ON public.judging_panel;
CREATE POLICY "Judges and staff can view panel"
  ON public.judging_panel FOR SELECT
  TO authenticated
  USING (
    judge_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
  );

-- 2. track_boosts: restrict SELECT to owner + staff
DROP POLICY IF EXISTS "Boosts visible to everyone" ON public.track_boosts;
CREATE POLICY "Owners and staff can view boosts"
  ON public.track_boosts FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
  );

-- 3. storage.objects: remove public SELECT on tracks bucket
DROP POLICY IF EXISTS "Audio files are publicly viewable" ON storage.objects;
-- Owners can read their own audio (folder convention: <user_id>/...)
CREATE POLICY "Owners can read their own track files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'tracks'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
-- Staff can read all track files for moderation
CREATE POLICY "Staff can read all track files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'tracks'
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  );