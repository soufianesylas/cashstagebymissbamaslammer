-- Tracks table
CREATE TABLE public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'solo' CHECK (mode IN ('solo', 'collab', 'battle')),
  audio_path TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  play_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tracks are viewable by everyone"
  ON public.tracks FOR SELECT USING (true);

CREATE POLICY "Users can insert their own tracks"
  ON public.tracks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracks"
  ON public.tracks FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracks"
  ON public.tracks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_tracks_updated_at
  BEFORE UPDATE ON public.tracks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_tracks_user_id ON public.tracks(user_id);
CREATE INDEX idx_tracks_created_at ON public.tracks(created_at DESC);

-- Storage bucket for audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('tracks', 'tracks', true);

CREATE POLICY "Audio files are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tracks');

CREATE POLICY "Users can upload their own audio"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tracks' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own audio"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tracks' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own audio"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tracks' AND auth.uid()::text = (storage.foldername(name))[1]);