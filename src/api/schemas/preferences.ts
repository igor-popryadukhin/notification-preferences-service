import { z } from 'zod';
import { NOTIFICATION_TYPES, CHANNELS } from '../../domain/constants.js';

export const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);
export const channelSchema = z.enum(CHANNELS);

export const preferenceSchema = z.object({
  notificationType: notificationTypeSchema,
  channel: channelSchema,
  allowed: z.boolean(),
});

export const quietHoursSchema = z.object({
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'startTime must be HH:MM or HH:MM:SS'),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'endTime must be HH:MM or HH:MM:SS'),
  timezone: z.string().refine(
    (tz) => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid IANA timezone' },
  ),
  enabled: z.boolean(),
});

export const upsertPreferencesBodySchema = z
  .object({
    preferences: z.array(preferenceSchema).optional(),
    quietHours: quietHoursSchema.optional(),
  })
  .refine(
    (data) => data.preferences !== undefined || data.quietHours !== undefined,
    { message: 'At least one of preferences or quietHours must be provided' },
  );

export const evaluateBodySchema = z.object({
  userId: z.string().min(1),
  notificationType: notificationTypeSchema,
  channel: channelSchema,
  region: z.string().optional(),
  datetime: z.string().datetime().optional(),
});

export type UpsertPreferencesBody = z.infer<typeof upsertPreferencesBodySchema>;
export type EvaluateBody = z.infer<typeof evaluateBodySchema>;
