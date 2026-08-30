import Cube from './Cube.jsx';

const CRITERION_LABELS = {
  'financial-status': 'maior patrimônio final',
  'lot-count': 'desempate por maior número de terrenos',
  'highest-lot': 'desempate pelo terreno mais valioso',
  'shared-tie': 'empate após todos os critérios oficiais',
  'no-eligible-player': 'nenhum jogador possui pelo menos dois terrenos',
};

export default function FinalScorePanel({ result, lotsById }) {
  if (!result) return null;

  const winners = result.scorecards.filter((score) => result.winnerIds.includes(score.playerId));
  const winnerText = winners.length === 1
    ? `${winners[0].name} venceu`
    : winners.length > 1
      ? `${winners.map((winner) => winner.name).join(' e ')} empataram`
      : 'Sem vencedor elegível';

  return (
    <div className="final-score-panel">
      <span className="eyebrow">resultado final</span>
      <h2>{winnerText}</h2>
      <p>{CRITERION_LABELS[result.criterion]}.</p>

      <div className="final-score-list">
        {result.scorecards.map((score, index) => (
          <article
            key={score.playerId}
            className={`final-score-card${result.winnerIds.includes(score.playerId) ? ' final-score-card--winner' : ''}`}
          >
            <div className="final-score-card__heading">
              <span className="final-rank">{index + 1}</span>
              <Cube color={score.playerId} small />
              <strong>{score.name}</strong>
              <b>{score.total}M</b>
            </div>

            <div className="final-score-math">
              <span>Terrenos <b>{score.propertyValue}M</b></span>
              <span>Dinheiro <b>{score.money}M</b></span>
              <span>Dívidas <b>−{score.debt}M</b></span>
            </div>

            <div className="final-owned-lots">
              {score.ownedLotIds.length > 0 ? score.ownedLotIds.map((lotId) => {
                const lot = lotsById[lotId];
                const breakdown = score.propertyBreakdown.find((entry) => entry.lotId === lotId);
                return (
                  <span key={lotId} className={breakdown?.doubled ? 'final-lot final-lot--doubled' : 'final-lot'}>
                    {lot?.multiplier ? '×2' : `${lot?.value}M${breakdown?.doubled ? ' ×2' : ''}`}
                  </span>
                );
              }) : <span className="final-no-lots">nenhum terreno</span>}
            </div>

            {!score.eligible && (
              <small className="final-ineligible">Não elegível: é preciso possuir pelo menos 2 terrenos.</small>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
