-- ============================================================
-- Fix: allow sender to re-activate a declined connection request
--
-- The unique constraint on (sender_id, receiver_id) means a declined
-- request blocks any future re-request via INSERT. We give the sender
-- an UPDATE path: they can flip their own declined row back to pending.
-- The WITH CHECK clause ensures they can only move it TO 'pending'.
-- ============================================================

create policy "Sender can re-activate declined request"
  on public.connection_requests for update
  to authenticated
  using  (auth.uid() = sender_id and status = 'declined')
  with check (status = 'pending');
