create extension if not exists pgcrypto;

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_requests_from_user_not_self check (from_user <> to_user),
  constraint friend_requests_status_valid check (status in ('pending', 'accepted', 'declined', 'cancelled'))
);

create index if not exists friend_requests_to_user_status_idx
  on public.friend_requests (to_user, status);

create index if not exists friend_requests_from_user_status_idx
  on public.friend_requests (from_user, status);

create unique index if not exists friend_requests_unique_pending_idx
  on public.friend_requests (from_user, to_user)
  where status = 'pending';

drop trigger if exists set_friend_requests_updated_at on public.friend_requests;
create trigger set_friend_requests_updated_at
  before update on public.friend_requests
  for each row execute function public.set_updated_at();

alter table public.friend_requests enable row level security;

drop policy if exists "Friend requests are viewable by participants" on public.friend_requests;
create policy "Friend requests are viewable by participants"
  on public.friend_requests
  for select
  to authenticated
  using (from_user = auth.uid() or to_user = auth.uid());

drop policy if exists "Users can send friend requests" on public.friend_requests;
create policy "Users can send friend requests"
  on public.friend_requests
  for insert
  to authenticated
  with check (from_user = auth.uid() and to_user <> auth.uid());

drop policy if exists "Receivers can respond to friend requests" on public.friend_requests;
create policy "Receivers can respond to friend requests"
  on public.friend_requests
  for update
  to authenticated
  using (to_user = auth.uid())
  with check (to_user = auth.uid() and status in ('accepted', 'declined'));

drop policy if exists "Senders can cancel friend requests" on public.friend_requests;
create policy "Senders can cancel friend requests"
  on public.friend_requests
  for update
  to authenticated
  using (from_user = auth.uid())
  with check (from_user = auth.uid() and status = 'cancelled');

create table if not exists public.friends (
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint friends_user_order check (user_a < user_b),
  primary key (user_a, user_b)
);

create index if not exists friends_user_a_idx
  on public.friends (user_a);

create index if not exists friends_user_b_idx
  on public.friends (user_b);

alter table public.friends enable row level security;

drop policy if exists "Friends are viewable by participants" on public.friends;
create policy "Friends are viewable by participants"
  on public.friends
  for select
  to authenticated
  using (user_a = auth.uid() or user_b = auth.uid());

drop policy if exists "Users can create friendships for themselves" on public.friends;
create policy "Users can create friendships for themselves"
  on public.friends
  for insert
  to authenticated
  with check (user_a = auth.uid() or user_b = auth.uid());

drop policy if exists "Users can remove their friendships" on public.friends;
create policy "Users can remove their friendships"
  on public.friends
  for delete
  to authenticated
  using (user_a = auth.uid() or user_b = auth.uid());
