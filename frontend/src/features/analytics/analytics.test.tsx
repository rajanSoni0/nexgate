import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { sessionStore } from '@/lib/session';
import { platformSession, signInAs, tenantSession } from '@/test/fixtures';
import { mockHttp, type Handler } from '@/test/http';
import { renderApp } from '@/test/render';
import { analyticsRefetch, ANALYTICS_REFRESH_MS } from './hooks';
import { ApiError } from '@/lib/errors';

function analytics(overrides: Record<string, Handler> = {}): Record<string, Handler> {
  return {
    'GET /api/analytics/summary': { status: 200, data: { totalRequests: 1200, successfulRequests: 1140, failedRequests: 60, averageResponseTimeMs: 42.5 } },
    'GET /api/analytics/routes': {
      status: 200,
      data: [
        { routeId: 'catalog', routePath: '/catalog/**', requestCount: 900, averageResponseTimeMs: 30 },
        { routeId: 'orders', routePath: '/orders/**', requestCount: 300, averageResponseTimeMs: 80 },
      ],
    },
    'GET /api/analytics/slow-routes': { status: 200, data: [{ routeId: 'orders', routePath: '/orders/**', requestCount: 300, averageResponseTimeMs: 80 }] },
    'GET /api/analytics/rate-limit-rejections': { status: 200, data: { total: 17 } },
    'GET /api/analytics/idempotency-replays': { status: 200, data: { total: 4 } },
    ...overrides,
  };
}

describe('platform analytics', () => {
  it('shows skeletons while loading', async () => {
    const never: Handler = () => new Promise(() => {});
    mockHttp(Object.fromEntries(Object.keys(analytics()).map((key) => [key, never])));
    signInAs(platformSession());
    renderApp('/platform/analytics');
    expect(await screen.findByRole('status', { name: 'Loading Total requests' })).toBeInTheDocument();
  });

  it('renders the real metrics and requests the slow-route limit', async () => {
    const http = mockHttp(analytics());
    signInAs(platformSession());
    renderApp('/platform/analytics');
    expect(await screen.findByText('1,200')).toBeInTheDocument();
    expect(screen.getByText('43 ms')).toBeInTheDocument(); // formatMs rounds values ≥ 10 ms
    expect(screen.getByText('17')).toBeInTheDocument();
    expect(screen.getByText('95.0%')).toBeInTheDocument();
    expect(http.callsTo('GET', '/api/analytics/slow-routes')[0].params).toEqual({ limit: 10 });
    expect(http.calls.every((call) => call.client !== 'analytics' || call.authorization?.startsWith('Bearer '))).toBe(true);
  });

  it('shows empty states when no traffic is recorded', async () => {
    mockHttp(
      analytics({
        'GET /api/analytics/summary': { status: 200, data: { totalRequests: 0, successfulRequests: 0, failedRequests: 0, averageResponseTimeMs: 0 } },
        'GET /api/analytics/routes': { status: 200, data: [] },
        'GET /api/analytics/slow-routes': { status: 200, data: [] },
      }),
    );
    signInAs(platformSession());
    renderApp('/platform/analytics');
    expect(await screen.findByText('No traffic recorded yet')).toBeInTheDocument();
    expect(screen.getAllByText('No route traffic yet').length).toBeGreaterThan(0);
    expect(screen.getByText('No latency data yet')).toBeInTheDocument();
  });

  it('explains the 401 from analytics-service and keeps the console session', async () => {
    const rejected = { status: 401 } as const;
    mockHttp(Object.fromEntries(Object.keys(analytics()).map((key) => [key, rejected])));
    signInAs(platformSession());
    renderApp('/platform/analytics');
    expect(await screen.findByText('Access rejected by service')).toBeInTheDocument();
    // Explained once at the top; cards point to it instead of repeating it.
    await screen.findAllByText(/See the error at the top of the page/);
    expect(screen.getAllByText('Access rejected by service')).toHaveLength(1);
    expect(screen.getByText(/no JWT configuration/)).toBeInTheDocument();
    expect(sessionStore.get()).not.toBeNull();
  });

  it('lists the capabilities the backend does not provide', async () => {
    mockHttp(analytics());
    signInAs(platformSession());
    renderApp('/platform/analytics');
    expect(await screen.findByText('Request timeline')).toBeInTheDocument();
    expect(screen.getByText('Time-range filters')).toBeInTheDocument();
    expect(screen.getByText('Top organizations')).toBeInTheDocument();
  });

  it('stops polling after an authorization failure', () => {
    expect(analyticsRefetch(null)).toBe(ANALYTICS_REFRESH_MS);
    expect(analyticsRefetch(new ApiError({ kind: 'network', message: '', service: 'analytics' }))).toBe(ANALYTICS_REFRESH_MS);
    expect(analyticsRefetch(new ApiError({ kind: 'unauthorized', message: '', service: 'analytics' }))).toBe(false);
  });
});

describe('tenant analytics isolation', () => {
  it.each(['/tenant/analytics', '/tenant/analytics/routes'])('%s makes no analytics requests', async (path) => {
    const http = mockHttp(analytics());
    signInAs(tenantSession());
    renderApp(path);
    expect(await screen.findByText(/would expose other organizations’ traffic/)).toBeInTheDocument();
    expect(http.calls.filter((call) => call.client === 'analytics')).toHaveLength(0);
  });

  it('the tenant overview shows traffic as unavailable without calling analytics', async () => {
    const http = mockHttp({ 'GET /api/gateway/admin/routes': { status: 200, data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 1 } } });
    signInAs(tenantSession());
    renderApp('/tenant');
    await waitFor(() => expect(screen.getAllByText('Not available').length).toBe(6));
    expect(http.calls.filter((call) => call.client === 'analytics')).toHaveLength(0);
  });
});
