-- ============================================================
-- Fix: allow a connection participant to initialise read status
-- for BOTH users when a connection is first created.
--
-- The original INSERT policy only allowed each user to write their
-- own row (auth.uid() = user_id). This meant acceptConnectionRequest()
-- could only upsert one row; the batch of two failed entirely.
-- The new policy allows either participant to write for both parties,
-- restricted to rows where user_id is one of the two connection members.
-- ============================================================

create policy "Connection participants can initialise read status"
  on public.message_read_status for insert
  to authenticated
  with check (
    exists (
      select 1 from public.connections c
      where c.id = connection_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
        and (user_id = c.user_a or user_id = c.user_b)
    )
  );
