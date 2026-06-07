import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getDbMetricsSnapshot,
  recordCacheEvent,
  resetDbMetrics,
  runWithDbContext,
  trackDbQuery,
} from '../modules/dbMetrics.js';

test('database metrics report cache effectiveness', () => {
  resetDbMetrics();
  recordCacheEvent('test.cache', 'miss');
  recordCacheEvent('test.cache', 'load');
  recordCacheEvent('test.cache', 'hit');
  recordCacheEvent('test.cache', 'inFlightHit');
  recordCacheEvent('test.cache', 'invalidation');

  const snapshot = getDbMetricsSnapshot();
  assert.equal(snapshot.schemaVersion, 3);
  assert.deepEqual(snapshot.caches, [{
    name: 'test.cache',
    accessCount: 3,
    hitCount: 1,
    missCount: 1,
    inFlightHitCount: 1,
    loadCount: 1,
    invalidationCount: 1,
    hitRate: 0.6667,
  }]);
});

test('database queries remain attributed to their originating context', async () => {
  resetDbMetrics();

  await runWithDbContext('test.context', async () => {
    await trackDbQuery('SELECT 1', async () => ({
      command: 'SELECT',
      rowCount: 1,
      rows: [{ value: 1 }],
    }));
  });

  const snapshot = getDbMetricsSnapshot();
  const context = snapshot.contexts.find(
    (entry) => entry.name === 'test.context'
  );

  assert.equal(snapshot.totals.queryCount, 1);
  assert.deepEqual(snapshot.attribution, {
    attributedQueryCount: 1,
    uncategorizedQueryCount: 0,
    attributedRate: 1,
  });
  assert.equal(context.queryCount, 1);
  assert.equal(context.queriesPerInvocation, 1);
  assert.equal(
    snapshot.contexts.some((entry) => entry.name === 'uncategorized'),
    false
  );
});

test('parenthesized SELECT statements are classified as reads', async () => {
  resetDbMetrics();

  await trackDbQuery(
    '(SELECT 1) UNION ALL (SELECT 2)',
    async () => ({
      command: 'SELECT',
      rowCount: 2,
      rows: [{ value: 1 }, { value: 2 }],
    })
  );

  const snapshot = getDbMetricsSnapshot();
  assert.deepEqual(snapshot.totals.operationCounts, {
    read: 1,
    write: 0,
    transaction: 0,
    other: 0,
  });
});
