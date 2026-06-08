import { pool } from '../database/pool.js';
import type { Preference } from '../../domain/types.js';

export async function getUserPreferences(
  userId: string,
): Promise<Preference[]> {
  const { rows } = await pool.query<Preference>(
    `SELECT notification_type AS "notificationType", channel, allowed
     FROM user_preferences
     WHERE user_id = $1
     ORDER BY notification_type, channel`,
    [userId],
  );
  return rows;
}

export async function upsertUserPreferences(
  userId: string,
  preferences: Preference[],
): Promise<void> {
  if (preferences.length === 0) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const pref of preferences) {
      await client.query(
        `INSERT INTO user_preferences (user_id, notification_type, channel, allowed, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (user_id, notification_type, channel)
         DO UPDATE SET allowed = $4, updated_at = NOW()`,
        [userId, pref.notificationType, pref.channel, pref.allowed],
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
