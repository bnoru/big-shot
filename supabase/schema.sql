-- Big Shot Online 0.9 — Supabase schema
-- Run this file in Supabase > SQL Editor.
-- Then enable Authentication > Providers > Anonymous Sign-Ins.

create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.room_players (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 28),
  seat integer not null check (seat between 0 and 3),
  color text not null check (color in ('red', 'blue', 'gold', 'ivory')),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id),
  unique (room_id, seat),
  unique (room_id, color)
);

create table if not exists public.game_states (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  revision bigint not null default 1 check (revision >= 1),
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.game_states enable row level security;

-- The browser only needs direct SELECT. All mutations are RPC-only.
grant select on public.rooms to authenticated;
grant select on public.room_players to authenticated;
grant select on public.game_states to authenticated;
revoke insert, update, delete on public.rooms from authenticated;
revoke insert, update, delete on public.room_players from authenticated;
revoke insert, update, delete on public.game_states from authenticated;

-- SECURITY DEFINER avoids recursive RLS checks when policies need to inspect room_players.
create or replace function public.is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.room_players rp
    where rp.room_id = p_room_id
      and rp.user_id = auth.uid()
  );
$$;

revoke all on function public.is_room_member(uuid) from public;
grant execute on function public.is_room_member(uuid) to authenticated;

-- Read access is limited to people who already have a seat in the room.
drop policy if exists rooms_member_select on public.rooms;
create policy rooms_member_select on public.rooms
for select to authenticated
using (public.is_room_member(id));

drop policy if exists room_players_member_select on public.room_players;
create policy room_players_member_select on public.room_players
for select to authenticated
using (public.is_room_member(room_id));

drop policy if exists game_states_member_select on public.game_states;
create policy game_states_member_select on public.game_states
for select to authenticated
using (public.is_room_member(room_id));

-- All writes go through the functions below, rather than direct table writes.
create or replace function public.create_room(p_name text)
returns table (room_id uuid, room_code text, seat integer, color text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_name text := trim(p_name);
  v_room_id uuid;
  v_code text;
  v_attempt integer := 0;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if char_length(v_name) < 1 or char_length(v_name) > 28 then
    raise exception 'invalid_name';
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    begin
      insert into public.rooms (code, host_user_id)
      values (v_code, v_user)
      returning id into v_room_id;
      exit;
    exception when unique_violation then
      if v_attempt >= 10 then raise; end if;
    end;
  end loop;

  insert into public.room_players (room_id, user_id, name, seat, color)
  values (v_room_id, v_user, v_name, 0, 'red');

  return query select v_room_id, v_code, 0, 'red'::text;
end;
$$;

create or replace function public.join_room(p_code text, p_name text)
returns table (room_id uuid, room_code text, seat integer, color text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_name text := trim(p_name);
  v_room public.rooms%rowtype;
  v_existing public.room_players%rowtype;
  v_seat integer;
  v_color text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if char_length(v_name) < 1 or char_length(v_name) > 28 then raise exception 'invalid_name'; end if;

  select * into v_room
  from public.rooms
  where code = upper(trim(p_code))
  for update;

  if not found then raise exception 'room_not_found'; end if;

  select * into v_existing
  from public.room_players
  where room_id = v_room.id and user_id = v_user;

  if found then
    return query select v_room.id, v_room.code, v_existing.seat, v_existing.color;
    return;
  end if;

  if v_room.status <> 'lobby' then raise exception 'room_already_started'; end if;

  select s into v_seat
  from generate_series(0, 3) as s
  where not exists (
    select 1 from public.room_players rp
    where rp.room_id = v_room.id and rp.seat = s
  )
  order by s
  limit 1;

  if v_seat is null then raise exception 'room_full'; end if;

  v_color := (array['red', 'blue', 'gold', 'ivory'])[v_seat + 1];

  insert into public.room_players (room_id, user_id, name, seat, color)
  values (v_room.id, v_user, v_name, v_seat, v_color);

  return query select v_room.id, v_room.code, v_seat, v_color;
end;
$$;

create or replace function public.start_room(p_room_id uuid, p_initial_state jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_room public.rooms%rowtype;
  v_count integer;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.host_user_id <> v_user then raise exception 'only_host'; end if;
  if v_room.status <> 'lobby' then raise exception 'room_already_started'; end if;

  select count(*) into v_count from public.room_players where room_id = p_room_id;
  if v_count <> 4 then raise exception 'need_four_players'; end if;
  if jsonb_typeof(p_initial_state) <> 'object' or jsonb_array_length(p_initial_state -> 'players') <> 4 then
    raise exception 'invalid_initial_state';
  end if;

  insert into public.game_states (room_id, revision, state, updated_at)
  values (p_room_id, 1, p_initial_state, now())
  on conflict (room_id) do update
    set revision = 1, state = excluded.state, updated_at = now();

  update public.rooms set status = 'playing' where id = p_room_id;
  return 1;
end;
$$;

create or replace function public.update_game_state(
  p_room_id uuid,
  p_expected_revision bigint,
  p_state jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current bigint;
  v_next bigint;
begin
  if not public.is_room_member(p_room_id) then raise exception 'not_room_member'; end if;
  if not exists (select 1 from public.rooms where id = p_room_id and status = 'playing') then
    raise exception 'room_not_playing';
  end if;
  if jsonb_typeof(p_state) <> 'object' then raise exception 'invalid_game_state'; end if;

  select revision into v_current
  from public.game_states
  where room_id = p_room_id
  for update;

  if not found then raise exception 'game_state_not_found'; end if;
  if v_current <> p_expected_revision then raise exception 'revision_conflict'; end if;

  v_next := v_current + 1;
  update public.game_states
  set revision = v_next, state = p_state, updated_at = now()
  where room_id = p_room_id;

  if p_state ->> 'phase' = 'end' then
    update public.rooms set status = 'finished' where id = p_room_id;
  end if;

  return v_next;
end;
$$;

revoke all on function public.create_room(text) from public;
revoke all on function public.join_room(text, text) from public;
revoke all on function public.start_room(uuid, jsonb) from public;
revoke all on function public.update_game_state(uuid, bigint, jsonb) from public;

grant execute on function public.create_room(text) to authenticated;
grant execute on function public.join_room(text, text) to authenticated;
grant execute on function public.start_room(uuid, jsonb) to authenticated;
grant execute on function public.update_game_state(uuid, bigint, jsonb) to authenticated;

-- Add the three tables to Supabase Realtime, but keep this script safe to rerun.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms') then
    alter publication supabase_realtime add table public.rooms;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_players') then
    alter publication supabase_realtime add table public.room_players;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'game_states') then
    alter publication supabase_realtime add table public.game_states;
  end if;
end $$;
