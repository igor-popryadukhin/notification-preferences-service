import { describe, it, expect } from 'vitest';
import { evaluate } from '@/domain/evaluate';
import type {
  EvaluateParams,
  Preference,
  GlobalPolicy,
  QuietHours,
} from '@/domain/types';

const allDefaults: Preference[] = [
  { notificationType: 'marketing', channel: 'email', allowed: true },
  { notificationType: 'marketing', channel: 'sms', allowed: true },
  { notificationType: 'marketing', channel: 'push', allowed: true },
  { notificationType: 'transactional', channel: 'email', allowed: true },
  { notificationType: 'transactional', channel: 'sms', allowed: true },
  { notificationType: 'transactional', channel: 'push', allowed: true },
  { notificationType: 'security', channel: 'email', allowed: true },
  { notificationType: 'security', channel: 'sms', allowed: true },
  { notificationType: 'security', channel: 'push', allowed: true },
];

describe('evaluate', () => {
  // --- Default preferences for new user ---
  it('should allow when user has no preferences (defaults are all allow)', () => {
    const params: EvaluateParams = {
      userId: 'new-user',
      notificationType: 'marketing',
      channel: 'email',
    };
    const result = evaluate(params, [], allDefaults, [], null);
    expect(result).toEqual({ decision: 'allow' });
  });

  it('should deny when default blocks the type/channel', () => {
    const denyDefaults: Preference[] = [
      { notificationType: 'marketing', channel: 'email', allowed: false },
    ];
    const params: EvaluateParams = {
      userId: 'new-user',
      notificationType: 'marketing',
      channel: 'email',
    };
    const result = evaluate(params, [], denyDefaults, [], null);
    expect(result).toEqual({
      decision: 'deny',
      reason: 'Default preference',
    });
  });

  // --- User preference override ---
  it('should use user preference (deny) over default (allow)', () => {
    const userPrefs: Preference[] = [
      { notificationType: 'marketing', channel: 'email', allowed: false },
    ];
    const params: EvaluateParams = {
      userId: 'user-1',
      notificationType: 'marketing',
      channel: 'email',
    };
    const result = evaluate(params, userPrefs, allDefaults, [], null);
    expect(result).toEqual({
      decision: 'deny',
      reason: 'User preference',
    });
  });

  it('should use user preference (allow) over default (deny)', () => {
    const denyDefaults: Preference[] = [
      { notificationType: 'marketing', channel: 'sms', allowed: false },
    ];
    const userPrefs: Preference[] = [
      { notificationType: 'marketing', channel: 'sms', allowed: true },
    ];
    const params: EvaluateParams = {
      userId: 'user-1',
      notificationType: 'marketing',
      channel: 'sms',
    };
    const result = evaluate(params, userPrefs, denyDefaults, [], null);
    expect(result).toEqual({ decision: 'allow' });
  });

  it('should use default for unchanged preferences while user override applies to changed ones', () => {
    const userPrefs: Preference[] = [
      { notificationType: 'marketing', channel: 'email', allowed: false },
    ];
    const params: EvaluateParams = {
      userId: 'user-1',
      notificationType: 'marketing',
      channel: 'push',
    };
    const result = evaluate(params, userPrefs, allDefaults, [], null);
    expect(result).toEqual({ decision: 'allow' });
  });

  // --- Quiet hours ---
  it('should block marketing notification during quiet hours', () => {
    const quietHours: QuietHours = {
      startTime: '22:00',
      endTime: '06:00',
      timezone: 'Europe/Moscow',
      enabled: true,
    };
    const params: EvaluateParams = {
      userId: 'user-1',
      notificationType: 'marketing',
      channel: 'push',
      datetime: '2026-05-21T23:00:00Z', // 02:00 MSK next day
    };
    const result = evaluate(params, [], allDefaults, [], quietHours);
    expect(result.decision).toBe('deny');
    expect(result.reason).toContain('Quiet hours active');
  });

  it('should allow transactional notification during quiet hours', () => {
    const quietHours: QuietHours = {
      startTime: '22:00',
      endTime: '06:00',
      timezone: 'Europe/Moscow',
      enabled: true,
    };
    const params: EvaluateParams = {
      userId: 'user-1',
      notificationType: 'transactional',
      channel: 'push',
      datetime: '2026-05-21T23:00:00Z', // 02:00 MSK next day
    };
    const result = evaluate(params, [], allDefaults, [], quietHours);
    expect(result).toEqual({ decision: 'allow' });
  });

  it('should allow marketing notification outside quiet hours', () => {
    const quietHours: QuietHours = {
      startTime: '22:00',
      endTime: '06:00',
      timezone: 'Europe/Moscow',
      enabled: true,
    };
    const params: EvaluateParams = {
      userId: 'user-1',
      notificationType: 'marketing',
      channel: 'push',
      datetime: '2026-05-21T10:00:00Z', // 13:00 MSK
    };
    const result = evaluate(params, [], allDefaults, [], quietHours);
    expect(result).toEqual({ decision: 'allow' });
  });

  it('should allow marketing when quiet hours exist but are disabled', () => {
    const quietHours: QuietHours = {
      startTime: '22:00',
      endTime: '06:00',
      timezone: 'Europe/Moscow',
      enabled: false,
    };
    const params: EvaluateParams = {
      userId: 'user-1',
      notificationType: 'marketing',
      channel: 'push',
      datetime: '2026-05-21T23:00:00Z',
    };
    const result = evaluate(params, [], allDefaults, [], quietHours);
    expect(result).toEqual({ decision: 'allow' });
  });

  it('should allow when no quiet hours configured', () => {
    const params: EvaluateParams = {
      userId: 'user-1',
      notificationType: 'marketing',
      channel: 'push',
      datetime: '2026-05-21T23:00:00Z',
    };
    const result = evaluate(params, [], allDefaults, [], null);
    expect(result).toEqual({ decision: 'allow' });
  });

  // --- Global policies ---
  it('should deny when global policy blocks type/channel/region', () => {
    const policies: GlobalPolicy[] = [
      {
        id: 1,
        notificationType: 'marketing',
        channel: 'sms',
        region: 'EU',
        allowed: false,
        reason: 'GDPR restriction',
      },
    ];
    const params: EvaluateParams = {
      userId: 'user-1',
      notificationType: 'marketing',
      channel: 'sms',
      region: 'EU',
    };
    const result = evaluate(params, [], allDefaults, policies, null);
    expect(result).toEqual({
      decision: 'deny',
      reason: 'GDPR restriction',
    });
  });

  it('should allow when global policy exists but region does not match', () => {
    const policies: GlobalPolicy[] = [
      {
        id: 1,
        notificationType: 'marketing',
        channel: 'sms',
        region: 'EU',
        allowed: false,
        reason: 'GDPR restriction',
      },
    ];
    const params: EvaluateParams = {
      userId: 'user-1',
      notificationType: 'marketing',
      channel: 'sms',
      region: 'US',
    };
    const result = evaluate(params, [], allDefaults, policies, null);
    expect(result).toEqual({ decision: 'allow' });
  });

  it('should match wildcard policy (null notificationType)', () => {
    const policies: GlobalPolicy[] = [
      {
        id: 1,
        notificationType: null,
        channel: 'sms',
        region: 'EU',
        allowed: false,
        reason: 'All SMS blocked in EU',
      },
    ];
    const params: EvaluateParams = {
      userId: 'user-1',
      notificationType: 'transactional',
      channel: 'sms',
      region: 'EU',
    };
    const result = evaluate(params, [], allDefaults, policies, null);
    expect(result).toEqual({
      decision: 'deny',
      reason: 'All SMS blocked in EU',
    });
  });

  it('should match wildcard policy (null region)', () => {
    const policies: GlobalPolicy[] = [
      {
        id: 1,
        notificationType: 'marketing',
        channel: 'push',
        region: null,
        allowed: false,
        reason: 'No marketing push anywhere',
      },
    ];
    const params: EvaluateParams = {
      userId: 'user-1',
      notificationType: 'marketing',
      channel: 'push',
    };
    const result = evaluate(params, [], allDefaults, policies, null);
    expect(result).toEqual({
      decision: 'deny',
      reason: 'No marketing push anywhere',
    });
  });

  it('should not match wildcard region when params has no region', () => {
    const policies: GlobalPolicy[] = [
      {
        id: 1,
        notificationType: 'marketing',
        channel: 'push',
        region: 'EU',
        allowed: false,
        reason: 'EU only block',
      },
    ];
    const params: EvaluateParams = {
      userId: 'user-1',
      notificationType: 'marketing',
      channel: 'push',
      // region is undefined
    };
    const result = evaluate(params, [], allDefaults, policies, null);
    expect(result).toEqual({ decision: 'allow' });
  });

  it('should use first matching deny policy among multiple', () => {
    const policies: GlobalPolicy[] = [
      {
        id: 1,
        notificationType: 'marketing',
        channel: 'email',
        region: 'EU',
        allowed: true,
        reason: null,
      },
      {
        id: 2,
        notificationType: 'marketing',
        channel: 'email',
        region: 'EU',
        allowed: false,
        reason: 'Later override blocks',
      },
    ];
    const params: EvaluateParams = {
      userId: 'user-1',
      notificationType: 'marketing',
      channel: 'email',
      region: 'EU',
    };
    const result = evaluate(params, [], allDefaults, policies, null);
    expect(result).toEqual({
      decision: 'deny',
      reason: 'Later override blocks',
    });
  });

  // --- Fallback ---
  it('should allow when no preferences, defaults, policies, or quiet hours exist', () => {
    const params: EvaluateParams = {
      userId: 'user-1',
      notificationType: 'marketing',
      channel: 'email',
    };
    const result = evaluate(params, [], [], [], null);
    expect(result).toEqual({ decision: 'allow' });
  });

  // --- Idempotency ---
  it('should be idempotent (same inputs → same output)', () => {
    const userPrefs: Preference[] = [
      { notificationType: 'marketing', channel: 'email', allowed: false },
    ];
    const policies: GlobalPolicy[] = [
      {
        id: 1,
        notificationType: null,
        channel: null,
        region: 'EU',
        allowed: false,
        reason: 'EU-wide block',
      },
    ];
    const quietHours: QuietHours = {
      startTime: '22:00',
      endTime: '06:00',
      timezone: 'Europe/Berlin',
      enabled: true,
    };
    const params: EvaluateParams = {
      userId: 'user-1',
      notificationType: 'marketing',
      channel: 'email',
      region: 'EU',
      datetime: '2026-05-21T23:00:00Z',
    };

    const result1 = evaluate(params, userPrefs, allDefaults, policies, quietHours);
    const result2 = evaluate(params, userPrefs, allDefaults, policies, quietHours);
    expect(result1).toEqual(result2);
  });

  // --- Priority: global policy > quiet hours > user preference ---
  it('should enforce global policy even when user preference allows', () => {
    const userPrefs: Preference[] = [
      { notificationType: 'marketing', channel: 'sms', allowed: true },
    ];
    const policies: GlobalPolicy[] = [
      {
        id: 1,
        notificationType: 'marketing',
        channel: 'sms',
        region: 'EU',
        allowed: false,
        reason: 'EU marketing SMS ban',
      },
    ];
    const params: EvaluateParams = {
      userId: 'user-1',
      notificationType: 'marketing',
      channel: 'sms',
      region: 'EU',
    };
    const result = evaluate(params, userPrefs, allDefaults, policies, null);
    expect(result).toEqual({
      decision: 'deny',
      reason: 'EU marketing SMS ban',
    });
  });

  // --- Overnight quiet hours edge cases ---
  it('should handle overnight quiet hours at boundary (start)', () => {
    const quietHours: QuietHours = {
      startTime: '22:00',
      endTime: '06:00',
      timezone: 'UTC',
      enabled: true,
    };
    const params: EvaluateParams = {
      userId: 'user-1',
      notificationType: 'marketing',
      channel: 'email',
      datetime: '2026-05-21T22:00:00Z', // exactly at start
    };
    const result = evaluate(params, [], allDefaults, [], quietHours);
    expect(result.decision).toBe('deny');
  });

  it('should handle overnight quiet hours at boundary (end)', () => {
    const quietHours: QuietHours = {
      startTime: '22:00',
      endTime: '06:00',
      timezone: 'UTC',
      enabled: true,
    };
    const params: EvaluateParams = {
      userId: 'user-1',
      notificationType: 'marketing',
      channel: 'email',
      datetime: '2026-05-21T05:59:59Z', // just before end
    };
    const result = evaluate(params, [], allDefaults, [], quietHours);
    expect(result.decision).toBe('deny');
  });

  it('should allow at quiet hours end boundary', () => {
    const quietHours: QuietHours = {
      startTime: '22:00',
      endTime: '06:00',
      timezone: 'UTC',
      enabled: true,
    };
    const params: EvaluateParams = {
      userId: 'user-1',
      notificationType: 'marketing',
      channel: 'email',
      datetime: '2026-05-21T06:00:00Z', // exactly at end
    };
    const result = evaluate(params, [], allDefaults, [], quietHours);
    expect(result).toEqual({ decision: 'allow' });
  });
});
