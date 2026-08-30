import Cube from '../Cube.jsx';

const COLORS = ['red', 'blue', 'gold', 'ivory'];

export default function LobbyScreen({ room, players, currentUserId, onlineUserIds, onStart, onCopyLink, busy, error }) {
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

        <p className="lobby-instruction">A partida começa quando os quatro assentos estiverem ocupados.</p>

        <div className="lobby-seats">
          {seats.map((player, seat) => (
            <article className={`lobby-seat${player ? ' lobby-seat--occupied' : ''}`} key={seat}>
              <Cube color={COLORS[seat]} />
              <div>
                <span>Assento {seat + 1}</span>
                <strong>{player?.name ?? 'Aguardando jogador'}</strong>
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
