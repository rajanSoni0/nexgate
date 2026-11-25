import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { platformSession, signInAs } from '@/test/fixtures';
import { mockHttp } from '@/test/http';
import { renderApp } from '@/test/render';
import { classifyActuator, classifyMysql } from './classify';

describe('health classification', () => {
  it('only treats an explicit UP as healthy', () => {
    expect(classifyActuator({ status: 200, data: { status: 'UP' }, upstreamUnavailable: false }).state).toBe('healthy');
    expect(classifyActuator({ status: 200, data: '<html>ok</html>', upstreamUnavailable: false }).state).toBe('unknown');
    expect(classifyActuator({ status: 200, data: { status: 'UNKNOWN' }, upstreamUnavailable: false }).state).toBe('unknown');
  });

  it('maps DOWN and 503 to unhealthy', () => {
    expect(classifyActuator({ status: 503, data: { status: 'DOWN' }, upstreamUnavailable: false }).state).toBe('unhealthy');
    expect(classifyActuator({ status: 503, data: null, upstreamUnavailable: false }).state).toBe('unhealthy');
  });

  it('maps credential-protected health to unknown, never healthy', () => {
    expect(classifyActuator({ status: 401, data: null, upstreamUnavailable: false }).state).toBe('unknown');
    expect(classifyActuator({ status: 403, data: null, upstreamUnavailable: false }).state).toBe('unknown');
  });

  it('maps refused connections and missing responses to unavailable', () => {
    expect(classifyActuator({ status: 502, data: null, upstreamUnavailable: true }).state).toBe('unavailable');
    expect(classifyActuator({ status: null, data: null, upstreamUnavailable: false }).state).toBe('unavailable');
  });

  it('reads MySQL status from API Management /health', () => {
    expect(classifyMysql({ status: 200, data: { serviceStatus: 'UP', dbStatus: 'UP' }, upstreamUnavailable: false }).state).toBe('healthy');
    expect(classifyMysql({ status: 200, data: { serviceStatus: 'UP', dbStatus: 'DOWN' }, upstreamUnavailable: false }).state).toBe('unhealthy');
    expect(classifyMysql({ status: 502, data: null, upstreamUnavailable: true }).state).toBe('unknown');
  });
});

describe('service health page', () => {
  it('shows each service’s real state, including an unavailable gateway', async () => {
    const http = mockHttp({
      // Raw probes go through bare axios with the full proxy path.
      'GET /proxy/gateway/actuator/health': { status: 502, headers: { 'x-nexgate-proxy': 'upstream-unavailable' }, data: {} },
      'GET /proxy/management/actuator/health': { status: 200, data: { status: 'UP' } },
      'GET /proxy/analytics/actuator/health': { status: 401 },
      'GET /proxy/catalog/actuator/health': { status: 200, data: { status: 'UP' } },
      'GET /proxy/order/actuator/health': { status: 503, data: { status: 'DOWN' } },
    });
    const session = platformSession();
    signInAs(session);
    renderApp('/platform/monitoring/services');

    const card = async (name: string) => (await screen.findByRole('heading', { name, level: 2 })).closest('div.relative') as HTMLElement;
    expect(await within(await card('Smart Gateway')).findByText('Unavailable')).toBeInTheDocument();
    expect(within(await card('Smart Gateway')).getByText(/refuses to start/)).toBeInTheDocument();
    expect(await within(await card('API Management')).findByText('Healthy')).toBeInTheDocument();
    expect(await within(await card('Analytics')).findByText('Unknown')).toBeInTheDocument();
    expect(await within(await card('Order')).findByText('Unhealthy')).toBeInTheDocument();

    // The session token goes only to NexGate's control-plane services.
    const withToken = http.calls.filter((call) => call.authorization).map((call) => call.url).sort();
    expect(withToken).toEqual(['/proxy/analytics/actuator/health', '/proxy/management/actuator/health']);
  });

  it('marks datastores without a health source as unknown', async () => {
    mockHttp({ 'GET /proxy/management/health': { status: 200, data: { serviceStatus: 'UP', dbStatus: 'UP', timestamp: '2026-11-24T10:00:00' } } });
    signInAs(platformSession());
    renderApp('/platform/monitoring/infrastructure');
    expect(await screen.findByText('API Management ran SELECT 1 successfully.')).toBeInTheDocument();
    expect(screen.getAllByText('No health source available')).toHaveLength(3);
    expect(screen.getAllByText('Not checked')).toHaveLength(3);
  });
});
