import type { NOTIFICATION_TYPES, CHANNELS } from './constants.js';

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type Channel = (typeof CHANNELS)[number];

export interface Preference {
  notificationType: NotificationType;
  channel: Channel;
  allowed: boolean;
}

export interface EffectivePreference extends Preference {
  source: 'user' | 'default';
}

export interface QuietHours {
  startTime: string; // "HH:MM" or "HH:MM:SS"
  endTime: string; // "HH:MM" or "HH:MM:SS"
  timezone: string; // IANA timezone, e.g. "Europe/Moscow"
  enabled: boolean;
}

export interface Decision {
  decision: 'allow' | 'deny';
  reason?: string;
}

export interface EvaluateParams {
  userId: string;
  notificationType: NotificationType;
  channel: Channel;
  region?: string;
  datetime?: string; // ISO 8601, defaults to now
}

export interface EffectivePreferences {
  userId: string;
  preferences: EffectivePreference[];
  quietHours: QuietHours | null;
}

export interface UpsertPreferencesRequest {
  preferences?: Preference[];
  quietHours?: QuietHours;
}

export interface GlobalPolicy {
  id: number;
  notificationType: NotificationType | null;
  channel: Channel | null;
  region: string | null;
  allowed: boolean;
  reason: string | null;
}
