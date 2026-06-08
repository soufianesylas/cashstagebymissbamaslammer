REVOKE EXECUTE ON FUNCTION public.apply_subscription_tier(uuid, text, text, text, text, timestamptz, timestamptz, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_subscription_tier(uuid, text, text, text, text, timestamptz, timestamptz, boolean, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.enforce_daily_drops_limit() FROM PUBLIC, anon, authenticated;