import assert from 'node:assert/strict';
import test from 'node:test';
import { createOrderIDCacheKey } from '../modules/database/limit_orders.js';

test('order ID cache keys normalize order and duplicates', () => {
  const first = createOrderIDCacheKey(['order-2', 'order-1', 'order-2']);
  const second = createOrderIDCacheKey(['order-1', 'order-2']);

  assert.equal(first, second);
  assert.equal(first, JSON.stringify(['order-1', 'order-2']));
});

test('order ID cache keys ignore empty values', () => {
  assert.equal(
    createOrderIDCacheKey(['order-1', null, undefined, '', 'order-2']),
    JSON.stringify(['order-1', 'order-2'])
  );
  assert.equal(createOrderIDCacheKey(), JSON.stringify([]));
});

test('order ID cache keys preserve ID boundaries', () => {
  assert.notEqual(
    createOrderIDCacheKey(['ab', 'c']),
    createOrderIDCacheKey(['a', 'bc'])
  );
});
