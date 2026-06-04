#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${COINBOT_DB_CONTAINER:-coinbot-postgres}"
POSTGRES_USER="${COINBOT_DB_USER:-coinbot}"
TARGET_DB="${COINBOT_COLD_START_DB:-coinbot_cold_start}"

if [[ "${1:-}" != "--yes" && "${COINBOT_CONFIRM_RESET:-}" != "$TARGET_DB" ]]; then
  echo "This will drop and recreate the local Podman database: $TARGET_DB"
  echo "Container: $CONTAINER_NAME"
  echo
  echo "Stop the server first. If nodemon is running, it may recreate the schema immediately."
  echo
  echo "Run again with:"
  echo "  $0 --yes"
  exit 1
fi

if [[ ! "$TARGET_DB" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
  echo "Refusing unsafe database name: $TARGET_DB" >&2
  exit 1
fi

if [[ ! "$POSTGRES_USER" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
  echo "Refusing unsafe database user: $POSTGRES_USER" >&2
  exit 1
fi

case "$TARGET_DB" in
  postgres|template0|template1|coinbot_dev|coinbot_prod|production)
    echo "Refusing to reset protected database: $TARGET_DB" >&2
    exit 1
    ;;
esac

if ! podman container exists "$CONTAINER_NAME"; then
  echo "Container does not exist: $CONTAINER_NAME" >&2
  echo "Start local Postgres first with ./scripts/dev-db-start.sh" >&2
  exit 1
fi

state="$(podman inspect --format '{{.State.Status}}' "$CONTAINER_NAME")"
if [[ "$state" != "running" ]]; then
  echo "Starting existing container $CONTAINER_NAME..."
  podman start "$CONTAINER_NAME" >/dev/null
fi

echo "Dropping $TARGET_DB..."
podman exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$TARGET_DB\" WITH (FORCE);"

echo "Creating $TARGET_DB..."
podman exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"$TARGET_DB\" OWNER \"$POSTGRES_USER\";"

table_count="$(podman exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$TARGET_DB" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema = current_schema();")"
echo "$TARGET_DB reset complete. Table count: $table_count"
