import assert from 'node:assert/strict';
import test from 'node:test';
import { createFundsRefreshGuard } from '../modules/runtime/fundsRefreshGuard.js';

test('funds refreshes remain deferred through the settlement grace period', () => {
  let currentTime = 1000;
  const guard = createFundsRefreshGuard({
    graceMs: 10000,
    now: () => currentTime,
  });

  guard.defer(1, 'trade flipped');
  assert.equal(guard.begin(1).deferred, true);

  currentTime = 10999;
  assert.equal(guard.begin(1).deferred, true);

  currentTime = 11000;
  assert.equal(guard.begin(1).deferred, false);
});

test('a reservation transition invalidates an in-flight funds snapshot', () => {
  let currentTime = 1000;
  const guard = createFundsRefreshGuard({
    graceMs: 10000,
    now: () => currentTime,
  });
  const snapshot = guard.begin(1);

  guard.defer(1, 'trade flipped');
  currentTime = 11000;

  assert.equal(guard.canPublish(1, snapshot), false);
  assert.equal(guard.canPublish(1, guard.begin(1)), true);
});

test('funds refresh guards are isolated by user', () => {
  const guard = createFundsRefreshGuard();
  const userTwoSnapshot = guard.begin(2);

  guard.defer(1, 'trade flipped');

  assert.equal(guard.begin(1).deferred, true);
  assert.equal(guard.canPublish(2, userTwoSnapshot), true);
});
