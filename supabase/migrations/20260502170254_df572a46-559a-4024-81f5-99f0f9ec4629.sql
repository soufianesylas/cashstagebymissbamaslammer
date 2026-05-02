CREATE OR REPLACE FUNCTION public.prevent_csb_balance_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.csb_balance IS DISTINCT FROM OLD.csb_balance THEN
    NEW.csb_balance := OLD.csb_balance;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_csb_balance_change ON public.profiles;

CREATE TRIGGER profiles_prevent_csb_balance_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_csb_balance_change();

REVOKE UPDATE (csb_balance) ON public.profiles FROM anon, authenticated;