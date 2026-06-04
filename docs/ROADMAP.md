# Cleanup Roadmap

This is the initial priority list after reviewing the current branch. It is biased toward getting a safe local development loop before making larger architecture changes.

## P0: Safe Local Dev Baseline

- [x] Add a Podman-based PostgreSQL dev setup.
- [x] Add a committed local setup guide and/or compose file.
- [x] Add a local-only cold-start database reset script.
- [x] Create `server/.env.example` from `server/env` and make the expected dev values explicit.
- [x] Verify the server can point at a disposable local database.
- Make sure dev startup cannot accidentally use production credentials.

## P0: Database Bootstrap And Migrations

- [x] Replace manual `database.sql` setup with a real migration runner.
- [x] Add a `schema_migrations` table.
- [x] Create all base tables from a blank database.
- [x] Move current runtime `ALTER TABLE` code into the baseline migration.
- [x] Include `messages`, `session`, `subscriptions`, and `market_candles` in the migration path.
- [x] Add seed/default handling for the singleton `bot_settings` row.
- [x] Make migrations idempotent at the runner level, not by destructive drops.
- Add automated migration tests for blank and prod-shaped databases.
- [x] Remove older runtime schema helper functions from the database modules.
- Keep or generate `database.sql` only as a reference after migrations are working.

## P0: Immediate Bugs Found During Orientation

- [x] `server/modules/database/feedback.js` uses `emitCacheEvent` and `cacheEvents` without importing them.
- [x] `deleteFeedback()` in `feedback.js` emits with `userID`, but `userID` is not in scope.
- [x] `server/modules/database/settings.js` references `cacheEvents` without importing it.
- [x] `settings.js` emits `cacheEvents.ALL_USER_SETTINGS_UPDATED`, but that event is not defined.
- [x] `dbUpgrade()` fails on a blank database because most upgrade helpers assume tables already exist.
- [x] `dbUpgrade()` deletes old non-chat messages during startup, which makes migration smoke tests mutate cloned data.
- [x] Move old non-chat message deletion to a delayed daily server maintenance job.
- [x] Delay PostgreSQL session-store creation until after migrations so cold-start pruning does not run before the `session` table exists.

## P1: Schema Integrity

- Add or confirm primary keys and unique constraints for tables the code treats as unique.
- Add a unique constraint for `products` on `(user_id, product_id)` if that is the intended identity.
- Enforce singleton semantics for `bot_settings`.
- Add foreign keys for user-owned tables where deletion behavior is known.
- Decide whether `limit_orders.userID` should be nullable after user deletion or cascade/deletion should be handled differently.
- [x] Separate schema migrations from runtime maintenance jobs like old-message cleanup.

## P1: Dev Safety Around Trading

- Add a documented maintenance-mode-first local workflow.
- Add a way to run the server without starting bot loops or Coinbase websocket loops.
- Add a mock/no-op Coinbase client mode for UI and database development.
- Make startup logs clearly show database name, maintenance mode, and whether trading loops are active.
- Add explicit portfolio awareness to sync/reorder logic now that dev can use a dedicated Coinbase portfolio.
- Use Coinbase portfolio breakdown as the Coinbase-side available-funds baseline, while still subtracting local DB-only order commitments.

## P1: Tests And Verification

- Add a server test harness that can run against disposable PostgreSQL.
- Add migration tests from an empty database.
- Add migration tests from a schema resembling the current `database.sql` baseline.
- Add tests for first-user registration/admin creation.
- Add client or end-to-end tests for login, registration loading, API-key activation, and current-user refresh.
- Add tests for cache invalidation after user/settings/products/orders writes.
- Add a smoke test that starts the server in no-trade mode.

## P2: Cache Consolidation

- Inventory every cached query and every write that should invalidate it.
- Fix broken cache event imports and missing event names.
- Choose a consistent invalidation pattern per table.
- Keep process-runtime bot state separate from read-through database caches.
- Consider removing caches that duplicate cheap indexed queries.
- Add targeted indexes before adding cache complexity.

## P2: Data Access Cleanup

- Reduce direct `pool.query` usage in route files where a database module already owns the table.
- Move SQL toward table modules or a small repository layer.
- Avoid promise constructors around `async` functions where plain `async/await` is enough.
- Normalize naming conventions over time. Current schema mixes `userID`, `user_id`, uppercase API columns, and camelCase API-key fields.

## P2: Server Runtime Cleanup

- Make robot loop startup explicit and configurable.
- Review loop timing and rate-limit handling after tests exist.
- Add tests around `fullSync`, `quickSync`, `updateMultipleOrders`, and `reorder` before changing loop ordering.
- Add tests around reinvestment reserve calculations and multiple simultaneous sell-to-buy flips.
- Add tests for fee policy: internal availability/reinvestment gates should reserve with taker assumptions, while expected-profit displays may use maker assumptions.
- Make child-process lifecycle for candle imports visible and stoppable.
- Add tests around server maintenance jobs such as old-message retention.
- Investigate repeated `unknown error getting candles` logs from `candleMaker` during startup against the cloned dev database.
- Add graceful shutdown for HTTP server, websockets, database pool, bot loops, and child processes.

## P2: Dependency Maintenance

- Review npm audit output for the server dependency tree.
- Review npm audit output for the client dependency tree.
- Upgrade dependencies intentionally after smoke tests and migration tests are in place.

## P3: Frontend Cleanup

- [x] Document the REST refresh, websocket invalidation, and request-identifier flow.
- Remove obvious debug logs from providers/components.
- Confirm old frontend code is still needed. If not, archive or remove it in a separate change.
- Keep websocket messages as invalidation hints unless a specific data stream needs direct state updates.
- Add a minimal client smoke/build check to the normal verification path.

## Suggested First Implementation Sequence

1. Add Podman database setup and local env example.
2. Build the migration runner and initial schema migration.
3. Prove blank database startup in no-trade mode.
4. Fix the immediate cache-event bugs.
5. Add cache invalidation tests around the current behavior.
6. Then start simplifying caching strategies with test coverage in place.
