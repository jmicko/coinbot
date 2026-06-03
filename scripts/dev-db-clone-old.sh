#!/usr/bin/env bash
set -euo pipefail

TARGET_CONTAINER="${COINBOT_DB_CONTAINER:-coinbot-postgres}"
TARGET_USER="${COINBOT_DB_USER:-coinbot}"
TARGET_PASSWORD="${COINBOT_DB_PASSWORD:-coinbot}"
TARGET_DB="${COINBOT_DB_NAME:-coinbot_dev}"
POSTGRES_IMAGE="${COINBOT_DB_IMAGE:-docker.io/library/postgres:16}"
SANITIZE_CLONE="${COINBOT_SANITIZE_CLONE:-true}"

SOURCE_HOST="${OLD_PGHOST:?Set OLD_PGHOST for the source database host.}"
SOURCE_PORT="${OLD_PGPORT:-5432}"
SOURCE_USER="${OLD_PGUSER:?Set OLD_PGUSER for the source database user.}"
SOURCE_DB="${OLD_PGDATABASE:?Set OLD_PGDATABASE for the source database name.}"
SOURCE_PASSWORD="${OLD_PGPASSWORD:-}"

if [ -z "$SOURCE_PASSWORD" ]; then
  read -rsp "Source database password: " SOURCE_PASSWORD
  echo
fi

if ! podman container exists "$TARGET_CONTAINER"; then
  echo "$TARGET_CONTAINER does not exist. Run ./scripts/dev-db-start.sh first." >&2
  exit 1
fi

if ! podman exec "$TARGET_CONTAINER" pg_isready -U "$TARGET_USER" -d "$TARGET_DB" >/dev/null 2>&1; then
  echo "$TARGET_CONTAINER is not ready. Run ./scripts/dev-db-start.sh first." >&2
  exit 1
fi

echo "Cloning $SOURCE_DB from $SOURCE_HOST into local $TARGET_DB..."
echo "The local target database will be cleaned before restore."

podman run --rm --network host \
  -e PGPASSWORD="$SOURCE_PASSWORD" \
  "$POSTGRES_IMAGE" \
  pg_dump \
    --host "$SOURCE_HOST" \
    --port "$SOURCE_PORT" \
    --username "$SOURCE_USER" \
    --dbname "$SOURCE_DB" \
    --format custom \
    --no-owner \
    --no-acl |
  podman exec -i \
    -e PGPASSWORD="$TARGET_PASSWORD" \
    "$TARGET_CONTAINER" \
    pg_restore \
      --clean \
      --if-exists \
      --no-owner \
      --no-acl \
      --username "$TARGET_USER" \
      --dbname "$TARGET_DB"

if [ "$SANITIZE_CLONE" != "false" ] && [ "$SANITIZE_CLONE" != "0" ]; then
  echo "Sanitizing local clone for safe startup..."
  podman exec \
    -e PGPASSWORD="$TARGET_PASSWORD" \
    "$TARGET_CONTAINER" \
    psql \
      --username "$TARGET_USER" \
      --dbname "$TARGET_DB" \
      --set ON_ERROR_STOP=1 \
      --command "update bot_settings set maintenance = true; update user_settings set paused = true; update user_api set \"CB_SECRET\" = null, \"CB_ACCESS_KEY\" = null, \"CB_ACCESS_PASSPHRASE\" = null, \"API_URI\" = null, name = null, \"privateKey\" = null;"
fi

echo "Clone complete."
