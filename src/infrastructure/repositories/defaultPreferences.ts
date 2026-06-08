import { pool } from '../database/pool.js';
import type { Preference } from '../../domain/types.js';

export async function getAllDefaultPreferences(): Promise<Preference[]> {
  const { rows } = await pool.query<Preference>(
    `SELECT notification_type AS "notificationType", channel, allowed
     FROM default_preferences
     ORDER BY notification_type, channel`,
  );
  return rows;
}
