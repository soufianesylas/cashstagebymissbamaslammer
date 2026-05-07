
UPDATE storage.buckets SET public = false WHERE id = 'tracks';

-- Drop any old policies on the tracks bucket and re-create
DROP POLICY IF EXISTS "Authenticated can read tracks" ON storage.objects;
DROP POLICY IF EXISTS "Owners manage own track files" ON storage.objects;

CREATE POLICY "Authenticated can read tracks"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tracks');

CREATE POLICY "Owners manage own track files"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'tracks' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'tracks' AND auth.uid()::text = (storage.foldername(name))[1]);
