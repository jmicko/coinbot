import crypto from 'crypto';
import { once } from 'events';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import util from 'util';
import { AsyncLocalStorage } from 'async_hooks';
import { getUTCWindowForTimeZoneDate, normalizeTimeZone } from './time.js';

const logContextStorage = new AsyncLocalStorage();
const logRoot = path.resolve(process.env.LOG_DIR || './logs');
const dedupeWindowMs = Number(process.env.LOG_DEDUPE_MS || 60000);
const maxRecentLogs = Number(process.env.LOG_RECENT_LIMIT || 500);
const maxDuplicateGroups = Number(process.env.LOG_DEDUPE_GROUP_LIMIT || 1000);
const maxOpenStreams = Number(process.env.LOG_MAX_OPEN_STREAMS || 50);
const maxStringLength = Number(process.env.LOG_MAX_STRING || 4000);
const maxArrayItems = Number(process.env.LOG_MAX_ARRAY_ITEMS || 25);
const maxObjectKeys = Number(process.env.LOG_MAX_OBJECT_KEYS || 50);
const maxTailBytes = Number(process.env.LOG_TAIL_MAX_BYTES || 1024 * 1024);

const streams = new Map();
const ensuredDirectories = new Set();
const recentLogs = [];
const duplicateGroups = new Map();

const sensitiveKeys = new Set([
  'authorization',
  'cookie',
  'key',
  'key_secret',
  'pass',
  'password',
  'pgpassword',
  'private_key',
  'privatekey',
  'secret',
  'server_session_secret',
  'session',
  'token',
  'vapid_private_key',
]);

function ensureDirectory(dir) {
  if (ensuredDirectories.has(dir)) return;
  fs.mkdirSync(dir, { recursive: true });
  ensuredDirectories.add(dir);
}

function padDatePart(value) {
  return String(value).padStart(2, '0');
}

function getUTCHourParts(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = padDatePart(date.getUTCMonth() + 1);
  const day = padDatePart(date.getUTCDate());
  const hour = padDatePart(date.getUTCHours());
  const dateID = `${year}-${month}-${day}`;

  return {
    year,
    month,
    day,
    hour,
    dateID,
    monthID: `${year}-${Number(month)}`,
    hourID: `${dateID}T${hour}`,
  };
}

function parseUTCHourID(hourID) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})$/.exec(hourID);
  if (!match || Number(match[4]) > 23) {
    throw new Error('Invalid log hour');
  }

  const year = Number(match[1]);
  const month = match[2];
  const day = match[3];
  const hour = match[4];
  const dateID = `${match[1]}-${month}-${day}`;

  return {
    year,
    month,
    day,
    hour,
    dateID,
    monthID: `${year}-${Number(month)}`,
    hourID,
  };
}

function getUTCFileHourIDsForWindow(start, end) {
  const hourIDs = [];
  let current = new Date(start);
  current.setUTCMinutes(0, 0, 0);

  while (current < end) {
    hourIDs.push(getUTCHourParts(current).hourID);
    current = new Date(current.getTime() + 60 * 60 * 1000);
  }

  return hourIDs;
}

function getTodayLogDateID(date = new Date()) {
  return getUTCHourParts(date).dateID;
}

function getLogPath({ bucket, userID, date = new Date(), hourID }) {
  const parts = hourID ? parseUTCHourID(hourID) : getUTCHourParts(date);
  if (bucket === 'user') {
    return path.join(logRoot, 'users', String(userID), parts.monthID, parts.dateID, `${parts.hour}.jsonl`);
  }
  return path.join(logRoot, bucket, parts.monthID, parts.dateID, `${parts.hour}.jsonl`);
}

