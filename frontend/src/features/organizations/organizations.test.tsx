import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { organization, platformSession, signInAs } from '@/test/fixtures';
import { mockHttp } from '@/test/http';
import { renderApp } from '@/test/render';
import { organizationSchema, slugify } from './schema';

describe('organization validation', () => {
  it('mirrors the backend slug pattern and length limits', () => {
    expect(organizationSchema.safeParse({ name: 'Acme', slug: 'acme-retail-2' }).success).toBe(true);
    for (const slug of ['Acme', 'acme--retail', '-acme', 'acme_', 'a b']) {
      expect(organizationSchema.safeParse({ name: 'Acme', slug }).success).toBe(false);
    }
    expect(organizationSchema.safeParse({ name: 'x'.repeat(151), slug: 'ok' }).success).toBe(false);
    expect(organizationSchema.safeParse({ name: '   ', slug: 'ok' }).success).toBe(false);
  });

  it('suggests valid slugs from names', () => {
    expect(slugify('Acme Retail, Inc.')).toBe('acme-retail-inc');
    expect(slugify('Café Zürich')).toBe('cafe-zurich');
    expect(organizationSchema.safeParse({ name: 'n', slug: slugify('  --Weird__Name!!  ') }).success).toBe(true);
  });
});

describe('organizations page', () => {
  const list = [
    organization({ id: 1, name: 'Acme Retail', slug: 'acme-retail', status: 'ACTIVE' }),
    organization({ id: 2, name: 'Beta Labs', slug: 'beta-labs', status: 'PENDING' }),
    organization({ id: 3, name: 'Cobalt Bank', slug: 'cobalt', status: 'SUSPENDED' }),
  ];

  it('lists, searches and filters organizations from one request', async () => {
    const http = mockHttp({ 'GET /api/platform/organizations': { status: 200, data: list } });
    signInAs(platformSession());
    renderApp('/platform/organizations');
    expect(await screen.findByRole('link', { name: 'Acme Retail' })).toBeInTheDocument();
    const user = userEvent.setup();

    await user.type(screen.getByRole('searchbox', { name: 'Search organizations' }), 'beta');
    expect(screen.queryByRole('link', { name: 'Acme Retail' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Beta Labs' })).toBeInTheDocument();

    await user.clear(screen.getByRole('searchbox', { name: 'Search organizations' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'SUSPENDED');
    expect(screen.getByRole('link', { name: 'Cobalt Bank' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Beta Labs' })).not.toBeInTheDocument();
    expect(http.callsTo('GET', '/api/platform/organizations')).toHaveLength(1);
  });

  it('shows an empty state with a call to action', async () => {
    mockHttp({ 'GET /api/platform/organizations': { status: 200, data: [] } });
    signInAs(platformSession());
    renderApp('/platform/organizations');
    expect(await screen.findByText('No organizations yet')).toBeInTheDocument();
  });

  it('shows a retryable error instead of a blank page', async () => {
    mockHttp({ 'GET /api/platform/organizations': { status: 500, data: { message: 'An unexpected error occurred' } } });
    signInAs(platformSession());
    renderApp('/platform/organizations');
    expect(await screen.findByText('Server error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('creates an organization with an auto-suggested slug and opens it', async () => {
    const created = organization({ id: 9, name: 'Delta Freight', slug: 'delta-freight', status: 'PENDING' });
    const http = mockHttp({
      'GET /api/platform/organizations': { status: 200, data: list },
      'POST /api/platform/organizations': { status: 201, data: created },
      'GET /api/platform/organizations/9': { status: 200, data: created },
      'GET /api/platform/organizations/9/tenant-admin': { status: 404, data: { status: 404, message: 'Tenant administrator not found' } },
    });
    signInAs(platformSession());
    const { router } = renderApp('/platform/organizations');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Create organization' }));

    const dialog = await screen.findByRole('dialog', { name: 'Create organization' });
    await user.type(within(dialog).getByLabelText(/^Name/), 'Delta Freight');
    expect(within(dialog).getByLabelText(/^Slug/)).toHaveValue('delta-freight');
    await user.click(within(dialog).getByRole('button', { name: 'Create organization' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/platform/organizations/9'));
    expect(http.callsTo('POST', '/api/platform/organizations')[0].body).toEqual({ name: 'Delta Freight', slug: 'delta-freight' });
    expect(await screen.findByText('Organization created')).toBeInTheDocument();
    expect(await screen.findByText('No tenant administrator')).toBeInTheDocument();
  });

  it('blocks an invalid slug client-side and shows a server conflict on the right field', async () => {
    const http = mockHttp({
      'GET /api/platform/organizations': { status: 200, data: list },
      'POST /api/platform/organizations': { status: 409, data: { status: 409, error: 'Conflict', message: 'Organization slug already exists' } },
    });
    signInAs(platformSession());
    renderApp('/platform/organizations');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Create organization' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^Name/), 'Acme Two');
    const slug = within(dialog).getByLabelText(/^Slug/);
    await user.clear(slug);
    await user.type(slug, 'Bad Slug');
    await user.click(within(dialog).getByRole('button', { name: 'Create organization' }));
    expect(await within(dialog).findByText(/Use lowercase letters, numbers and single hyphens/)).toBeInTheDocument();
    expect(http.callsTo('POST', '/api/platform/organizations')).toHaveLength(0);

    await user.clear(slug);
    await user.type(slug, 'acme-retail');
    await user.click(within(dialog).getByRole('button', { name: 'Create organization' }));
    expect(await within(dialog).findByText('Organization slug already exists')).toBeInTheDocument();
    expect(slug).toHaveAttribute('aria-invalid', 'true');
  });

  it('changes status only after confirmation', async () => {
    const org = organization({ id: 2, name: 'Beta Labs', slug: 'beta-labs', status: 'PENDING' });
    const http = mockHttp({
      'GET /api/platform/organizations/2': { status: 200, data: org },
      'GET /api/platform/organizations/2/tenant-admin': { status: 200, data: { id: 5, organizationId: 2, username: 'beta-admin', enabled: true } },
      'PATCH /api/platform/organizations/2/status': { status: 200, data: { ...org, status: 'ACTIVE' } },
      'GET /api/platform/organizations': { status: 200, data: list },
    });
    signInAs(platformSession());
    renderApp('/platform/organizations/2');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('radio', { name: /^Active/ }));
    expect(http.callsTo('PATCH', '/api/platform/organizations/2/status')).toHaveLength(0);
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Activate organization' }));
    await waitFor(() => expect(http.callsTo('PATCH', '/api/platform/organizations/2/status')[0]?.body).toEqual({ status: 'ACTIVE' }));
  });
});
