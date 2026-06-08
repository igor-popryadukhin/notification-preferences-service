export const NOTIFICATION_TYPES = [
  'marketing',
  'transactional',
  'security',
] as const;

export const CHANNELS = ['email', 'sms', 'push'] as const;

/**
 * Notification types that bypass quiet hours.
 * Marketing is blocked during quiet hours; transactional and security are not.
 */
export const QUIET_HOURS_BYPASS_TYPES: readonly string[] = [
  'transactional',
  'security',
];
