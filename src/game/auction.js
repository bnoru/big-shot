const LOAN_FACE_VALUE = 10;

function indexOfPlayer(players, playerId) {
  return players.findIndex((player) => player.id === playerId);
}

function findNextPlayer(players, fromPlayerId, predicate) {
  if (players.length === 0) return null;

  let index = indexOfPlayer(players, fromPlayerId);
  if (index < 0) index = -1;

  for (let step = 1; step <= players.length; step += 1) {
    const candidate = players[(index + step) % players.length];
    if (predicate(candidate)) return candidate.id;
  }

  return null;
}

export function createAuctionState(players, rollerId, spaceId) {
  const firstBidderId = findNextPlayer(players, rollerId, () => true);

  return {
    spaceId,
    rollerId,
    currentBidderId: firstBidderId,
    currentBid: 0,
    highestBidderId: null,
    passedPlayerIds: [],
    borrowedPlayerIds: [],
    status: 'bidding',
    winnerId: null,
    price: null,
  };
}

export function minimumBid(auction) {
  return auction.currentBid + 1;
}

export function loanPayout(player) {
  return Math.max(0, 9 - player.loans);
}

export function canBorrow(player, auction) {
  return (
    auction.status === 'bidding'
    && auction.currentBidderId === player.id
    && !auction.borrowedPlayerIds.includes(player.id)
    && loanPayout(player) > 0
  );
}

export function borrowForAuction(players, auction, playerId) {
  const player = players.find((entry) => entry.id === playerId);
  if (!player) throw new Error('Jogador inválido.');
  if (!canBorrow(player, auction)) {
    throw new Error('Este jogador não pode pegar outro empréstimo nesta rodada.');
  }

  const payout = loanPayout(player);
  const updatedPlayers = players.map((entry) => (
    entry.id === playerId
      ? { ...entry, money: entry.money + payout, loans: entry.loans + 1 }
      : entry
  ));

  return {
    players: updatedPlayers,
    auction: {
      ...auction,
      borrowedPlayerIds: [...auction.borrowedPlayerIds, playerId],
    },
    payout,
    debtAdded: LOAN_FACE_VALUE,
  };
}

function resolveAuction(auction, winnerId, price) {
  return {
    ...auction,
    currentBidderId: null,
    status: 'resolved',
    winnerId,
    price,
  };
}

function remainingChallengers(players, auction) {
  return players.filter((player) => (
    !auction.passedPlayerIds.includes(player.id)
    && player.id !== auction.highestBidderId
  ));
}

export function placeBid(players, auction, playerId, amount) {
  if (auction.status !== 'bidding') throw new Error('O leilão já terminou.');
  if (auction.currentBidderId !== playerId) throw new Error('Não é a vez deste jogador.');

  const player = players.find((entry) => entry.id === playerId);
  if (!player) throw new Error('Jogador inválido.');

  const numericAmount = Number(amount);
  if (!Number.isInteger(numericAmount)) throw new Error('O lance precisa ser um valor inteiro em M.');
  if (numericAmount < minimumBid(auction)) {
    throw new Error(`O lance mínimo é ${minimumBid(auction)}M.`);
  }
  if (numericAmount > player.money) {
    throw new Error('O jogador não possui dinheiro suficiente para este lance.');
  }

  const nextAuction = {
    ...auction,
    currentBid: numericAmount,
    highestBidderId: playerId,
  };

  const challengers = remainingChallengers(players, nextAuction);
  if (challengers.length === 0) {
    return resolveAuction(nextAuction, playerId, numericAmount);
  }

  return {
    ...nextAuction,
    currentBidderId: findNextPlayer(
      players,
      playerId,
      (candidate) => (
        !nextAuction.passedPlayerIds.includes(candidate.id)
        && candidate.id !== playerId
      ),
    ),
  };
}

export function passBid(players, auction, playerId) {
  if (auction.status !== 'bidding') throw new Error('O leilão já terminou.');
  if (auction.currentBidderId !== playerId) throw new Error('Não é a vez deste jogador.');

  const passedPlayerIds = [...auction.passedPlayerIds, playerId];
  const nextAuction = { ...auction, passedPlayerIds };

  // Special rule: if everybody passes without a single bid, the roller takes the cubes for free.
  if (auction.highestBidderId === null) {
    if (passedPlayerIds.length === players.length) {
      return resolveAuction(nextAuction, auction.rollerId, 0);
    }

    return {
      ...nextAuction,
      currentBidderId: findNextPlayer(
        players,
        playerId,
        (candidate) => !passedPlayerIds.includes(candidate.id),
      ),
    };
  }

  const challengers = remainingChallengers(players, nextAuction);
  if (challengers.length === 0) {
    return resolveAuction(nextAuction, auction.highestBidderId, auction.currentBid);
  }

  return {
    ...nextAuction,
    currentBidderId: findNextPlayer(
      players,
      playerId,
      (candidate) => (
        !passedPlayerIds.includes(candidate.id)
        && candidate.id !== auction.highestBidderId
      ),
    ),
  };
}

export function payAuctionPrice(players, winnerId, price) {
  return players.map((player) => {
    if (player.id !== winnerId) return player;
    if (price > player.money) throw new Error('O vencedor não possui dinheiro suficiente para pagar o lance.');
    return { ...player, money: player.money - price };
  });
}
