import type {
  Decision,
  EvaluateParams,
  GlobalPolicy,
  Preference,
  QuietHours,
} from './types.js';
import { QUIET_HOURS_BYPASS_TYPES } from './constants.js';

export function evaluate(
  params: EvaluateParams,
  userPreferences: Preference[],
  defaultPreferences: Preference[],
  globalPolicies: GlobalPolicy[],
  quietHours: QuietHours | null,
): Decision {
  // Priority 1: Global policies (hard block)
  for (const policy of globalPolicies) {
    const typeMatch =
      policy.notificationType === null ||
      policy.notificationType === params.notificationType;
    const channelMatch =
      policy.channel === null || policy.channel === params.channel;
    const regionMatch =
      policy.region === null ||
      (params.region !== undefined && policy.region === params.region);

    if (typeMatch && channelMatch && regionMatch) {
      if (!policy.allowed) {
        return {
          decision: 'deny',
          reason: policy.reason ?? 'blocked_by_global_policy',
        };
      }
    }
  }

  // Priority 2: Quiet hours (only for non-bypass types)
  if (quietHours && quietHours.enabled) {
    const bypassesQuietHours = QUIET_HOURS_BYPASS_TYPES.includes(
      params.notificationType,
    );

    if (!bypassesQuietHours && isWithinQuietHours(params.datetime, quietHours)) {
      return {
        decision: 'deny',
        reason: `Quiet hours active (${quietHours.startTime} - ${quietHours.endTime} ${quietHours.timezone})`,
      };
    }
  }

  // Priority 3: User preferences (override defaults)
  const userPref = userPreferences.find(
    (p) =>
      p.notificationType === params.notificationType &&
      p.channel === params.channel,
  );
  if (userPref) {
    return {
      decision: userPref.allowed ? 'allow' : 'deny',
      reason: userPref.allowed ? undefined : 'User preference',
    };
  }

  // Priority 4: Default preferences
  const defaultPref = defaultPreferences.find(
    (p) =>
      p.notificationType === params.notificationType &&
      p.channel === params.channel,
  );
  if (defaultPref) {
    return {
      decision: defaultPref.allowed ? 'allow' : 'deny',
      reason: defaultPref.allowed ? undefined : 'Default preference',
    };
  }

  // Priority 5: Fallback — allow
  return { decision: 'allow' };
}

function isWithinQuietHours(
  datetimeIso: string | undefined,
  quietHours: QuietHours,
): boolean {
  const now = datetimeIso ? new Date(datetimeIso) : new Date();

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: quietHours.timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const localTime = formatter.format(now);

  const start = normalizeTime(quietHours.startTime);
  const end = normalizeTime(quietHours.endTime);

  if (start <= end) {
    return localTime >= start && localTime < end;
  }
  // Overnight: e.g. 22:00 - 06:00
  return localTime >= start || localTime < end;
}

function normalizeTime(time: string): string {
  // Ensure HH:MM:SS format
  if (time.length === 5) return time + ':00';
  return time;
}
