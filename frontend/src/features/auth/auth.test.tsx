import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { sessionStore } from '@/lib/session';
import { makeToken, platformSession, signInAs, springPage, tenantSession } from '@/test/fixtures';
import { mockHttp } from '@/test/http';
import { renderApp } from '@/test/render';

const future = () => Math.floor(Date.now() / 1000) + 3600;

function loginReply(role: string, organizationId: number | null = null) {
  return {
    status: 200,
    data: { token: makeToken({ sub: 'someone', role, organizationId, exp: future() }), tokenType: 'Bearer', expiresInSeconds: 3600, role, organizationId },
  };
}

const platformData = {
  'GET /api/platform/organizations': { status: 200, data: [] },
  'GET /api/gateway/admin/routes': { status: 200, data: springPage([]) },
  'GET /api/analytics/summary': { status: 401 },
  'GET /api/analytics/rate-limit-rejections': { status: 401 },
};

async function submitLogin(username: string, password: string) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Username'), username);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('authentication', () => {
  it('redirects signed-out visitors to the login page', async () => {
    renderApp('/platform/organizations');
    expect(await screen.findByRole('heading', { name: 'Sign in to NexGate Console' })).toBeInTheDocument();
  });

  it('validates required fields before calling the server', async () => {
    const http = mockHttp({});
    renderApp('/login');
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter your username')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(http.calls).toHaveLength(0);
  });

  it('signs a platform admin in, stores the session in sessionStorage and never logs the token', async () => {
    const logSpies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((level) => vi.spyOn(console, level));
    const http = mockHttp({ 'POST /api/auth/login': loginReply('PLATFORM_ADMIN'), ...platformData });
    const { router } = renderApp('/login');
    await submitLogin('platform-admin', 'correct-horse');

    expect(await screen.findByRole('heading', { name: 'Platform overview' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/platform');
    expect(http.callsTo('POST', '/api/auth/login')[0].body).toEqual({ username: 'platform-admin', password: 'correct-horse' });
    const stored = window.sessionStorage.getItem('nexgate.session') ?? '';
    expect(stored).toContain('"role":"PLATFORM_ADMIN"');
    expect(window.localStorage.getItem('nexgate.session')).toBeNull();

    const token = sessionStore.token() as string;
    for (const spy of logSpies) {
      for (const call of spy.mock.calls) expect(JSON.stringify(call)).not.toContain(token);
    }
  });

  it('sends tenant admins to the tenant console', async () => {
    mockHttp({
      'POST /api/auth/login': loginReply('TENANT_ADMIN', 7),
      'GET /api/gateway/admin/routes': { status: 200, data: springPage([]) },
    });
    const { router } = renderApp('/login');
    await submitLogin('acme-admin', 'password123');
    await waitFor(() => expect(router.state.location.pathname).toBe('/tenant'));
    expect(await screen.findByText(/scoped to your organization by the server/)).toBeInTheDocument();
  });

  it('refuses the GATEWAY_SERVICE account and keeps nothing', async () => {
    mockHttp({ 'POST /api/auth/login': loginReply('GATEWAY_SERVICE') });
    renderApp('/login');
    await submitLogin('gateway-service', 'whatever');
    expect(await screen.findByText('This account can’t use the console')).toBeInTheDocument();
    expect(screen.getByText(/machine-to-machine service account/)).toBeInTheDocument();
    expect(window.sessionStorage.getItem('nexgate.session')).toBeNull();
    expect(sessionStore.get()).toBeNull();
  });

  it('shows the server’s message for invalid credentials', async () => {
    mockHttp({ 'POST /api/auth/login': { status: 401, data: { status: 401, error: 'Unauthorized', message: 'Invalid username or password' } } });
    renderApp('/login');
    await submitLogin('platform-admin', 'wrong');
    expect(await screen.findByText('Invalid username or password')).toBeInTheDocument();
    expect(sessionStore.get()).toBeNull();
  });

  it('explains a 403 for an inactive organization', async () => {
    mockHttp({ 'POST /api/auth/login': { status: 403, data: { status: 403, message: 'The organization is not active' } } });
    renderApp('/login');
    await submitLogin('acme-admin', 'password123');
    expect(await screen.findByText('The organization is not active')).toBeInTheDocument();
    expect(screen.getByText(/only while their organization is active/)).toBeInTheDocument();
  });

  it('reports an unreachable API Management service', async () => {
    mockHttp({ 'POST /api/auth/login': 'network' });
    renderApp('/login');
    await submitLogin('platform-admin', 'pw');
    expect(await screen.findByText(/Can’t reach the API Management service/)).toBeInTheDocument();
  });

  it('signs the user out and explains why when the server rejects the session', async () => {
    mockHttp({ ...platformData, 'GET /api/platform/organizations': { status: 401 } });
    signInAs(platformSession());
    renderApp('/platform/organizations');
    expect(await screen.findByText('You were signed out')).toBeInTheDocument();
    expect(sessionStore.get()).toBeNull();
  });

  it('warns when the session is about to expire (no refresh endpoint exists)', async () => {
    mockHttp(platformData);
    signInAs(platformSession({ expiresAt: Date.now() + 60_000 }));
    renderApp('/platform');
    expect(await screen.findByText(/Your session ends at/)).toBeInTheDocument();
  });

  it('signs out from the sidebar', async () => {
    mockHttp(platformData);
    signInAs(platformSession());
    renderApp('/platform');
    const sidebar = (await screen.findAllByRole('complementary', { name: 'Sidebar' }))[0];
    await userEvent.setup().click(within(sidebar).getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: 'Sign in to NexGate Console' })).toBeInTheDocument();
    expect(window.sessionStorage.getItem('nexgate.session')).toBeNull();
  });

  it('keeps an already-signed-in tenant off the login page', async () => {
    mockHttp({ 'GET /api/gateway/admin/routes': { status: 200, data: springPage([]) } });
    signInAs(tenantSession());
    const { router } = renderApp('/login');
    await waitFor(() => expect(router.state.location.pathname).toBe('/tenant'));
  });
});
