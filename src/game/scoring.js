import { countColors, resolveLotOwner } from './placement.js';

const LOAN_FACE_VALUE = 10;

/**
 * Resolves every lot that is still open after round 18 using the same ownership
 * rule used when a lot reaches seven cubes during play.
 */
export function resolveIncompleteLots(lotStates) {
  const nextStates = { ...lotStates };
  const resolutions = [];

  Object.entries(lotStates).forEach(([lotId, current]) => {
    if (current.sold) return;

    const ownerId = resolveLotOwner(current.cubes);
    nextStates[lotId] = {
      ...current,
      sold: Boolean(ownerId),
      resolved: true,
      ownerId,
      cubes: ownerId ? [ownerId] : [],
    };

    resolutions.push({
      lotId,
      ownerId,
      counts: countColors(current.cubes),
      cubesBeforeResolution: [...current.cubes],
      endGameResolution: true,
    });
  });

  return { lotStates: nextStates, resolutions };
}

function multiplierApplies(lot, playerId, lotStates, lotsById) {
  if (!lot || lot.multiplier) return false;

  return Object.values(lotsById).some((candidate) => (
    candidate.multiplier === 2
    && candidate.district === lot.district
    && candidate.scoringAdjacent?.includes(lot.id)
    && lotStates[candidate.id]?.ownerId === playerId
  ));
}

export function scorePlayer(player, lots, lotsById, lotStates) {
  const ownedLots = lots.filter((lot) => lotStates[lot.id]?.ownerId === player.id);

  const propertyBreakdown = ownedLots.map((lot) => {
    const doubled = multiplierApplies(lot, player.id, lotStates, lotsById);
    const scoredValue = lot.multiplier ? 0 : lot.value * (doubled ? 2 : 1);

    return {
      lotId: lot.id,
      baseValue: lot.value,
      multiplier: lot.multiplier ?? null,
      doubled,
      scoredValue,
    };
  });

  const propertyValue = propertyBreakdown.reduce((sum, lot) => sum + lot.scoredValue, 0);
  const debt = player.loans * LOAN_FACE_VALUE;
  const total = propertyValue + player.money - debt;
  const highestLotValue = propertyBreakdown.reduce(
    (highest, lot) => Math.max(highest, lot.scoredValue),
    0,
  );

  return {
    playerId: player.id,
    name: player.name,
    money: player.money,
    loans: player.loans,
    debt,
    ownedLotIds: ownedLots.map((lot) => lot.id),
    lotCount: ownedLots.length,
    propertyBreakdown,
    propertyValue,
    total,
    highestLotValue,
    eligible: ownedLots.length >= 2,
  };
}

/**
 * Official winner order:
 * 1) only players owning at least two lots are eligible;
 * 2) highest final financial status;
 * 3) most lots;
 * 4) most valuable single lot.
 * If players are still identical after all published tie-breakers, the result
 * remains a shared tie rather than inventing another criterion.
 */
export function determineWinners(scorecards) {
  const eligible = scorecards.filter((score) => score.eligible);
  if (eligible.length === 0) {
    return { winnerIds: [], criterion: 'no-eligible-player' };
  }

  const bestTotal = Math.max(...eligible.map((score) => score.total));
  let finalists = eligible.filter((score) => score.total === bestTotal);
  if (finalists.length === 1) {
    return { winnerIds: [finalists[0].playerId], criterion: 'financial-status' };
  }

  const mostLots = Math.max(...finalists.map((score) => score.lotCount));
  finalists = finalists.filter((score) => score.lotCount === mostLots);
  if (finalists.length === 1) {
    return { winnerIds: [finalists[0].playerId], criterion: 'lot-count' };
  }

  const highestLotValue = Math.max(...finalists.map((score) => score.highestLotValue));
  finalists = finalists.filter((score) => score.highestLotValue === highestLotValue);

  return {
    winnerIds: finalists.map((score) => score.playerId),
    criterion: finalists.length === 1 ? 'highest-lot' : 'shared-tie',
  };
}

export function calculateFinalScores(players, lots, lotsById, lotStates) {
  const scorecards = players.map((player) => scorePlayer(player, lots, lotsById, lotStates));
  const outcome = determineWinners(scorecards);

  const ordered = [...scorecards].sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    if (a.total !== b.total) return b.total - a.total;
    if (a.lotCount !== b.lotCount) return b.lotCount - a.lotCount;
    if (a.highestLotValue !== b.highestLotValue) return b.highestLotValue - a.highestLotValue;
    return a.name.localeCompare(b.name);
  });

  return { scorecards: ordered, ...outcome };
}
