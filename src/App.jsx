import { useCallback, useEffect, useMemo, useState } from 'react';
import { players as playerTemplates } from './data/board.js';
import { applyGameAction, createInitialGameState, getActivePlayerId } from './game/state.js';
import { ensureAnonymousSession, supabaseConfigured } from './lib/supabase.js';
import {
  createRoom,
  joinRoom,
  loadRoom,
  loadRoomByCode,
  saveGameState,
  startRoom,
  subscribeToPresence,
  subscribeToRoom,
} from './multiplayer/rooms.js';
import HomeScreen from './components/screens/HomeScreen.jsx';
import JoinRoomScreen from './components/screens/JoinRoomScreen.jsx';
import LobbyScreen from './components/screens/LobbyScreen.jsx';
import SetupRequired from './components/screens/SetupRequired.jsx';
import GameScreen from './components/screens/GameScreen.jsx';

function roomCodeFromUrl() {
  return new URLSearchParams(window.location.search).get('room')?.toUpperCase() ?? '';
}

function setRoomUrl(code) {
  const url = new URL(window.location.href);
  if (code) url.searchParams.set('room', code);
  else url.searchParams.delete('room');
  window.history.pushState({}, '', url);
}

function readableError(error) {
  const message = error?.message ?? String(error ?? 'Erro desconhecido');
  if (message.includes('Anonymous sign-ins are disabled')) {
    return 'Ative Anonymous Sign-Ins em Supabase → Authentication → Providers.';
  }
  if (message.includes('room_full')) return 'Esta mesa já possui quatro jogadores.';
  if (message.includes('room_not_found')) return 'Mesa não encontrada.';
  if (message.includes('room_already_started')) return 'Esta partida já começou.';
  if (message.includes('only_host')) return 'Somente o anfitrião pode iniciar a partida.';
  if (message.includes('need_four_players')) return 'São necessários quatro jogadores para começar.';
  if (message.includes('revision_conflict')) return 'Outro jogador agiu ao mesmo tempo. O estado foi atualizado; tente novamente.';
  return message;
}

export default function App() {
  const [forceLocal, setForceLocal] = useState(false);

  if (!supabaseConfigured && !forceLocal) {
    return <SetupRequired onLocal={() => setForceLocal(true)} />;
  }

  if (!supabaseConfigured || forceLocal) {
    return <LocalGame onExit={supabaseConfigured ? () => setForceLocal(false) : null} />;
  }

  return <OnlineApp />;
}

function LocalGame() {
  const [game, setGame] = useState(() => createInitialGameState(playerTemplates));
  const activePlayerId = getActivePlayerId(game) ?? game.players[0].id;

  const onAction = useCallback(async (action) => {
    setGame((current) => applyGameAction(current, { ...action, actorId: getActivePlayerId(current) }));
  }, []);

  const onReset = useCallback(() => {
    setGame(createInitialGameState(playerTemplates));
  }, []);

  return (
    <GameScreen
      game={game}
      roomCode="LOCAL"
      myPlayerId={activePlayerId}
      onAction={onAction}
      onReset={onReset}
      connectionLabel="Modo local · sem sincronização"
    />
  );
}

