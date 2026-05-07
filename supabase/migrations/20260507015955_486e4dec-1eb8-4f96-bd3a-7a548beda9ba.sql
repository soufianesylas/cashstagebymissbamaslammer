REVOKE UPDATE ON public.tracks FROM anon, authenticated;
GRANT UPDATE (title, mode, audio_path, duration_seconds, updated_at) ON public.tracks TO authenticated;