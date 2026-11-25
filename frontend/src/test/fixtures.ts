import { sessionStore, type Session } from '@/lib/session';
import type { Organization, Route } from '@/types/api';

function base64url(value: object): string {
  return btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/** Unsigned, test-only token with the same claim layout API Management issues. */
export function makeToken(claims: Record<string, unknown>): string {
  return `${base64url({ alg: 'HS256' })}.${base64url(claims)}.test-signature`;
}

export function platformSession(overrides: Partial<Session> = {}): Session {
  const now = Date.now();
  return {
    token: makeToken({ sub: 'platform-admin', role: 'PLATFORM_ADMIN', iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + 3600 }),
    role: 'PLATFORM_ADMIN',
    organizationId: null,
    username: 'platform-admin',
    issuedAt: now,
    expiresAt: now + 3_600_000,
    ...overrides,
  };
}

export function tenantSession(overrides: Partial<Session> = {}): Session {
  const now = Date.now();
  return {
    token: makeToken({ sub: 'acme-admin', role: 'TENANT_ADMIN', organizationId: 7, iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + 3600 }),
    role: 'TENANT_ADMIN',
    organizationId: 7,
    username: 'acme-admin',
    issuedAt: now,
    expiresAt: now + 3_600_000,
    ...overrides,
  };
}

export function signInAs(session: Session) {
  sessionStore.start(session);
}

export function organization(overrides: Partial<Organization> = {}): Organization {
  return {
    id: 7,
    name: 'Acme Retail',
    slug: 'acme-retail',
    status: 'ACTIVE',
    createdAt: '2026-11-01T09:30:00',
    updatedAt: '2026-11-20T14:05:00',
    ...overrides,
  };
}

export function route(overrides: Partial<Route> = {}): Route {
  return {
    id: 11,
    organizationId: 7,
    routeId: 'catalog',
    name: 'Catalog API',
    description: null,
    pathPattern: '/catalog/**',
    targetUri: 'http://catalog:8082',
    stripPrefix: true,
    allowedMethods: ['GET', 'POST'],
    active: true,
    deleted: false,
    configurationVersion: 3,
    policy: {
      authenticationRequired: true,
      permittedRoles: ['USER'],
      rateLimitEnabled: true,
      rateLimitRequests: 100,
      rateLimitWindowSeconds: 60,
      rateLimitScope: 'USER',
      timeoutMs: 5000,
      idempotencyEnabled: false,
      rewriteEnabled: true,
      rewriteTargetPrefix: '/api/catalog',
    },
    headerRules: [],
    createdAt: '2026-11-02T10:00:00',
    updatedAt: '2026-11-21T08:00:00',
    ...overrides,
  };
}

/** Spring Data PageImpl JSON shape (Boot 3.5 default). */
export function springPage<T>(content: T[], { page = 0, size = 20, total = content.length } = {}) {
  return { content, totalElements: total, totalPages: Math.max(1, Math.ceil(total / size)), number: page, size, first: page === 0, last: true, empty: total === 0 };
}
