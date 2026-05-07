CREATE OR REPLACE FUNCTION public.anonymous_track_score_tallies()
RETURNS TABLE (
  track_id uuid,
  score_count bigint,
  average_score numeric,
  feature_worthy_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ts.track_id,
    count(*)::bigint AS score_count,
    round(avg(ts.score)::numeric, 2) AS average_score,
    count(*) FILTER (WHERE ts.feature_worthy IS TRUE)::bigint AS feature_worthy_count
  FROM public.track_scores ts
  GROUP BY ts.track_id
$$;

REVOKE ALL ON FUNCTION public.anonymous_track_score_tallies() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.anonymous_track_score_tallies() TO authenticated;

CREATE OR REPLACE FUNCTION public.boosted_track_order()
RETURNS TABLE (
  track_id uuid,
  boost_rank bigint,
  boosted_plays_remaining bigint,
  boosted_votes_remaining bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    tb.track_id,
    sum(GREATEST(tb.plays_remaining, 0) + GREATEST(tb.votes_remaining, 0))::bigint AS boost_rank,
    sum(GREATEST(tb.plays_remaining, 0))::bigint AS boosted_plays_remaining,
    sum(GREATEST(tb.votes_remaining, 0))::bigint AS boosted_votes_remaining
  FROM public.track_boosts tb
  WHERE tb.plays_remaining > 0 OR tb.votes_remaining > 0
  GROUP BY tb.track_id
$$;

REVOKE ALL ON FUNCTION public.boosted_track_order() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.boosted_track_order() TO anon, authenticated;