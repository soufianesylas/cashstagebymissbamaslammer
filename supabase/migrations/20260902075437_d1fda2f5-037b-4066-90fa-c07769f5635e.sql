REVOKE ALL ON FUNCTION public.add_ticket_to_pot() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.bump_entry_share(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.daily_solo_rank() FROM anon;
GRANT EXECUTE ON FUNCTION public.bump_entry_share(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.daily_solo_rank() TO authenticated;