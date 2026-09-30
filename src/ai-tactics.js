export function partnerTakesBall(landingX, humanX, partnerCoverX, partnerDistance, humanDistance) {
  const humanLane = Math.abs(humanX) > .55 ? Math.sign(humanX) : -Math.sign(partnerCoverX);
  if (landingX * humanLane > .45) return false;
  if (landingX * humanLane < -.45) return true;
  return partnerDistance + .45 < humanDistance;
}

export function opponentAimX(openSide, humanX, roll) {
  return roll < .45 ? Math.sign(humanX || -1) * 3.45 : openSide;
}
