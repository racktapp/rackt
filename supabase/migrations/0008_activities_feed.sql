create extension if not exists pgcrypto;

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  entity_type text not null,
  entity_id uuid null,
  metadata jsonb not null default '{}'::jsonb,
  constraint activities_type_check check (type in ('match_confirmed', 'friend_added', 'rating_updated')),
  constraint activities_entity_type_check check (entity_type in ('match', 'friendship', 'rating'))
);

create index if not exists activities_created_at_idx
  on public.activities (created_at desc);

create index if not exists activities_actor_created_at_idx
  on public.activities (actor_user_id, created_at desc);

alter table public.activities enable row level security;

drop policy if exists "Activities are viewable by friends" on public.activities;
create policy "Activities are viewable by friends"
  on public.activities
  for select
  to authenticated
  using (
    actor_user_id = auth.uid()
    or exists (
      select 1
      from public.friends f
      where (f.user_a = auth.uid() and f.user_b = activities.actor_user_id)
         or (f.user_b = auth.uid() and f.user_a = activities.actor_user_id)
    )
  );

create or replace function public.log_friend_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  friend_id uuid;
begin
  actor_id := coalesce(auth.uid(), new.user_a);
  friend_id := case
    when actor_id = new.user_a then new.user_b
    when actor_id = new.user_b then new.user_a
    else new.user_b
  end;

  insert into public.activities (
    actor_user_id,
    type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    actor_id,
    'friend_added',
    'friendship',
    null,
    jsonb_build_object('friendUserId', friend_id)
  );

  return new;
end;
$$;

drop trigger if exists log_friend_activity on public.friends;
create trigger log_friend_activity
  after insert on public.friends
  for each row
  execute function public.log_friend_activity();

create or replace function public.log_match_confirmation_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  match_sport text;
begin
  if new.status = 'confirmed' and old.status is distinct from new.status then
    select sport into match_sport
    from public.matches
    where id = new.match_id;

    insert into public.activities (
      actor_user_id,
      type,
      entity_type,
      entity_id,
      metadata
    )
    values (
      new.user_id,
      'match_confirmed',
      'match',
      new.match_id,
      jsonb_build_object('matchId', new.match_id, 'sport', match_sport)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists log_match_confirmation_activity on public.match_confirmations;
create trigger log_match_confirmation_activity
  after update on public.match_confirmations
  for each row
  execute function public.log_match_confirmation_activity();

create or replace function public.log_rating_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activities (
    actor_user_id,
    type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    new.user_id,
    'rating_updated',
    'rating',
    new.id,
    jsonb_build_object(
      'sport', new.sport,
      'newLevel', new.level_after,
      'delta', new.delta
    )
  );

  return new;
end;
$$;

drop trigger if exists log_rating_activity on public.sport_rating_history;
create trigger log_rating_activity
  after insert on public.sport_rating_history
  for each row
  execute function public.log_rating_activity();
