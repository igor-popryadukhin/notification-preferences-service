import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { startTestServer, stopTestServer, getBaseUrl } from '../helpers/testServer';
import {
  seedUserPreference,
  seedQuietHours,
  seedGlobalPolicy,
  clearAllData,
} from '../helpers/testDatabase';

describe('Evaluate API', () => {
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

  // --- Default preferences for new user ---
  it('should allow for new user (defaults all allow)', async () => {
    const res = await fetch(`${baseUrl}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'new-user',
        notificationType: 'marketing',
        channel: 'email',
      }),
    });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toEqual({ decision: 'allow' });
  });

  // --- User preference override ---
  it('should deny when user has opted out', async () => {
    await seedUserPreference('user-1', 'marketing', 'email', false);

    const res = await fetch(`${baseUrl}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user-1',
        notificationType: 'marketing',
        channel: 'email',
      }),
    });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.decision).toBe('deny');
    expect(data.reason).toBe('User preference');
  });

  // --- Quiet hours ---
  it('should deny marketing during quiet hours', async () => {
    await seedQuietHours('user-1', '22:00', '06:00', 'UTC', true);

    const res = await fetch(`${baseUrl}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user-1',
        notificationType: 'marketing',
        channel: 'push',
        datetime: '2026-05-21T23:00:00Z',
      }),
    });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.decision).toBe('deny');
    expect(data.reason).toContain('Quiet hours active');
  });

  it('should allow transactional during quiet hours', async () => {
    await seedQuietHours('user-1', '22:00', '06:00', 'UTC', true);

    const res = await fetch(`${baseUrl}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user-1',
        notificationType: 'transactional',
        channel: 'push',
        datetime: '2026-05-21T23:00:00Z',
      }),
    });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toEqual({ decision: 'allow' });
  });

  // --- Global policy ---
  it('should deny when global policy blocks type/channel/region', async () => {
    await seedGlobalPolicy({
      notificationType: 'marketing',
      channel: 'sms',
      region: 'EU',
      allowed: false,
      reason: 'EU marketing SMS ban',
    });

    const res = await fetch(`${baseUrl}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user-1',
        notificationType: 'marketing',
        channel: 'sms',
        region: 'EU',
      }),
    });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.decision).toBe('deny');
    expect(data.reason).toBe('EU marketing SMS ban');
  });

  it('should allow when global policy exists but region differs', async () => {
    await seedGlobalPolicy({
      notificationType: 'marketing',
      channel: 'sms',
      region: 'EU',
      allowed: false,
      reason: 'EU marketing SMS ban',
    });

    const res = await fetch(`${baseUrl}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user-1',
        notificationType: 'marketing',
        channel: 'sms',
        region: 'US',
      }),
    });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.decision).toBe('allow');
  });

  // --- Validation ---
  it('should return 400 for missing userId', async () => {
    const res = await fetch(`${baseUrl}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationType: 'marketing',
        channel: 'email',
      }),
    });
    expect(res.status).toBe(400);
  });

  it('should return 400 for invalid notificationType', async () => {
    const res = await fetch(`${baseUrl}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user-1',
        notificationType: 'invalid_type',
        channel: 'email',
      }),
    });
    expect(res.status).toBe(400);
  });
});
