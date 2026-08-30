import Board from '../Board.jsx';
import PlayerBar from '../PlayerBar.jsx';
import { getActiveLabel, getActivePlayerId } from '../../game/state.js';

export default function GameScreen({ game, roomCode, myPlayerId, onAction, onReset = null, connectionLabel = null }) {
  const activePlayerId = getActivePlayerId(game);
  const activeLabel = getActiveLabel(game);
  const me = game.players.find((player) => player.id === myPlayerId);

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <span className="eyebrow">BIG SHOT ONLINE · protótipo 0.11</span>
          <h1>Mesa digital</h1>
        </div>
        <div className="topbar-meta">
          {me && <span className="you-are">Você: <b>{me.name}</b></span>}
          <div className="table-code">
            <span>Mesa</span>
            <b>{roomCode}</b>
          </div>
        </div>
      </header>

      <PlayerBar players={game.players} activePlayerId={activePlayerId} activeLabel={activeLabel} />
      <Board
        game={game}
        myPlayerId={myPlayerId}
        onAction={onAction}
        onReset={onReset}
        connectionLabel={connectionLabel}
      />
    </main>
  );
}
