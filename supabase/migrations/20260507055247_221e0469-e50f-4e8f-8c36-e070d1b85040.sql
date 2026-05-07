
ALTER TABLE public.track_scores
  ADD COLUMN IF NOT EXISTS feature_worthy BOOLEAN,
  ADD COLUMN IF NOT EXISTS favorite_bars TEXT,
  ADD COLUMN IF NOT EXISTS needs_improvement TEXT,
  ADD COLUMN IF NOT EXISTS fully_listened BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reward_paid BOOLEAN NOT NULL DEFAULT false;

-- Enforce length limits on free-text answers and daily 250 cap
CREATE OR REPLACE FUNCTION public.validate_track_score()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  _owner UUID;
  _today_count INT;
BEGIN
  IF NEW.score < 1 OR NEW.score > 10 THEN
    RAISE EXCEPTION 'Score must be between 1 and 10';
  END IF;
  SELECT user_id INTO _owner FROM public.tracks WHERE id = NEW.track_id;
  IF _owner = NEW.judge_id THEN
    RAISE EXCEPTION 'You cannot score your own track';
  END IF;
  IF length(coalesce(NEW.favorite_bars, '')) > 500 THEN
    RAISE EXCEPTION 'favorite_bars too long (max 500)';
  END IF;
  IF length(coalesce(NEW.needs_improvement, '')) > 500 THEN
    RAISE EXCEPTION 'needs_improvement too long (max 500)';
  END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT COUNT(*) INTO _today_count FROM public.track_scores
      WHERE judge_id = NEW.judge_id AND score_date = NEW.score_date;
    IF _today_count >= 250 THEN
      RAISE EXCEPTION 'Daily judging limit reached (250)';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

-- Pay 1 CSB to judges who fully listen to a track (first time only)
CREATE OR REPLACE FUNCTION public.pay_listen_reward()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.fully_listened = true AND NEW.reward_paid = false THEN
    UPDATE public.wallets
       SET csb_balance = csb_balance + 1, updated_at = now()
     WHERE user_id = NEW.judge_id;
    NEW.reward_paid = true;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.pay_listen_reward() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_pay_listen_reward ON public.track_scores;
CREATE TRIGGER trg_pay_listen_reward
  BEFORE INSERT ON public.track_scores
  FOR EACH ROW EXECUTE FUNCTION public.pay_listen_reward();
