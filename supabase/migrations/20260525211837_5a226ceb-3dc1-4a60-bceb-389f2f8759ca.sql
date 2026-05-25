
-- Revoke EXECUTE on internal SECURITY DEFINER helpers and trigger functions.
-- They keep working inside RLS policies and triggers (which run as the function
-- owner regardless of caller grants).

DO $$
DECLARE
  fn text;
  internal text[] := ARRAY[
    'has_role(uuid, app_role)',
    'is_crew_member(uuid, uuid)',
    'crew_role(uuid, uuid)',
    'user_tier(uuid)',
    'handle_new_user()',
    'handle_new_user_subscription()',
    'handle_new_crew()',
    'pay_listen_reward()',
    'prevent_play_count_change()',
    'prevent_beat_self_approval()',
    'consume_boost_play(uuid)',
    'consume_boost_vote(uuid)',
    'validate_track_score()',
    'validate_judging_score()',
    'enforce_weekday_contest()',
    'enforce_vote_window()',
    'enforce_entry_window()',
    'enforce_weekly_submission_window()',
    'enforce_crew_limits()',
    'enforce_free_weekly_limit()',
    'update_updated_at_column()'
  ];
BEGIN
  FOREACH fn IN ARRAY internal LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;

-- Explicitly lock then grant the genuine client-callable RPCs to authenticated only.
REVOKE ALL ON FUNCTION public.submit_track_score(uuid, integer, boolean, text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.submit_track_score(uuid, integer, boolean, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.increment_play_count(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.increment_play_count(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.is_panel_judge(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.is_panel_judge(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.anonymous_track_score_tallies() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.anonymous_track_score_tallies() TO authenticated;

REVOKE ALL ON FUNCTION public.boosted_track_order() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.boosted_track_order() TO authenticated;

REVOKE ALL ON FUNCTION public.open_todays_contest() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.open_todays_contest() TO authenticated;

REVOKE ALL ON FUNCTION public.close_expired_contests() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.close_expired_contests() TO authenticated;
