import { lots, lotsById } from '../data/board.js';
import { createAuctionSetup } from '../data/setup.js';
import { moveBroker, pickInitialBrokerSpace, rollDie } from './broker.js';
import {
  borrowForAuction,
  createAuctionState,
  passBid,
  payAuctionPrice,
  placeBid,
} from './auction.js';
import { createLotStates, placeCubeOnLot } from './placement.js';
import { calculateFinalScores, resolveIncompleteLots } from './scoring.js';

export const GAME_STATE_VERSION = 1;

export function normalizePlayers(players) {
  return players.map((player) => ({
    id: player.id,
    name: player.name,
    userId: player.userId ?? null,
    money: Number.isFinite(player.money) ? player.money : 10,
    loans: Number.isFinite(player.loans) ? player.loans : 0,
  }));
}

export function createInitialGameState(players, random = Math.random) {
  const normalizedPlayers = normalizePlayers(players);
  if (normalizedPlayers.length !== 4) {
    throw new Error('A versão multiplayer atual exige exatamente 4 jogadores.');
  }

  const auctionSpaces = createAuctionSetup(random);

  return {
    schemaVersion: GAME_STATE_VERSION,
    players: normalizedPlayers,
    auctionSpaces,
    lotStates: createLotStates(lots),
    brokerSpaceId: pickInitialBrokerSpace(auctionSpaces, random),
    lastRoll: null,
    roundStarterIndex: 0,
    roundNumber: 1,
    phase: 'move',
    auctionState: null,
    auctionResult: null,
    lastLotResolution: null,
    finalResult: null,
    endGameResolutions: [],
  };
}

export function getActivePlayerId(game) {
  if (!game) return null;
  if (game.phase === 'move') return game.players[game.roundStarterIndex]?.id ?? null;
  if (game.phase === 'auction') return game.auctionState?.currentBidderId ?? null;
  if (game.phase === 'placement') return game.auctionResult?.winnerId ?? null;
  return null;
}

export function getActiveLabel(game) {
  if (!game) return '';
  if (game.phase === 'move') return 'rola o dado';
  if (game.phase === 'auction') return 'lance atual';
  if (game.phase === 'placement') return 'coloca os cubos';
  return 'fim da partida';
}

function requireActor(game, actorId, expectedPlayerId, message = 'Esta ação pertence a outro jogador.') {
  if (!actorId || actorId !== expectedPlayerId) {
    throw new Error(message);
  }
}

function resolveAuctionIntoPlacement(game, resolvedAuction) {
  const space = game.auctionSpaces.find((entry) => entry.id === resolvedAuction.spaceId);
  if (!space || space.cubes.length === 0) {
    throw new Error('Os cubos deste espaço de leilão já foram retirados.');
  }

  const wonCubes = space.cubes.map((color, index) => ({
    id: `r${game.roundNumber}-a${resolvedAuction.spaceId}-c${index}`,
    color,
  }));

  return {
    ...game,
    players: payAuctionPrice(game.players, resolvedAuction.winnerId, resolvedAuction.price),
    auctionSpaces: game.auctionSpaces.map((entry) => (
      entry.id === resolvedAuction.spaceId ? { ...entry, cubes: [] } : entry
    )),
    auctionState: resolvedAuction,
    auctionResult: {
      winnerId: resolvedAuction.winnerId,
      price: resolvedAuction.price,
      cubes: wonCubes,
    },
    lastLotResolution: null,
    phase: 'placement',
  };
}

function finishPlacement(game, finalLotStates) {
  if (game.roundNumber >= 18) {
    const endGame = resolveIncompleteLots(finalLotStates);
    const finalResult = calculateFinalScores(game.players, lots, lotsById, endGame.lotStates);

    return {
      ...game,
      lotStates: endGame.lotStates,
      auctionState: null,
      auctionResult: null,
      lastRoll: null,
      endGameResolutions: endGame.resolutions,
      finalResult,
      phase: 'end',
    };
  }

  return {
    ...game,
    lotStates: finalLotStates,
    auctionState: null,
    auctionResult: null,
    lastRoll: null,
    roundStarterIndex: (game.roundStarterIndex + 1) % game.players.length,
    roundNumber: game.roundNumber + 1,
    phase: 'move',
  };
}

