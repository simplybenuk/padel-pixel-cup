// Each pair keeps its order. Teams alternate service games.
export const SERVER_ORDER = [0, 2, 1, 3];

export function serverIndexForGame(completedGames) {
  return SERVER_ORDER[completedGames % SERVER_ORDER.length];
}

export function serviceSideForPoint(homePoints, rivalPoints) {
  return (homePoints + rivalPoints) % 2 === 0 ? 1 : -1;
}

export function isLegalServeBounce(x, z, serverSide, serviceSide) {
  const receivingSide = -serverSide;
  const targetHalf = -serverSide * serviceSide;
  return z * receivingSide > 0
    && Math.abs(z) <= 6.95
    && x * targetHalf >= 0
    && Math.abs(x) <= 5;
}
