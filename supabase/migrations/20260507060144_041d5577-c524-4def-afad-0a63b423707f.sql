REVOKE ALL ON FUNCTION public.consume_boost_play(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_boost_play(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.consume_boost_vote(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_boost_vote(uuid) TO authenticated;