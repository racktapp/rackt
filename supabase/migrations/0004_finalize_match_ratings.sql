alter table public.matches
  add column if not exists rating_applied boolean not null default false;

alter table public.matches
  add column if not exists winner_side int not null default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'matches_winner_side_check'
  ) then
    alter table public.matches
      add constraint matches_winner_side_check check (winner_side in (1, 2));
  end if;
end;
$$;

create or replace function public.finalize_match(match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  match_rec public.matches%rowtype;
  team1_level numeric;
  team2_level numeric;
  expected numeric;
  actual numeric;
  base_delta numeric;
  player_rec record;
  player_delta numeric;
  reliability_factor numeric;
  new_level numeric;
  reliability_after int;
begin
  select *
  into match_rec
  from public.matches
  where id = match_id
  for update;

  if not found then
    raise exception 'match not found';
  end if;

  if match_rec.is_ranked is not true then
    raise exception 'match is not ranked';
  end if;

  if match_rec.status = 'disputed' then
    raise exception 'match is disputed';
  end if;

  if match_rec.rating_applied then
    raise exception 'match ratings already applied';
  end if;

  if match_rec.reported_by <> auth.uid() then
    raise exception 'only reporter can finalize match';
  end if;

  if match_rec.winner_side not in (1, 2) then
    raise exception 'winner_side must be 1 or 2';
  end if;

  if exists (
    select 1
    from public.match_confirmations mc
    where mc.match_id = match_id
      and mc.status <> 'confirmed'
  ) then
    raise exception 'not all confirmations are confirmed';
  end if;

  insert into public.sport_ratings (user_id, sport, level, reliability, source, matches_competitive)
  select mp.user_id, match_rec.sport, 3.0, 20, 'system', 0
  from public.match_players mp
  where mp.match_id = match_id
  on conflict (user_id, sport) do nothing;

  select avg(sr.level)
  into team1_level
  from public.match_players mp
  join public.sport_ratings sr
    on sr.user_id = mp.user_id
   and sr.sport = match_rec.sport
  where mp.match_id = match_id
    and mp.side = 1;

  select avg(sr.level)
  into team2_level
  from public.match_players mp
  join public.sport_ratings sr
    on sr.user_id = mp.user_id
   and sr.sport = match_rec.sport
  where mp.match_id = match_id
    and mp.side = 2;

  if team1_level is null or team2_level is null then
    raise exception 'missing team levels';
  end if;

  expected := 1 / (1 + power(10, (-(team1_level - team2_level) / 1.2)));
  actual := case when match_rec.winner_side = 1 then 1 else 0 end;
  base_delta := 0.22 * (actual - expected);

  for player_rec in
    select mp.user_id, mp.side, sr.level, sr.reliability, sr.matches_competitive
    from public.match_players mp
    join public.sport_ratings sr
      on sr.user_id = mp.user_id
     and sr.sport = match_rec.sport
    where mp.match_id = match_id
    for update
  loop
    reliability_factor := case
      when player_rec.reliability < 40 then 1.25
      when player_rec.reliability <= 70 then 1.0
      else 0.75
    end;

    player_delta := base_delta * reliability_factor;
    if player_delta > 0.35 then
      player_delta := 0.35;
    end if;
    if player_delta < -0.35 then
      player_delta := -0.35;
    end if;

    if player_rec.side = 2 then
      player_delta := -player_delta;
    end if;

    new_level := player_rec.level + player_delta;
    if new_level > 7 then
      new_level := 7;
    end if;
    if new_level < 0 then
      new_level := 0;
    end if;

    reliability_after := least(100, player_rec.reliability + 3);

    insert into public.sport_rating_history (
      user_id,
      sport,
      match_id,
      level_before,
      level_after,
      delta,
      reliability_after
    )
    values (
      player_rec.user_id,
      match_rec.sport,
      match_id,
      player_rec.level,
      new_level,
      player_delta,
      reliability_after
    );

    update public.sport_ratings
    set level = new_level,
        reliability = reliability_after,
        matches_competitive = player_rec.matches_competitive + 1
    where user_id = player_rec.user_id
      and sport = match_rec.sport;
  end loop;

  update public.matches
  set rating_applied = true,
      status = 'confirmed'
  where id = match_id;
end;
$$;

grant execute on function public.finalize_match(uuid) to authenticated;
