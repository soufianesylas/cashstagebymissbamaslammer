
-- Trigger-only functions: revoke from everyone (triggers run as definer regardless)
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_crew() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_subscription() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_play_count_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pay_listen_reward() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_judging_score() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_track_score() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_entry_window() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_weekly_submission_window() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_weekday_contest() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_vote_window() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_crew_limits() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_free_weekly_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_beat_self_approval() FROM PUBLIC, anon, authenticated;

-- App-callable helpers: revoke from anon, allow authenticated only
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.user_tier(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_tier(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.is_crew_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_crew_member(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.crew_role(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crew_role(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.increment_play_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_play_count(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.consume_boost_play(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_boost_play(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.consume_boost_vote(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_boost_vote(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.open_todays_contest() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_todays_contest() TO authenticated;

REVOKE ALL ON FUNCTION public.close_expired_contests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_expired_contests() TO authenticated;

REVOKE ALL ON FUNCTION public.anonymous_track_score_tallies() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.anonymous_track_score_tallies() TO authenticated;

REVOKE ALL ON FUNCTION public.boosted_track_order() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.boosted_track_order() TO authenticated;
