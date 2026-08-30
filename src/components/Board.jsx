import { useEffect, useMemo, useState } from 'react';
import { districtsById, lots, lotsById } from '../data/board.js';
import { countAuctionCubes } from '../data/setup.js';
import { canBorrow, loanPayout, minimumBid } from '../game/auction.js';
import AuctionSpace from './AuctionSpace.jsx';
import Lot from './Lot.jsx';
import LotPieces from './LotPieces.jsx';
import Cube from './Cube.jsx';
import FinalScorePanel from './FinalScorePanel.jsx';

const COLOR_NAMES = {
  red: 'vermelho',
  blue: 'azul',
  gold: 'amarelo',
  ivory: 'marfim',
};

export default function Board({ game, myPlayerId, onAction, onReset = null, connectionLabel = null }) {
  const {
    players,
    auctionSpaces,
    lotStates,
    brokerSpaceId,
    lastRoll,
    roundStarterIndex,
    roundNumber,
    phase,
    auctionState,
    auctionResult,
    lastLotResolution,
    finalResult,
    endGameResolutions,
  } = game;

  const [selectedAuction, setSelectedAuction] = useState(null);
  const [selectedLot, setSelectedLot] = useState(null);
  const [bidAmount, setBidAmount] = useState('1');
  const [actionError, setActionError] = useState('');
  const [selectedPlacementCubeId, setSelectedPlacementCubeId] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (auctionState?.spaceId) setSelectedAuction(auctionState.spaceId);
  }, [auctionState?.spaceId]);

  useEffect(() => {
    if (phase === 'auction' && auctionState?.status === 'bidding') {
      setBidAmount(String(minimumBid(auctionState)));
    }
  }, [phase, auctionState?.currentBidderId, auctionState?.currentBid]);

  useEffect(() => {
    if (phase !== 'placement' || !auctionResult?.cubes?.length) {
      setSelectedPlacementCubeId(null);
      return;
    }

    if (!auctionResult.cubes.some((cube) => cube.id === selectedPlacementCubeId)) {
      setSelectedPlacementCubeId(auctionResult.cubes[0].id);
    }
  }, [phase, auctionResult?.cubes, selectedPlacementCubeId]);

  const lot = selectedLot ? lotsById[selectedLot] : null;
  const lotState = selectedLot ? lotStates[selectedLot] : null;
  const district = lot ? districtsById[lot.district] : null;
  const inspectedAuction = selectedAuction
    ? auctionSpaces.find((space) => space.id === selectedAuction)
    : null;
  const activeAuction = auctionState
    ? auctionSpaces.find((space) => space.id === auctionState.spaceId)
    : null;

  const currentBidder = auctionState?.currentBidderId
    ? players.find((player) => player.id === auctionState.currentBidderId)
    : null;

  const highestBidder = auctionState?.highestBidderId
    ? players.find((player) => player.id === auctionState.highestBidderId)
    : null;

  const winner = auctionResult
    ? players.find((player) => player.id === auctionResult.winnerId)
    : null;

  const multiplierTargets = useMemo(
    () => lot?.scoringAdjacent?.map((id) => lotsById[id]) ?? [],
    [lot],
  );

  const cubeCounts = useMemo(
    () => countAuctionCubes(auctionSpaces),
    [auctionSpaces],
  );

  const rollerId = players[roundStarterIndex]?.id ?? null;
  const canRoll = phase === 'move' && myPlayerId === rollerId;
  const canBid = phase === 'auction' && myPlayerId === auctionState?.currentBidderId;
  const canPlace = phase === 'placement' && myPlayerId === auctionResult?.winnerId;

  async function dispatch(action) {
    if (busy) return;
    try {
      setBusy(true);
      setActionError('');
      await onAction(action);
    } catch (error) {
      setActionError(error?.message ?? 'Não foi possível realizar a ação.');
    } finally {
      setBusy(false);
    }
  }

  function handleLotClick(lotId) {
    setSelectedLot(lotId);
    if (phase !== 'placement' || !canPlace || !auctionResult) {
      if (phase !== 'placement') setSelectedAuction(null);
      return;
    }

    const selectedCube = auctionResult.cubes.find((cube) => cube.id === selectedPlacementCubeId);
    if (!selectedCube) {
      setActionError('Selecione um dos cubos adquiridos antes de clicar no terreno.');
      return;
    }

    dispatch({
      type: 'PLACE_CUBE',
      actorId: myPlayerId,
      cubeId: selectedCube.id,
      lotId,
    });
  }

  return (
    <div className="board-shell">
      <section className="table-stage" aria-label="Mesa do Big Shot">
        <div className="auction-ring">
          {auctionSpaces.map((space) => (
            <AuctionSpace
              key={space.id}
              space={space}
              active={selectedAuction === space.id}
              broker={brokerSpaceId === space.id}
              onSelect={(id) => {
                setSelectedAuction(id);
                setSelectedLot(null);
              }}
            />
          ))}

          <div className="board-art-wrap">
            <img
              className="board-art"
              src="./board-city.png"
              alt="Cidade do tabuleiro dividida em quatro distritos e treze terrenos"
              draggable="false"
            />

            <svg
              className="lot-overlay"
              viewBox="0 0 926 959"
              preserveAspectRatio="none"
              aria-label="Áreas interativas dos terrenos"
            >
              {lots.map((entry) => (
                <Lot
                  key={entry.id}
                  lot={entry}
                  state={lotStates[entry.id]}
                  selected={selectedLot === entry.id}
                  placementMode={canPlace}
                  onSelect={handleLotClick}
                />
              ))}
              {lots.map((entry) => (
                <LotPieces
                  key={`pieces-${entry.id}`}
                  lot={entry}
                  state={lotStates[entry.id]}
                />
              ))}
            </svg>
          </div>
        </div>
      </section>

      <aside className="inspection-panel">
        {connectionLabel && <div className="connection-label">{connectionLabel}</div>}

        {phase === 'auction' && auctionState ? (
          <AuctionPanel
            auctionState={auctionState}
            auction={activeAuction}
            players={players}
            currentBidder={currentBidder}
            highestBidder={highestBidder}
            bidAmount={bidAmount}
            setBidAmount={setBidAmount}
            error={actionError}
            canAct={canBid && !busy}
            waiting={canBid ? null : currentBidder?.name}
            onBid={() => dispatch({ type: 'BID', actorId: myPlayerId, amount: Number(bidAmount) })}
            onPass={() => dispatch({ type: 'PASS', actorId: myPlayerId })}
            onBorrow={() => dispatch({ type: 'BORROW', actorId: myPlayerId })}
          />
        ) : phase === 'placement' && auctionResult ? (
          <PlacementPanel
            winner={winner}
            auctionResult={auctionResult}
            selectedCubeId={selectedPlacementCubeId}
            setSelectedCubeId={setSelectedPlacementCubeId}
            selectedLot={lot}
            selectedLotState={lotState}
            error={actionError}
            lastResolution={lastLotResolution}
            players={players}
            canAct={canPlace && !busy}
          />
        ) : phase === 'end' ? (
          <FinalScorePanel result={finalResult} lotsById={lotsById} />
        ) : (
          <div>
            <span className="eyebrow">fase 1 · mover o corretor</span>
            <h2>{lot ? (lot.multiplier ? 'Terreno ×2' : `Terreno ${lot.value}M`) : inspectedAuction ? 'Leilão' : 'Corretor'}</h2>

            {lot ? (
              <>
                <p>{district?.name}. {lotState?.sold ? 'Este terreno já foi vendido.' : `${lotState?.cubes.length ?? 0} de 7 cubos colocados.`}</p>
                <div className="inspection-panel__box">
                  <span>Valor base</span>
                  <strong>{lot.multiplier ? '×2' : `${lot.value}M`}</strong>
                  {lot.multiplier && (
                    <small>Multiplica: {multiplierTargets.map((target) => `${target.value}M`).join(', ')}.</small>
                  )}
                  {lotState?.ownerId && (
                    <small>Proprietário: {players.find((player) => player.id === lotState.ownerId)?.name ?? lotState.ownerId}.</small>
                  )}
                </div>
              </>
            ) : inspectedAuction ? (
              <>
                <p>{brokerSpaceId === inspectedAuction.id ? 'O corretor está neste espaço.' : 'Espaço da trilha de leilão.'}</p>
                <AuctionCubeDetail auction={inspectedAuction} />
              </>
            ) : (
              <p>O corretor percorre os espaços de leilão no sentido horário, ignorando os que já estiverem vazios.</p>
            )}
          </div>
        )}

        {phase === 'move' && (
          <div className="broker-controls">
            <span className="eyebrow">rodada {roundNumber} · movimento</span>
            <div className="die-readout" aria-live="polite">
              <span>Último dado</span>
              <strong>{lastRoll ?? '—'}</strong>
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={() => dispatch({ type: 'ROLL', actorId: myPlayerId })}
              disabled={!canRoll || busy || !brokerSpaceId}
            >
              Rolar dado
            </button>
            <small>
              {canRoll
                ? 'É a sua vez de rolar.'
                : `Aguardando ${players[roundStarterIndex]?.name ?? 'outro jogador'} rolar o dado.`}
            </small>
            {actionError && <p className="auction-error" role="alert">{actionError}</p>}
          </div>
        )}

        <div className="setup-summary">
          <span className="eyebrow">cubos ainda na trilha</span>
          <div className="cube-counts">
            {Object.entries(COLOR_NAMES).map(([color, name]) => (
              <div key={color} className="cube-count">
                <Cube color={color} small />
                <span>{name}</span>
                <strong>{cubeCounts[color] ?? 0}</strong>
              </div>
            ))}
          </div>

          {onReset && (
            <button className="secondary-button" type="button" onClick={onReset} disabled={busy}>
              Nova preparação
            </button>
          )}
        </div>

        <div className="phase-card">
          <span>Estado da rodada</span>
          <strong>{phase === 'move' ? 'Corretor' : phase === 'auction' ? 'Leilão' : phase === 'placement' ? 'Colocação' : 'Encerrada'}</strong>
          <small>
            {phase === 'placement'
              ? `${auctionResult?.cubes.length ?? 0} cubo(s) ainda precisam ser colocados.`
              : phase === 'end'
                ? `${endGameResolutions.length} terreno(s) incompleto(s) resolvido(s) no encerramento.`
                : `Rodada ${roundNumber} de 18.`}
          </small>
        </div>
      </aside>
    </div>
  );
}

