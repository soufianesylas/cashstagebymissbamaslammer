
-- ============ Beat of the Day eligibility ============

-- Block creating contests on weekends
CREATE OR REPLACE FUNCTION public.enforce_weekday_contest()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXTRACT(ISODOW FROM NEW.contest_date) > 5 THEN
    RAISE EXCEPTION 'Beat of the Day contests only run Mon–Fri';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_weekday_contest
  BEFORE INSERT OR UPDATE OF contest_date ON public.daily_contests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_weekday_contest();

-- Director picks only while contest is "open"
CREATE OR REPLACE FUNCTION public.enforce_entry_window()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _status TEXT;
BEGIN
  SELECT status INTO _status FROM public.daily_contests WHERE id = NEW.contest_id;
  IF _status IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION 'Director picks can only be added while the contest is open (current: %)', _status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_entry_window
  BEFORE INSERT ON public.contest_entries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_entry_window();

-- Votes only during "voting" status AND before 11:59 PM of the contest date
CREATE OR REPLACE FUNCTION public.enforce_vote_window()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  _status TEXT;
  _date DATE;
BEGIN
  SELECT status, contest_date INTO _status, _date
  FROM public.daily_contests WHERE id = NEW.contest_id;

  IF _status IS DISTINCT FROM 'voting' THEN
    RAISE EXCEPTION 'Voting is not open (status: %)', _status;
  END IF;
  IF (now() AT TIME ZONE 'UTC')::date > _date THEN
    RAISE EXCEPTION 'Voting cutoff has passed for %', _date;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_vote_window
  BEFORE INSERT ON public.contest_votes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_vote_window();

-- Helper: open today's contest (admin/mod only)
CREATE OR REPLACE FUNCTION public.open_todays_contest()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id UUID;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'Only admins or moderators can open contests';
  END IF;
  IF EXTRACT(ISODOW FROM CURRENT_DATE) > 5 THEN
    RAISE EXCEPTION 'No contests on weekends';
  END IF;
  INSERT INTO public.daily_contests (contest_date, status)
  VALUES (CURRENT_DATE, 'open')
  ON CONFLICT (contest_date) DO UPDATE SET status = 'open'
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.open_todays_contest() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_todays_contest() TO authenticated;

-- Helper: close any past or stale contests (safe to run from cron)
CREATE OR REPLACE FUNCTION public.close_expired_contests()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n INTEGER;
BEGIN
  WITH upd AS (
    UPDATE public.daily_contests
    SET status = 'closed'
    WHERE status <> 'closed'
      AND contest_date < CURRENT_DATE
    RETURNING 1
  )
  SELECT COUNT(*) INTO _n FROM upd;
  RETURN _n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.close_expired_contests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_expired_contests() TO authenticated;

-- ============ Weekly contests ($500 prize) ============

CREATE TABLE public.weekly_contests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL UNIQUE,
  prize_usd_cents INTEGER NOT NULL DEFAULT 50000,
  submissions_open_at TIMESTAMPTZ NOT NULL,
  submissions_close_at TIMESTAMPTZ NOT NULL,
  voting_open_at TIMESTAMPTZ NOT NULL,
  voting_close_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'submissions', -- submissions | voting | closed
  winner_user_id UUID,
  payout_status TEXT NOT NULL DEFAULT 'pending', -- pending | processing | paid | failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_contests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Weekly contests viewable by everyone"
  ON public.weekly_contests FOR SELECT USING (true);

CREATE POLICY "Admins/mods manage weekly contests"
  ON public.weekly_contests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE TRIGGER trg_weekly_contests_updated
  BEFORE UPDATE ON public.weekly_contests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.weekly_contest_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL REFERENCES public.weekly_contests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contest_id, user_id)
);

ALTER TABLE public.weekly_contest_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Weekly entries viewable by everyone"
  ON public.weekly_contest_entries FOR SELECT USING (true);

CREATE POLICY "Users submit own entries"
  ON public.weekly_contest_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own entries"
  ON public.weekly_contest_entries FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Enforce submission window + status
CREATE OR REPLACE FUNCTION public.enforce_weekly_submission_window()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _open TIMESTAMPTZ; _close TIMESTAMPTZ; _status TEXT;
BEGIN
  SELECT submissions_open_at, submissions_close_at, status
    INTO _open, _close, _status
    FROM public.weekly_contests WHERE id = NEW.contest_id;
  IF _status IS DISTINCT FROM 'submissions' THEN
    RAISE EXCEPTION 'Submissions are not open (status: %)', _status;
  END IF;
  IF now() < _open OR now() > _close THEN
    RAISE EXCEPTION 'Outside submission window (% to %)', _open, _close;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_weekly_submission_window
  BEFORE INSERT ON public.weekly_contest_entries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_weekly_submission_window();