function actionRoll(game, action) {
  if (game.phase !== 'move') throw new Error('O corretor só pode ser movido na fase de movimento.');
  const rollerId = game.players[game.roundStarterIndex]?.id;
  requireActor(game, action.actorId, rollerId, 'Somente o jogador inicial da rodada pode rolar o dado.');

  const die = action.die ?? rollDie();
  if (!Number.isInteger(die) || die < 1 || die > 6) throw new Error('Resultado de dado inválido.');

  const destination = moveBroker(game.auctionSpaces, game.brokerSpaceId, die);
  if (destination === null) throw new Error('Não há mais espaços de leilão disponíveis.');

  return {
    ...game,
    brokerSpaceId: destination,
    lastRoll: die,
    auctionState: createAuctionState(game.players, rollerId, destination),
    auctionResult: null,
    lastLotResolution: null,
    phase: 'auction',
  };
}

function actionBid(game, action) {
  if (game.phase !== 'auction' || !game.auctionState) throw new Error('Não há um leilão em andamento.');
  requireActor(game, action.actorId, game.auctionState.currentBidderId, 'Não é a sua vez de dar lance.');

  const nextAuction = placeBid(game.players, game.auctionState, action.actorId, Number(action.amount));
  return nextAuction.status === 'resolved'
    ? resolveAuctionIntoPlacement(game, nextAuction)
    : { ...game, auctionState: nextAuction };
}

function actionPass(game, action) {
  if (game.phase !== 'auction' || !game.auctionState) throw new Error('Não há um leilão em andamento.');
  requireActor(game, action.actorId, game.auctionState.currentBidderId, 'Não é a sua vez de passar.');

  const nextAuction = passBid(game.players, game.auctionState, action.actorId);
  return nextAuction.status === 'resolved'
    ? resolveAuctionIntoPlacement(game, nextAuction)
    : { ...game, auctionState: nextAuction };
}

function actionBorrow(game, action) {
  if (game.phase !== 'auction' || !game.auctionState) throw new Error('Empréstimos são feitos durante um leilão.');
  requireActor(game, action.actorId, game.auctionState.currentBidderId, 'Não é a sua vez de pegar empréstimo.');

  const result = borrowForAuction(game.players, game.auctionState, action.actorId);
  return {
    ...game,
    players: result.players,
    auctionState: result.auction,
  };
}

function actionPlaceCube(game, action) {
  if (game.phase !== 'placement' || !game.auctionResult) throw new Error('Não há cubos aguardando colocação.');
  requireActor(game, action.actorId, game.auctionResult.winnerId, 'Somente o vencedor do leilão pode colocar estes cubos.');

  const selectedCube = game.auctionResult.cubes.find((cube) => cube.id === action.cubeId);
  if (!selectedCube) throw new Error('Este cubo não está mais disponível.');

  const placement = placeCubeOnLot(game.lotStates, action.lotId, selectedCube.color);
  const remainingCubes = game.auctionResult.cubes.filter((cube) => cube.id !== selectedCube.id);

  if (remainingCubes.length === 0) {
    return finishPlacement({ ...game, lastLotResolution: placement.resolution }, placement.lotStates);
  }

  return {
    ...game,
    lotStates: placement.lotStates,
    auctionResult: { ...game.auctionResult, cubes: remainingCubes },
    lastLotResolution: placement.resolution,
  };
}

export function applyGameAction(game, action) {
  if (!game) throw new Error('Estado da partida indisponível.');
  if (!action?.type) throw new Error('Ação inválida.');

  switch (action.type) {
    case 'ROLL': return actionRoll(game, action);
    case 'BID': return actionBid(game, action);
    case 'PASS': return actionPass(game, action);
    case 'BORROW': return actionBorrow(game, action);
    case 'PLACE_CUBE': return actionPlaceCube(game, action);
    default: throw new Error(`Ação desconhecida: ${action.type}`);
  }
}