function AuctionCubeDetail({ auction }) {
  if (!auction) return null;
  return (
    <div className="inspection-panel__box auction-detail">
      <span>Cubos neste espaço</span>
      <div className="auction-detail__cubes">
        {auction.cubes.map((color, index) => (
          <span key={`${auction.id}-detail-${index}`} className="auction-detail__cube">
            <Cube color={color} />
            <small>{COLOR_NAMES[color]}</small>
          </span>
        ))}
      </div>
    </div>
  );
}

function PlacementPanel({ winner, auctionResult, selectedCubeId, setSelectedCubeId, selectedLot, selectedLotState, error, lastResolution, players, canAct }) {
  return (
    <div className="placement-panel">
      <span className="eyebrow">fase 3 · colocar cubos</span>
      <h2>{winner?.name ?? 'Vencedor'} coloca</h2>
      <p>{canAct ? 'Selecione um cubo e depois clique no terreno onde deseja colocá-lo.' : `Aguardando ${winner?.name ?? 'o vencedor'} distribuir os quatro cubos.`}</p>

      <div className="placement-cubes" aria-label="Cubos ainda não colocados">
        {auctionResult.cubes.map((cube) => (
          <button
            key={cube.id}
            type="button"
            className={`placement-cube-button${cube.id === selectedCubeId ? ' placement-cube-button--selected' : ''}`}
            onClick={() => setSelectedCubeId(cube.id)}
            aria-pressed={cube.id === selectedCubeId}
            disabled={!canAct}
          >
            <Cube color={cube.color} />
            <span>{COLOR_NAMES[cube.color]}</span>
          </button>
        ))}
      </div>

      <div className="placement-target">
        <span>Destino</span>
        <strong>{selectedLot ? selectedLot.multiplier ? 'Terreno ×2' : `${selectedLot.value}M` : 'Clique em um terreno'}</strong>
        <small>
          {selectedLotState?.sold
            ? 'Este terreno já foi vendido.'
            : selectedLotState
              ? `${selectedLotState.cubes.length}/7 cubos atualmente.`
              : 'Terrenos vendidos não podem receber novos cubos.'}
        </small>
      </div>

      {lastResolution && <ResolutionNotice resolution={lastResolution} players={players} />}
      {error && <p className="auction-error" role="alert">{error}</p>}
    </div>
  );
}

