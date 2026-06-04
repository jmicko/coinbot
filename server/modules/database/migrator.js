import { pool } from '../pool.js';
import baselineSchema from './migrations/001_baseline_schema.js';

const migrations = [
  baselineSchema,
];

const MIGRATION_LOCK_ID = 73194201;

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "schema_migrations" (
      "id" text PRIMARY KEY,
      "name" text NOT NULL,
      "applied_at" timestamptz NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrationIDs(client) {
  const result = await client.query(`SELECT "id" FROM "schema_migrations";`);
  return new Set(result.rows.map(row => row.id));
}

export async function runMigrations() {
  const client = await pool.connect();

  try {
    await client.query('SELECT pg_advisory_lock($1);', [MIGRATION_LOCK_ID]);
    await ensureMigrationsTable(client);

    const appliedMigrationIDs = await getAppliedMigrationIDs(client);

    for (const migration of migrations) {
      if (appliedMigrationIDs.has(migration.id)) {
        continue;
      }

      await client.query('BEGIN;');
      try {
        await migration.up(client);
        await client.query(
          `INSERT INTO "schema_migrations" ("id", "name") VALUES ($1, $2);`,
          [migration.id, migration.name]
        );
        await client.query('COMMIT;');
        console.log(`Applied migration ${migration.id}: ${migration.name}`);
      } catch (error) {
        await client.query('ROLLBACK;');
        throw error;
      }
    }
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1);', [MIGRATION_LOCK_ID]);
    } catch (error) {
      console.log('Failed to release migration advisory lock', error);
    }
    client.release();
  }
}
