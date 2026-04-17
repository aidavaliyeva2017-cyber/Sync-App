-- ============================================================
-- Sync App — Initial Schema Migration
-- Run this file in the Supabase SQL editor to set up the database.
-- ============================================================

-- Enable required extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. PROFILES
-- ============================================================
create table if not exists public.profiles (
  id                  uuid        primary key references auth.users(id) on delete cascade,
  full_name           text        not null,
  username            text        not null unique,
  avatar_url          text,
  age                 integer     not null check (age >= 16),
  city                text        not null,
  country             text        not null,
  major               text        not null,
  university          text,
  interests           text[]      not null check (array_length(interests, 1) = 3),
  projects            text,
  linkedin_url        text,
  is_verified         boolean     not null default false,
  verification_email  text,
  expo_push_token     text,
  onboarding_complete boolean     not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Indexes on profiles
create unique index if not exists profiles_username_idx on public.profiles (username);
create index if not exists profiles_city_idx on public.profiles (city);
create index if not exists profiles_major_idx on public.profiles (major);
create index if not exists profiles_interests_idx on public.profiles using gin (interests);
create index if not exists profiles_onboarding_idx on public.profiles (onboarding_complete);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- 2. CONNECTIONS
-- ============================================================
create table if not exists public.connections (
  id         uuid        primary key default gen_random_uuid(),
  user_a     uuid        not null references public.profiles(id) on delete cascade,
  user_b     uuid        not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint connections_unique unique (user_a, user_b),
  constraint connections_ordering check (user_a < user_b)
);

create index if not exists connections_user_a_idx on public.connections (user_a);
create index if not exists connections_user_b_idx on public.connections (user_b);

-- ============================================================
-- 3. CONNECTION_REQUESTS
-- ============================================================
create table if not exists public.connection_requests (
  id          uuid        primary key default gen_random_uuid(),
  sender_id   uuid        not null references public.profiles(id) on delete cascade,
  receiver_id uuid        not null references public.profiles(id) on delete cascade,
  intro_note  text        check (char_length(intro_note) <= 200),
  status      text        not null default 'pending'
                          check (status in ('pending', 'accepted', 'declined')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint connection_requests_unique unique (sender_id, receiver_id),
  constraint connection_requests_no_self check (sender_id != receiver_id)
);

create index if not exists conn_req_receiver_pending_idx
  on public.connection_requests (receiver_id)
  where status = 'pending';

create index if not exists conn_req_sender_pending_idx
  on public.connection_requests (sender_id)
  where status = 'pending';

create trigger connection_requests_updated_at
  before update on public.connection_requests
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- 4. MESSAGES
-- ============================================================
create table if not exists public.messages (
  id            uuid        primary key default gen_random_uuid(),
  connection_id uuid        not null references public.connections(id) on delete cascade,
  sender_id     uuid        not null references public.profiles(id) on delete cascade,
  content       text        not null check (char_length(content) <= 2000),
  created_at    timestamptz not null default now()
);

create index if not exists messages_connection_created_idx
  on public.messages (connection_id, created_at desc);

create index if not exists messages_sender_idx
  on public.messages (sender_id);

-- ============================================================
-- 5. MESSAGE_READ_STATUS
-- ============================================================
create table if not exists public.message_read_status (
  id            uuid        primary key default gen_random_uuid(),
  connection_id uuid        not null references public.connections(id) on delete cascade,
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  last_read_at  timestamptz not null,
  constraint message_read_status_unique unique (connection_id, user_id)
);

-- ============================================================
-- 6. NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  type         text        not null
                           check (type in (
                             'connection_request',
                             'connection_accepted',
                             'new_message',
                             'new_match'
                           )),
  title        text        not null,
  body         text        not null,
  reference_id uuid,
  is_read      boolean     not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id)
  where is_read = false;

-- ============================================================
-- 7. MATCH_SUGGESTIONS
-- ============================================================
create table if not exists public.match_suggestions (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references public.profiles(id) on delete cascade,
  suggested_user_id uuid        not null references public.profiles(id) on delete cascade,
  score             float       not null check (score >= 0 and score <= 1),
  reason            text,
  shown_at          date        not null default current_date,
  was_acted_on      boolean     not null default false,
  created_at        timestamptz not null default now(),
  constraint match_suggestions_unique unique (user_id, suggested_user_id, shown_at)
);

create index if not exists match_suggestions_user_date_idx
  on public.match_suggestions (user_id, shown_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
alter table public.profiles           enable row level security;
alter table public.connections         enable row level security;
alter table public.connection_requests enable row level security;
alter table public.messages            enable row level security;
alter table public.message_read_status enable row level security;
alter table public.notifications       enable row level security;
alter table public.match_suggestions   enable row level security;

-- ---- profiles ----
create policy "Authenticated users can read all profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Users can delete their own profile"
  on public.profiles for delete
  to authenticated
  using (auth.uid() = id);

-- ---- connections ----
create policy "Users can read their own connections"
  on public.connections for select
  to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);

create policy "Users can delete their own connections"
  on public.connections for delete
  to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);

-- INSERT for connections is handled by Edge Function / database trigger only

-- ---- connection_requests ----
create policy "Users can read their own requests"
  on public.connection_requests for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send requests as sender"
  on public.connection_requests for insert
  to authenticated
  with check (auth.uid() = sender_id);

create policy "Receiver can update request status"
  on public.connection_requests for update
  to authenticated
  using (auth.uid() = receiver_id);

create policy "Sender can delete pending request"
  on public.connection_requests for delete
  to authenticated
  using (auth.uid() = sender_id and status = 'pending');

-- ---- messages ----
create policy "Users can read messages in their connections"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.connections c
      where c.id = connection_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

create policy "Users can send messages in their connections"
  on public.messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.connections c
      where c.id = connection_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

-- ---- message_read_status ----
create policy "Users can read their own read status"
  on public.message_read_status for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can upsert their own read status"
  on public.message_read_status for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own read status"
  on public.message_read_status for update
  to authenticated
  using (auth.uid() = user_id);

-- ---- notifications ----
create policy "Users can read their own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can mark notifications as read"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id);

-- INSERT is via Edge Functions (service role key), no user INSERT policy needed

-- ---- match_suggestions ----
create policy "Users can read their own match suggestions"
  on public.match_suggestions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can update was_acted_on on their suggestions"
  on public.match_suggestions for update
  to authenticated
  using (auth.uid() = user_id);

-- INSERT is via Edge Function (service role key)

-- ============================================================
-- STORAGE — avatars bucket
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Authenticated users can read avatars"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars');

create policy "Users can upload to their own avatar folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
