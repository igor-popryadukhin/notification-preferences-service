import { describe, it, expect } from 'vitest';
import { mergePreferences } from '@/domain/merge';
import type { Preference, EffectivePreference } from '@/domain/types';

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

describe('mergePreferences', () => {
  it('should return all defaults when user has no preferences', () => {
    const result = mergePreferences([], allDefaults);
    expect(result).toHaveLength(9);
    result.forEach((p: EffectivePreference) => {
      expect(p.source).toBe('default');
    });
  });

  it('should mark overridden preference with source=user', () => {
    const userPrefs: Preference[] = [
      { notificationType: 'marketing', channel: 'email', allowed: false },
    ];
    const result = mergePreferences(userPrefs, allDefaults);
    const overridden = result.find(
      (p) =>
        p.notificationType === 'marketing' && p.channel === 'email',
    );
    expect(overridden).toBeDefined();
    expect(overridden!.source).toBe('user');
    expect(overridden!.allowed).toBe(false);
  });

  it('should mark non-overridden preferences with source=default', () => {
    const userPrefs: Preference[] = [
      { notificationType: 'marketing', channel: 'email', allowed: false },
    ];
    const result = mergePreferences(userPrefs, allDefaults);
    const defaultOne = result.find(
      (p) =>
        p.notificationType === 'marketing' && p.channel === 'push',
    );
    expect(defaultOne!.source).toBe('default');
  });

  it('should handle user overriding all preferences', () => {
    const userPrefs: Preference[] = [
      ...allDefaults.map((d) => ({ ...d, allowed: false })),
    ];
    const result = mergePreferences(userPrefs, allDefaults);
    expect(result).toHaveLength(9);
    result.forEach((p: EffectivePreference) => {
      expect(p.source).toBe('user');
    });
  });

  it('should omit combinations not present in either user or defaults', () => {
    const partialDefaults: Preference[] = [
      { notificationType: 'marketing', channel: 'email', allowed: true },
    ];
    const result = mergePreferences([], partialDefaults);
    // Only 1 combination should be present (the rest are omitted)
    expect(result).toHaveLength(1);
  });

  it('should produce consistent output order (type first, then channel)', () => {
    const result = mergePreferences([], allDefaults);
    // First 3: marketing × (email, sms, push)
    expect(result[0].notificationType).toBe('marketing');
    expect(result[0].channel).toBe('email');
    expect(result[1].channel).toBe('sms');
    expect(result[2].channel).toBe('push');
  });
});
