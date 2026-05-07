
-- 1. Trigger-level guard: non-admin/mod cannot modify approved column
CREATE OR REPLACE FUNCTION public.prevent_beat_self_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approved IS DISTINCT FROM OLD.approved THEN
    IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
      RAISE EXCEPTION 'Only admins or moderators can change beat approval status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_beat_self_approval ON public.contest_beats;
CREATE TRIGGER trg_prevent_beat_self_approval
  BEFORE UPDATE ON public.contest_beats
  FOR EACH ROW EXECUTE FUNCTION public.prevent_beat_self_approval();

-- 2. Realtime channel authorization for crew chat
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can receive chat events for allowed rooms" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can read realtime for allowed rooms" ON realtime.messages;

-- Allow authenticated users to receive realtime events only for chatroom topics
-- they are permitted to read (public rooms or crew rooms they belong to).
-- Non-chatroom topics (other tables' postgres_changes broadcasts) remain allowed.
CREATE POLICY "Authenticated can read realtime for allowed rooms"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    NOT EXISTS (SELECT 1 FROM public.chatrooms r WHERE r.id::text = realtime.topic())
    OR EXISTS (
      SELECT 1 FROM public.chatrooms r
      WHERE r.id::text = realtime.topic()
        AND (r.kind = 'public' OR (r.kind = 'crew' AND public.is_crew_member(r.crew_id, auth.uid())))
    )
  );
