import { players, lots } from '../src/data/board.js';
import { applyGameAction, createInitialGameState, getActivePlayerId } from '../src/game/state.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

let game = createInitialGameState(players);
assert(game.auctionSpaces.length === 18, 'A partida deve começar com 18 espaços de leilão.');
assert(game.players.length === 4, 'A partida deve começar com quatro jogadores.');

for (let round = 1; round <= 18; round += 1) {
  game = applyGameAction(game, {
    type: 'ROLL',
    actorId: getActivePlayerId(game),
    die: ((round - 1) % 6) + 1,
  });

  let auctionGuard = 0;
  while (game.phase === 'auction' && auctionGuard < 8) {
    game = applyGameAction(game, { type: 'PASS', actorId: getActivePlayerId(game) });
    auctionGuard += 1;
  }
  assert(game.phase === 'placement', `Rodada ${round}: o leilão deveria chegar à colocação.`);

  while (game.phase === 'placement') {
    const cube = game.auctionResult.cubes[0];
    const target = lots.find((lot) => {
      const state = game.lotStates[lot.id];
      return !state.sold && state.cubes.length < 7;
    });
    assert(target, 'Deve existir um terreno apto a receber o cubo.');

    game = applyGameAction(game, {
      type: 'PLACE_CUBE',
      actorId: getActivePlayerId(game),
      cubeId: cube.id,
      lotId: target.id,
    });
  }
}

assert(game.phase === 'end', 'A partida deve terminar após a 18ª rodada.');
assert(game.finalResult?.scorecards?.length === 4, 'A pontuação final deve conter quatro jogadores.');

let illegal = createInitialGameState(players);
let rejected = false;
try {
  illegal = applyGameAction(illegal, { type: 'ROLL', actorId: 'blue', die: 3 });
} catch {
  rejected = true;
}
assert(rejected, 'Uma pessoa não deve conseguir agir pela cor de outro jogador.');

console.log('Big Shot game-state tests: OK');
