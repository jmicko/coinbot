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

## Next Verification Target

The current server will not fully bootstrap a blank database yet. The expected near-term workflow is:

1. Start a blank local database.
2. Implement migrations until server startup succeeds against blank Postgres.
3. Reset the local database.
4. Clone the old dev database.
5. Run the same migrations against the clone.
6. Compare schema and smoke-test app startup before touching production-like data.
