-- 1. Move csb_balance to a private wallets table
CREATE TABLE public.wallets (
  user_id uuid PRIMARY KEY,
  csb_balance integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wallet"
  ON public.wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies => only SECURITY DEFINER functions can write

-- Backfill existing balances
INSERT INTO public.wallets (user_id, csb_balance)
SELECT id, csb_balance FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- Drop balance column and trigger from profiles
DROP TRIGGER IF EXISTS profiles_prevent_csb_balance_change ON public.profiles;
DROP FUNCTION IF EXISTS public.prevent_csb_balance_change();
ALTER TABLE public.profiles DROP COLUMN IF EXISTS csb_balance;

-- Update handle_new_user to also create a wallet row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, artist_name, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'artist_name', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'artist_name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );

  INSERT INTO public.wallets (user_id, csb_balance) VALUES (NEW.id, 0);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'artist');

  RETURN NEW;
END;
$$;

-- 2. Block role self-escalation with RESTRICTIVE policies
CREATE POLICY "Only admins can insert roles"
  ON public.user_roles AS RESTRICTIVE FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
  ON public.user_roles AS RESTRICTIVE FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles AS RESTRICTIVE FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Make track audio files publicly readable (bucket is public; align storage policy)
DROP POLICY IF EXISTS "Audio files are viewable by owner" ON storage.objects;
DROP POLICY IF EXISTS "Audio files are publicly viewable" ON storage.objects;

CREATE POLICY "Audio files are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tracks');