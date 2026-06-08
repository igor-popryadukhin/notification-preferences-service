import { pool } from '../database/pool.js';
import type { GlobalPolicy } from '../../domain/types.js';

export async function getAllGlobalPolicies(): Promise<GlobalPolicy[]> {
  const { rows } = await pool.query<{
    id: number;
    notification_type: string | null;
    channel: string | null;
    region: string | null;
    allowed: boolean;
    reason: string | null;
  }>(
    'SELECT id, notification_type, channel, region, allowed, reason FROM global_policies',
  );

  return rows.map((r) => ({
    id: r.id,
    notificationType: r.notification_type as GlobalPolicy['notificationType'],
    channel: r.channel as GlobalPolicy['channel'],
    region: r.region,
    allowed: r.allowed,
    reason: r.reason,
  }));
}
