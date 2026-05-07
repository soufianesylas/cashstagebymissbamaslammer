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

REVOKE ALL ON FUNCTION public.anonymous_track_score_tallies() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.anonymous_track_score_tallies() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.boosted_track_order()
RETURNS TABLE (
  track_id uuid,
  boost_rank bigint,
  boosted_plays_remaining bigint,
  boosted_votes_remaining bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.consume_boost_vote(_track_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _boost_id uuid;
BEGIN
  SELECT id INTO _boost_id
  FROM public.track_boosts
  WHERE track_id = _track_id
    AND votes_remaining > 0
  ORDER BY created_at ASC
  LIMIT 1;

  IF _boost_id IS NOT NULL THEN
    UPDATE public.track_boosts
    SET votes_remaining = GREATEST(votes_remaining - 1, 0),
        updated_at = now()
    WHERE id = _boost_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_boost_vote(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_boost_vote(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.consume_boost_play(_track_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _boost_id uuid;
BEGIN
  SELECT id INTO _boost_id
  FROM public.track_boosts
  WHERE track_id = _track_id
    AND plays_remaining > 0
  ORDER BY created_at ASC
  LIMIT 1;

  IF _boost_id IS NOT NULL THEN
    UPDATE public.track_boosts
    SET plays_remaining = GREATEST(plays_remaining - 1, 0),
        updated_at = now()
    WHERE id = _boost_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_boost_play(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_boost_play(uuid) TO authenticated;