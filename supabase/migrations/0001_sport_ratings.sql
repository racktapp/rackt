create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.sport_ratings (
  user_id uuid not null references auth.users(id) on delete cascade,
  sport text not null,
  level numeric not null default 3.0,
  reliability int not null default 20,
  source text not null default 'system',
  matches_competitive int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, sport),
  constraint sport_ratings_level_range check (level >= 0 and level <= 7),
  constraint sport_ratings_reliability_range check (reliability >= 0 and reliability <= 100),
  constraint sport_ratings_sport_check check (sport in ('tennis', 'padel', 'badminton', 'table_tennis'))
);

create table if not exists public.sport_rating_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sport text not null,
  match_id uuid null,
  level_before numeric not null,
  level_after numeric not null,
  delta numeric not null,
  reliability_after int not null,
  created_at timestamptz not null default now(),
  constraint sport_rating_history_sport_check check (sport in ('tennis', 'padel', 'badminton', 'table_tennis')),
  constraint sport_rating_history_level_before_range check (level_before >= 0 and level_before <= 7),
  constraint sport_rating_history_level_after_range check (level_after >= 0 and level_after <= 7),
  constraint sport_rating_history_reliability_range check (reliability_after >= 0 and reliability_after <= 100)
);

drop trigger if exists sport_ratings_set_updated_at on public.sport_ratings;
create trigger sport_ratings_set_updated_at
before update on public.sport_ratings
for each row
execute function public.set_updated_at();

alter table public.sport_ratings enable row level security;

alter table public.sport_rating_history enable row level security;

drop policy if exists "Sport ratings are viewable by authenticated users" on public.sport_ratings;
create policy "Sport ratings are viewable by authenticated users"
on public.sport_ratings
for select
to authenticated
using (true);

drop policy if exists "Sport ratings can be inserted by owner" on public.sport_ratings;
create policy "Sport ratings can be inserted by owner"
on public.sport_ratings
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Sport ratings can be updated by owner" on public.sport_ratings;
create policy "Sport ratings can be updated by owner"
on public.sport_ratings
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Sport rating history is viewable by authenticated users" on public.sport_rating_history;
create policy "Sport rating history is viewable by authenticated users"
on public.sport_rating_history
for select
to authenticated
using (true);

drop policy if exists "Sport rating history can be inserted by owner" on public.sport_rating_history;
create policy "Sport rating history can be inserted by owner"
on public.sport_rating_history
for insert
to authenticated
with check (user_id = auth.uid());
