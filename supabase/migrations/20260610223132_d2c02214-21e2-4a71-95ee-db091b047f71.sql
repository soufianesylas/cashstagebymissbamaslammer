
DROP POLICY IF EXISTS "Users insert their own drops" ON public.drops;
DROP POLICY IF EXISTS "Users update their own drops" ON public.drops;
DROP POLICY IF EXISTS "Users delete their own drops" ON public.drops;

CREATE POLICY "Users insert their own drops" ON public.drops
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own drops" ON public.drops
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own drops" ON public.drops
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Media: owners can read" ON storage.objects;
CREATE POLICY "Media: owners can read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
