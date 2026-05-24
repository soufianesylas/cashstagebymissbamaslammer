
-- Fix 1: tracks SELECT policy must respect is_hidden
DROP POLICY IF EXISTS "Tracks are viewable by everyone" ON public.tracks;
CREATE POLICY "Tracks are viewable by everyone"
  ON public.tracks FOR SELECT
  USING (
    is_hidden = false
    OR auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

-- Fix 2: remove overly-broad SELECT policies on storage 'tracks' bucket
DROP POLICY IF EXISTS "Authenticated can read tracks" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read tracks bucket" ON storage.objects;
