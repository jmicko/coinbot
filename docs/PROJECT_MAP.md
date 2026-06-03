# Coinbot Project Map

This is a first-pass orientation document based on the current `db-cache` branch. It describes how the project is wired today, not the final architecture we want.

## Purpose

Coinbot is a self-hosted Coinbase trading bot with a browser UI. The core trading strategy stores local trade-pair records, places a limit order on Coinbase, and flips the order to the opposite side after settlement. The database is the durable source of truth for users, settings, products, local order records, messages, candles, sessions, feedback, and push subscriptions.

Because the app can place real orders, dev work should use an isolated local database and either mocked Coinbase calls or a deliberately limited test account. Do not point a fresh dev checkout at production data.

## Repository Layout

- `README.md`: user-facing project overview and manual setup notes.
- `database.sql`: destructive schema snapshot previously used for manual database bootstrap.
- `server/`: Node.js, Express, Passport, PostgreSQL, websocket server, Coinbase integration, and bot loops.
- `client/`: current Vite + React + TypeScript frontend.
- `old_fe/`: old React frontend retained as reference. It is not the current app.
- `scripts/`: local development helper scripts, currently focused on the Podman PostgreSQL database.
- `compose.yaml`: Podman/Docker Compose definition for local PostgreSQL.
- `todo.md`: older short task list. The current cleanup roadmap is in `docs/ROADMAP.md`.

## Runtime Entry Points

### Server

`server/server.js` is the main server entry point.

Startup order today:

1. Import server modules.
2. `await dbUpgrade()` from `server/modules/databaseClient.js`.
3. Create Express app and HTTP server.
4. Add JSON/body parsing, session middleware, Passport initialization, and Passport session support.
5. Create a `ws` `WebSocketServer` on the HTTP server.
6. Mount REST routers under `/api/*`.
7. Serve `../client/dist` for production builds.
8. Start `robot.startSync()`.
9. Listen on `PORT` or `5000`.

Important implication: bot loops start automatically when the server starts. During development, maintenance mode and isolated credentials matter.

### Client

`client/src/main.tsx` renders the React app. `client/src/components/App/App.tsx` wraps the app in:

1. `IdentifierProvider`
2. `UserProvider`
3. `CheckUser`

After login, `CheckUser` brings in the providers and screens needed for the main app. `DataProvider` owns most browser-side data loading and refresh callbacks. `WebSocketProvider` receives server websocket messages and calls refresh handlers rather than carrying most durable data directly over the socket.

In development, `client/vite.config.ts` proxies `/api` to `http://localhost:5000`.

## Main Server Modules

- `modules/pool.js`: builds the shared PostgreSQL connection pool from `DATABASE_URL` or `PG*` environment variables.
- `modules/session-middleware.js`: configures `express-session` with `connect-pg-simple`.
- `strategies/user.strategy.js`: Passport local strategy and session serialization/deserialization.
- `modules/databaseClient.js`: aggregation facade for database functions and startup `dbUpgrade()`.
- `modules/database/*.js`: table-oriented query functions and some table-specific cache logic.
- `modules/cache.js`: in-memory runtime state for bot settings, per-user bot state, Coinbase clients, and websocket message fan-out.
- `modules/cacheEvents.js`: process-local event emitter for cache invalidation events.
- `modules/robot.js`: main trading/sync loops, product updates, order settlement processing, reordering, and available-funds refresh.
- `modules/websocket.js`: browser websocket server setup and Coinbase websocket startup per active approved user.
- `modules/coinbaseClient.js`: Coinbase API/websocket client wrapper.
- `modules/candleMaker.js`: child process for candle import/update work.
- `modules/push.js`: web push notification support.

## REST API Areas

Routes are mounted in `server/server.js`:

- `/api/user`: login, logout, registration, current user, approval, deletion.
- `/api/account`: account/product/profit/message/export/API-key operations.
- `/api/orders`: list, create, auto setup, sync, bulk update, delete order records.
- `/api/trade`: market orders, pair sync, simulation endpoints.
- `/api/settings`: user settings, feedback, connection and registration checks.
- `/api/admin`: admin user controls, bot settings, maintenance, factory reset.
- `/api/notifications`: VAPID public key and push subscription registration.

## Data Flow Summary

1. Browser fetches durable state through REST hooks in `client/src/hooks`.
2. Server route handlers call `databaseClient`, `robot`, `cache.js`, and Coinbase client methods.
3. Database modules read and write PostgreSQL through the shared `pool`.
4. Long-running bot loops maintain per-user runtime state in `userStorage`, `messenger`, `cbClients`, and `botSettings`.
5. Server websocket messages notify the browser about updates, heartbeats, tickers, and Coinbase socket status.
6. Browser refresh handlers refetch affected REST resources after websocket invalidation messages.

## Development Commands

Current documented commands:

```sh
./scripts/dev-db-start.sh
cp server/.env.example server/.env
```

```sh
cd server
npm install
npm run dev
```

```sh
cd client
npm install
npm run dev
```

Current gaps:

- There is no root-level script to start both apps.
- The server expects a PostgreSQL database to already exist.
- `dbUpgrade()` is not yet a complete blank-database bootstrap.

## Environment

`server/env` is the example file. Copy it to `server/.env` for local use.

Important variables:

- `PGHOST`
- `PGUSER`
- `PGPASSWORD`
- `PGDATABASE`
- `PGPORT`
- `SERVER_SESSION_SECRET`
- `NODE_ENV`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `DOMAIN_NAME`

For local dev, prefer a dedicated database such as `coinbot_dev` or a Podman container database. Avoid sharing a host, database name, or credentials with production.
