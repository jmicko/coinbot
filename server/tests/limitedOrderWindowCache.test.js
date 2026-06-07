import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createLimitedOrderWindowCache,
  createLimitedOrderWindowKey,
  orderUpdateAffectsLimitedOrderWindow,
  parseLimitedOrderWindowKey,
} from '../modules/database/limitedOrderWindowCache.js';

test('limited-order window keys preserve active product order', () => {
  const key = createLimitedOrderWindowKey(
    '20',
    ['ETH-USD', 'BTC-USD', 'ETH-USD']
  );

  assert.deepEqual(parseLimitedOrderWindowKey(key), {
    limit: 20,
    productIDs: ['ETH-USD', 'BTC-USD'],
  });
});

test('limited-order windows are reused until invalidated', async () => {
  let loadCount = 0;
  const cache = createLimitedOrderWindowCache(async () => {
    loadCount += 1;
    return [{ order_id: `order-${loadCount}` }];
  });
  const key = createLimitedOrderWindowKey(20, ['BTC-USD']);

  const first = await cache.get(1, key);
  assert.equal(await cache.get(1, key), first);
  cache.invalidate(1);
  assert.deepEqual(await cache.get(1, key), [{ order_id: 'order-2' }]);
  assert.equal(loadCount, 2);
});

test('only limited-window-affecting order updates require invalidation', () => {
  const affectingUpdates = [
    { reorder: true },
    { reorder: false },
    { product_id: 'ETH-USD' },
    { limit_price: 100 },
    { limit_price: 0 },
    { side: 'BUY' },
    { flipped: true },
    { flipped: false },
    { settled: true },
    { settled: false },
    { will_cancel: true },
    { will_cancel: false },
    { order_configuration: { limit_limit_gtc: { limit_price: '100' } } },
  ];
  const unrelatedUpdates = [
    { base_size: 1 },
    { filled_at: new Date() },
    { status: 'FILLED' },
    { total_fees: 1 },
    { trade_pair_ratio: 2 },
  ];

  affectingUpdates.forEach((update) => {
    assert.equal(orderUpdateAffectsLimitedOrderWindow(update), true);
  });
  unrelatedUpdates.forEach((update) => {
    assert.equal(orderUpdateAffectsLimitedOrderWindow(update), false);
  });
});
