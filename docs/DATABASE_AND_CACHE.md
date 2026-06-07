# Database And Cache Notes

This document captures the current state of schema setup and caching on the `db-cache` branch. It is meant to guide the next cleanup pass.

## Current Database State

The database is PostgreSQL. Startup now uses a migration runner for schema setup, and runtime maintenance jobs are kept separate from migrations.

- `server/modules/database/migrator.js`: runs ordered migrations and records them in `schema_migrations`.
- `server/modules/database/migrations/001_baseline_schema.js`: creates the current baseline schema from a blank database.
- `database.sql`: a destructive legacy manual bootstrap snapshot, kept only as a reference for now.
- `server/modules/database/*.js`: table-oriented query/cache modules. The old runtime schema helper functions have been folded into the baseline migration.
- `server/modules/serverMaintenance.js`: starts global runtime maintenance jobs after schema bootstrap.
- `connect-pg-simple`: expects a `session` table compatible with its session store.

The baseline and product cleanup migrations have been verified against blank databases and disposable copies of the old dev/prod-shaped database.

Migration `002_simplify_products` intentionally makes the new schema differ from the legacy snapshot. It preserves product identity and activation rows, removes volatile Coinbase snapshot columns, deduplicates legacy rows, adds per-user availability state, and adds a unique index on `(user_id, product_id)`.

Migration `001_baseline_schema` remains unchanged from the version already applied to existing installations. A fresh installation runs `001` and then `002`; this is intentionally less compact than rewriting an applied migration, but it keeps migration history deterministic and safe.

The migration has also been tested with deliberately duplicated product rows. Active state was preserved, inactive duplicates retained the most recent activation timestamp, and the final unique index was created successfully.

## Startup Upgrade Flow

`server/server.js` calls:

```js
await dbUpgrade();
```

`dbUpgrade()` currently runs:

1. `runMigrations()`

The migration runner:

1. Creates `schema_migrations` if needed.
2. Takes a PostgreSQL advisory lock so only one process runs migrations at a time.
3. Runs each unapplied migration inside a transaction.
4. Records successful migrations by ID and timestamp.

Startup no longer runs non-schema maintenance inside `dbUpgrade()`.

The PostgreSQL session store is created after `dbUpgrade()` completes. This avoids `connect-pg-simple` trying to prune expired sessions before the baseline migration has created the `session` table during a cold start.

After the server is bootstrapped, `serverMaintenance.js` starts runtime housekeeping. The first job is old-message retention:

- `messages` rows older than 30 days are deleted when `type != 'chat'`.
- Chat messages are retained.
- The first cleanup runs after a startup delay, then repeats daily.
- This is deliberately not part of migrations and not part of a per-user robot loop.

## `database.sql`

`database.sql` contains the old manual setup snapshot. It starts with `DROP TABLE IF EXISTS`, so it is destructive and should not be used as a normal application startup migration.

It creates these tables:

- `user`
- `user_api`
- `user_settings`
- `products`
- `market_candles`
- `bot_settings`
- `limit_orders`
- `feedback`
- `subscriptions`
- `session`

It also creates indexes:

- `IDX_session_expire`
- `reorders`
- `user_active`
- `candles`

Important differences from the old manual snapshot:

- `products` now persists only `product_id`, `user_id`, `active_for_user`, `available_for_user`, `activated_at`, `quote_currency_id`, and `base_currency_id`.
- Volatile product fields and decimal helpers are held in the process-local product catalog instead of PostgreSQL.
- `user_api` needs additional columns beyond `database.sql`: `name` and `privateKey`.
- `bot_settings` needs additional column beyond `database.sql`: `registration_open`.
- `messages` is absent from `database.sql`.
- `feedback` and `limit_orders` foreign keys are absent from `database.sql`.

## Schema Risks To Fix

- `database.sql` is destructive and easy to misuse.
- `bot_settings` is treated as a singleton, but the table does not enforce a single row.
- `products` uses a unique index on `(user_id, product_id)`.
- Several foreign-key relationships are missing or added after the fact.

## Recommended Migration Direction

For this branch, the remaining clean target should be:

