/**
 * State for the 13 city lots. Cubes are player/color ids.
 */
export function createLotStates(lots) {
  return Object.fromEntries(lots.map((lot) => [
    lot.id,
    {
      lotId: lot.id,
      cubes: [],
      sold: false,
      ownerId: null,
    },
  ]));
}

export function countColors(cubes) {
  return cubes.reduce((counts, color) => {
    counts[color] = (counts[color] ?? 0) + 1;
    return counts;
  }, {});
}

/**
 * Big Shot ownership rule:
 * - the color with the largest unique count owns the lot;
 * - if the largest count is tied, all colors tied at that count are ignored;
 * - continue with the next-highest count;
 * - if no unique count remains, nobody owns the lot.
 */
export function resolveLotOwner(cubes) {
  const counts = countColors(cubes);
  const entries = Object.entries(counts).filter(([, count]) => count > 0);
  if (entries.length === 0) return null;

  const levels = [...new Set(entries.map(([, count]) => count))]
    .sort((a, b) => b - a);

  for (const level of levels) {
    const contenders = entries.filter(([, count]) => count === level);
    if (contenders.length === 1) return contenders[0][0];
  }

  return null;
}

export function canPlaceOnLot(lotState) {
  return Boolean(lotState && !lotState.sold && lotState.cubes.length < 7);
}

/**
 * Places one cube. When the seventh cube enters a lot, ownership is resolved
 * immediately. The six losing cubes leave play and one cube of the owner
 * remains on the sold lot, matching the physical-game procedure.
 */
export function placeCubeOnLot(lotStates, lotId, color) {
  const current = lotStates[lotId];
  if (!current) throw new Error('Terreno inválido.');
  if (!color) throw new Error('Selecione um cubo antes de escolher o terreno.');
  if (current.sold) throw new Error('Este terreno já foi vendido.');
  if (current.cubes.length >= 7) throw new Error('Este terreno já atingiu o limite de 7 cubos.');

  const cubesBeforeResolution = [...current.cubes, color];
  let nextLot = {
    ...current,
    cubes: cubesBeforeResolution,
  };
  let resolution = null;

  if (cubesBeforeResolution.length === 7) {
    const ownerId = resolveLotOwner(cubesBeforeResolution);
    nextLot = {
      ...nextLot,
      sold: true,
      ownerId,
      cubes: ownerId ? [ownerId] : [],
    };
    resolution = {
      lotId,
      ownerId,
      counts: countColors(cubesBeforeResolution),
      cubesBeforeResolution,
    };
  }

  return {
    lotStates: {
      ...lotStates,
      [lotId]: nextLot,
    },
    resolution,
  };
}
