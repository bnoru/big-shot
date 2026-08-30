-- Big Shot Online 0.11 upgrade
-- Already applied to the connected Supabase project on 2026-08-30.

alter table public.room_players drop constraint if exists room_players_color_check;

update public.room_players set color = 'green' where color = 'ivory';
update public.game_states
set state = replace(state::text, '"ivory"', '"green"')::jsonb, updated_at = now()
where state::text like '%"ivory"%';

alter table public.room_players
  add constraint room_players_color_check
  check (color in ('red', 'blue', 'gold', 'green'));

alter table public.room_players drop constraint if exists room_players_room_id_color_key;
alter table public.room_players
  add constraint room_players_room_id_color_key
  unique (room_id, color) deferrable initially immediate;

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

  select r.* into v_room
  from public.rooms r
  where r.code = upper(trim(p_code))
  for update;

  if not found then raise exception 'room_not_found'; end if;

  select rp.* into v_existing
  from public.room_players rp
  where rp.room_id = v_room.id and rp.user_id = v_user;

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
  v_color := (array['red', 'blue', 'gold', 'green'])[v_seat + 1];

  insert into public.room_players (room_id, user_id, name, seat, color)
  values (v_room.id, v_user, v_name, v_seat, v_color);

  return query select v_room.id, v_room.code, v_seat, v_color;
end;
$$;

create or replace function public.set_player_color(p_room_id uuid, p_player_user_id uuid, p_color text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_room public.rooms%rowtype;
  v_old_color text;
  v_other_user uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_color not in ('red', 'blue', 'gold', 'green') then raise exception 'invalid_color'; end if;

  select r.* into v_room from public.rooms r where r.id = p_room_id for update;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.host_user_id <> v_user then raise exception 'only_host'; end if;
  if v_room.status <> 'lobby' then raise exception 'room_already_started'; end if;

  select rp.color into v_old_color
  from public.room_players rp
  where rp.room_id = p_room_id and rp.user_id = p_player_user_id;
  if not found then raise exception 'player_not_found'; end if;
  if v_old_color = p_color then return; end if;

  select rp.user_id into v_other_user
  from public.room_players rp
  where rp.room_id = p_room_id and rp.color = p_color;

  set constraints room_players_room_id_color_key deferred;

  if v_other_user is null then
    update public.room_players rp
    set color = p_color
    where rp.room_id = p_room_id and rp.user_id = p_player_user_id;
  else
    update public.room_players rp
    set color = case
      when rp.user_id = p_player_user_id then p_color
      when rp.user_id = v_other_user then v_old_color
      else rp.color
    end
    where rp.room_id = p_room_id and rp.user_id in (p_player_user_id, v_other_user);
  end if;
end;
$$;

revoke all on function public.set_player_color(uuid, uuid, text) from public;
grant execute on function public.set_player_color(uuid, uuid, text) to authenticated;
