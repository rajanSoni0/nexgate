import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { platformSession, signInAs, springPage, tenantSession } from '@/test/fixtures';
import { mockHttp } from '@/test/http';
import { renderApp } from '@/test/render';

function sidebarLinks() {
  const sidebar = screen.getAllByRole('complementary', { name: 'Sidebar' })[0];
  return within(sidebar)
    .getAllByRole('link')
    .map((link) => link.textContent?.trim());
}

describe('role-based routing and navigation', () => {
  it('blocks tenant admins from platform pages without calling platform APIs', async () => {
    const http = mockHttp({});
    signInAs(tenantSession());
    renderApp('/platform/organizations');
    expect(await screen.findByRole('heading', { name: 'This area is for platform admins' })).toBeInTheDocument();
    expect(http.calls.filter((call) => call.url.startsWith('/api/platform'))).toHaveLength(0);
  });

  it('blocks platform admins from tenant pages', async () => {
    mockHttp({});
    signInAs(platformSession());
    renderApp('/tenant/routes/new');
    expect(await screen.findByRole('heading', { name: 'This area is for tenant admins' })).toBeInTheDocument();
  });

  it('shows the platform navigation to platform admins', async () => {
    mockHttp({
      'GET /api/platform/organizations': { status: 200, data: [] },
      'GET /api/gateway/admin/routes': { status: 200, data: springPage([]) },
    });
    signInAs(platformSession());
    renderApp('/platform/audit');
    await screen.findByRole('heading', { name: 'Audit logs' });
    const links = sidebarLinks();
    for (const label of ['Overview', 'Organizations', 'Tenant administrators', 'Routes', 'Configuration versions', 'Platform analytics', 'Organization analytics', 'Service health', 'Infrastructure health', 'Audit logs', 'Settings']) {
      expect(links).toContain(label);
    }
    expect(links).not.toContain('My routes');
  });

  it('shows the tenant navigation to tenant admins, without platform sections', async () => {
    mockHttp({});
    signInAs(tenantSession());
    renderApp('/tenant/organization');
    await screen.findByRole('heading', { name: 'Organization details' });
    const links = sidebarLinks();
    for (const label of ['Overview', 'My routes', 'Route policies', 'Configuration versions', 'API analytics', 'Route analytics', 'Organization details']) {
      expect(links).toContain(label);
    }
    for (const label of ['Organizations', 'Tenant administrators', 'Service health', 'Audit logs', 'Platform analytics']) {
      expect(links).not.toContain(label);
    }
  });
});
