
-- Revoke client write privileges; only service_role should mutate boosts.
REVOKE INSERT, UPDATE, DELETE ON public.track_boosts FROM anon, authenticated;
GRANT ALL ON public.track_boosts TO service_role;

-- Explicit RESTRICTIVE deny so intent is unambiguous and future
-- permissive policies can never open client-side writes.
DROP POLICY IF EXISTS "Deny client inserts on track_boosts" ON public.track_boosts;
DROP POLICY IF EXISTS "Deny client updates on track_boosts" ON public.track_boosts;
DROP POLICY IF EXISTS "Deny client deletes on track_boosts" ON public.track_boosts;

CREATE POLICY "Deny client inserts on track_boosts"
  ON public.track_boosts AS RESTRICTIVE
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "Deny client updates on track_boosts"
  ON public.track_boosts AS RESTRICTIVE
  FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "Deny client deletes on track_boosts"
  ON public.track_boosts AS RESTRICTIVE
  FOR DELETE TO anon, authenticated
  USING (false);