1. Add automated migration tests for blank and prod-shaped databases.
2. Add intentional schema integrity migrations for singleton `bot_settings` and known foreign keys.
3. Keep `database.sql` only as a generated/schema-reference artifact or remove it after replacement.

## Local Dev Database Target

Use Podman for an isolated PostgreSQL database:

```sh
./scripts/dev-db-start.sh
```

Then `server/.env` can point at:

```sh
PGHOST=localhost
PGUSER=coinbot
PGPASSWORD=coinbot
PGDATABASE=coinbot_dev
PGPORT=5432
NODE_ENV=development
SERVER_SESSION_SECRET=replace-this-local-dev-secret
```

Do not connect local development to the old shared development database until migrations are proven against disposable data.

For details, including how to clone and sanitize the old dev database into the local Podman database, see `docs/DEV_ENVIRONMENT.md`.

## Current State And Cache Layers

There are two different categories now: database read caches and process-local runtime state. Database reads should be cached in the table-oriented database modules, not in runtime state modules.

### Runtime Bot State

Defined in `server/modules/runtime/`:

- `botSettings.js`: process-local snapshot of global bot settings for synchronous robot-loop gates.
- `userStorage.js`: per-user runtime status, funds, cancel sets, order check queues, loop status, export/simulation state, and websocket status.
- `messenger.js`: per-user browser websocket fan-out plus in-memory message/error windows.
- `coinbaseClients.js`: per-user Coinbase client registry and API credential hydration.
- `productCatalog.js`: per-user Coinbase product metadata and precomputed increment/rounding helpers, keyed by user ID and product ID.

This state is process-local. User/settings/API state is rebuilt from PostgreSQL during startup; the product catalog is loaded from Coinbase when maintenance and credentials allow it. It is not treated as durable database state.

`userStorage.js` stores user runtime state internally in a `Map` and exposes explicit module methods such as `getUser()`, `getAvailableFunds()`, `queueOrdersToCheck()`, and `updateStatus()`. Route and robot code should use those methods rather than direct keyed property access.

### Table Query Caches

Defined inside database modules:

- `server/modules/database/products.js`: per-user cache of durable product identity and activation rows. Reads merge those rows with `productCatalog`.
- `server/modules/database/limit_orders.js`: per-user order query caches and single-order caches.
- `server/modules/database/user.js`: per-user user/settings/API caches and all-users caches.
- `server/modules/database/settings.js`: singleton bot settings cache.

These caches reduce database calls but make write-path invalidation critical.

### Product Persistence

The products table is no longer a current-market snapshot.

- PostgreSQL owns user/product identity, activation state, and whether Coinbase currently lists the product for that user.
- Each user has an independent `productCatalog` containing volatile Coinbase fields such as price, volume, limits, status, and increments.
- Decimal helpers are calculated once when a Coinbase catalog response is loaded.
- Product refreshes compare identity and availability fields against the per-user identity cache.
- An unchanged refresh performs no product write.
- Products missing from one user's latest non-empty Coinbase response are marked unavailable only for that user. Their rows are retained for existing orders and history.
- Missing runtime market data is valid during maintenance-mode cold starts. Product menus still load from PostgreSQL, while trade controls wait for the runtime catalog.

Robot trading paths require that user's populated product catalog. The catalog refresh itself is allowed before that gate so disabling maintenance can load metadata before order processing resumes. A user whose refresh has not succeeded cannot be unblocked by another user's catalog.

Fee summaries use the same write-suppression rule: Coinbase may still be checked at the normal frequency, but `user_settings` is updated and invalidated only when maker fee, taker fee, or volume changed.

### Database Cache Events

`server/modules/cacheEvents.js` provides a process-local `EventEmitter` for database cache invalidation.

Current event types:

- `BOT_SETTINGS_UPDATED`
- `FEEDBACK_UPDATED`
- `LIMIT_ORDERS_UPDATED`
- `MARKET_CANDLES_UPDATED`
- `MESSAGES_UPDATED`
- `PRODUCTS_UPDATED`
- `SUBSCRIPTIONS_UPDATED`
- `USER_UPDATED`
- `USER_API_UPDATED`
- `USER_SETTINGS_UPDATED`

