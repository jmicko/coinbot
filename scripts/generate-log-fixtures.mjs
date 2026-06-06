import fs from 'fs/promises';
import path from 'path';

const FIXTURE_ID = 'hourly-log-test-v1';
const HOUR_MS = 60 * 60 * 1000;

function getArgument(name, fallback) {
  const prefix = `--${name}=`;
  const argument = process.argv.find(value => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : fallback;
}

function getHourParts(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const dateID = `${year}-${month}-${day}`;

  return {
    dateID,
    hour,
    monthID: `${year}-${Number(month)}`,
  };
}

function getLogPath(logRoot, bucket, date, userID) {
  const { dateID, hour, monthID } = getHourParts(date);
  const bucketRoot = bucket === 'user'
    ? path.join(logRoot, 'users', String(userID))
    : path.join(logRoot, bucket);

  return path.join(bucketRoot, monthID, dateID, `${hour}.jsonl`);
}

async function appendFixture(filePath, entries) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  try {
    const existing = await fs.readFile(filePath, 'utf8');
    if (existing.includes(`"fixture":"${FIXTURE_ID}"`)) {
      return false;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  await fs.appendFile(
    filePath,
    `${entries.map(entry => JSON.stringify(entry)).join('\n')}\n`
  );
  return true;
}

function makeEntry(date, { level = 'info', message, userID = null, scope = 'fixture' }) {
  return {
    ts: date.toISOString(),
    level,
    message,
    context: {
      name: `fixture.${scope}${userID ? ` user:${userID}` : ''}`,
      scope: 'fixture',
      userID,
    },
    userID,
    args: [message],
    fixture: FIXTURE_ID,
  };
}

const hours = Math.max(1, Number(getArgument('hours', '72')));
const userID = Math.max(1, Number(getArgument('user', '1')));
const logRoot = path.resolve(getArgument('log-dir', 'server/logs'));
const currentHour = new Date();
currentHour.setUTCMinutes(0, 0, 0);
const firstHour = new Date(currentHour.getTime() - hours * HOUR_MS);

let filesCreated = 0;
let filesSkipped = 0;

for (let index = 0; index < hours; index += 1) {
  const hourStart = new Date(firstHour.getTime() + index * HOUR_MS);
  const firstEntryTime = new Date(hourStart.getTime() + 10 * 60 * 1000);
  const secondEntryTime = new Date(hourStart.getTime() + 50 * 60 * 1000);
  const hourID = getHourParts(hourStart);
  const appEntries = [
    makeEntry(firstEntryTime, {
      message: `Fixture app activity for ${hourID.dateID} ${hourID.hour}:10 UTC`,
      scope: 'app',
    }),
    makeEntry(secondEntryTime, {
      message: `Fixture user activity for ${hourID.dateID} ${hourID.hour}:50 UTC`,
      userID,
      scope: 'user',
    }),
  ];
  const userEntries = [appEntries[1]];

  if (index % 8 === 0) {
    const errorEntry = makeEntry(new Date(hourStart.getTime() + 30 * 60 * 1000), {
      level: 'error',
      message: `Fixture error for ${hourID.dateID} ${hourID.hour}:30 UTC`,
      userID,
      scope: 'error',
    });
    appEntries.push(errorEntry);
    userEntries.push(errorEntry);

    const created = await appendFixture(
      getLogPath(logRoot, 'errors', hourStart, userID),
      [errorEntry]
    );
    created ? filesCreated += 1 : filesSkipped += 1;
  }

  for (const [bucket, entries] of [['app', appEntries], ['user', userEntries]]) {
    const created = await appendFixture(
      getLogPath(logRoot, bucket, hourStart, userID),
      entries
    );
    created ? filesCreated += 1 : filesSkipped += 1;
  }
}

console.log(JSON.stringify({
  fixture: FIXTURE_ID,
  logRoot,
  userID,
  hours,
  firstHour: firstHour.toISOString(),
  endHour: currentHour.toISOString(),
  filesCreated,
  filesSkipped,
}, null, 2));
