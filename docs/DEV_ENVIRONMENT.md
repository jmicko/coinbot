# Dev Environment

This project should use an isolated local PostgreSQL database for development. Do not point a fresh checkout at production or at a shared database while working on migrations.

## Database Modes

Use two local database states while cleaning up schema and caching:

- Blank local database: proves a new install can start from nothing.
- Clone of the old dev database: proves migrations are safe against the likely production schema shape.

The scripts in `scripts/` use Podman and the official `postgres:16` image. Host `psql` and `pg_dump` are not required.

The old dev database currently reports PostgreSQL 16.9, so the local container defaults to Postgres 16. If production is on a different major version, set `COINBOT_DB_IMAGE` before starting the local database and clone with the same image version.

## Start Local Postgres

```sh
./scripts/dev-db-start.sh
```

Defaults:

- Container: `coinbot-postgres`
- Volume: `coinbot-postgres-data`
- User: `coinbot`
- Password: `coinbot`
- Database: `coinbot_dev`
- Port: `5432`

The same defaults are captured in `compose.yaml` for people who prefer `podman compose`.

## Server Env

Create the local server env file:

```sh
cp server/.env.example server/.env
```

`server/.env` is ignored by git. Keep real database passwords, Coinbase credentials, and VAPID private keys out of committed files.

For push notifications, `DOMAIN_NAME` is the VAPID subject. The `web-push` package requires it to be an `https:` or `mailto:` URL, even for local development. `https://localhost.local` is valid; `http://localhost:5000` is not.

## Clone Old Dev DB Into Podman

Start the target database first:

```sh
./scripts/dev-db-start.sh
```

Then clone from the old dev database:

```sh
OLD_PGHOST=old-dev-host \
OLD_PGUSER=postgres \
OLD_PGDATABASE=coinbot-dev \
./scripts/dev-db-clone-old.sh
```

The script prompts for the source password if `OLD_PGPASSWORD` is not set. Prefer the prompt so the password does not end up in shell history.

The target local database is cleaned during restore. If you want to return to a truly blank local database, reset it.

By default, the clone script sanitizes the local restored database after restore:

- sets `bot_settings.maintenance` to `true`
- pauses all user settings
- clears Coinbase API credential fields from `user_api`

This keeps the local clone useful for migration testing without allowing server startup to trade. User `active` flags are preserved because maintenance mode and per-user pause settings are the safety controls. To keep credentials in a private throwaway clone, explicitly set `COINBOT_SANITIZE_CLONE=false`.

## Stop Or Reset

Stop the database without deleting data:

```sh
./scripts/dev-db-stop.sh
```

Delete the container and volume:

```sh
./scripts/dev-db-reset.sh
```

Then start again for a fresh blank database:

```sh
./scripts/dev-db-start.sh
```

## Cold-Start Verification

To manually test the first-install experience, point `server/.env` at a database that exists but has no tables, then start the server normally. Do not run `dbUpgrade()` manually first; `server/server.js` should be the first application code to touch the database.

The current manual cold-start database is:

```sh
PGDATABASE=coinbot_cold_start
```

Reset only the cold-start database back to zero tables:

```sh
./scripts/dev-db-reset-cold-start.sh --yes
```

Stop the server before running the reset. If nodemon is still running, it may reconnect and recreate the schema immediately after the database is recreated.

Keep using separate databases for the two migration safety checks:

1. Start or create a blank local database.
2. Start the server and verify it creates `schema_migrations`, the baseline tables, and the default `bot_settings` row.
3. Keep the cloned old dev database intact as the prod-shaped reference.
4. Compare the generated blank schema against the clone.
5. Add automated tests for the blank and prod-shaped migration paths before touching production-like data.

Compare the public schema of two local databases:

```sh
./scripts/dev-db-compare-schema.sh coinbot_dev coinbot_cold_start
```

The comparison intentionally ignores `schema_migrations`, because existing production-shaped databases will not have that table until the new migration runner starts.

## Prod-Shaped Smoke Copy

When the local `coinbot_dev` database is a preserved clone of the old dev/prod-shaped database, make a disposable local copy before testing startup migrations against it:

```sh
podman exec coinbot-postgres \
  psql -U coinbot -d postgres \
  -c "create database coinbot_prod_shape_smoke with template coinbot_dev owner coinbot"
```

Before starting the server against that copy, enable maintenance mode and pause users in the copy:

```sh
podman exec coinbot-postgres \
  psql -U coinbot -d coinbot_prod_shape_smoke \
  -c "update bot_settings set maintenance = true; update user_settings set paused = true;"
```

Then run the server with a database override:

```sh
PGDATABASE=coinbot_prod_shape_smoke PORT=5505 npm run server
```

After startup, compare the migrated smoke-copy schema against the cold-start schema:

```sh
./scripts/dev-db-compare-schema.sh coinbot_prod_shape_smoke coinbot_cold_start
```
