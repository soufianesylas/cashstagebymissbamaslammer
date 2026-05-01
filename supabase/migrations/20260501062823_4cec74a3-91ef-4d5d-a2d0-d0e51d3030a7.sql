DROP POLICY IF EXISTS "Audio files are publicly accessible" ON storage.objects;

-- Anonymous users can no longer list the bucket, but signed URLs / public object URLs still work
CREATE POLICY "Users can view their own audio files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tracks' AND auth.uid()::text = (storage.foldername(name))[1]);