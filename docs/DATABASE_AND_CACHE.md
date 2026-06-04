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

The new baseline migration was verified against a separate blank local database, `coinbot_bootstrap_test`, and the generated schema matched the cloned dev database on tables, columns, data types, defaults, nullability, constraints, and indexes.

It was also verified against a disposable database loaded from the legacy `database.sql` snapshot, `coinbot_legacy_sql_test`. Running the migration on that legacy-shaped database produced the same schema shape as the cloned dev database. Existing `bot_settings` rows are preserved; only a truly blank database gets the default seed row with `maintenance = false`.

The current cold-start database, `coinbot_cold_start`, was compared against the preserved old clone, `coinbot_dev`, with `scripts/dev-db-compare-schema.sh`; the schemas matched when ignoring `schema_migrations`. A local template copy of the old clone, `coinbot_prod_shape_smoke`, was then started through the server, migrated successfully, served HTTP on port `5505`, and still matched `coinbot_cold_start`.

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

- `products` needs additional columns beyond `database.sql`: `base_increment_decimals`, `quote_increment_decimals`, `quote_inverse_increment`, `base_inverse_increment`, `price_rounding`, `pbd`, and `pqd`.
- `user_api` needs additional columns beyond `database.sql`: `name` and `privateKey`.
- `bot_settings` needs additional column beyond `database.sql`: `registration_open`.
- `messages` is absent from `database.sql`.
- `feedback` and `limit_orders` foreign keys are absent from `database.sql`.

## Schema Risks To Fix

- `database.sql` is destructive and easy to misuse.
- `bot_settings` is treated as a singleton, but the table does not enforce a single row.
- `products` has no primary key or unique constraint, even though the code treats `(user_id, product_id)` as unique.
- Several foreign-key relationships are missing or added after the fact.

## Recommended Migration Direction

For this branch, the remaining clean target should be:

1. Add automated migration tests for blank and prod-shaped databases.
2. Add intentional schema integrity migrations for singleton `bot_settings`, product identity, and known foreign keys.
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

This state is process-local and is rebuilt on server start from database users/settings/API rows. It is not treated as the database caching strategy.

`userStorage.js` stores user runtime state internally in a `Map` and exposes explicit module methods such as `getUser()`, `getAvailableFunds()`, `queueOrdersToCheck()`, and `updateStatus()`. Route and robot code should use those methods rather than direct keyed property access.

### Table Query Caches

Defined inside database modules:

- `server/modules/database/products.js`: per-user product caches.
- `server/modules/database/limit_orders.js`: per-user order query caches and single-order caches.
- `server/modules/database/user.js`: per-user user/settings/API caches and all-users caches.
- `server/modules/database/settings.js`: singleton bot settings cache.

These caches reduce database calls but make write-path invalidation critical.

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
