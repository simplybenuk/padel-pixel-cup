import test from 'node:test';
import assert from 'node:assert/strict';
import { partnerTakesBall, opponentAimX } from '../src/ai-tactics.js';

test('Mika leaves Juno to return shots in the half Juno occupies', () => {
  assert.equal(partnerTakesBall(3.4, 4.4, -2.2, 4, 1), false);
  assert.equal(partnerTakesBall(-3.4, 4.4, -2.2, 1, 8), true);
  assert.equal(partnerTakesBall(-3.4, -4.4, 2.2, 8, 1), false);
  assert.equal(partnerTakesBall(3.4, -4.4, 2.2, 1, 8), true);
});

test('rivals sometimes attack Juno even when Mika leaves a wider gap', () => {
  assert.equal(opponentAimX(-3.45, 4.4, .2), 3.45);
  assert.equal(opponentAimX(-3.45, 4.4, .8), -3.45);
});
