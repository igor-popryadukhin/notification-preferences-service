import { pool } from '../database/pool.js';
import type { QuietHours } from '../../domain/types.js';

export async function getQuietHours(
  userId: string,
): Promise<QuietHours | null> {
  const { rows } = await pool.query<{
    start_time: string;
    end_time: string;
    timezone: string;
    enabled: boolean;
  }>(
    'SELECT start_time, end_time, timezone, enabled FROM quiet_hours WHERE user_id = $1',
    [userId],
  );

  if (rows.length === 0) return null;

  const r = rows[0];
  return {
    startTime: r.start_time,
    endTime: r.end_time,
    timezone: r.timezone,
    enabled: r.enabled,
  };
}

export async function upsertQuietHours(
  userId: string,
  quietHours: QuietHours,
): Promise<void> {
  await pool.query(
    `INSERT INTO quiet_hours (user_id, start_time, end_time, timezone, enabled, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET start_time = $2, end_time = $3, timezone = $4, enabled = $5, updated_at = NOW()`,
    [
      userId,
      quietHours.startTime,
      quietHours.endTime,
      quietHours.timezone,
      quietHours.enabled,
    ],
  );
}
