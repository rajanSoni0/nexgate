import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { organization, platformSession, route, signInAs, springPage, tenantSession } from '@/test/fixtures';
import { mockHttp } from '@/test/http';
import { renderApp } from '@/test/render';

describe('tenant route management', () => {
  it('creates a route without sending an organization ID', async () => {
    const created = route({ id: 21, routeId: 'orders', name: 'Orders API', configurationVersion: 1 });
    const http = mockHttp({
      'POST /api/gateway/admin/routes': { status: 201, data: created },
      'GET /api/gateway/admin/routes/21': { status: 200, data: created },
    });
    signInAs(tenantSession());
    const { router } = renderApp('/tenant/routes/new');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/^Route ID/), 'orders');
    await user.type(screen.getByLabelText(/^Name/), 'Orders API');
    await user.click(screen.getByRole('tab', { name: 'Routing' }));
    await user.type(screen.getByLabelText(/^Path pattern/), '/orders/**');
    await user.type(screen.getByLabelText(/^Target URI/), 'http://order:8083');
    await user.click(screen.getByRole('checkbox', { name: 'POST' }));
    await user.click(screen.getByRole('button', { name: 'Create route' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/tenant/routes/21'));
    const body = http.callsTo('POST', '/api/gateway/admin/routes')[0].body as Record<string, unknown>;
    expect(body).not.toHaveProperty('organizationId');
    expect(body).toMatchObject({ routeId: 'orders', name: 'Orders API', pathPattern: '/orders/**', targetUri: 'http://order:8083', allowedMethods: ['GET', 'POST'] });
    expect(body.policy).toMatchObject({ timeoutMs: 30000, authenticationRequired: true });
    expect(await screen.findByText('Route created')).toBeInTheDocument();
  });

  it('jumps to the tab holding the first validation error', async () => {
    const http = mockHttp({});
    signInAs(tenantSession());
    renderApp('/tenant/routes/new');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/^Route ID/), 'orders');
    await user.type(screen.getByLabelText(/^Name/), 'Orders');
    await user.click(screen.getByRole('button', { name: 'Create route' }));

    expect(await screen.findByRole('tab', { name: /Routing/, selected: true })).toBeInTheDocument();
    expect(screen.getByText('Enter a path pattern')).toBeInTheDocument();
    expect(screen.getByText('Enter the upstream URI')).toBeInTheDocument();
    expect(http.calls).toHaveLength(0);
  });

  it('puts a duplicate route ID conflict back on the field', async () => {
    mockHttp({ 'POST /api/gateway/admin/routes': { status: 409, data: { status: 409, message: 'Route identifier already exists' } } });
    signInAs(tenantSession());
    renderApp('/tenant/routes/new');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/^Route ID/), 'catalog');
    await user.type(screen.getByLabelText(/^Name/), 'Dup');
    await user.click(screen.getByRole('tab', { name: 'Routing' }));
    await user.type(screen.getByLabelText(/^Path pattern/), '/c/**');
    await user.type(screen.getByLabelText(/^Target URI/), 'http://c:1');
    await user.click(screen.getByRole('button', { name: 'Create route' }));
    expect(await screen.findByText('Route identifier already exists')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /General/, selected: true })).toBeInTheDocument();
  });

  it('shows the request pipeline from the saved policy', async () => {
    mockHttp({ 'GET /api/gateway/admin/routes/11': { status: 200, data: route() } });
    signInAs(tenantSession());
    renderApp('/tenant/routes/11');
    const pipeline = await screen.findByRole('figure', { name: 'Request pipeline' });
    expect(within(pipeline).getByText('Bearer JWT with role USER')).toBeInTheDocument();
    expect(within(pipeline).getByText(/100 requests \/ 60 s per user/)).toBeInTheDocument();
    expect(within(pipeline).getByText('/api/catalog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeInTheDocument();
  });

  it('compares two versions and restores only after confirmation', async () => {
    const versions = [3, 2, 1].map((n) => ({ id: n, routeId: 'catalog', versionNumber: n, changeType: n === 1 ? 'CREATE' : 'UPDATE', configurationSnapshot: '{"active":true}', createdBy: 'acme-admin', createdAt: '2026-11-20T10:00:00' }));
    const http = mockHttp({
      'GET /api/gateway/admin/routes/11': { status: 200, data: route() },
      'GET /api/gateway/admin/routes/11/versions': { status: 200, data: versions },
      'GET /api/gateway/admin/routes/11/versions/compare': { status: 200, data: { fromVersion: 2, toVersion: 3, differences: [{ field: 'policy.timeoutMs', from: 3000, to: 5000 }] } },
      'POST /api/gateway/admin/routes/11/versions/1/restore': { status: 200, data: route({ configurationVersion: 4 }) },
    });
    signInAs(tenantSession());
    renderApp('/tenant/routes/11?tab=versions');
    expect(await screen.findByText('policy.timeoutMs')).toBeInTheDocument();
    expect(http.callsTo('GET', '/api/gateway/admin/routes/11/versions/compare')[0].params).toEqual({ from: 2, to: 3 });

    const user = userEvent.setup();
    const rows = screen.getAllByRole('button', { name: 'Restore' });
    await user.click(rows[rows.length - 1]);
    expect(http.callsTo('POST', '/api/gateway/admin/routes/11/versions/1/restore')).toHaveLength(0);
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Restore version' }));
    await waitFor(() => expect(http.callsTo('POST', '/api/gateway/admin/routes/11/versions/1/restore')).toHaveLength(1));
  });

  it('pages and filters routes on the server', async () => {
    const http = mockHttp({ 'GET /api/gateway/admin/routes': { status: 200, data: springPage([route()], { total: 45 }) } });
    signInAs(tenantSession());
    renderApp('/tenant/routes');
    expect(await screen.findByText('1–20 of 45')).toBeInTheDocument();
    const user = userEvent.setup();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'active');
    await waitFor(() => expect(http.calls.at(-1)?.params).toMatchObject({ active: true, page: 0, size: 20 }));
  });
});

describe('platform route oversight', () => {
  it('is read-only and names the owning organization', async () => {
    mockHttp({
      'GET /api/gateway/admin/routes/11': { status: 200, data: route() },
      'GET /api/platform/organizations': { status: 200, data: [organization()] },
    });
    signInAs(platformSession());
    renderApp('/platform/routes/11');
    expect(await screen.findByText('Read-only oversight')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Acme Retail' })).toBeInTheDocument();
    for (const name of ['Edit route', 'Deactivate', 'Delete']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });

  it('does not offer restore on the versions tab', async () => {
    mockHttp({
      'GET /api/gateway/admin/routes/11': { status: 200, data: route() },
      'GET /api/platform/organizations': { status: 200, data: [organization()] },
      'GET /api/gateway/admin/routes/11/versions': {
        status: 200,
        data: [2, 1].map((n) => ({ id: n, routeId: 'catalog', versionNumber: n, changeType: 'UPDATE', configurationSnapshot: '{}', createdBy: 'x', createdAt: null })),
      },
      'GET /api/gateway/admin/routes/11/versions/compare': { status: 200, data: { fromVersion: 1, toVersion: 2, differences: [] } },
    });
    signInAs(platformSession());
    renderApp('/platform/routes/11?tab=versions');
    expect(await screen.findByText(/No configuration differences/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Restore' })).not.toBeInTheDocument();
  });
});
