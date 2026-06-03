#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${COINBOT_DB_CONTAINER:-coinbot-postgres}"
VOLUME_NAME="${COINBOT_DB_VOLUME:-coinbot-postgres-data}"

if podman container exists "$CONTAINER_NAME"; then
  podman stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
  podman rm "$CONTAINER_NAME" >/dev/null
fi

if podman volume exists "$VOLUME_NAME"; then
  podman volume rm "$VOLUME_NAME" >/dev/null
fi

echo "Removed $CONTAINER_NAME and $VOLUME_NAME."
echo "Run ./scripts/dev-db-start.sh to create a fresh blank dev database."
