
-- Tiers
CREATE TYPE public.tier AS ENUM ('free','platinum','vip');

CREATE TABLE public.subscriptions (
  user_id UUID PRIMARY KEY,
  tier public.tier NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active', -- active | past_due | canceled
  current_period_end TIMESTAMPTZ,
  daily_drops INTEGER NOT NULL DEFAULT 3,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own subscription" ON public.subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage subscriptions" ON public.subscriptions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_subs_updated BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create free sub on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, tier, daily_drops)
  VALUES (NEW.id, 'free', 3) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_subscription() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- Backfill existing users
INSERT INTO public.subscriptions (user_id, tier, daily_drops)
SELECT id, 'free', 3 FROM auth.users
ON CONFLICT DO NOTHING;

-- Helper: get tier
CREATE OR REPLACE FUNCTION public.user_tier(_user_id UUID)
RETURNS public.tier LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT tier FROM public.subscriptions WHERE user_id = _user_id), 'free'::public.tier);
$$;
REVOKE EXECUTE ON FUNCTION public.user_tier(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_tier(UUID) TO authenticated;

-- Free-user limit: 1 weekly contest per ISO week
CREATE OR REPLACE FUNCTION public.enforce_free_weekly_limit()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  _tier public.tier;
  _entries INT;
  _week_start DATE;
BEGIN
  _tier := public.user_tier(NEW.user_id);
  IF _tier <> 'free' THEN RETURN NEW; END IF;

  SELECT week_start INTO _week_start FROM public.weekly_contests WHERE id = NEW.contest_id;
  SELECT COUNT(*) INTO _entries
  FROM public.weekly_contest_entries e
  JOIN public.weekly_contests c ON c.id = e.contest_id
  WHERE e.user_id = NEW.user_id
    AND date_trunc('week', c.week_start) = date_trunc('week', _week_start);

  IF _entries >= 1 THEN
    RAISE EXCEPTION 'Free accounts can only enter one weekly contest per week. Upgrade to Platinum or VIP for unlimited entries.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_free_weekly_limit
  BEFORE INSERT ON public.weekly_contest_entries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_free_weekly_limit();
