import { pool } from '@/infrastructure/database/pool';

export async function seedDefaultPreference(
  notificationType: string,
  channel: string,
  allowed: boolean,
): Promise<void> {
  await pool.query(
    `INSERT INTO default_preferences (notification_type, channel, allowed)
     VALUES ($1, $2, $3)
     ON CONFLICT (notification_type, channel) DO UPDATE SET allowed = $3`,
    [notificationType, channel, allowed],
  );
}

export async function seedUserPreference(
  userId: string,
  notificationType: string,
  channel: string,
  allowed: boolean,
): Promise<void> {
  await pool.query(
    `INSERT INTO user_preferences (user_id, notification_type, channel, allowed)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, notification_type, channel) DO UPDATE SET allowed = $4`,
    [userId, notificationType, channel, allowed],
  );
}

export async function seedGlobalPolicy(policy: {
  notificationType?: string | null;
  channel?: string | null;
  region?: string | null;
  allowed: boolean;
  reason?: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO global_policies (notification_type, channel, region, allowed, reason)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      policy.notificationType ?? null,
      policy.channel ?? null,
      policy.region ?? null,
      policy.allowed,
      policy.reason ?? null,
    ],
  );
}

export async function seedQuietHours(
  userId: string,
  startTime: string,
  endTime: string,
  timezone: string,
  enabled: boolean,
): Promise<void> {
  await pool.query(
    `INSERT INTO quiet_hours (user_id, start_time, end_time, timezone, enabled)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE SET start_time = $2, end_time = $3, timezone = $4, enabled = $5`,
    [userId, startTime, endTime, timezone, enabled],
  );
}

export async function clearAllData(): Promise<void> {
  await pool.query('DELETE FROM user_preferences');
  await pool.query('DELETE FROM quiet_hours');
  await pool.query('DELETE FROM global_policies');
  // Keep default_preferences (seeded by migration)
}
