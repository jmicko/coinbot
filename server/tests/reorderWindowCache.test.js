import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createReorderWindowCache,
  createReorderWindowKey,
  orderUpdateAffectsReorderWindow,
  parseReorderWindowKey,
} from '../modules/database/reorderWindowCache.js';

test('reorder window keys normalize product order and duplicates', () => {
  const first = createReorderWindowKey(20, ['ETH-USD', 'BTC-USD', 'ETH-USD']);
  const second = createReorderWindowKey('20', ['BTC-USD', 'ETH-USD']);

  assert.equal(first, second);
  assert.deepEqual(parseReorderWindowKey(first), {
    limit: 20,
    productIDs: ['BTC-USD', 'ETH-USD'],
  });
});

test('reorder windows are cached by user, limit, and active products', async () => {
  const loadedKeys = [];
  const cache = createReorderWindowCache(async (userID, key) => {
    loadedKeys.push([userID, key]);
    return [{ order_id: `${userID}-${key}` }];
  });
  const firstKey = createReorderWindowKey(20, ['BTC-USD']);
  const secondKey = createReorderWindowKey(10, ['BTC-USD']);

  const first = await cache.get(1, firstKey);
  assert.equal(await cache.get(1, firstKey), first);
  await cache.get(1, secondKey);
  await cache.get(2, firstKey);

  assert.deepEqual(loadedKeys, [
    [1, firstKey],
    [1, secondKey],
    [2, firstKey],
  ]);
});

test('reorder window invalidation reloads the current key', async () => {
  let loadCount = 0;
  const cache = createReorderWindowCache(async () => {
    loadCount += 1;
    return [{ loadCount }];
  });
  const key = createReorderWindowKey(20, ['BTC-USD']);

  assert.deepEqual(await cache.get(1, key), [{ loadCount: 1 }]);
  cache.invalidate(1);
  assert.deepEqual(await cache.get(1, key), [{ loadCount: 2 }]);
});

test('only reorder-window-affecting order updates require invalidation', () => {
  const affectingUpdates = [
    { reorder: true },
    { reorder: false },
    { product_id: 'ETH-USD' },
    { limit_price: 100 },
    { limit_price: 0 },
    { side: 'BUY' },
    { flipped: true },
    { flipped: false },
    { will_cancel: true },
    { will_cancel: false },
    { order_configuration: { limit_limit_gtc: { limit_price: '100' } } },
  ];
  const unrelatedUpdates = [
    { base_size: 1 },
    { settled: true },
    { filled_at: new Date() },
    { status: 'FILLED' },
    { total_fees: 1 },
    { trade_pair_ratio: 2 },
  ];

  affectingUpdates.forEach((update) => {
    assert.equal(orderUpdateAffectsReorderWindow(update), true);
  });
  unrelatedUpdates.forEach((update) => {
    assert.equal(orderUpdateAffectsReorderWindow(update), false);
  });
});
