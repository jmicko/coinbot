import { AsyncLocalStorage } from 'async_hooks';

const dbContextStorage = new AsyncLocalStorage();
const slowQueryThresholdMs = Number(process.env.DB_SLOW_QUERY_MS || 250);
const maxRecentSlowQueries = 50;

let startedAt = new Date();
const totals = {
  queryCount: 0,
  totalMs: 0,
  errorCount: 0,
  slowCount: 0,
};
const contexts = new Map();
const queries = new Map();
const recentSlowQueries = [];

function createMetric() {
  return {
    queryCount: 0,
    totalMs: 0,
    maxMs: 0,
    errorCount: 0,
    slowCount: 0,
  };
}

function getMetric(map, key) {
  if (!map.has(key)) {
    map.set(key, createMetric());
  }
  return map.get(key);
}

function normalizeSql(query) {
  const sql = typeof query === 'string'
    ? query
    : query?.text || String(query);

  return sql.replace(/\s+/g, ' ').trim().slice(0, 300);
}

function normalizeHttpPath(path) {
  return path
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':uuid')
    .replace(/\/\d+(?=\/|$)/g, '/:id');
}

function getContextName() {
  return dbContextStorage.getStore()?.name || 'uncategorized';
}

function updateMetric(metric, durationMs, hasError, isSlow) {
  metric.queryCount += 1;
  metric.totalMs += durationMs;
  metric.maxMs = Math.max(metric.maxMs, durationMs);
  if (hasError) metric.errorCount += 1;
  if (isSlow) metric.slowCount += 1;
}

function toPublicMetric([name, metric]) {
  return {
    name,
    queryCount: metric.queryCount,
    totalMs: Number(metric.totalMs.toFixed(2)),
    avgMs: metric.queryCount ? Number((metric.totalMs / metric.queryCount).toFixed(2)) : 0,
    maxMs: Number(metric.maxMs.toFixed(2)),
    errorCount: metric.errorCount,
    slowCount: metric.slowCount,
  };
}

function recordDbQuery(query, durationMs, hasError) {
  const context = dbContextStorage.getStore();
  const contextName = context?.name || 'uncategorized';
  const sql = normalizeSql(query);
  const isSlow = durationMs >= slowQueryThresholdMs;

  totals.queryCount += 1;
  totals.totalMs += durationMs;
  if (hasError) totals.errorCount += 1;
  if (isSlow) totals.slowCount += 1;

  if (context) {
    context.queryCount += 1;
    context.totalMs += durationMs;
    context.maxMs = Math.max(context.maxMs, durationMs);
    if (hasError) context.errorCount += 1;
    if (isSlow) context.slowCount += 1;
  }

  updateMetric(getMetric(contexts, contextName), durationMs, hasError, isSlow);
  updateMetric(getMetric(queries, sql), durationMs, hasError, isSlow);

  if (isSlow) {
    const slowQuery = {
      timestamp: new Date().toISOString(),
      context: contextName,
      durationMs: Number(durationMs.toFixed(2)),
      sql,
    };

    recentSlowQueries.unshift(slowQuery);
    if (recentSlowQueries.length > maxRecentSlowQueries) {
      recentSlowQueries.length = maxRecentSlowQueries;
    }

    if (process.env.DB_SLOW_QUERY_LOG !== 'false') {
      console.log(`[db slow] ${slowQuery.durationMs}ms ${contextName}: ${sql}`);
    }
  }
}

function recordDbQueryResult(query, durationMs, hasError = false) {
  recordDbQuery(query, durationMs, hasError);
}

async function trackDbQuery(query, runQuery) {
  const start = performance.now();
  let hasError = false;

  try {
    return await runQuery();
  } catch (err) {
    hasError = true;
    throw err;
  } finally {
    recordDbQuery(query, performance.now() - start, hasError);
  }
}

function runWithDbContext(name, callback) {
  const parent = dbContextStorage.getStore();
  const context = {
    name,
    parent: parent?.name || null,
    queryCount: 0,
    totalMs: 0,
    maxMs: 0,
    errorCount: 0,
    slowCount: 0,
  };

  return dbContextStorage.run(context, callback);
}

function dbMetricsMiddleware(req, res, next) {
  const path = normalizeHttpPath(req.originalUrl.split('?')[0]);
  const contextName = `http ${req.method} ${path}`;

  runWithDbContext(contextName, () => {
    const context = dbContextStorage.getStore();
    const start = performance.now();

    res.on('finish', () => {
      if (process.env.DB_METRICS_HTTP_LOG === 'true' && context.queryCount > 0) {
        const elapsedMs = Number((performance.now() - start).toFixed(2));
        console.log(
          `[db request] ${contextName} ${res.statusCode}: ` +
          `${context.queryCount} queries, ${context.totalMs.toFixed(2)}ms db, ${elapsedMs}ms total`
        );
      }
    });

    next();
  });
}

function getDbMetricsSnapshot({ limit = 20 } = {}) {
  const contextMetrics = [...contexts.entries()]
    .map(toPublicMetric)
    .sort((a, b) => b.totalMs - a.totalMs)
    .slice(0, limit);

  const queryMetrics = [...queries.entries()]
    .map(toPublicMetric)
    .sort((a, b) => b.totalMs - a.totalMs)
    .slice(0, limit);

  return {
    startedAt,
    uptimeSeconds: Number(((Date.now() - startedAt.getTime()) / 1000).toFixed(1)),
    slowQueryThresholdMs,
    totals: {
      queryCount: totals.queryCount,
      totalMs: Number(totals.totalMs.toFixed(2)),
      avgMs: totals.queryCount ? Number((totals.totalMs / totals.queryCount).toFixed(2)) : 0,
      errorCount: totals.errorCount,
      slowCount: totals.slowCount,
    },
    contexts: contextMetrics,
    queries: queryMetrics,
    recentSlowQueries,
  };
}

function resetDbMetrics() {
  startedAt = new Date();
  totals.queryCount = 0;
  totals.totalMs = 0;
  totals.errorCount = 0;
  totals.slowCount = 0;
  contexts.clear();
  queries.clear();
  recentSlowQueries.length = 0;
}

export {
  dbMetricsMiddleware,
  getDbMetricsSnapshot,
  getContextName,
  resetDbMetrics,
  recordDbQueryResult,
  runWithDbContext,
  trackDbQuery,
};
