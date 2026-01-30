create extension if not exists pgcrypto;

create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null,
  platform text not null,
  device_id text null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint device_push_tokens_platform_check check (platform in ('ios', 'android', 'web')),
  constraint device_push_tokens_expo_push_token_unique unique (expo_push_token)
);

create index if not exists device_push_tokens_user_id_idx
  on public.device_push_tokens (user_id);

drop trigger if exists device_push_tokens_set_updated_at on public.device_push_tokens;
create trigger device_push_tokens_set_updated_at
  before update on public.device_push_tokens
  for each row execute function public.set_updated_at();

alter table public.device_push_tokens enable row level security;

drop policy if exists "Device push tokens are viewable by owner" on public.device_push_tokens;
create policy "Device push tokens are viewable by owner"
  on public.device_push_tokens
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Device push tokens insert by owner" on public.device_push_tokens;
create policy "Device push tokens insert by owner"
  on public.device_push_tokens
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Device push tokens update by owner" on public.device_push_tokens;
create policy "Device push tokens update by owner"
  on public.device_push_tokens
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Device push tokens delete by owner" on public.device_push_tokens;
create policy "Device push tokens delete by owner"
  on public.device_push_tokens
  for delete
  to authenticated
  using (user_id = auth.uid());

create or replace function public.notify_friend_request_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient_has_tokens boolean;
begin
  if new.status <> 'pending' then
    return new;
  end if;

  if new.to_user = new.from_user then
    return new;
  end if;

  select exists(
    select 1
    from public.device_push_tokens
    where user_id = new.to_user
      and enabled
  ) into recipient_has_tokens;

  if not recipient_has_tokens then
    return new;
  end if;

  perform supabase_functions.http_request(
    'POST',
    concat(current_setting('supabase_functions.url'), '/push-notify'),
    jsonb_build_object('Content-Type', 'application/json'),
    jsonb_build_object(
      'event_type', 'friend_request',
      'recipient_user_id', new.to_user,
      'actor_user_id', new.from_user,
      'request_id', new.id
    ),
    1000
  );

  return new;
end;
$$;

create or replace function public.notify_match_confirmation_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient_has_tokens boolean;
  match_reporter uuid;
begin
  if new.status <> 'pending' then
    return new;
  end if;

  select reported_by
    into match_reporter
    from public.matches
    where id = new.match_id;

  if match_reporter is null then
    return new;
  end if;

  if match_reporter = new.user_id then
    return new;
  end if;

  select exists(
    select 1
    from public.device_push_tokens
    where user_id = new.user_id
      and enabled
  ) into recipient_has_tokens;

  if not recipient_has_tokens then
    return new;
  end if;

  perform supabase_functions.http_request(
    'POST',
    concat(current_setting('supabase_functions.url'), '/push-notify'),
    jsonb_build_object('Content-Type', 'application/json'),
    jsonb_build_object(
      'event_type', 'match_confirmation',
      'recipient_user_id', new.user_id,
      'actor_user_id', match_reporter,
      'match_id', new.match_id
    ),
    1000
  );

  return new;
end;
$$;

drop trigger if exists friend_request_push_notify on public.friend_requests;
create trigger friend_request_push_notify
  after insert on public.friend_requests
  for each row execute function public.notify_friend_request_push();

drop trigger if exists match_confirmation_push_notify on public.match_confirmations;
create trigger match_confirmation_push_notify
  after insert on public.match_confirmations
  for each row execute function public.notify_match_confirmation_push();
