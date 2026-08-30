import Cube from '../Cube.jsx';

const COLORS = [
  { id: 'red', label: 'Vermelho' },
  { id: 'blue', label: 'Azul' },
  { id: 'gold', label: 'Amarelo' },
  { id: 'green', label: 'Verde' },
];

const COLOR_LABELS = Object.fromEntries(COLORS.map((color) => [color.id, color.label]));

export default function LobbyScreen({
  room,
  players,
  currentUserId,
  onlineUserIds,
  onStart,
  onSetColor,
  onCopyLink,
  busy,
  error,
}) {
  const isHost = room.host_user_id === currentUserId;
  const full = players.length === 4;
  const seats = Array.from({ length: 4 }, (_, seat) => players.find((player) => player.seat === seat) ?? null);

  return (
    <main className="lobby-page">
      <section className="lobby-card">
        <header className="lobby-header">
          <div>
            <span className="eyebrow">BIG SHOT ONLINE · lobby</span>
            <h1>Mesa {room.code}</h1>
          </div>
          <button className="secondary-button lobby-copy" type="button" onClick={onCopyLink}>Copiar convite</button>
        </header>

        <p className="lobby-instruction">
          {isHost
            ? 'Defina a cor de cada jogador. A partida começa quando os quatro assentos estiverem ocupados.'
            : 'Aguardando o anfitrião definir as cores e iniciar a partida.'}
        </p>

        <div className="lobby-seats">
          {seats.map((player, seat) => (
            <article className={`lobby-seat${player ? ' lobby-seat--occupied' : ''}`} key={seat}>
              {player ? <Cube color={player.color} /> : <span className="lobby-empty-cube" aria-hidden="true" />}
              <div className="lobby-seat__main">
                <span>Assento {seat + 1}</span>
                <strong>{player?.name ?? 'Aguardando jogador'}</strong>
                {player && (
                  isHost ? (
                    <label className="lobby-color-control">
                      <span>Cor</span>
                      <select
                        value={player.color}
                        disabled={busy}
                        onChange={(event) => onSetColor(player.user_id, event.target.value)}
                      >
                        {COLORS.map((color) => (
                          <option key={color.id} value={color.id}>{color.label}</option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <span className="lobby-color-label">{COLOR_LABELS[player.color] ?? player.color}</span>
                  )
                )}
              </div>
              {player && (
                <span className={`presence-dot${onlineUserIds.has(player.user_id) ? ' presence-dot--online' : ''}`} title={onlineUserIds.has(player.user_id) ? 'Online' : 'Desconectado'} />
              )}
            </article>
          ))}
        </div>

        <div className="lobby-status">
          <strong>{players.length}/4</strong>
          <span>jogadores na mesa</span>
        </div>

        {isHost ? (
          <button className="primary-button lobby-start" type="button" disabled={!full || busy} onClick={onStart}>
            Iniciar partida
          </button>
        ) : (
          <p className="lobby-wait">Aguardando o anfitrião iniciar a partida.</p>
        )}

        {error && <p className="entry-error" role="alert">{error}</p>}
      </section>
    </main>
  );
}
