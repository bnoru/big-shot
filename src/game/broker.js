const DIE_SIDES = 6;

export function rollDie(random = Math.random) {
  return Math.floor(random() * DIE_SIDES) + 1;
}

export function pickInitialBrokerSpace(spaces, random = Math.random) {
  const available = spaces.filter((space) => space.cubes.length > 0);
  if (available.length === 0) return null;

  const index = Math.floor(random() * available.length);
  return available[index].id;
}

/**
 * Move clockwise through the internal auction-space order.
 * Empty auction spaces do not count toward the die result.
 */
export function moveBroker(spaces, currentSpaceId, steps) {
  if (!Number.isInteger(steps) || steps < 1) {
    throw new Error('O movimento do corretor precisa ser um inteiro positivo.');
  }

  const availableCount = spaces.filter((space) => space.cubes.length > 0).length;
  if (availableCount === 0) return null;

  let index = spaces.findIndex((space) => space.id === currentSpaceId);
  if (index < 0) index = -1;

  let counted = 0;
  let inspected = 0;
  const maxInspections = spaces.length * steps + spaces.length;

  while (counted < steps && inspected < maxInspections) {
    index = (index + 1) % spaces.length;
    inspected += 1;

    if (spaces[index].cubes.length === 0) continue;
    counted += 1;
  }

  return counted === steps ? spaces[index].id : null;
}
