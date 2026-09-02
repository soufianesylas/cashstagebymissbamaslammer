CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'solo',
  genre text,
  ticket_price_cents integer NOT NULL DEFAULT 200,
  pot_cents integer NOT NULL DEFAULT 0,
  max_entries integer NOT NULL DEFAULT 32,
  status text NOT NULL DEFAULT 'open',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT challenges_kind_chk CHECK (kind IN ('solo','collab','battle','cypher')),
  CONSTRAINT challenges_status_chk CHECK (status IN ('open','voting','closed')),
  CONSTRAINT challenges_title_chk CHECK (char_length(title) BETWEEN 3 AND 80)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges TO authenticated;
GRANT SELECT ON public.challenges TO anon;
GRANT ALL ON public.challenges TO service_role;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Challenges are viewable by everyone" ON public.challenges FOR SELECT USING (true);
CREATE POLICY "Users can create their own challenges" ON public.challenges FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update their challenges" ON public.challenges FOR UPDATE TO authenticated USING (auth.uid() = creator_id OR public.has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = creator_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Creators can delete their challenges" ON public.challenges FOR DELETE TO authenticated USING (auth.uid() = creator_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_challenges_updated BEFORE UPDATE ON public.challenges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.challenge_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  share_code text NOT NULL DEFAULT encode(gen_random_bytes(6),'hex'),
  share_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id),
  UNIQUE (share_code)
);
GRANT SELECT, INSERT, DELETE ON public.challenge_entries TO authenticated;
GRANT SELECT ON public.challenge_entries TO anon;
GRANT ALL ON public.challenge_entries TO service_role;
ALTER TABLE public.challenge_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Entries are viewable by everyone" ON public.challenge_entries FOR SELECT USING (true);
CREATE POLICY "Users can enter with their own track" ON public.challenge_entries FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND t.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.status = 'open' AND now() BETWEEN c.starts_at AND c.ends_at)
);
CREATE POLICY "Users can withdraw their own entry" ON public.challenge_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.rally_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL DEFAULT 200,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rally_amount_chk CHECK (amount_cents > 0)
);
GRANT SELECT, INSERT ON public.rally_tickets TO authenticated;
GRANT ALL ON public.rally_tickets TO service_role;
ALTER TABLE public.rally_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tickets are viewable by signed-in users" ON public.rally_tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can buy their own tickets" ON public.rally_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.add_ticket_to_pot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.challenges
     SET pot_cents = pot_cents + NEW.amount_cents, updated_at = now()
   WHERE id = NEW.challenge_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_add_ticket_to_pot AFTER INSERT ON public.rally_tickets FOR EACH ROW EXECUTE FUNCTION public.add_ticket_to_pot();

CREATE TABLE public.daily_rank_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id uuid REFERENCES public.tracks(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'solo',
  rank_date date NOT NULL DEFAULT CURRENT_DATE,
  amount_cents integer NOT NULL DEFAULT 500,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, rank_date),
  CONSTRAINT payout_category_chk CHECK (category IN ('solo','collab','battle','cypher')),
  CONSTRAINT payout_status_chk CHECK (status IN ('pending','paid','void'))
);
GRANT SELECT ON public.daily_rank_payouts TO authenticated;
GRANT ALL ON public.daily_rank_payouts TO service_role;
ALTER TABLE public.daily_rank_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Payouts are viewable by signed-in users" ON public.daily_rank_payouts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage payouts" ON public.daily_rank_payouts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_payouts_updated BEFORE UPDATE ON public.daily_rank_payouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.bump_entry_share(_entry_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  UPDATE public.challenge_entries
     SET share_count = share_count + 1
   WHERE id = _entry_id
  RETURNING share_count INTO _n;
  IF _n IS NULL THEN RAISE EXCEPTION 'Entry not found'; END IF;
  RETURN _n;
END; $$;

CREATE OR REPLACE FUNCTION public.daily_solo_rank()
RETURNS TABLE(track_id uuid, user_id uuid, title text, plays integer, avg_score numeric, votes bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.user_id, t.title, t.play_count,
         COALESCE(round(avg(ts.score)::numeric,2), 0) AS avg_score,
         count(ts.id)::bigint AS votes
    FROM public.tracks t
    LEFT JOIN public.track_scores ts
      ON ts.track_id = t.id AND ts.score_date = CURRENT_DATE
   WHERE t.is_hidden = false AND t.mode = 'solo'
   GROUP BY t.id, t.user_id, t.title, t.play_count
   ORDER BY avg_score DESC, votes DESC, t.play_count DESC
   LIMIT 25
$$;