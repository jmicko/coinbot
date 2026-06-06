const systemTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const formatterCache = new Map();

function getFormatter(timeZone, options) {
  const key = `${timeZone}:${JSON.stringify(options)}`;
  if (!formatterCache.has(key)) {
    formatterCache.set(key, new Intl.DateTimeFormat('en-US', { timeZone, ...options }));
  }
  return formatterCache.get(key);
}

function isValidTimeZone(timeZone) {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function normalizeTimeZone(timeZone, fallback = 'UTC') {
  if (typeof timeZone !== 'string') return fallback;
  const normalized = timeZone.trim();
  return normalized && isValidTimeZone(normalized) ? normalized : fallback;
}

function getSystemTimeZone() {
  return systemTimeZone;
}

function getDatePartsForTimeZone(date = new Date(), timeZone = systemTimeZone) {
  const formatter = getFormatter(timeZone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date).reduce((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value;
    return result;
  }, {});

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour === '24' ? '00' : parts.hour,
    minute: parts.minute,
    second: parts.second,
    dateID: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

function parseDateID(dateID) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateID);
  if (!match) {
    throw new Error('Invalid date');
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function addDaysToDateID(dateID, days) {
  const { year, month, day } = parseDateID(dateID);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function getUTCInstantForTimeZoneDateTime(dateID, timeZone, hour = 0) {
  const { year, month, day } = parseDateID(dateID);
  const target = Date.UTC(year, month - 1, day, hour, 0, 0);
  let guess = target;

  for (let i = 0; i < 6; i += 1) {
    const parts = getDatePartsForTimeZone(new Date(guess), timeZone);
    const represented = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );
    const diff = target - represented;
    if (diff === 0) break;
    guess += diff;
  }

  return new Date(guess);
}

function getUTCWindowForTimeZoneDate(dateID, timeZone) {
  const normalizedTimeZone = normalizeTimeZone(timeZone);
  const start = getUTCInstantForTimeZoneDateTime(dateID, normalizedTimeZone, 0);
  const end = getUTCInstantForTimeZoneDateTime(addDaysToDateID(dateID, 1), normalizedTimeZone, 0);

  return {
    date: dateID,
    timeZone: normalizedTimeZone,
    start,
    end,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  };
}

export {
  addDaysToDateID,
  getDatePartsForTimeZone,
  getSystemTimeZone,
  getUTCInstantForTimeZoneDateTime,
  getUTCWindowForTimeZoneDate,
  isValidTimeZone,
  normalizeTimeZone,
};
