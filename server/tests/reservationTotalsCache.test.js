import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createReservationTotalsCache,
  orderUpdateAffectsReservationTotals,
} from '../modules/database/reservationTotalsCache.js';

test('reservation totals are loaded once and reused', async () => {
  let loadCount = 0;
  const events = [];
  const expected = new Map([['BTC-USD', { base_spent: 1, quote_spent: 2 }]]);
  const cache = createReservationTotalsCache(async () => {
    loadCount += 1;
    return expected;
  }, event => events.push(event));

  assert.equal(await cache.get(1, 1.01), expected);
  assert.equal(await cache.get(1, 1.01), expected);
  assert.equal(loadCount, 1);
  assert.deepEqual(events, ['miss', 'load', 'hit']);
});

test('concurrent reservation reads share one database load', async () => {
  let resolveLoad;
  let loadCount = 0;
  const events = [];
  const cache = createReservationTotalsCache(() => {
    loadCount += 1;
    return new Promise(resolve => {
      resolveLoad = resolve;
    });
  }, event => events.push(event));

  const first = cache.get(1, 1.01);
  const second = cache.get(1, 1.01);
  const expected = new Map();
  resolveLoad(expected);

  assert.equal(await first, expected);
  assert.equal(await second, expected);
  assert.equal(loadCount, 1);
  assert.deepEqual(events, ['miss', 'load', 'inFlightHit']);
});

test('invalidation during a load retries instead of returning stale totals', async () => {
  const pendingLoads = [];
  let loadCount = 0;
  const cache = createReservationTotalsCache(() => {
    loadCount += 1;
    return new Promise(resolve => pendingLoads.push(resolve));
  });

  const firstRead = cache.get(1, 1.01);
  cache.invalidate(1);
  const secondRead = cache.get(1, 1.01);

  const stale = new Map([['BTC-USD', { base_spent: 1, quote_spent: 1 }]]);
  const fresh = new Map([['BTC-USD', { base_spent: 2, quote_spent: 2 }]]);
  pendingLoads[0](stale);
  pendingLoads[1](fresh);

  assert.equal(await firstRead, fresh);
  assert.equal(await secondRead, fresh);
  assert.equal(await cache.get(1, 1.01), fresh);
  assert.equal(loadCount, 2);
});

test('a taker fee change reloads reservation totals once', async () => {
  const loadedKeys = [];
  const cache = createReservationTotalsCache(async (userID, fee) => {
    loadedKeys.push([userID, fee]);
    return new Map([['BTC-USD', { quote_spent: fee }]]);
  });

  const first = await cache.get(1, 1.01);
  const second = await cache.get(1, 1.02);
  const third = await cache.get(1, 1.02);

  assert.equal(first.get('BTC-USD').quote_spent, 1.01);
  assert.equal(second.get('BTC-USD').quote_spent, 1.02);
  assert.equal(third, second);
  assert.deepEqual(loadedKeys, [[1, 1.01], [1, 1.02]]);
});

test('concurrent fee variants do not replace each other', async () => {
  const pendingLoads = new Map();
  const cache = createReservationTotalsCache((userID, fee) => (
    new Promise(resolve => pendingLoads.set(fee, resolve))
  ));

  const firstFeeRead = cache.get(1, 1.01);
  const secondFeeRead = cache.get(1, 1.02);
  const firstFeeTotals = new Map([['BTC-USD', { quote_spent: 1.01 }]]);
  const secondFeeTotals = new Map([['BTC-USD', { quote_spent: 1.02 }]]);
  pendingLoads.get(1.02)(secondFeeTotals);
  pendingLoads.get(1.01)(firstFeeTotals);

  assert.equal(await firstFeeRead, firstFeeTotals);
  assert.equal(await secondFeeRead, secondFeeTotals);
  assert.equal(await cache.get(1, 1.01), firstFeeTotals);
  assert.equal(await cache.get(1, 1.02), secondFeeTotals);
});

test('only reserve-affecting order updates require invalidation', () => {
  const affectingUpdates = [
    { product_id: 'ETH-USD' },
    { base_size: 1 },
    { base_size: 0 },
    { limit_price: 100 },
    { limit_price: 0 },
    { side: 'BUY' },
    { flipped: true },
    { flipped: false },
    { will_cancel: true },
    { will_cancel: false },
    { order_configuration: { limit_limit_gtc: { base_size: '1' } } },
    { order_configuration: { limit_limit_gtc: { limit_price: '100' } } },
  ];
  const metadataUpdates = [
    { reorder: true },
    { settled: true },
    { filled_at: new Date() },
    { status: 'FILLED' },
    { total_fees: 1 },
    { trade_pair_ratio: 2 },
  ];

  affectingUpdates.forEach(update => {
    assert.equal(orderUpdateAffectsReservationTotals(update), true);
  });
  metadataUpdates.forEach(update => {
    assert.equal(orderUpdateAffectsReservationTotals(update), false);
  });
});
