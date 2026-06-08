
-- Make contest votes immutable: voters cannot delete or update their votes
CREATE POLICY "Contest votes are immutable - no delete"
ON public.contest_votes AS RESTRICTIVE FOR DELETE
TO anon, authenticated
USING (false);

CREATE POLICY "Contest votes are immutable - no update"
ON public.contest_votes AS RESTRICTIVE FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- Make judging scores immutable on delete (preserve audit trail)
CREATE POLICY "Judging scores cannot be deleted"
ON public.judging_scores AS RESTRICTIVE FOR DELETE
TO anon, authenticated
USING (false);