function getStream(filePath) {
  const existing = streams.get(filePath);
  if (existing) {
    existing.lastUsed = Date.now();
    return existing.stream;
  }

  ensureDirectory(path.dirname(filePath));
  const stream = fs.createWriteStream(filePath, { flags: 'a' });
  stream.on('error', err => {
    console.error('error writing log stream', filePath, err);
  });
  streams.set(filePath, { stream, lastUsed: Date.now() });
  pruneOpenStreams();
  return stream;
}

function pruneOpenStreams() {
  while (streams.size > maxOpenStreams) {
    const [oldestPath, oldest] = [...streams.entries()]
      .sort((a, b) => a[1].lastUsed - b[1].lastUsed)[0];
    oldest.stream.end();
    streams.delete(oldestPath);
  }
}

function redactString(value) {
  if (typeof value !== 'string') return value;

  const redacted = value
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g, '[REDACTED PRIVATE KEY]')
    .replace(/organizations\/[0-9a-f-]+\/apiKeys\/[0-9a-f-]+/gi, '[REDACTED API KEY NAME]')
    .replace(/(authorization:\s*bearer\s+)[^\s,}]+/gi, '$1[REDACTED]')
    .replace(/(PGPASSWORD=)[^\s]+/gi, '$1[REDACTED]');

  return redacted.length > maxStringLength
    ? `${redacted.slice(0, maxStringLength)}...[truncated ${redacted.length - maxStringLength} chars]`
    : redacted;
}

function isSensitiveKey(key) {
  const normalized = String(key).toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (sensitiveKeys.has(normalized)) return true;
  return normalized.includes('password')
    || normalized.includes('secret')
    || normalized.includes('privatekey')
    || normalized.includes('token');
}

function serializeError(error) {
  const serialized = {
    name: error.name,
    message: redactString(error.message),
    stack: redactString(error.stack),
  };

  for (const key of Object.keys(error)) {
    serialized[key] = isSensitiveKey(key) ? '[REDACTED]' : serializeValue(error[key]);
  }

  return serialized;
}

function serializeValue(value, depth = 0, seen = new WeakSet()) {
  if (value instanceof Error) return serializeError(value);
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;
  if (value instanceof Date) return value.toISOString();

  if (typeof value !== 'object') return String(value);
  if (seen.has(value)) return '[Circular]';
  if (depth >= 4) return '[MaxDepth]';

  seen.add(value);

  if (Array.isArray(value)) {
    const result = value.slice(0, maxArrayItems).map(item => serializeValue(item, depth + 1, seen));
    if (value.length > maxArrayItems) {
      result.push(`[${value.length - maxArrayItems} more items]`);
    }
    return result;
  }

  const result = {};
  const entries = Object.entries(value);
  for (const [key, child] of entries.slice(0, maxObjectKeys)) {
    result[key] = isSensitiveKey(key) ? '[REDACTED]' : serializeValue(child, depth + 1, seen);
  }
  if (entries.length > maxObjectKeys) {
    result.__truncatedKeys = entries.length - maxObjectKeys;
  }
  return result;
}

function formatArgForMessage(arg) {
  if (arg instanceof Error) {
    return `${arg.name}: ${redactString(arg.message)}`;
  }

  if (typeof arg === 'string') return redactString(arg);
  if (typeof arg === 'number' || typeof arg === 'boolean' || arg === null || arg === undefined) {
    return String(arg);
  }

  return util.inspect(serializeValue(arg), {
    breakLength: Infinity,
    depth: 2,
    maxArrayLength: 10,
  });
}

function inferLevel(args) {
  if (args.some(arg => arg instanceof Error)) return 'error';
  const message = args.map(formatArgForMessage).join(' ');
  if (/\b(error|failed|failure|exception|timeout|invalid)\b/i.test(message)) return 'error';
  return 'info';
}

function getLogContext() {
  return logContextStorage.getStore() || {};
}

