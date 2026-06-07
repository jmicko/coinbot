import { AsyncLocalStorage } from 'async_hooks';
import { createHash } from 'crypto';

const dbContextStorage = new AsyncLocalStorage();
const slowQueryThresholdMs = Number(process.env.DB_SLOW_QUERY_MS || 250);
const maxRecentSlowQueries = 50;
const sqlPreviewLength = 500;

let startedAt = new Date();
const totals = createQueryMetric();
const contexts = new Map();
const queries = new Map();
const contextQueries = new Map();
const recentSlowQueries = [];

function createOperationCounts() {
  return {
    read: 0,
    write: 0,
    transaction: 0,
    other: 0,
  };
}

function createQueryMetric(metadata = {}) {
  return {
    ...metadata,
    queryCount: 0,
    totalMs: 0,
    maxMs: 0,
    errorCount: 0,
    slowCount: 0,
    resultRowCount: 0,
    affectedRowCount: 0,
    operationCounts: createOperationCounts(),
    invocationCount: 0,
    completedInvocationCount: 0,
    totalElapsedMs: 0,
    maxElapsedMs: 0,
  };
}

function getMetric(map, key, metadata = {}) {
  if (!map.has(key)) {
    map.set(key, createQueryMetric(metadata));
  }
  return map.get(key);
}

function getSql(query) {
  const sql = typeof query === 'string'
    ? query
    : query?.text || String(query);

  return sql.replace(/\s+/g, ' ').trim();
}

function getQueryDetails(query) {
  const sql = getSql(query);
  const firstKeyword = sql.match(/^[A-Za-z]+/)?.[0]?.toUpperCase() || 'OTHER';
  const containsWrite = /\b(INSERT|UPDATE|DELETE|MERGE)\b/i.test(sql);

  let operation = 'other';
  if (['BEGIN', 'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'RELEASE'].includes(firstKeyword)) {
    operation = 'transaction';
  } else if (['INSERT', 'UPDATE', 'DELETE', 'MERGE'].includes(firstKeyword) || containsWrite) {
    operation = 'write';
  } else if (['SELECT', 'WITH', 'SHOW', 'EXPLAIN', 'VALUES'].includes(firstKeyword)) {
    operation = 'read';
  }

  return {
    sql,
    sqlPreview: sql.slice(0, sqlPreviewLength),
    fingerprint: createHash('sha1').update(sql).digest('hex').slice(0, 16),
    operation,
  };
}

function normalizeHttpPath(path) {
  return path
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':uuid')
    .replace(/\/\d+(?=\/|$)/g, '/:id');
}

function getActiveContext() {
  const context = dbContextStorage.getStore();
  return context?.active ? context : null;
}

function getContextName() {
  return getActiveContext()?.name || 'uncategorized';
}

function getResultCounts(result, operation) {
  const results = Array.isArray(result) ? result : [result];

  return results.reduce((counts, queryResult) => {
    const rowCount = Number.isFinite(queryResult?.rowCount)
      ? queryResult.rowCount
      : Array.isArray(queryResult?.rows)
        ? queryResult.rows.length
        : 0;
    const command = String(queryResult?.command || '').toUpperCase();

    counts.resultRowCount += rowCount;
    if (
      operation === 'write'
      && ['INSERT', 'UPDATE', 'DELETE', 'MERGE'].includes(command)
    ) {
      counts.affectedRowCount += rowCount;
    }
    return counts;
  }, { resultRowCount: 0, affectedRowCount: 0 });
}

function updateQueryMetric(
  metric,
  durationMs,
  hasError,
  isSlow,
  operation,
  resultRowCount,
  affectedRowCount
) {
  metric.queryCount += 1;
  metric.totalMs += durationMs;
  metric.maxMs = Math.max(metric.maxMs, durationMs);
  metric.resultRowCount += resultRowCount;
  metric.affectedRowCount += affectedRowCount;
  metric.operationCounts[operation] += 1;
  if (hasError) metric.errorCount += 1;
  if (isSlow) metric.slowCount += 1;
}

