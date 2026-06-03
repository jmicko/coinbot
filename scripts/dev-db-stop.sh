#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${COINBOT_DB_CONTAINER:-coinbot-postgres}"

if podman container exists "$CONTAINER_NAME"; then
  podman stop "$CONTAINER_NAME"
else
  echo "$CONTAINER_NAME does not exist."
fi
