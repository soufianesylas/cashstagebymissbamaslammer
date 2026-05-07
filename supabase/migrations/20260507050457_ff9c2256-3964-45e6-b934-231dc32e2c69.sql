-- Lock down SECURITY DEFINER functions that should never be called directly by users
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_subscription() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_crew() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.open_todays_contest() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.close_expired_contests() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_play_count(uuid) FROM PUBLIC, anon;

-- Re-grant only what's needed
GRANT EXECUTE ON FUNCTION public.increment_play_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.crew_role(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_crew_member(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.user_tier(uuid) TO authenticated, anon;