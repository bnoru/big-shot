import Cube from './Cube.jsx';

export default function PlayerBar({ players, activePlayerId, activeLabel = 'vez atual' }) {
  return (
    <section className="players" aria-label="Jogadores">
      {players.map((player, index) => {
        const active = player.id === activePlayerId;
        return (
          <article className={`player-card${active ? ' player-card--turn' : ''}`} key={player.id}>
            <div className="player-card__identity">
              <Cube color={player.id} />
              <div>
                <strong>{player.name}</strong>
                <span>{active ? activeLabel : `assento ${index + 1}`}</span>
              </div>
            </div>
            <div className="player-card__stats">
              <span><b>{player.money}M</b> caixa</span>
              <span><b>{player.loans}</b> empréstimos</span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
