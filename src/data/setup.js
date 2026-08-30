import { auctionSpaces as auctionLayout, players } from './board.js';

const CUBES_PER_PLAYER = 18;
const CUBES_PER_AUCTION = 4;

function shuffle(items, random = Math.random) {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function hasAtLeastTwoColors(cubes) {
  return new Set(cubes).size >= 2;
}

/**
 * Creates the official four-player cube setup:
 * - 72 cubes total;
 * - 18 cubes of each player color;
 * - 4 cubes on each of the 18 auction spaces;
 * - every auction space contains at least two different colors.
 */
export function createAuctionSetup(random = Math.random) {
  const bag = players.flatMap((player) =>
    Array.from({ length: CUBES_PER_PLAYER }, () => player.id),
  );

  // A rejected shuffle is cheap here and keeps the distribution completely random
  // among all arrangements that satisfy the setup restriction.
  for (let attempt = 0; attempt < 10000; attempt += 1) {
    const shuffled = shuffle(bag, random);
    const spaces = auctionLayout.map((space, index) => ({
      ...space,
      cubes: shuffled.slice(
        index * CUBES_PER_AUCTION,
        (index + 1) * CUBES_PER_AUCTION,
      ),
    }));

    if (spaces.every((space) => hasAtLeastTwoColors(space.cubes))) {
      return spaces;
    }
  }

  throw new Error('Não foi possível gerar uma distribuição válida de cubos.');
}

export function countAuctionCubes(spaces) {
  return spaces.reduce((counts, space) => {
    space.cubes.forEach((color) => {
      counts[color] = (counts[color] ?? 0) + 1;
    });
    return counts;
  }, {});
}

export function isValidAuctionSetup(spaces) {
  if (spaces.length !== 18) return false;

  if (spaces.some((space) => space.cubes.length !== CUBES_PER_AUCTION)) {
    return false;
  }

  if (spaces.some((space) => !hasAtLeastTwoColors(space.cubes))) {
    return false;
  }

  const counts = countAuctionCubes(spaces);
  return players.every((player) => counts[player.id] === CUBES_PER_PLAYER);
}
