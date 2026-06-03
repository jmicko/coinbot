# Database And Cache Notes

This document captures the current state of schema setup and caching on the `db-cache` branch. It is meant to guide the next cleanup pass.

## Current Database State

The database is PostgreSQL. The current schema knowledge is split between:

- `database.sql`: a destructive manual bootstrap snapshot.
- `server/modules/databaseClient.js`: calls table update helpers from `dbUpgrade()`.
- `server/modules/database/*.js`: scattered `CREATE TABLE`, `ALTER TABLE`, constraint, and cleanup logic.
- `connect-pg-simple`: expects a `session` table compatible with its session store.

The app currently cannot be trusted to bootstrap a completely blank database. Most update helpers query `information_schema` or `pg_constraint`, then run `ALTER TABLE` against tables that are assumed to already exist.

## Startup Upgrade Flow

`server/server.js` calls:

```js
await dbUpgrade();
```

`dbUpgrade()` currently runs:

1. `updateProductsTable()`
2. `createMessagesTable()`
3. `updateMessagesTable()`
4. `updateFeedbackTable()`
5. `updateLimitOrdersTable()`
6. `updateSettingsTable()`
7. `updateUserTables()`

This order works only after the base schema already exists. On a blank database:

- `updateProductsTable()` will try to `ALTER TABLE products` even if `products` does not exist.
- `updateFeedbackTable()` assumes `feedback` and `user` exist.
- `updateLimitOrdersTable()` assumes `limit_orders` and `user` exist.
- `updateSettingsTable()` assumes `bot_settings` exists.
- `updateUserTables()` assumes `user_api` exists.
- `subscriptions`, `session`, `market_candles`, `user`, `user_settings`, `user_api`, `bot_settings`, and `limit_orders` are not created by `dbUpgrade()`.

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

Important mismatches with runtime upgrade code:

- `products` gets additional runtime columns: `base_increment_decimals`, `quote_increment_decimals`, `quote_inverse_increment`, `base_inverse_increment`, `price_rounding`, `pbd`, and `pqd`.
- `user_api` gets additional runtime columns: `name` and `privateKey`.
- `bot_settings` gets additional runtime column: `registration_open`.
- `messages` exists only in runtime code, not in `database.sql`.
- `feedback` and `limit_orders` foreign keys are added in runtime code, not in `database.sql`.

## Schema Risks To Fix

- There is no migrations table, version number, or ordered migration history.
- Blank-database startup is not supported yet.
- `database.sql` is destructive and easy to misuse.
- Some schema exists only in code and some exists only in `database.sql`.
- `bot_settings` is treated as a singleton, but the table does not enforce a single row.
- `products` has no primary key or unique constraint, even though the code treats `(user_id, product_id)` as unique.
- Several foreign-key relationships are missing or added after the fact.
- `session` table setup is not part of `dbUpgrade()`.
- `subscriptions` and `market_candles` have no runtime table creation/update function.
- Startup cleanup deletes old non-chat messages as part of `updateMessagesTable()`, which mixes migration and maintenance behavior.

## Recommended Migration Direction

For this branch, the clean target should be:

1. Add a real migration runner that executes ordered SQL files once.
2. Create a `schema_migrations` table with migration name and applied timestamp.
3. Convert the current full schema into an initial non-destructive migration.
4. Convert scattered runtime `ALTER TABLE` blocks into ordered migrations.
5. Make `dbUpgrade()` run migrations, then run non-schema startup maintenance separately.
6. Keep `database.sql` only as a generated/schema-reference artifact or remove it after replacement.

The initial migration should support a blank database without needing manual SQL.

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

## Current Cache Layers

There are three broad cache categories.

### Runtime Bot State

Defined in `server/modules/cache.js`:

- `botSettings`: in-memory copy of `bot_settings`.
- `userStorage`: per-user runtime status, funds, active products, cancel sets, order check queues, loop status, export/simulation state, and websocket status.
- `messenger`: per-user browser websocket fan-out plus message/error arrays.
- `cbClients`: per-user Coinbase clients and API details.

This state is process-local and is rebuilt on server start from database users/settings/API rows.

### Table Query Caches

Defined inside database modules:

- `server/modules/database/products.js`: per-user product caches.
- `server/modules/database/limit_orders.js`: per-user order query caches and single-order caches.
- `server/modules/database/user.js`: per-user user/settings/API caches and all-users caches.
- `server/modules/database/settings.js`: singleton bot settings cache.

These caches reduce database calls but make write-path invalidation critical.

### Cache Events

`server/modules/cacheEvents.js` provides a process-local `EventEmitter`.

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
- Some event names referenced in code are missing from `cacheEvents`.
- `feedback.js` emits cache events but does not import `cacheEvents` or `emitCacheEvent`.
- `settings.js` imports `emitCacheEvent` but references `cacheEvents` without importing it.
- `settings.js` emits `cacheEvents.ALL_USER_SETTINGS_UPDATED`, which is not defined.

## Cache Cleanup Direction

Before changing behavior, define ownership:

- Runtime state in `cache.js` is allowed to track bot-loop state that is not durable on its own.
- Database module caches should be read-through caches for expensive or frequently repeated queries.
- Every database write should either invalidate a named cache scope or return fresh data and update the cache in one obvious place.
- Cache invalidation should be centralized enough that route handlers do not need to know table-cache internals.

Suggested near-term cleanup:

1. Fix the broken imports/event names.
2. Document each cached query and its invalidation trigger.
3. Add tests around cache hits after writes for users, products, orders, and settings.
4. Replace ad hoc cache clearing with a small explicit cache API per table.
5. Only then consider more aggressive caching or removing duplicate caches.
