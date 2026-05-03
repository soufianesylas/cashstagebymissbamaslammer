
-- 1) Lock wallets table: explicit restrictive deny for INSERT/UPDATE/DELETE by clients.
-- Only service role / SECURITY DEFINER functions can mutate balances.
CREATE POLICY "Block client inserts on wallets"
  ON public.wallets AS RESTRICTIVE
  FOR INSERT TO authenticated, anon
  WITH CHECK (false);

CREATE POLICY "Block client updates on wallets"
  ON public.wallets AS RESTRICTIVE
  FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);

CREATE POLICY "Block client deletes on wallets"
  ON public.wallets AS RESTRICTIVE
  FOR DELETE TO authenticated, anon
  USING (false);

-- 2) Prevent artists from inflating their own play_count via direct updates.
REVOKE UPDATE (play_count) ON public.tracks FROM authenticated, anon;

-- Trigger guard: even if grants change, block play_count changes outside SECURITY DEFINER context.
CREATE OR REPLACE FUNCTION public.prevent_play_count_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.play_count IS DISTINCT FROM OLD.play_count THEN
    NEW.play_count := OLD.play_count;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_play_count_change_trg ON public.tracks;
CREATE TRIGGER prevent_play_count_change_trg
  BEFORE UPDATE ON public.tracks
  FOR EACH ROW EXECUTE FUNCTION public.prevent_play_count_change();

-- SECURITY DEFINER RPC for legitimate increments (e.g. from an edge function).
-- Caller must not be the track owner (prevents self-play inflation).
CREATE OR REPLACE FUNCTION public.increment_play_count(_track_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
BEGIN
  SELECT user_id INTO _owner FROM public.tracks WHERE id = _track_id;
  IF _owner IS NULL THEN
    RAISE EXCEPTION 'Track not found';
  END IF;
  IF _owner = auth.uid() THEN
    RAISE EXCEPTION 'Owners cannot play-count their own track';
  END IF;
  -- Bypass the protection trigger by using a direct UPDATE with session_replication_role
  PERFORM set_config('session_replication_role', 'replica', true);
  UPDATE public.tracks SET play_count = play_count + 1 WHERE id = _track_id;
  PERFORM set_config('session_replication_role', 'origin', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_play_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_play_count(uuid) TO authenticated;

-- 3) Tighten tracks storage bucket: keep files publicly readable by direct URL,
-- but prevent clients from listing the entire bucket contents.
DROP POLICY IF EXISTS "Public read access for tracks" ON storage.objects;
DROP POLICY IF EXISTS "Tracks are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view tracks" ON storage.objects;

-- Note: public bucket flag still allows direct getPublicUrl access without an RLS row-listing policy.
