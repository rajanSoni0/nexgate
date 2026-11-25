import { describe, expect, it } from 'vitest';
import { route } from '@/test/fixtures';
import { DEFAULT_ROUTE_FORM, formToRouteRequest, makePolicyOnlySchema, routeFormSchema, routeToForm, targetUriIssue, type RouteFormValues } from './schema';

function valid(overrides: Partial<RouteFormValues> = {}): RouteFormValues {
  return { ...DEFAULT_ROUTE_FORM, routeId: 'catalog', name: 'Catalog', pathPattern: '/catalog/**', targetUri: 'http://catalog:8082', ...overrides };
}

function messages(values: RouteFormValues): string[] {
  const result = routeFormSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

describe('route validation mirrors RoutePolicyValidator', () => {
  it('accepts a minimal valid route', () => {
    expect(messages(valid())).toEqual([]);
  });

  it('requires an absolute http(s) target URI', () => {
    expect(targetUriIssue('catalog:8082')).toMatch(/absolute HTTP or HTTPS/);
    expect(targetUriIssue('ftp://files.example')).toMatch(/absolute HTTP or HTTPS/);
    expect(targetUriIssue('http://exa mple')).toMatch(/spaces/);
    expect(targetUriIssue('https://catalog.internal/api')).toBeNull();
  });

  it('requires the path pattern to start with a slash', () => {
    expect(messages(valid({ pathPattern: 'catalog/**' }))).toContain('Path pattern must start with “/”');
  });

  it('requires at least one method', () => {
    expect(messages(valid({ allowedMethods: [] }))).toContain('Choose at least one HTTP method');
  });

  it('requires POST for idempotency', () => {
    const values = valid({ allowedMethods: ['GET'], policy: { ...DEFAULT_ROUTE_FORM.policy, idempotencyEnabled: true } });
    expect(messages(values)).toContain('POST idempotency requires POST in the allowed methods');
    expect(messages({ ...values, allowedMethods: ['GET', 'POST'] })).toEqual([]);
  });

  it('requires positive rate-limit values only when rate limiting is on', () => {
    const policy = { ...DEFAULT_ROUTE_FORM.policy, rateLimitEnabled: true, rateLimitRequests: '0', rateLimitWindowSeconds: '' };
    const errors = messages(valid({ policy }));
    expect(errors).toContain('Enter a whole number of requests, 1 or more');
    expect(errors).toContain('Enter a whole number of seconds, 1 or more');
    expect(messages(valid({ policy: { ...policy, rateLimitEnabled: false } }))).toEqual([]);
  });

  it('bounds the timeout to 1–300000 ms', () => {
    for (const timeoutMs of ['0', '300001', '1.5', '']) {
      expect(messages(valid({ policy: { ...DEFAULT_ROUTE_FORM.policy, timeoutMs } }))).toContain('Enter a whole number of milliseconds between 1 and 300000');
    }
    expect(messages(valid({ policy: { ...DEFAULT_ROUTE_FORM.policy, timeoutMs: '300000' } }))).toEqual([]);
  });

  it('rejects roles outside the application role set', () => {
    expect(messages(valid({ policy: { ...DEFAULT_ROUTE_FORM.policy, permittedRoles: ['ROOT'] } }))).toContain('Unsupported application role: ROOT');
  });

  it('requires values for ADD/MODIFY and refuses sensitive headers', () => {
    const errors = messages(
      valid({
        headerRules: [
          { direction: 'REQUEST', action: 'ADD', headerName: 'X-Tenant', headerValue: '' },
          { direction: 'REQUEST', action: 'FORWARD', headerName: 'Authorization', headerValue: '' },
          { direction: 'RESPONSE', action: 'REMOVE', headerName: 'Set-Cookie', headerValue: '' },
          { direction: 'RESPONSE', action: 'REMOVE', headerName: 'Server', headerValue: '' },
        ],
      }),
    );
    expect(errors).toContain('A value is required for ADD and MODIFY rules');
    expect(errors).toContain('Sensitive headers can’t be transformed: Authorization');
    expect(errors).toContain('Sensitive headers can’t be transformed: Set-Cookie');
    expect(errors).toHaveLength(3);
  });

  it('validates policy-only edits against the route’s existing methods', () => {
    const schema = makePolicyOnlySchema(['GET']);
    expect(schema.safeParse({ policy: { ...DEFAULT_ROUTE_FORM.policy, idempotencyEnabled: true } }).success).toBe(false);
  });
});

describe('route request mapping', () => {
  it('never sends organizationId and always sends a complete policy', () => {
    const request = formToRouteRequest(valid({ description: '  ', allowedMethods: ['post', 'GET'] }));
    expect(request).not.toHaveProperty('organizationId');
    expect(request.description).toBeNull();
    expect(request.allowedMethods).toEqual(['GET', 'POST']);
    expect(request.policy).toEqual({
      authenticationRequired: true,
      permittedRoles: [],
      rateLimitEnabled: false,
      rateLimitRequests: 100,
      rateLimitWindowSeconds: 60,
      rateLimitScope: 'ROUTE',
      timeoutMs: 30000,
      idempotencyEnabled: false,
      rewriteEnabled: false,
      rewriteTargetPrefix: null,
    });
  });

  it('round-trips an existing route', () => {
    const existing = route({ headerRules: [{ id: 1, direction: 'REQUEST', action: 'REMOVE', headerName: 'X-Debug', headerValue: null }] });
    const request = formToRouteRequest(routeToForm(existing));
    expect(request).toMatchObject({
      routeId: existing.routeId,
      pathPattern: existing.pathPattern,
      targetUri: existing.targetUri,
      policy: existing.policy,
      headerRules: [{ direction: 'REQUEST', action: 'REMOVE', headerName: 'X-Debug', headerValue: null }],
    });
  });
});
