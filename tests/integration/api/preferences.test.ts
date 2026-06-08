import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { startTestServer, stopTestServer, getBaseUrl } from '../helpers/testServer';
import { seedUserPreference, seedQuietHours, clearAllData } from '../helpers/testDatabase';

describe('Preferences API', () => {
  let baseUrl: string;

  beforeAll(async () => {
    baseUrl = await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  beforeEach(async () => {
    await clearAllData();
  });

  // --- GET preferences ---
  it('should return default preferences for a new user', async () => {
    const res = await fetch(`${baseUrl}/users/user-new/preferences`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.userId).toBe('user-new');
    expect(body.preferences).toHaveLength(9);
    body.preferences.forEach((p: { source: string }) => {
      expect(p.source).toBe('default');
    });
    expect(body.quietHours).toBeNull();
  });

  it('should return user overrides merged with defaults', async () => {
    await seedUserPreference('user-1', 'marketing', 'email', false);

    const res = await fetch(`${baseUrl}/users/user-1/preferences`);
    expect(res.status).toBe(200);

    const body = await res.json();
    const marketingEmail = body.preferences.find(
      (p: { notificationType: string; channel: string }) =>
        p.notificationType === 'marketing' && p.channel === 'email',
    );
    expect(marketingEmail.source).toBe('user');
    expect(marketingEmail.allowed).toBe(false);
  });

  it('should include quiet hours when set', async () => {
    await seedQuietHours('user-1', '22:00:00', '06:00:00', 'UTC', true);

    const res = await fetch(`${baseUrl}/users/user-1/preferences`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.quietHours).not.toBeNull();
    expect(body.quietHours.startTime).toBe('22:00:00');
    expect(body.quietHours.endTime).toBe('06:00:00');
    expect(body.quietHours.timezone).toBe('UTC');
    expect(body.quietHours.enabled).toBe(true);
  });

  // --- POST preferences ---
  it('should upsert user preferences', async () => {
    const body = {
      preferences: [
        { notificationType: 'marketing', channel: 'email', allowed: false },
        { notificationType: 'marketing', channel: 'push', allowed: false },
      ],
    };

    const res = await fetch(`${baseUrl}/users/user-1/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(200);

    const data = await res.json();
    const marketingEmail = data.preferences.find(
      (p: { notificationType: string; channel: string }) =>
        p.notificationType === 'marketing' && p.channel === 'email',
    );
    expect(marketingEmail.source).toBe('user');
    expect(marketingEmail.allowed).toBe(false);
  });

  it('should upsert quiet hours', async () => {
    const body = {
      quietHours: {
        startTime: '23:00',
        endTime: '07:00',
        timezone: 'America/New_York',
        enabled: true,
      },
    };

    const res = await fetch(`${baseUrl}/users/user-1/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.quietHours).not.toBeNull();
    expect(data.quietHours.startTime).toBe('23:00:00');
  });

  // --- Idempotency ---
  it('should be idempotent for repeated preference upserts', async () => {
    const body = {
      preferences: [
        { notificationType: 'marketing', channel: 'email', allowed: false },
      ],
    };
    const headers = { 'Content-Type': 'application/json' };
    const bodyStr = JSON.stringify(body);

    const res1 = await fetch(`${baseUrl}/users/user-1/preferences`, {
      method: 'POST',
      headers,
      body: bodyStr,
    });
    const data1 = await res1.json();

    const res2 = await fetch(`${baseUrl}/users/user-1/preferences`, {
      method: 'POST',
      headers,
      body: bodyStr,
    });
    const data2 = await res2.json();

    expect(data1.preferences).toEqual(data2.preferences);
    expect(data1.quietHours).toEqual(data2.quietHours);
  });

  // --- Validation ---
  it('should return 400 for empty body', async () => {
    const res = await fetch(`${baseUrl}/users/user-1/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe('Validation failed');
  });

  it('should return 400 for invalid notification type', async () => {
    const res = await fetch(`${baseUrl}/users/user-1/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        preferences: [
          { notificationType: 'spam', channel: 'email', allowed: false },
        ],
      }),
    });
    expect(res.status).toBe(400);
  });

  it('should return 400 for invalid timezone', async () => {
    const res = await fetch(`${baseUrl}/users/user-1/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quietHours: {
          startTime: '22:00',
          endTime: '06:00',
          timezone: 'Mars/Olympus',
          enabled: true,
        },
      }),
    });
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.details[0].message).toBe('Invalid IANA timezone');
  });
});
