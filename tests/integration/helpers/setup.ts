import { beforeAll, afterAll } from 'vitest';
import { pool } from '@/infrastructure/database/pool';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_PATH = join(
  __dirname,
  '../../../src/infrastructure/database/migrations/001_initial.sql',
);

beforeAll(async () => {
  // Use an advisory lock to prevent concurrent DDL from parallel test files
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(42)');

    const sql = readFileSync(MIGRATION_PATH, 'utf-8');

    await client.query('DROP TABLE IF EXISTS schema_migrations CASCADE');
    await client.query('DROP TABLE IF EXISTS user_preferences CASCADE');
    await client.query('DROP TABLE IF EXISTS quiet_hours CASCADE');
    await client.query('DROP TABLE IF EXISTS global_policies CASCADE');
    await client.query('DROP TABLE IF EXISTS default_preferences CASCADE');

    await client.query(sql);

    await client.query('SELECT pg_advisory_unlock(42)');
  } finally {
    client.release();
  }
});

afterAll(async () => {
  await pool.end();
});
