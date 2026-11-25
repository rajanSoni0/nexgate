import { describe, expect, it } from 'vitest';
import { makeToken } from '@/test/fixtures';
import { LoginRejectedError, sessionFromLogin, sessionStore } from './session';

const now = Date.UTC(2026, 10, 24, 12, 0, 0);

describe('sessionFromLogin', () => {
  it('builds a platform session using the token exp claim', () => {
    const exp = Math.floor(now / 1000) + 1800;
    const session = sessionFromLogin(
      { token: makeToken({ sub: 'platform-admin', role: 'PLATFORM_ADMIN', iat: now / 1000, exp }), tokenType: 'Bearer', expiresInSeconds: 3600, role: 'PLATFORM_ADMIN', organizationId: null },
      now,
    );
    expect(session).toMatchObject({ role: 'PLATFORM_ADMIN', username: 'platform-admin', organizationId: null, expiresAt: exp * 1000 });
  });

  it('falls back to expiresInSeconds when the token has no exp', () => {
    const session = sessionFromLogin(
      { token: makeToken({ sub: 'a', role: 'TENANT_ADMIN' }), tokenType: 'Bearer', expiresInSeconds: 600, role: 'TENANT_ADMIN', organizationId: 4 },
      now,
    );
    expect(session.expiresAt).toBe(now + 600_000);
    expect(session.organizationId).toBe(4);
  });

  it('refuses the machine-to-machine GATEWAY_SERVICE role', () => {
    expect(() =>
      sessionFromLogin({ token: makeToken({ role: 'GATEWAY_SERVICE' }), tokenType: 'Bearer', expiresInSeconds: 3600, role: 'GATEWAY_SERVICE', organizationId: null }, now),
    ).toThrow(LoginRejectedError);
  });

  it('refuses unknown roles, unreadable tokens and role mismatches', () => {
    const base = { tokenType: 'Bearer', expiresInSeconds: 3600, organizationId: null };
    expect(() => sessionFromLogin({ ...base, token: makeToken({ role: 'USER' }), role: 'USER' }, now)).toThrow(LoginRejectedError);
    expect(() => sessionFromLogin({ ...base, token: 'not-a-jwt', role: 'PLATFORM_ADMIN' }, now)).toThrow(LoginRejectedError);
    expect(() => sessionFromLogin({ ...base, token: makeToken({ role: 'TENANT_ADMIN' }), role: 'PLATFORM_ADMIN' }, now)).toThrow(LoginRejectedError);
  });

  it('refuses a tenant administrator without an organization', () => {
    expect(() =>
      sessionFromLogin({ token: makeToken({ role: 'TENANT_ADMIN' }), tokenType: 'Bearer', expiresInSeconds: 3600, role: 'TENANT_ADMIN', organizationId: null }, now),
    ).toThrow(/not linked to an organization/);
  });
});

describe('sessionStore', () => {
  it('persists to sessionStorage only and clears on end', () => {
    const exp = Date.now() + 60_000;
    sessionStore.start({ token: 't', role: 'PLATFORM_ADMIN', organizationId: null, username: 'u', issuedAt: Date.now(), expiresAt: exp });
    expect(window.sessionStorage.getItem('nexgate.session')).toContain('"token":"t"');
    expect(window.localStorage.length).toBe(0);
    sessionStore.end('logout');
    expect(window.sessionStorage.getItem('nexgate.session')).toBeNull();
  });

  it('drops an already-expired stored session on load', () => {
    window.sessionStorage.setItem(
      'nexgate.session',
      JSON.stringify({ token: 't', role: 'PLATFORM_ADMIN', organizationId: null, username: 'u', issuedAt: 0, expiresAt: Date.now() - 1 }),
    );
    sessionStore.reload();
    expect(sessionStore.get()).toBeNull();
    expect(window.sessionStorage.getItem('nexgate.session')).toBeNull();
  });
});
