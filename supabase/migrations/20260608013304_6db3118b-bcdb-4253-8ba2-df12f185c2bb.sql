
-- 1. Add cover_url to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_url text;

-- 2. drops table
CREATE TABLE IF NOT EXISTS public.drops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('audio','video','image')),
  media_path text NOT NULL,
  caption text,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.drops TO authenticated;
GRANT SELECT ON public.drops TO anon;
GRANT ALL ON public.drops TO service_role;

ALTER TABLE public.drops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public drops are viewable by everyone"
  ON public.drops FOR SELECT
  USING (visibility = 'public' OR auth.uid() = user_id);

CREATE POLICY "Users insert their own drops"
  ON public.drops FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own drops"
  ON public.drops FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own drops"
  ON public.drops FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER drops_set_updated_at
  BEFORE UPDATE ON public.drops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS drops_user_idx ON public.drops(user_id, created_at DESC);

-- 3. Storage policies on media bucket — folder-scoped to auth.uid()
CREATE POLICY "Media: owners can read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Media: authenticated can read public profile + drop media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'media');

CREATE POLICY "Media: owners can upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Media: owners can update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Media: owners can delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
