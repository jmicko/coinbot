#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${COINBOT_DB_CONTAINER:-coinbot-postgres}"
VOLUME_NAME="${COINBOT_DB_VOLUME:-coinbot-postgres-data}"
HOST_PORT="${COINBOT_DB_HOST_PORT:-5432}"
IMAGE="${COINBOT_DB_IMAGE:-docker.io/library/postgres:16}"
POSTGRES_USER="${COINBOT_DB_USER:-coinbot}"
POSTGRES_PASSWORD="${COINBOT_DB_PASSWORD:-coinbot}"
POSTGRES_DB="${COINBOT_DB_NAME:-coinbot_dev}"

if podman container exists "$CONTAINER_NAME"; then
  state="$(podman inspect --format '{{.State.Status}}' "$CONTAINER_NAME")"
  if [ "$state" = "running" ]; then
    echo "$CONTAINER_NAME is already running."
  else
    echo "Starting existing container $CONTAINER_NAME..."
    podman start "$CONTAINER_NAME" >/dev/null
  fi
else
  if ! podman volume exists "$VOLUME_NAME"; then
    podman volume create "$VOLUME_NAME" >/dev/null
  fi

  echo "Creating $CONTAINER_NAME from $IMAGE..."
  podman run \
    --name "$CONTAINER_NAME" \
    -e POSTGRES_USER="$POSTGRES_USER" \
    -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
    -e POSTGRES_DB="$POSTGRES_DB" \
    -p "$HOST_PORT:5432" \
    -v "$VOLUME_NAME:/var/lib/postgresql/data" \
    -d "$IMAGE" >/dev/null
fi

echo "Waiting for Postgres to accept connections..."
for _ in $(seq 1 60); do
  if podman exec "$CONTAINER_NAME" pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
    echo "Postgres is ready on localhost:$HOST_PORT/$POSTGRES_DB."
    exit 0
  fi
  sleep 1
done

echo "Postgres did not become ready in time." >&2
exit 1