function toPublicMetric([key, metric]) {
  const publicMetric = {
    name: metric.name || key,
    queryCount: metric.queryCount,
    totalMs: Number(metric.totalMs.toFixed(2)),
    avgMs: metric.queryCount ? Number((metric.totalMs / metric.queryCount).toFixed(2)) : 0,
    maxMs: Number(metric.maxMs.toFixed(2)),
    errorCount: metric.errorCount,
    slowCount: metric.slowCount,
    resultRowCount: metric.resultRowCount,
    affectedRowCount: metric.affectedRowCount,
    operationCounts: { ...metric.operationCounts },
  };

  if (metric.fingerprint) publicMetric.fingerprint = metric.fingerprint;
  if (metric.context) publicMetric.context = metric.context;
  if (metric.operation) publicMetric.operation = metric.operation;
  if (metric.invocationCount > 0) {
    publicMetric.invocationCount = metric.invocationCount;
    publicMetric.completedInvocationCount = metric.completedInvocationCount;
    publicMetric.totalElapsedMs = Number(metric.totalElapsedMs.toFixed(2));
    publicMetric.avgElapsedMs = metric.completedInvocationCount
      ? Number((metric.totalElapsedMs / metric.completedInvocationCount).toFixed(2))
      : 0;
    publicMetric.maxElapsedMs = Number(metric.maxElapsedMs.toFixed(2));
    publicMetric.queriesPerInvocation = metric.completedInvocationCount
      ? Number((metric.queryCount / metric.completedInvocationCount).toFixed(2))
      : 0;
  }

  return publicMetric;
}

function createContext(name) {
  const context = {
    name,
    active: true,
    startedAt: performance.now(),
    queryCount: 0,
    totalMs: 0,
    maxMs: 0,
    errorCount: 0,
    slowCount: 0,
  };
  getMetric(contexts, name, { name }).invocationCount += 1;
  return context;
}

function completeContext(context) {
  if (!context?.active) {
    return;
  }

  context.active = false;
  const elapsedMs = performance.now() - context.startedAt;
  const metric = getMetric(contexts, context.name, { name: context.name });
  metric.completedInvocationCount += 1;
  metric.totalElapsedMs += elapsedMs;
  metric.maxElapsedMs = Math.max(metric.maxElapsedMs, elapsedMs);
}

function recordDbQuery(query, durationMs, hasError, result) {
  const context = getActiveContext();
  const contextName = context?.name || 'uncategorized';
  const details = getQueryDetails(query);
  const isSlow = durationMs >= slowQueryThresholdMs;
  const { resultRowCount, affectedRowCount } = getResultCounts(
    result,
    details.operation
  );

  updateQueryMetric(
    totals,
    durationMs,
    hasError,
    isSlow,
    details.operation,
    resultRowCount,
    affectedRowCount
  );

  if (context) {
    context.queryCount += 1;
    context.totalMs += durationMs;
    context.maxMs = Math.max(context.maxMs, durationMs);
    if (hasError) context.errorCount += 1;
    if (isSlow) context.slowCount += 1;
  }

  const contextMetric = getMetric(contexts, contextName, { name: contextName });
  const queryMetric = getMetric(queries, details.fingerprint, {
    name: details.sqlPreview,
    fingerprint: details.fingerprint,
    operation: details.operation,
  });
  const contextQueryKey = `${contextName}\u0000${details.fingerprint}`;
  const contextQueryMetric = getMetric(contextQueries, contextQueryKey, {
    name: details.sqlPreview,
    context: contextName,
    fingerprint: details.fingerprint,
    operation: details.operation,
  });

  [contextMetric, queryMetric, contextQueryMetric].forEach((metric) => {
    updateQueryMetric(
      metric,
      durationMs,
      hasError,
      isSlow,
      details.operation,
      resultRowCount,
      affectedRowCount
    );
  });

  if (isSlow) {
    const slowQuery = {
      timestamp: new Date().toISOString(),
      context: contextName,
      durationMs: Number(durationMs.toFixed(2)),
      operation: details.operation,
      fingerprint: details.fingerprint,
      resultRowCount,
      affectedRowCount,
      sql: details.sqlPreview,
    };

    recentSlowQueries.unshift(slowQuery);
    if (recentSlowQueries.length > maxRecentSlowQueries) {
      recentSlowQueries.length = maxRecentSlowQueries;
    }

    if (process.env.DB_SLOW_QUERY_LOG !== 'false') {
      console.log(
        `[db slow] ${slowQuery.durationMs}ms ${contextName} ` +
        `${details.operation} ${details.fingerprint}: ${details.sqlPreview}`
      );
    }
  }
}