function ResolutionNotice({ resolution, players }) {
  const owner = players.find((player) => player.id === resolution.ownerId);
  const countText = Object.entries(resolution.counts)
    .map(([color, count]) => `${COLOR_NAMES[color]} ${count}`)
    .join(' · ');

  return (
    <div className="resolution-notice" aria-live="polite">
      <span>Terreno vendido</span>
      <strong>{owner ? owner.name : 'Sem proprietário'}</strong>
      <small>{countText}</small>
    </div>
  );
}

function AuctionPanel({ auctionState, auction, players, currentBidder, highestBidder, bidAmount, setBidAmount, error, canAct, waiting, onBid, onPass, onBorrow }) {
  const payout = currentBidder ? loanPayout(currentBidder) : 0;
  const borrowEnabled = canAct && currentBidder ? canBorrow(currentBidder, auctionState) : false;
  const passed = new Set(auctionState.passedPlayerIds);

  return (
    <div className="auction-panel">
      <span className="eyebrow">fase 2 · leilão</span>
      <h2>{currentBidder ? `Vez de ${currentBidder.name}` : 'Leilão'}</h2>
      <AuctionCubeDetail auction={auction} />

      <div className="auction-status-grid">
        <div>
          <span>Maior lance</span>
          <strong>{auctionState.currentBid ? `${auctionState.currentBid}M` : '—'}</strong>
          <small>{highestBidder?.name ?? 'nenhum lance ainda'}</small>
        </div>
        <div>
          <span>Lance mínimo</span>
          <strong>{minimumBid(auctionState)}M</strong>
          <small>sempre +1M ou mais</small>
        </div>
      </div>

      <div className="bidder-list" aria-label="Situação dos jogadores no leilão">
        {players.map((player) => (
          <div
            className={`bidder-row${player.id === currentBidder?.id ? ' bidder-row--active' : ''}${passed.has(player.id) ? ' bidder-row--passed' : ''}`}
            key={player.id}
          >
            <span className="bidder-row__name"><Cube color={player.id} small /> {player.name}</span>
            <span>{passed.has(player.id) ? 'passou' : player.id === highestBidder?.id ? 'liderando' : `${player.money}M`}</span>
          </div>
        ))}
      </div>

      {currentBidder && canAct ? (
        <div className="bid-controls">
          <label htmlFor="bid-amount">Seu lance</label>
          <div className="bid-input-row">
            <input
              id="bid-amount"
              type="number"
              min={minimumBid(auctionState)}
              max={currentBidder.money}
              step="1"
              value={bidAmount}
              onChange={(event) => setBidAmount(event.target.value)}
            />
            <span>M</span>
          </div>
          <button className="primary-button" type="button" onClick={onBid}>Fazer lance</button>
          <button className="secondary-button auction-pass-button" type="button" onClick={onPass}>Passar</button>
          <button className="loan-button" type="button" onClick={onBorrow} disabled={!borrowEnabled}>
            Empréstimo: +{payout}M / dívida +10M
          </button>
          <small className="loan-note">Só pode pegar um empréstimo por rodada. O 1º rende 9M, o 2º 8M, o 3º 7M e assim por diante.</small>
        </div>
      ) : (
        <p className="waiting-note">Aguardando {waiting ?? 'outro jogador'}.</p>
      )}

      {error && <p className="auction-error" role="alert">{error}</p>}
    </div>
  );
}
