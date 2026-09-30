import test from 'node:test';
import assert from 'node:assert/strict';
import { serverIndexForGame, serviceSideForPoint, isLegalServeBounce } from '../src/match-rules.js';

test('service alternates teams and players across games', () => {
  assert.deepEqual(Array.from({ length: 8 }, (_, game) => serverIndexForGame(game)), [0, 2, 1, 3, 0, 2, 1, 3]);
});

test('server changes diagonal side after every point', () => {
  assert.equal(serviceSideForPoint(0, 0), 1);
  assert.equal(serviceSideForPoint(1, 0), -1);
  assert.equal(serviceSideForPoint(1, 1), 1);
  assert.equal(serviceSideForPoint(3, 3), 1);
});

test('a serve must bounce in the opposite diagonal service box', () => {
  assert.equal(isLegalServeBounce(-2.5, -3.5, 1, 1), true);
  assert.equal(isLegalServeBounce(2.5, -3.5, 1, 1), false);
  assert.equal(isLegalServeBounce(-2.5, -7.2, 1, 1), false);
  assert.equal(isLegalServeBounce(2.5, 3.5, -1, 1), true);
  assert.equal(isLegalServeBounce(0, -6.95, 1, 1), true);
  assert.equal(isLegalServeBounce(-5, -3.5, 1, 1), true);
});
