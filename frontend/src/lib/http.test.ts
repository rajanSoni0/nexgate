import { describe, expect, it } from 'vitest';
import { mockHttp } from '@/test/http';
import { platformSession, signInAs } from '@/test/fixtures';
import { analyticsClient, managementClient } from './http';
import { sessionStore } from './session';

describe('service clients', () => {
  it('attaches the session token to API Management requests', async () => {
    const http = mockHttp({ 'GET /api/platform/organizations': { status: 200, data: [] } });
    const session = platformSession();
    signInAs(session);
    await managementClient.get('/api/platform/organizations');
    expect(http.calls[0].authorization).toBe(`Bearer ${session.token}`);
  });

  it('ends the session when API Management rejects the token', async () => {
    mockHttp({ 'GET /api/platform/organizations': { status: 401 } });
    signInAs(platformSession());
    await expect(managementClient.get('/api/platform/organizations')).rejects.toMatchObject({ kind: 'unauthorized' });
    expect(sessionStore.get()).toBeNull();
  });

  it('keeps the session when another service answers 401', async () => {
    mockHttp({ 'GET /api/analytics/summary': { status: 401 } });
    signInAs(platformSession());
    await expect(analyticsClient.get('/api/analytics/summary')).rejects.toMatchObject({ kind: 'unauthorized', service: 'analytics' });
    expect(sessionStore.get()).not.toBeNull();
  });

  it('does not send a token with the login request', async () => {
    const http = mockHttp({ 'POST /api/auth/login': { status: 401, data: { message: 'Invalid username or password' } } });
    signInAs(platformSession());
    await expect(managementClient.post('/api/auth/login', {}, { skipAuth: true })).rejects.toMatchObject({ message: 'Invalid username or password' });
    expect(http.calls[0].authorization).toBeUndefined();
    expect(sessionStore.get()).not.toBeNull();
  });

  it('normalizes network failures', async () => {
    mockHttp({ 'GET /api/platform/organizations': 'network' });
    await expect(managementClient.get('/api/platform/organizations')).rejects.toMatchObject({ kind: 'network' });
  });
});
