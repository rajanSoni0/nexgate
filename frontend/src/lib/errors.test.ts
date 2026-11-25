import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { errorTitle, normalizeError } from './errors';

function responseError(status: number, data: unknown, headers: Record<string, string> = {}) {
  const config = { headers: new AxiosHeaders() } as never;
  return new AxiosError('failed', 'ERR_BAD_RESPONSE', config, {}, { status, statusText: '', data, headers: AxiosHeaders.from(headers), config });
}

describe('normalizeError', () => {
  it('maps a missing response to a network error', () => {
    const error = normalizeError(new AxiosError('Network Error', 'ERR_NETWORK'), 'management');
    expect(error.kind).toBe('network');
    expect(errorTitle(error)).toBe('Connection failed');
  });

  it('recognises the dev proxy’s upstream-unavailable signal', () => {
    const error = normalizeError(responseError(502, { message: 'proxy text' }, { 'x-nexgate-proxy': 'upstream-unavailable' }), 'gateway');
    expect(error.kind).toBe('unavailable');
    expect(error.message).toMatch(/Smart Gateway/);
  });

  it('uses the backend ApiErrorResponse message for validation failures', () => {
    const error = normalizeError(
      responseError(400, { timestamp: '2026-11-24T10:00:00Z', status: 400, error: 'Validation failed', message: 'slug must contain lowercase letters, numbers and single hyphens', path: '/api/platform/organizations' }),
      'management',
    );
    expect(error).toMatchObject({ kind: 'validation', status: 400, fromServer: true, path: '/api/platform/organizations' });
    expect(error.message).toBe('slug must contain lowercase letters, numbers and single hyphens');
  });

  it('maps 403 and 409 with server messages', () => {
    expect(normalizeError(responseError(403, { message: 'Cross-tenant access is not permitted' }), 'management')).toMatchObject({ kind: 'forbidden', message: 'Cross-tenant access is not permitted' });
    expect(normalizeError(responseError(409, { message: 'Route identifier already exists' }), 'management')).toMatchObject({ kind: 'conflict' });
  });

  it('explains a 401 from a non-session service without blaming the session', () => {
    const error = normalizeError(responseError(401, ''), 'analytics');
    expect(error.kind).toBe('unauthorized');
    expect(error.message).toBe('The Analytics service rejected this session.');
    expect(errorTitle(error)).toBe('Access rejected by service');
  });

  it('hides the backend’s generic 500 text behind a service-specific message', () => {
    const error = normalizeError(responseError(500, { message: 'An unexpected error occurred' }), 'management');
    expect(error.kind).toBe('server');
    expect(error.message).toBe('The API Management service returned an error (HTTP 500).');
  });
});