function createEntry(level, args, options = {}) {
  const context = { ...getLogContext(), ...(options.context || {}) };
  const errors = args.filter(arg => arg instanceof Error).map(serializeError);
  const serializedArgs = args.map(arg => serializeValue(arg));
  const message = args.map(formatArgForMessage).join(' ');
  const userID = options.userID ?? context.userID ?? context.userId ?? null;

  return {
    ts: new Date().toISOString(),
    level,
    message,
    context,
    userID,
    args: serializedArgs,
    errors: errors.length ? errors : undefined,
  };
}

function fingerprintEntry(entry) {
  const firstError = entry.errors?.[0];
  const basis = JSON.stringify({
    level: entry.level,
    message: entry.message,
    context: entry.context?.name || entry.context?.scope || null,
    userID: entry.userID || null,
    error: firstError ? `${firstError.name}:${firstError.message}` : null,
  });

  return crypto.createHash('sha256').update(basis).digest('hex');
}

function writeLine(filePath, entry) {
  const stream = getStream(filePath);
  stream.write(`${JSON.stringify(entry)}\n`);
}

function writeEntry(entry) {
  recentLogs.unshift(entry);
  if (recentLogs.length > maxRecentLogs) {
    recentLogs.length = maxRecentLogs;
  }

  writeLine(getLogPath({ bucket: 'app' }), entry);

  if (entry.level === 'error') {
    writeLine(getLogPath({ bucket: 'errors' }), entry);
  }

  if (entry.userID !== null && entry.userID !== undefined) {
    writeLine(getLogPath({ bucket: 'user', userID: entry.userID }), entry);
  }
}

function writeDuplicateSummary(state) {
  if (!state?.suppressed) return;

  const summary = {
    ...state.entry,
    ts: new Date().toISOString(),
    message: `Suppressed ${state.suppressed} repeated log entr${state.suppressed === 1 ? 'y' : 'ies'} over ${Math.round((Date.now() - state.firstSeen) / 1000)}s: ${state.entry.message}`,
    duplicateOf: state.fingerprint,
    suppressedCount: state.suppressed,
    firstSeen: new Date(state.firstSeen).toISOString(),
    lastSeen: new Date(state.lastSeen).toISOString(),
  };

  state.suppressed = 0;
  writeEntry(summary);
}

function scheduleDuplicateSummary(state) {
  if (state.timer) return;
  state.timer = setTimeout(() => {
    state.timer = null;
    writeDuplicateSummary(state);
  }, dedupeWindowMs);
  state.timer.unref?.();
}

function writeWithDedupe(entry) {
  const fingerprint = fingerprintEntry(entry);
  const now = Date.now();
  const state = duplicateGroups.get(fingerprint);

  if (!state || now - state.lastSeen > dedupeWindowMs) {
    if (state) writeDuplicateSummary(state);
    while (duplicateGroups.size >= maxDuplicateGroups) {
      const [oldestFingerprint, oldestState] = duplicateGroups.entries().next().value;
      writeDuplicateSummary(oldestState);
      if (oldestState.timer) clearTimeout(oldestState.timer);
      duplicateGroups.delete(oldestFingerprint);
    }
    duplicateGroups.set(fingerprint, {
      entry,
      fingerprint,
      firstSeen: now,
      lastSeen: now,
      suppressed: 0,
      timer: null,
    });
    writeEntry(entry);
    return;
  }

  state.lastSeen = now;
  state.suppressed += 1;
  scheduleDuplicateSummary(state);
}

function log(level, ...args) {
  writeWithDedupe(createEntry(level, args));
}

function devLog(...args) {
  const level = inferLevel(args);

  if (process.env.NODE_ENV === 'development' && process.env.LOG_CONSOLE !== 'false') {
    console.log(...args.map(arg => serializeValue(arg)));
  }

  writeWithDedupe(createEntry(level, args));
}

function runWithLogContext(context, callback) {
  const parent = getLogContext();
  return logContextStorage.run({ ...parent, ...context }, callback);
}

