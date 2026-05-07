
-- 1. Weekly contest entry ownership
DROP POLICY IF EXISTS "Users submit own entries" ON public.weekly_contest_entries;
CREATE POLICY "Users submit own entries"
  ON public.weekly_contest_entries FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.tracks WHERE id = track_id AND user_id = auth.uid())
  );

-- 2. Beat self-approval prevention
DROP POLICY IF EXISTS "Producers can update own beats" ON public.contest_beats;
CREATE POLICY "Producers can update own beats"
  ON public.contest_beats FOR UPDATE TO authenticated
  USING (auth.uid() = producer_id)
  WITH CHECK (auth.uid() = producer_id AND approved = false);

-- 3. Block client mutations on subscriptions
CREATE POLICY "Block client inserts on subscriptions"
  ON public.subscriptions AS RESTRICTIVE FOR INSERT TO anon, authenticated
  WITH CHECK (false);
CREATE POLICY "Block client updates on subscriptions"
  ON public.subscriptions AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);
CREATE POLICY "Block client deletes on subscriptions"
  ON public.subscriptions AS RESTRICTIVE FOR DELETE TO anon, authenticated
  USING (false);

-- 4. Realtime channel authorization for chat
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can receive chat events for allowed rooms" ON realtime.messages;
CREATE POLICY "Authenticated can receive chat events for allowed rooms"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chatrooms r
      WHERE r.id::text = realtime.topic()
        AND (r.kind = 'public' OR (r.kind = 'crew' AND public.is_crew_member(r.crew_id, auth.uid())))
    )
    OR realtime.topic() NOT IN (SELECT id::text FROM public.chatrooms)
  );

-- 5. close_expired_contests admin/mod check
CREATE OR REPLACE FUNCTION public.close_expired_contests()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _n INTEGER;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'Only admins or moderators can close contests';
  END IF;
  WITH upd AS (
    UPDATE public.daily_contests
    SET status = 'closed'
    WHERE status <> 'closed' AND contest_date < CURRENT_DATE
    RETURNING 1
  )
  SELECT COUNT(*) INTO _n FROM upd;
  RETURN _n;
END;
$$;

-- 6. tracks.audio_path must be in owner's folder
ALTER TABLE public.tracks DROP CONSTRAINT IF EXISTS tracks_audio_path_owner;
ALTER TABLE public.tracks
  ADD CONSTRAINT tracks_audio_path_owner
  CHECK (audio_path LIKE (user_id::text || '/%'));

-- 7. contest_beats.audio_path must be in producer's folder
ALTER TABLE public.contest_beats DROP CONSTRAINT IF EXISTS contest_beats_audio_path_owner;
ALTER TABLE public.contest_beats
  ADD CONSTRAINT contest_beats_audio_path_owner
  CHECK (audio_path LIKE (producer_id::text || '/%'));

-- 8. crew_members role escalation guard
DROP POLICY IF EXISTS "Leader can change roles" ON public.crew_members;
CREATE POLICY "Leader can change roles"
  ON public.crew_members FOR UPDATE TO authenticated
  USING (public.crew_role(crew_id, auth.uid()) = 'leader')
  WITH CHECK (
    public.crew_role(crew_id, auth.uid()) = 'leader'
    AND role IN ('member', 'admin', 'leader')
  );
