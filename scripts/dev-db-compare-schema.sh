#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${COINBOT_DB_CONTAINER:-coinbot-postgres}"
POSTGRES_USER="${COINBOT_DB_USER:-coinbot}"
LEFT_DB="${1:-coinbot_dev}"
RIGHT_DB="${2:-coinbot_cold_start}"

if ! podman container exists "$CONTAINER_NAME"; then
  echo "$CONTAINER_NAME does not exist. Run ./scripts/dev-db-start.sh first." >&2
  exit 1
fi

if ! podman exec "$CONTAINER_NAME" pg_isready -U "$POSTGRES_USER" -d "$LEFT_DB" >/dev/null 2>&1; then
  echo "$CONTAINER_NAME is not ready for $LEFT_DB." >&2
  exit 1
fi

if ! podman exec "$CONTAINER_NAME" pg_isready -U "$POSTGRES_USER" -d "$RIGHT_DB" >/dev/null 2>&1; then
  echo "$CONTAINER_NAME is not ready for $RIGHT_DB." >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

run_query() {
  local db="$1"
  local name="$2"
  local sql="$3"

  podman exec "$CONTAINER_NAME" \
    psql \
      --username "$POSTGRES_USER" \
      --dbname "$db" \
      --no-align \
      --tuples-only \
      --field-separator $'\t' \
      --set ON_ERROR_STOP=1 \
      --command "$sql" |
    sort > "$TMP_DIR/$db.$name"
}

compare_query() {
  local name="$1"
  local sql="$2"

  run_query "$LEFT_DB" "$name" "$sql"
  run_query "$RIGHT_DB" "$name" "$sql"

  if ! diff -u "$TMP_DIR/$LEFT_DB.$name" "$TMP_DIR/$RIGHT_DB.$name"; then
    echo "Schema mismatch in $name." >&2
    return 1
  fi
}

compare_query tables "
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
  and table_name <> 'schema_migrations'
order by table_name;
"

compare_query columns "
select
  table_name,
  column_name,
  ordinal_position,
  data_type,
  udt_name,
  coalesce(character_maximum_length::text, ''),
  coalesce(numeric_precision::text, ''),
  coalesce(numeric_scale::text, ''),
  is_nullable,
  coalesce(column_default, ''),
  is_identity,
  coalesce(identity_generation, ''),
  coalesce(generation_expression, '')
from information_schema.columns
where table_schema = 'public'
  and table_name <> 'schema_migrations'
order by table_name, ordinal_position;
"

compare_query constraints "
select
  table_class.relname,
  constraint_info.conname,
  constraint_info.contype,
  pg_get_constraintdef(constraint_info.oid)
from pg_constraint constraint_info
join pg_namespace constraint_schema
  on constraint_schema.oid = constraint_info.connamespace
join pg_class table_class
  on table_class.oid = constraint_info.conrelid
where constraint_schema.nspname = 'public'
  and table_class.relname <> 'schema_migrations'
order by table_class.relname, constraint_info.conname;
"

compare_query indexes "
select
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename <> 'schema_migrations'
order by tablename, indexname;
"

compare_query sequences "
select
  sequence_name,
  data_type,
  start_value,
  minimum_value,
  maximum_value,
  increment
from information_schema.sequences
where sequence_schema = 'public'
  and sequence_name <> 'schema_migrations_id_seq'
order by sequence_name;
"

echo "Schemas match: $LEFT_DB and $RIGHT_DB"
