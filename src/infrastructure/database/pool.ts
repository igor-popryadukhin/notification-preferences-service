import pg from 'pg';
import { config } from '../../config.js';
import { logger } from '../logger.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.database.url,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle database client');
});

export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    client.release();
    return true;
  } catch {
    return false;
  }
}
