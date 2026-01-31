create table if not exists public.leaderboards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  sport text not null,
  created_at timestamptz not null default now(),
  constraint leaderboards_sport_check check (sport in ('tennis', 'padel', 'badminton'))
);

create table if not exists public.leaderboard_members (
  leaderboard_id uuid not null references public.leaderboards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (leaderboard_id, user_id)
);

alter table public.leaderboards enable row level security;

alter table public.leaderboard_members enable row level security;

drop policy if exists "Leaderboards are viewable by members" on public.leaderboards;
create policy "Leaderboards are viewable by members"
  on public.leaderboards
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.leaderboard_members
      where leaderboard_members.leaderboard_id = leaderboards.id
        and leaderboard_members.user_id = auth.uid()
    )
  );

drop policy if exists "Owners can insert leaderboards" on public.leaderboards;
create policy "Owners can insert leaderboards"
  on public.leaderboards
  for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Owners can update leaderboards" on public.leaderboards;
create policy "Owners can update leaderboards"
  on public.leaderboards
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Owners can delete leaderboards" on public.leaderboards;
create policy "Owners can delete leaderboards"
  on public.leaderboards
  for delete
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Leaderboard members are viewable by members" on public.leaderboard_members;
create policy "Leaderboard members are viewable by members"
  on public.leaderboard_members
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.leaderboard_members as membership
      where membership.leaderboard_id = leaderboard_members.leaderboard_id
        and membership.user_id = auth.uid()
    )
  );

drop policy if exists "Owners can add leaderboard members" on public.leaderboard_members;
create policy "Owners can add leaderboard members"
  on public.leaderboard_members
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.leaderboards
      where leaderboards.id = leaderboard_members.leaderboard_id
        and leaderboards.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners can remove leaderboard members" on public.leaderboard_members;
create policy "Owners can remove leaderboard members"
  on public.leaderboard_members
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.leaderboards
      where leaderboards.id = leaderboard_members.leaderboard_id
        and leaderboards.owner_id = auth.uid()
    )
  );
