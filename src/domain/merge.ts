import type { Preference, EffectivePreference } from './types.js';
import { NOTIFICATION_TYPES, CHANNELS } from './constants.js';

export function mergePreferences(
  userPreferences: Preference[],
  defaultPreferences: Preference[],
): EffectivePreference[] {
  const result: EffectivePreference[] = [];

  for (const nType of NOTIFICATION_TYPES) {
    for (const channel of CHANNELS) {
      const userPref = userPreferences.find(
        (p) => p.notificationType === nType && p.channel === channel,
      );
      const defaultPref = defaultPreferences.find(
        (p) => p.notificationType === nType && p.channel === channel,
      );

      if (userPref) {
        result.push({ ...userPref, source: 'user' });
      } else if (defaultPref) {
        result.push({ ...defaultPref, source: 'default' });
      }
    }
  }

  return result;
}
