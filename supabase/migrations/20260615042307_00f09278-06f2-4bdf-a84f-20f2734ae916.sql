CREATE TABLE public.user_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('audio','video','image')),
  storage_path TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_media TO authenticated;
GRANT ALL ON public.user_media TO service_role;
ALTER TABLE public.user_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their media" ON public.user_media
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX user_media_user_created_idx ON public.user_media (user_id, created_at DESC);