Known issues:

- Events are process-local only. Multiple server processes would not share invalidation.
- Some writes directly clear local module caches, some emit events, and some do both.

### Database Query Metrics

`server/modules/dbMetrics.js` instruments PostgreSQL calls in-process. It does not cache query results or change database behavior; it only records counts and timings so cache work can target the expensive paths first.

Metrics are collected by wrapping checked-out `pg` clients in `server/modules/pool.js`. This covers normal `pool.query()` calls, explicit transaction clients, promise-style queries, and callback-style queries used by dependencies such as the session store.

Query metrics are grouped by context:

- HTTP requests are recorded as `http METHOD /normalized/path`.
- Robot loops are recorded at broad loop boundaries such as `robot.syncOrders user:1` and `robot.processingLoop user:1`.
- Startup and background work without an explicit context is recorded as `uncategorized`.

The exported report includes:

- `schemaVersion: 2` so reports from the old and corrected collectors are distinguishable.
- Overall query counts, database time, errors, slow queries, and query rates.
- Read, write, transaction, and other-operation counts.
- Rows returned and rows directly affected by writes.
- Context invocation counts, elapsed time, and queries per completed invocation.
- SQL grouped by a stable fingerprint of the full normalized statement.
- A context-plus-SQL breakdown showing which statement each route or loop generated.
- Recent slow queries with their operation, fingerprint, context, and row counts.

Context attribution is active only while the route or robot-loop invocation is running. Timers and websocket callbacks that outlive their originating startup function are recorded as `uncategorized` instead of being incorrectly attributed to startup for the rest of the process lifetime.

The report's `affectedRowCount` is populated for direct PostgreSQL `INSERT`, `UPDATE`, `DELETE`, and `MERGE` results. A write performed inside a CTE may report its returned summary row under `resultRowCount` without exposing the internal affected-row total to the generic query wrapper.

Admin-only endpoints:

- `GET /api/admin/dbMetrics?limit=20`: returns totals, top contexts, top SQL statements, and recent slow queries.
- `GET /api/admin/dbMetrics/download?limit=100`: downloads the same data plus source metadata as a JSON text file.
- `DELETE /api/admin/dbMetrics`: resets the in-process counters.

The Admin settings panel exposes the download route under `Database Metrics`. This is the intended way to collect production data before restarting or redeploying the server.

Environment flags:

- `DB_SLOW_QUERY_MS`: slow-query threshold in milliseconds. Default: `250`.
- `DB_SLOW_QUERY_LOG=false`: disables slow-query console logs.
- `DB_METRICS_HTTP_LOG=true`: logs per-request database counts and timings after each HTTP response.

This is deliberately process-local. Coinbot is intended to run as a small single-server app, and local counters are enough to see whether repeated route refreshes, robot loops, or specific SQL statements are responsible for database load.

### Available Funds Aggregation

Available-funds calculation still uses Coinbase account totals minus every relevant Coinbot order, including orders that are intentionally not synchronized to Coinbase.

The database portion is now one grouped query per funds refresh:

- SELL orders sum reserved base size by product.
- BUY orders sum reserved quote value by product using the taker-fee multiplier.
- All active products are requested together instead of issuing separate base and quote queries for each product.

This changes only how the same ledger totals are retrieved. Coinbase account reads, currency-level accumulation, taker-fee conservatism, and the resulting per-product available-funds shape remain unchanged.

## Cache Cleanup Direction

Before changing behavior, define ownership:

- Runtime state in `server/modules/runtime/` is allowed to track bot-loop state that is not durable on its own.
- Database module caches should be read-through caches for expensive or frequently repeated queries.
- Every database write should either invalidate a named cache scope or return fresh data and update the cache in one obvious place.
- Cache invalidation should be centralized enough that route handlers do not need to know table-cache internals.

Suggested near-term cleanup:

1. Document each cached database query and its invalidation trigger.
2. Add tests around cache hits after writes for users, products, orders, and settings.
3. Replace ad hoc cache clearing with a small explicit cache API per table.
4. Only then consider more aggressive caching or removing duplicate caches.