function logContextMiddleware(req, res, next) {
  const userID = req.user?.id || req.user?.userID || null;
  const pathName = req.originalUrl?.split('?')[0] || req.path;

  runWithLogContext({
    name: `http ${req.method} ${pathName}`,
    scope: 'http',
    method: req.method,
    path: pathName,
    userID,
  }, next);
}

function getRecentLogs({ limit = 100, level, userID } = {}) {
  const normalizedLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  return recentLogs
    .filter(entry => !level || entry.level === level)
    .filter(entry => userID === undefined || userID === '' || String(entry.userID) === String(userID))
    .slice(0, normalizedLimit);
}

function validateDateID(dateID) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateID)) {
    throw new Error('Invalid log date');
  }
}

function validateLogScope(bucket, userID) {
  if (bucket === 'user') {
    if (!userID || !/^\d+$/.test(String(userID))) {
      throw new Error('A numeric userID is required for user logs');
    }
    return;
  }

  if (!['app', 'errors'].includes(bucket)) {
    throw new Error('Invalid log bucket');
  }
}

function getLogDayFileSelection({ bucket = 'app', date, timeZone = 'UTC', userID } = {}) {
  const dateID = date || getTodayLogDateID();
  validateDateID(dateID);
  validateLogScope(bucket, userID);

  const window = getUTCWindowForTimeZoneDate(dateID, timeZone);
  const hourIDs = getUTCFileHourIDsForWindow(window.start, window.end);
  const files = hourIDs.map(hourID => ({
    hourID,
    path: getLogPath({ bucket, userID, hourID }),
  }));

  return {
    ...window,
    bucket,
    userID: bucket === 'user' ? userID : null,
    files,
  };
}

function parseLogLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    return { raw: line };
  }
}

function isLogLineInWindow(line, start, end) {
  const entry = parseLogLine(line);
  if (!entry.ts) {
    return { entry, inWindow: true };
  }

  const time = Date.parse(entry.ts);
  return {
    entry,
    inWindow: Number.isFinite(time) && time >= start.getTime() && time < end.getTime(),
  };
}

async function readTail({ bucket = 'app', date, timeZone, userID, lines = 200, maxBytes = maxTailBytes } = {}) {
  const selection = getLogDayFileSelection({ bucket, date, timeZone, userID });
  const lineLimit = Math.min(Math.max(Number(lines) || 200, 1), 1000);
  const byteLimit = Math.min(Math.max(Number(maxBytes) || maxTailBytes, 4096), maxTailBytes);

  const entries = [];
  const existingFiles = [];
  let size = 0;
  let truncated = false;

  for (const file of [...selection.files].reverse()) {
    let stat;
    try {
      stat = await fs.promises.stat(file.path);
    } catch (err) {
      if (err.code === 'ENOENT') continue;
      throw err;
    }

    existingFiles.push(path.relative(logRoot, file.path));
    size += stat.size;
    const bytesToRead = Math.min(stat.size, byteLimit);
    truncated = truncated || stat.size > bytesToRead;
    const handle = await fs.promises.open(file.path, 'r');

    try {
      const buffer = Buffer.alloc(bytesToRead);
      await handle.read(buffer, 0, bytesToRead, stat.size - bytesToRead);
      const rawLines = buffer.toString('utf8').split('\n').filter(Boolean).reverse();
      for (const line of rawLines) {
        const { entry, inWindow } = isLogLineInWindow(line, selection.start, selection.end);
        if (!inWindow) continue;
        entries.push(entry);
        if (entries.length >= lineLimit) break;
      }
    } finally {
      await handle.close();
    }

    if (entries.length >= lineLimit) break;
  }

  return {
    file: `${selection.bucket}/${selection.date} (${selection.timeZone})`,
    files: existingFiles.reverse(),
    date: selection.date,
    timeZone: selection.timeZone,
    start: selection.startISO,
    end: selection.endISO,
    size,
    truncated,
    missing: existingFiles.length === 0,
    entries: entries.reverse(),
  };
}

