import { deleteOldNonChatMessages } from './database/messages.js';
import { devLog } from './utilities.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_INITIAL_DELAY_MS = 10 * 60 * 1000;
const DEFAULT_MESSAGE_RETENTION_DAYS = 30;

function readPositiveIntegerEnv(name, fallback) {
  const value = process.env[name];

  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function startServerMaintenanceJobs({
  initialDelayMs = readPositiveIntegerEnv('MESSAGE_CLEANUP_INITIAL_DELAY_MS', DEFAULT_INITIAL_DELAY_MS),
  intervalMs = readPositiveIntegerEnv('MESSAGE_CLEANUP_INTERVAL_MS', DAY_MS),
  messageRetentionDays = readPositiveIntegerEnv('MESSAGE_RETENTION_DAYS', DEFAULT_MESSAGE_RETENTION_DAYS),
} = {}) {
  let interval;
  let running = false;
  let stopped = false;

  async function runOldMessageCleanup() {
    if (stopped || running) {
      return;
    }

    running = true;

    try {
      const deletedCount = await deleteOldNonChatMessages({ olderThanDays: messageRetentionDays });

      if (deletedCount > 0) {
        devLog(`deleted ${deletedCount} old non-chat messages`);
      }
    } catch (error) {
      devLog(error, 'error deleting old messages');
    } finally {
      running = false;
    }
  }

  const firstRun = setTimeout(() => {
    runOldMessageCleanup();
    interval = setInterval(runOldMessageCleanup, intervalMs);
    interval.unref?.();
  }, initialDelayMs);
  firstRun.unref?.();

  return {
    runOldMessageCleanup,
    stop() {
      stopped = true;
      clearTimeout(firstRun);

      if (interval) {
        clearInterval(interval);
      }
    },
  };
}
