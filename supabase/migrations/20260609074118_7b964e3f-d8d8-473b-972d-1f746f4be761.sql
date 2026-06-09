-- 1) Make judging_scores immutable once submitted (consistent with track_scores/contest_votes)
DROP POLICY IF EXISTS "Judges can update own scores" ON public.judging_scores;
CREATE POLICY "judging_scores immutable"
ON public.judging_scores
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

-- 2) Allow public reads of media files attached to public drops
CREATE POLICY "Public drop media readable by all"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'media'
  AND EXISTS (
    SELECT 1 FROM public.drops d
    WHERE d.media_path = storage.objects.name
      AND d.visibility = 'public'
  )
);
