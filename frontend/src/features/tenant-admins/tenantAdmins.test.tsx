import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { organization, platformSession, signInAs } from '@/test/fixtures';
import { mockHttp } from '@/test/http';
import { renderApp } from '@/test/render';
import { tenantAdminSchema } from './schema';

const org = organization({ id: 7 });
const admin = { id: 5, organizationId: 7, username: 'acme-admin', enabled: true };

describe('tenant administrator validation', () => {
  it('mirrors TenantAdminRequest and requires acknowledgement on updates', () => {
    const valid = { username: 'a', password: '12345678', confirmPassword: '12345678', enabled: true, acknowledge: false };
    expect(tenantAdminSchema(false).safeParse(valid).success).toBe(true);
    expect(tenantAdminSchema(true).safeParse(valid).success).toBe(false);
    expect(tenantAdminSchema(true).safeParse({ ...valid, acknowledge: true }).success).toBe(true);
    expect(tenantAdminSchema(false).safeParse({ ...valid, password: '1234567', confirmPassword: '1234567' }).success).toBe(false);
    expect(tenantAdminSchema(false).safeParse({ ...valid, confirmPassword: 'different' }).success).toBe(false);
    expect(tenantAdminSchema(false).safeParse({ ...valid, username: 'x'.repeat(101) }).success).toBe(false);
  });
});

describe('tenant administrators page', () => {
  it('loads one organization at a time through the selector', async () => {
    const http = mockHttp({
      'GET /api/platform/organizations': { status: 200, data: [org, organization({ id: 8, name: 'Beta', slug: 'beta' })] },
      'GET /api/platform/organizations/7/tenant-admin': { status: 200, data: admin },
    });
    signInAs(platformSession());
    renderApp('/platform/tenant-admins');
    expect(await screen.findByText(/loads one organization at a time/)).toBeInTheDocument();
    expect(http.calls.filter((call) => call.url.endsWith('/tenant-admin'))).toHaveLength(0);

    await userEvent.setup().selectOptions(await screen.findByLabelText('Organization'), '7');
    expect(await screen.findByText('acme-admin')).toBeInTheDocument();
    expect(http.calls.filter((call) => call.url.endsWith('/tenant-admin'))).toHaveLength(1);
  });

  it('deactivation states the password requirement and needs explicit confirmation', async () => {
    const http = mockHttp({
      'GET /api/platform/organizations': { status: 200, data: [org] },
      'GET /api/platform/organizations/7/tenant-admin': { status: 200, data: admin },
      'PUT /api/platform/organizations/7/tenant-admin': { status: 200, data: { ...admin, enabled: false } },
    });
    signInAs(platformSession());
    renderApp('/platform/tenant-admins?org=7');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Deactivate' }));

    const dialog = await screen.findByRole('dialog', { name: 'Deactivate tenant administrator' });
    expect(within(dialog).getByText('This update requires a new password')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(/^New password/), 'n3w-secret-pw');
    await user.type(within(dialog).getByLabelText(/^Confirm password/), 'n3w-secret-pw');
    await user.click(within(dialog).getByRole('button', { name: 'Deactivate and replace password' }));

    expect(await within(dialog).findByText('Confirm that the current password will be replaced')).toBeInTheDocument();
    expect(http.callsTo('PUT', '/api/platform/organizations/7/tenant-admin')).toHaveLength(0);

    await user.click(within(dialog).getByRole('checkbox', { name: /Replace the current password/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Deactivate and replace password' }));
    await waitFor(() =>
      expect(http.callsTo('PUT', '/api/platform/organizations/7/tenant-admin')[0]?.body).toEqual({ username: 'acme-admin', password: 'n3w-secret-pw', enabled: false }),
    );
    expect(await screen.findByText('Tenant administrator deactivated')).toBeInTheDocument();
    expect(screen.getByText('The previous password no longer works.')).toBeInTheDocument();
  });

  it('creates an administrator without the replacement warning', async () => {
    const http = mockHttp({
      'GET /api/platform/organizations': { status: 200, data: [org] },
      'GET /api/platform/organizations/7/tenant-admin': { status: 404, data: { message: 'Tenant administrator not found' } },
      'POST /api/platform/organizations/7/tenant-admin': { status: 201, data: admin },
    });
    signInAs(platformSession());
    renderApp('/platform/tenant-admins?org=7');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Create administrator' }));
    const dialog = await screen.findByRole('dialog', { name: 'Create tenant administrator' });
    expect(within(dialog).queryByText('This update requires a new password')).not.toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(/^Username/), 'acme-admin');
    await user.type(within(dialog).getByLabelText(/^Password/), 'initial-pw-1');
    await user.type(within(dialog).getByLabelText(/^Confirm password/), 'initial-pw-1');
    await user.click(within(dialog).getByRole('button', { name: 'Create administrator' }));
    await waitFor(() => expect(http.callsTo('POST', '/api/platform/organizations/7/tenant-admin')[0]?.body).toEqual({ username: 'acme-admin', password: 'initial-pw-1', enabled: true }));
  });

  it('deletes only after confirmation', async () => {
    const http = mockHttp({
      'GET /api/platform/organizations': { status: 200, data: [org] },
      'GET /api/platform/organizations/7/tenant-admin': { status: 200, data: admin },
      'DELETE /api/platform/organizations/7/tenant-admin': { status: 204 },
    });
    signInAs(platformSession());
    renderApp('/platform/tenant-admins?org=7');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(http.callsTo('DELETE', '/api/platform/organizations/7/tenant-admin')).toHaveLength(0);
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete administrator' }));
    expect(await screen.findByText('No tenant administrator')).toBeInTheDocument();
  });
});