function recordDbQueryResult(query, durationMs, hasError = false, result) {
  recordDbQuery(query, durationMs, hasError, result);
}

async function trackDbQuery(query, runQuery) {
  const start = performance.now();

  try {
    const result = await runQuery();
    recordDbQuery(query, performance.now() - start, false, result);
    return result;
  } catch (err) {
    recordDbQuery(query, performance.now() - start, true);
    throw err;
  }
}

function runWithDbContext(name, callback) {
  const context = createContext(name);
  let result;

  try {
    result = dbContextStorage.run(context, callback);
  } catch (err) {
    completeContext(context);
    throw err;
  }

  if (result && typeof result.finally === 'function') {
    return result.finally(() => completeContext(context));
  }

  completeContext(context);
  return result;
}

function dbMetricsMiddleware(req, res, next) {
  const path = normalizeHttpPath(req.originalUrl.split('?')[0]);
  const contextName = `http ${req.method} ${path}`;
  const context = createContext(contextName);
  let completed = false;

  const finishContext = () => {
    if (completed) {
      return;
    }
    completed = true;
    completeContext(context);

    if (process.env.DB_METRICS_HTTP_LOG === 'true' && context.queryCount > 0) {
      const elapsedMs = Number((performance.now() - context.startedAt).toFixed(2));
      console.log(
        `[db request] ${contextName} ${res.statusCode}: ` +
        `${context.queryCount} queries, ${context.totalMs.toFixed(2)}ms db, ${elapsedMs}ms total`
      );
    }
  };

  res.once('finish', finishContext);
  res.once('close', finishContext);
  dbContextStorage.run(context, next);
}

function getDbMetricsSnapshot({ limit = 20 } = {}) {
  const rawUptimeSeconds = (Date.now() - startedAt.getTime()) / 1000;
  const uptimeSeconds = Number(rawUptimeSeconds.toFixed(1));
  const contextMetrics = [...contexts.entries()]
    .map(toPublicMetric)
    .sort((a, b) => b.totalMs - a.totalMs)
    .slice(0, limit);
  const queryMetrics = [...queries.entries()]
    .map(toPublicMetric)
    .sort((a, b) => b.totalMs - a.totalMs)
    .slice(0, limit);
  const contextQueryMetrics = [...contextQueries.entries()]
    .map(toPublicMetric)
    .sort((a, b) => b.totalMs - a.totalMs)
    .slice(0, limit);

  return {
    schemaVersion: 2,
    startedAt,
    uptimeSeconds,
    slowQueryThresholdMs,
    totals: {
      queryCount: totals.queryCount,
      totalMs: Number(totals.totalMs.toFixed(2)),
      avgMs: totals.queryCount ? Number((totals.totalMs / totals.queryCount).toFixed(2)) : 0,
      maxMs: Number(totals.maxMs.toFixed(2)),
      errorCount: totals.errorCount,
      slowCount: totals.slowCount,
      resultRowCount: totals.resultRowCount,
      affectedRowCount: totals.affectedRowCount,
      operationCounts: { ...totals.operationCounts },
    },
    rates: {
      queriesPerSecond: rawUptimeSeconds
        ? Number((totals.queryCount / rawUptimeSeconds).toFixed(3))
        : 0,
      queriesPerMinute: rawUptimeSeconds
        ? Number((totals.queryCount * 60 / rawUptimeSeconds).toFixed(2))
        : 0,
      dbMsPerSecond: rawUptimeSeconds
        ? Number((totals.totalMs / rawUptimeSeconds).toFixed(2))
        : 0,
    },
    contexts: contextMetrics,
    queries: queryMetrics,
    contextQueries: contextQueryMetrics,
    recentSlowQueries,
  };
}

function resetDbMetrics() {
  startedAt = new Date();
  Object.assign(totals, createQueryMetric());
  contexts.clear();
  queries.clear();
  contextQueries.clear();
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
