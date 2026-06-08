
-- 1. Rename tier enum value
ALTER TYPE public.tier RENAME VALUE 'platinum' TO 'premium';

-- 2. Extend subscriptions table for Stripe
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS price_id text,
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS free_radio_sends_remaining integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_id ON public.subscriptions(stripe_subscription_id);

-- 3. 18+ flag on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_18_plus boolean NOT NULL DEFAULT false;

-- 4. Enforce daily drops limit per tier
CREATE OR REPLACE FUNCTION public.enforce_daily_drops_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _limit int;
  _count int;
BEGIN
  SELECT daily_drops INTO _limit FROM public.subscriptions WHERE user_id = NEW.user_id;
  IF _limit IS NULL THEN _limit := 3; END IF;

  SELECT COUNT(*) INTO _count
  FROM public.drops
  WHERE user_id = NEW.user_id
    AND created_at >= (now() - interval '24 hours');

  IF _count >= _limit THEN
    RAISE EXCEPTION 'Daily drop limit reached (% per day). Upgrade for more drops.', _limit;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_daily_drops_limit ON public.drops;
CREATE TRIGGER trg_enforce_daily_drops_limit
  BEFORE INSERT ON public.drops
  FOR EACH ROW EXECUTE FUNCTION public.enforce_daily_drops_limit();

-- 5. Helper for server code (webhook) to apply tier from price_id
CREATE OR REPLACE FUNCTION public.apply_subscription_tier(
  _user_id uuid,
  _price_id text,
  _stripe_subscription_id text,
  _stripe_customer_id text,
  _status text,
  _current_period_start timestamptz,
  _current_period_end timestamptz,
  _cancel_at_period_end boolean,
  _environment text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tier public.tier;
  _drops int;
  _radio int;
  _is_active boolean;
BEGIN
  _is_active := _status IN ('active', 'trialing');

  IF NOT _is_active THEN
    _tier := 'free';
    _drops := 3;
    _radio := 0;
  ELSIF _price_id LIKE 'vip_%' THEN
    _tier := 'vip';
    _drops := 5;
    _radio := 1;
  ELSIF _price_id LIKE 'premium_%' THEN
    _tier := 'premium';
    _drops := 4;
    _radio := 1;
  ELSE
    _tier := 'free';
    _drops := 3;
    _radio := 0;
  END IF;

  INSERT INTO public.subscriptions (
    user_id, tier, daily_drops, status,
    stripe_subscription_id, stripe_customer_id, price_id,
    current_period_start, current_period_end, cancel_at_period_end,
    environment, free_radio_sends_remaining
  ) VALUES (
    _user_id, _tier, _drops, _status,
    _stripe_subscription_id, _stripe_customer_id, _price_id,
    _current_period_start, _current_period_end, _cancel_at_period_end,
    _environment, _radio
  )
  ON CONFLICT (user_id) DO UPDATE SET
    tier = EXCLUDED.tier,
    daily_drops = EXCLUDED.daily_drops,
    status = EXCLUDED.status,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    price_id = EXCLUDED.price_id,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    environment = EXCLUDED.environment,
    free_radio_sends_remaining = GREATEST(public.subscriptions.free_radio_sends_remaining, EXCLUDED.free_radio_sends_remaining),
    updated_at = now();
END;
$$;
