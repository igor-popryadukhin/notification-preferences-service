import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool } from './pool.js';
import { logger } from '../logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const { rows } = await pool.query(
    'SELECT version FROM schema_migrations ORDER BY version',
  );
  return new Set(rows.map((r: { version: string }) => r.version));
}

async function migrate(): Promise<void> {
  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      logger.info({ migration: file }, 'Migration already applied, skipping');
      continue;
    }

    logger.info({ migration: file }, 'Applying migration');
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (version) VALUES ($1)',
        [file],
      );
      await client.query('COMMIT');
      logger.info({ migration: file }, 'Migration applied successfully');
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error({ migration: file, err }, 'Migration failed');
      throw err;
    } finally {
      client.release();
    }
  }

  logger.info('All migrations applied');
}

migrate()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    logger.error({ err }, 'Migration runner failed');
    process.exit(1);
  });
