-- ============================================================
-- Fix: add INSERT policy for the connections table
--
-- The original schema had no INSERT policy ("handled by Edge Function")
-- but no Edge Function or trigger was ever created. Client-side accepts
-- via acceptConnectionRequest() were silently blocked by RLS, leaving
-- connection_requests.status = 'accepted' with no matching connections row.
-- ============================================================

drop policy if exists "Users can create connections they are part of" on public.connections;

create policy "Users can create connections they are part of"
  on public.connections for insert
  to authenticated
  with check (auth.uid() = user_a or auth.uid() = user_b);
