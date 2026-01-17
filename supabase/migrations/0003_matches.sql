create extension if not exists pgcrypto;

create table if not exists public.matches (
    id uuid primary key default gen_random_uuid(),
    sport text not null,
    format text not null,
    is_ranked boolean not null default true,
    status text not null default 'pending',
    reported_by uuid not null references auth.users(id) on delete cascade,
    played_at timestamptz not null default now(),
    score_text text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint matches_sport_check check (sport in ('tennis', 'padel', 'badminton', 'table_tennis')),
    constraint matches_format_check check (format in ('singles', 'doubles')),
    constraint matches_status_check check (status in ('pending', 'confirmed', 'disputed'))
);

drop trigger if exists matches_set_updated_at on public.matches;
create trigger matches_set_updated_at
    before update on public.matches
    for each row
    execute function public.set_updated_at();

alter table public.matches enable row level security;

drop policy if exists "Matches select participants" on public.matches;
create policy "Matches select participants"
    on public.matches
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.match_players mp
            where mp.match_id = matches.id
              and mp.user_id = auth.uid()
        )
    );

drop policy if exists "Matches insert reporter" on public.matches;
create policy "Matches insert reporter"
    on public.matches
    for insert
    to authenticated
    with check (reported_by = auth.uid());

drop policy if exists "Matches update reporter" on public.matches;
create policy "Matches update reporter"
    on public.matches
    for update
    to authenticated
    using (reported_by = auth.uid())
    with check (reported_by = auth.uid());

create table if not exists public.match_players (
    match_id uuid not null references public.matches(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    side int not null,
    created_at timestamptz not null default now(),
    primary key (match_id, user_id),
    constraint match_players_side_check check (side in (1, 2))
);

create index if not exists match_players_match_id_idx on public.match_players (match_id);
create index if not exists match_players_user_id_idx on public.match_players (user_id);

alter table public.match_players enable row level security;

drop policy if exists "Match players select participants" on public.match_players;
create policy "Match players select participants"
    on public.match_players
    for select
    to authenticated
    using (
        user_id = auth.uid()
        or exists (
            select 1
            from public.match_players mp
            where mp.match_id = match_players.match_id
              and mp.user_id = auth.uid()
        )
    );

drop policy if exists "Match players insert reporter" on public.match_players;
create policy "Match players insert reporter"
    on public.match_players
    for insert
    to authenticated
    with check (
        exists (
            select 1
            from public.matches m
            where m.id = match_id
              and m.reported_by = auth.uid()
        )
    );

drop policy if exists "Match players delete reporter" on public.match_players;
create policy "Match players delete reporter"
    on public.match_players
    for delete
    to authenticated
    using (
        exists (
            select 1
            from public.matches m
            where m.id = match_id
              and m.reported_by = auth.uid()
        )
    );

create table if not exists public.match_confirmations (
    match_id uuid not null references public.matches(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    status text not null default 'pending',
    updated_at timestamptz not null default now(),
    primary key (match_id, user_id),
    constraint match_confirmations_status_check check (status in ('pending', 'confirmed', 'disputed'))
);

create index if not exists match_confirmations_match_id_idx on public.match_confirmations (match_id);

drop trigger if exists match_confirmations_set_updated_at on public.match_confirmations;
create trigger match_confirmations_set_updated_at
    before update on public.match_confirmations
    for each row
    execute function public.set_updated_at();

alter table public.match_confirmations enable row level security;

drop policy if exists "Match confirmations select participants" on public.match_confirmations;
create policy "Match confirmations select participants"
    on public.match_confirmations
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.match_players mp
            where mp.match_id = match_confirmations.match_id
              and mp.user_id = auth.uid()
        )
    );

drop policy if exists "Match confirmations insert reporter" on public.match_confirmations;
create policy "Match confirmations insert reporter"
    on public.match_confirmations
    for insert
    to authenticated
    with check (
        exists (
            select 1
            from public.matches m
            where m.id = match_id
              and m.reported_by = auth.uid()
        )
    );

drop policy if exists "Match confirmations update owner" on public.match_confirmations;
create policy "Match confirmations update owner"
    on public.match_confirmations
    for update
    to authenticated
    using (user_id = auth.uid())
    with check (
        user_id = auth.uid()
        and status in ('confirmed', 'disputed')
    );