function OnlineApp() {
  const [user, setUser] = useState(null);
  const [roomBundle, setRoomBundle] = useState(null);
  const [requestedCode, setRequestedCode] = useState(roomCodeFromUrl);
  const [joinRequired, setJoinRequired] = useState(Boolean(roomCodeFromUrl()));
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [connectionState, setConnectionState] = useState('Conectando…');

  const refreshRoom = useCallback(async (roomId) => {
    const next = await loadRoom(roomId);
    setRoomBundle(next);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        setLoading(true);
        const currentUser = await ensureAnonymousSession();
        if (cancelled) return;
        setUser(currentUser);

        const code = roomCodeFromUrl();
        if (!code) {
          setJoinRequired(false);
          return;
        }

        const existing = await loadRoomByCode(code);
        if (cancelled) return;
        if (existing) {
          setRoomBundle(existing);
          setJoinRequired(false);
        } else {
          setRequestedCode(code);
          setJoinRequired(true);
        }
      } catch (bootError) {
        if (!cancelled) setError(readableError(bootError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    boot();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const roomId = roomBundle?.room?.id;
    if (!roomId || !user?.id) return undefined;

    setConnectionState('Sincronizado');

    const unsubscribeDb = subscribeToRoom(roomId, {
      onRoom: (room) => {
        if (!room?.id) return;
        setRoomBundle((current) => current ? { ...current, room } : current);
      },
      onPlayersChanged: async () => {
        try {
          await refreshRoom(roomId);
        } catch (refreshError) {
          setError(readableError(refreshError));
        }
      },
      onGame: (gameRow) => {
        if (!gameRow?.room_id) return;
        setRoomBundle((current) => current ? { ...current, game: gameRow } : current);
      },
    });

    const unsubscribePresence = subscribeToPresence(roomId, user.id, setOnlineUserIds);

    return () => {
      unsubscribeDb();
      unsubscribePresence();
    };
  }, [roomBundle?.room?.id, user?.id, refreshRoom]);

  async function handleCreate(name) {
    try {
      setBusy(true);
      setError('');
      const created = await createRoom(name);
      setUser(created.user);
      setRoomUrl(created.room_code);
      setRequestedCode(created.room_code);
      const next = await loadRoom(created.room_id);
      setRoomBundle(next);
      setJoinRequired(false);
    } catch (createError) {
      setError(readableError(createError));
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(code, name) {
    try {
      setBusy(true);
      setError('');
      const joined = await joinRoom(code, name);
      setUser(joined.user);
      setRoomUrl(joined.room_code);
      setRequestedCode(joined.room_code);
      const next = await loadRoom(joined.room_id);
      setRoomBundle(next);
      setJoinRequired(false);
    } catch (joinError) {
      setError(readableError(joinError));
    } finally {
      setBusy(false);
    }
  }

  async function handleStart() {
    if (!roomBundle?.room) return;
    try {
      setBusy(true);
      setError('');
      const sortedPlayers = [...roomBundle.players].sort((a, b) => a.seat - b.seat);
      const initialState = createInitialGameState(sortedPlayers.map((player) => ({
        id: player.color,
        name: player.name,
        userId: player.user_id,
      })));
      await startRoom(roomBundle.room.id, initialState);
      await refreshRoom(roomBundle.room.id);
    } catch (startError) {
      setError(readableError(startError));
    } finally {
      setBusy(false);
    }
  }

  const myRoomPlayer = useMemo(
    () => roomBundle?.players?.find((player) => player.user_id === user?.id) ?? null,
    [roomBundle?.players, user?.id],
  );

  const handleGameAction = useCallback(async (action) => {
    const currentGameRow = roomBundle?.game;
    const roomId = roomBundle?.room?.id;
    if (!currentGameRow?.state || !roomId) throw new Error('Estado da partida indisponível.');

    const nextState = applyGameAction(currentGameRow.state, {
      ...action,
      actorId: myRoomPlayer?.color,
    });

    try {
      setConnectionState('Salvando…');
      const nextRevision = await saveGameState(roomId, currentGameRow.revision, nextState);
      setRoomBundle((current) => {
        if (!current?.game || current.game.revision > currentGameRow.revision) return current;
        return {
          ...current,
          game: {
            ...current.game,
            revision: nextRevision,
            state: nextState,
            updated_at: new Date().toISOString(),
          },
        };
      });
      setConnectionState('Sincronizado');
    } catch (saveError) {
      setConnectionState('Atualizando…');
      await refreshRoom(roomId);
      setConnectionState('Sincronizado');
      throw new Error(readableError(saveError));
    }
  }, [roomBundle?.game, roomBundle?.room?.id, myRoomPlayer?.color, refreshRoom]);

  function handleBack() {
    setRoomUrl('');
    setRoomBundle(null);
    setRequestedCode('');
    setJoinRequired(false);
    setError('');
  }

  async function copyInvite() {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomBundle.room.code);
    try {
      await navigator.clipboard.writeText(url.toString());
    } catch {
      window.prompt('Copie o link da mesa:', url.toString());
    }
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (!roomBundle && joinRequired) {
    return <JoinRoomScreen code={requestedCode} onJoin={handleJoin} onBack={handleBack} busy={busy} error={error} />;
  }

  if (!roomBundle) {
    return <HomeScreen onCreate={handleCreate} onJoin={handleJoin} busy={busy} error={error} />;
  }

  if (roomBundle.room.status === 'lobby') {
    return (
      <LobbyScreen
        room={roomBundle.room}
        players={roomBundle.players}
        currentUserId={user.id}
        onlineUserIds={onlineUserIds}
        onStart={handleStart}
        onCopyLink={copyInvite}
        busy={busy}
        error={error}
      />
    );
  }

  if (roomBundle.game?.state && myRoomPlayer) {
    return (
      <GameScreen
        game={roomBundle.game.state}
        roomCode={roomBundle.room.code}
        myPlayerId={myRoomPlayer.color}
        onAction={handleGameAction}
        connectionLabel={`${connectionState} · revisão ${roomBundle.game.revision}`}
      />
    );
  }

  return <LoadingScreen text="Carregando partida…" />;
}

function LoadingScreen({ text = 'Conectando à mesa…' }) {
  return (
    <main className="entry-page">
      <section className="entry-card entry-card--compact">
        <span className="eyebrow">BIG SHOT ONLINE</span>
        <h1>{text}</h1>
      </section>
    </main>
  );
}
