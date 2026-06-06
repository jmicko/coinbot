# Logging

Coinbot uses a small in-process logger with no external dependencies. Existing `devLog(...)` call sites still work, but the implementation now writes structured JSONL instead of ad hoc text lines.

## Goals

- Keep logging independent from PostgreSQL so database failures can still be recorded.
- Avoid opening a file for every log call.
- Avoid giant files caused by repeated robot-loop errors.
- Make production logs accessible from the Admin panel without downloading hundreds of megabytes.
- Add enough context to find logs for a specific user or runtime area.

## File Layout

Structured logs are written under `server/logs` by default. Files are split by UTC hour:

```text
logs/
  app/YYYY-M/YYYY-MM-DD/HH.jsonl
  errors/YYYY-M/YYYY-MM-DD/HH.jsonl
  users/{userID}/YYYY-M/YYYY-MM-DD/HH.jsonl
```

File paths use UTC so the server never needs a configured app timezone to decide where to write. Individual entry timestamps are also ISO UTC timestamps.

When the UI requests a day of logs, the browser sends its IANA timezone with the selected date. The server expands that local day into the UTC hour files that overlap it, filters entries by timestamp, and returns or streams the matching lines. Downloaded filenames include the timezone used for the request.

Every log entry goes to `app`. Error-level entries also go to `errors`. Entries with a known `userID` are duplicated into that user's log file so user-specific issues are easier to inspect.

Set `LOG_DIR` to move logs elsewhere.

The Admin `Server Logs` panel and user `My Logs` panel use the browser's local date for the date picker. `Recent` is not date-based; it reads the in-memory recent-log buffer.

## Format

Each line is one JSON object:

```json
{"ts":"2026-06-04T16:30:00.000Z","level":"error","message":"Example","context":{"name":"robot.syncOrders user:1","scope":"robot","userID":1},"userID":1}
```

The logger redacts common sensitive keys and known private-key/token patterns before writing. This is a safety net, not permission to intentionally log secrets.

## Dedupe

Repeated identical entries are suppressed in memory for a short window. The first event is written immediately. Repeats are counted, then a summary line is written:

```text
Suppressed 438 repeated log entries over 60s: ...
```

Environment knobs:

- `LOG_DEDUPE_MS`: repeated-log window. Default: `60000`.
- `LOG_DEDUPE_GROUP_LIMIT`: maximum active dedupe fingerprints. Default: `1000`.
- `LOG_MAX_OPEN_STREAMS`: maximum open log file streams before older streams are closed. Default: `50`.
- `LOG_RECENT_LIMIT`: process-local recent log ring size. Default: `500`.
- `LOG_MAX_STRING`: max string length per serialized value. Default: `4000`.
- `LOG_CONSOLE=false`: disables development console mirroring.

## Context

HTTP routes are tagged after authentication with request method, path, and user id when available.

Robot loops are tagged at broad loop boundaries, such as:

- `robot.startSync`
- `robot.initializeUserLoops user:{id}`
- `robot.processingLoop user:{id}`
- `robot.syncOrders user:{id}`

Future cleanup can add more precise contexts around candle workers, export workers, and Coinbase websocket handling.

## Admin Access

The Admin settings panel has a `Server Logs` section:

- `Recent`: returns recent in-memory log entries.
- `Tail day`: reads the end of the selected browser-local day without loading whole log files.
- `Download day`: streams the selected browser-local day as JSONL.

Admin-only routes:

- `GET /api/admin/logs/recent?limit=200&userID=1`
- `GET /api/admin/logs/tail?bucket=app&date=YYYY-MM-DD&timeZone=America/Chicago&lines=200`
- `GET /api/admin/logs/tail?bucket=user&userID=1&date=YYYY-MM-DD&timeZone=America/Chicago&lines=200`
- `GET /api/admin/logs/files?bucket=errors`
- `GET /api/admin/logs/download?bucket=errors&date=YYYY-MM-DD&timeZone=America/Chicago`

## User Access

Regular authenticated users can inspect only their own user-scoped logs from the General settings panel under `My Logs`.

User routes do not accept a `userID` parameter. They always use the authenticated session user:

- `GET /api/user/logs/recent?limit=200`
- `GET /api/user/logs/tail?date=YYYY-MM-DD&timeZone=America/Chicago&lines=200`
- `GET /api/user/logs/download?date=YYYY-MM-DD&timeZone=America/Chicago`

## Development Fixtures

Generate identifiable hourly fixture logs for the previous 72 complete UTC hours:

```sh
node scripts/generate-log-fixtures.mjs --hours=72 --user=1
```

The script creates app and user entries every hour plus periodic error entries. It is idempotent for each hour and marks generated entries with:

```json
{"fixture":"hourly-log-test-v1"}
```

Optional arguments:

- `--hours=24`
- `--user=2`
- `--log-dir=/tmp/coinbot-logs`
