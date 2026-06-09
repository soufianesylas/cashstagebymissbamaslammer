CREATE POLICY "Authenticated can read visible track files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'tracks'
  AND EXISTS (
    SELECT 1 FROM public.tracks t
    WHERE t.audio_path = storage.objects.name
      AND t.is_hidden = false
  )
);