async function listLogFiles({ bucket = 'app', userID } = {}) {
  let root;
  if (bucket === 'user') {
    if (!userID || !/^\d+$/.test(String(userID))) {
      return [];
    }
    root = path.join(logRoot, 'users', String(userID));
  } else if (['app', 'errors'].includes(bucket)) {
    root = path.join(logRoot, bucket);
  } else {
    throw new Error('Invalid log bucket');
  }

  try {
    const files = [];
    const monthDirs = await fs.promises.readdir(root, { withFileTypes: true });
    for (const monthDir of monthDirs) {
      if (!monthDir.isDirectory()) continue;
      const monthPath = path.join(root, monthDir.name);
      const dayDirs = await fs.promises.readdir(monthPath, { withFileTypes: true });
      for (const dayDir of dayDirs) {
        if (!dayDir.isDirectory()) continue;
        const dayPath = path.join(monthPath, dayDir.name);
        const hourFiles = await fs.promises.readdir(dayPath, { withFileTypes: true });
        for (const file of hourFiles) {
          if (!file.isFile() || !file.name.endsWith('.jsonl')) continue;
          const hour = file.name.replace(/\.jsonl$/, '');
          const filePath = path.join(dayPath, file.name);
          const stat = await fs.promises.stat(filePath);
          files.push({
            bucket,
            userID: bucket === 'user' ? userID : null,
            date: dayDir.name,
            hour,
            hourID: `${dayDir.name}T${hour}`,
            path: path.relative(logRoot, filePath),
            size: stat.size,
            modifiedAt: stat.mtime.toISOString(),
          });
        }
      }
    }
    return files.sort((a, b) => b.hourID.localeCompare(a.hourID));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

function getLogDownloadFilename({ bucket = 'app', date, timeZone = 'UTC', userID } = {}) {
  const safeTimeZone = normalizeTimeZone(timeZone).replace(/[^a-z0-9_-]+/gi, '_');
  const userText = bucket === 'user' ? `-user-${userID}` : '';
  return `coinbot-${bucket}${userText}-logs-${date || getTodayLogDateID()}-${safeTimeZone}.jsonl`;
}

async function streamLogDay({ bucket = 'app', date, timeZone, userID, writable } = {}) {
  const selection = getLogDayFileSelection({ bucket, date, timeZone, userID });
  let filesRead = 0;
  let linesWritten = 0;
  let bytesRead = 0;

  for (const file of selection.files) {
    let stat;
    try {
      stat = await fs.promises.stat(file.path);
    } catch (err) {
      if (err.code === 'ENOENT') continue;
      throw err;
    }

    filesRead += 1;
    bytesRead += stat.size;

    const lines = readline.createInterface({
      input: fs.createReadStream(file.path),
      crlfDelay: Infinity,
    });

    for await (const line of lines) {
      if (!line) continue;
      const { inWindow } = isLogLineInWindow(line, selection.start, selection.end);
      if (!inWindow) continue;
      if (writable.write(`${line}\n`) === false && typeof writable.once === 'function') {
        await once(writable, 'drain');
      }
      linesWritten += 1;
    }
  }

  return {
    ...selection,
    filesRead,
    linesWritten,
    bytesRead,
  };
}

function shutdownLogger() {
  for (const state of duplicateGroups.values()) {
    writeDuplicateSummary(state);
    if (state.timer) clearTimeout(state.timer);
  }
  duplicateGroups.clear();

  for (const { stream } of streams.values()) {
    stream.end();
  }
  streams.clear();
}

export {
  devLog,
  getLogDownloadFilename,
  getLogContext,
  getLogDayFileSelection,
  getRecentLogs,
  getTodayLogDateID,
  listLogFiles,
  log,
  logContextMiddleware,
  readTail,
  runWithLogContext,
  shutdownLogger,
  streamLogDay,
};
