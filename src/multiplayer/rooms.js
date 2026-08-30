import { ensureAnonymousSession, supabase } from '../lib/supabase.js';

function cleanCode(code) {
  return String(code ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export async function createRoom(playerName) {
  const user = await ensureAnonymousSession();
  const { data, error } = await supabase.rpc('create_room', { p_name: playerName.trim() });
  if (error) throw error;
  const result = Array.isArray(data) ? data[0] : data;
  return { ...result, user };
}

export async function joinRoom(roomCode, playerName) {
  const user = await ensureAnonymousSession();
  const { data, error } = await supabase.rpc('join_room', {
    p_code: cleanCode(roomCode),
    p_name: playerName.trim(),
  });
  if (error) throw error;
  const result = Array.isArray(data) ? data[0] : data;
  return { ...result, user };
}

export async function loadRoomByCode(roomCode) {
  const code = cleanCode(roomCode);
  if (!code) return null;

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, code, status, host_user_id, created_at')
    .eq('code', code)
    .maybeSingle();
  if (roomError) throw roomError;
  if (!room) return null;

  return loadRoom(room.id, room);
}

export async function loadRoom(roomId, roomRow = null) {
  const roomPromise = roomRow
    ? Promise.resolve({ data: roomRow, error: null })
    : supabase
      .from('rooms')
      .select('id, code, status, host_user_id, created_at')
      .eq('id', roomId)
      .single();

  const [roomResult, playersResult, gameResult] = await Promise.all([
    roomPromise,
    supabase
      .from('room_players')
      .select('room_id, user_id, name, seat, color, joined_at')
      .eq('room_id', roomId)
      .order('seat'),
    supabase
      .from('game_states')
      .select('room_id, revision, state, updated_at')
      .eq('room_id', roomId)
      .maybeSingle(),
  ]);

  if (roomResult.error) throw roomResult.error;
  if (playersResult.error) throw playersResult.error;
  if (gameResult.error) throw gameResult.error;

  return {
    room: roomResult.data,
    players: playersResult.data ?? [],
    game: gameResult.data ?? null,
  };
}

export async function startRoom(roomId, initialState) {
  const { data, error } = await supabase.rpc('start_room', {
    p_room_id: roomId,
    p_initial_state: initialState,
  });
  if (error) throw error;
  return Number(data);
}

export async function saveGameState(roomId, expectedRevision, nextState) {
  const { data, error } = await supabase.rpc('update_game_state', {
    p_room_id: roomId,
    p_expected_revision: expectedRevision,
    p_state: nextState,
  });

  if (error) throw error;
  return Number(data);
}

export function subscribeToRoom(roomId, handlers = {}) {
  const channel = supabase
    .channel(`room-db:${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
      (payload) => handlers.onRoom?.(payload.new),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
      () => handlers.onPlayersChanged?.(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'game_states', filter: `room_id=eq.${roomId}` },
      (payload) => handlers.onGame?.(payload.new),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToPresence(roomId, userId, onSync) {
  const channel = supabase.channel(`room-presence:${roomId}`, {
    config: { presence: { key: userId } },
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      onSync?.(new Set(Object.keys(state)));
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: userId, online_at: new Date().toISOString() });
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
