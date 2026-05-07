-- Restrict execute on the SECURITY DEFINER play-count function
REVOKE EXECUTE ON FUNCTION public.increment_play_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_play_count(uuid) TO authenticated;

-- Prevent listing of all files in the public 'tracks' bucket while keeping direct URL access
DROP POLICY IF EXISTS "Tracks are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Public read tracks" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view tracks" ON storage.objects;

CREATE POLICY "Authenticated can read tracks bucket"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'tracks');

CREATE POLICY "Owners can manage their track files"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'tracks' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'tracks' AND auth.uid()::text = (storage.foldername(name))[1]);