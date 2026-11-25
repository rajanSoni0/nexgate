import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState, ErrorState, InlineAlert, LoadingBlock } from '@/components/ui/Feedback';
import { Field, Select } from '@/components/ui/Form';
import { PageHeader } from '@/components/ui/Page';
import { useOrganizations } from '../organizations/hooks';
import { OrganizationStatusBadge } from '../organizations/status';
import { TenantAdminPanel } from './TenantAdminPanel';

/**
 * The backend has no "list all tenant administrators" endpoint; reading them
 * all would take one request per organization. As agreed, this page loads one
 * organization's administrator at a time through a selector.
 */
export function TenantAdminsPage() {
  const organizations = useOrganizations();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('org') ? Number(params.get('org')) : null;

  const sorted = useMemo(() => [...(organizations.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [organizations.data]);
  const selected = sorted.find((org) => org.id === selectedId) ?? null;

  return (
    <>
      <PageHeader
        title="Tenant administrators"
        description="Each organization has at most one tenant administrator. Choose an organization to view or manage its administrator."
      />
      <InlineAlert tone="info" className="mb-5">
        NexGate doesn’t offer a combined list of administrators. Loading them all would take one request per organization, so this page
        loads one organization at a time.
      </InlineAlert>

      <Card className="mb-5">
        <CardBody>
          {organizations.isPending ? (
            <LoadingBlock rows={1} label="Loading organizations" />
          ) : organizations.isError ? (
            <ErrorState error={organizations.error} onRetry={() => organizations.refetch()} compact />
          ) : sorted.length === 0 ? (
            <EmptyState title="No organizations yet" description="Create an organization before adding its administrator." action={<Link className="text-accent-fg hover:underline" to="/platform/organizations">Go to organizations</Link>} className="py-4" />
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Field label="Organization" htmlFor="ta-org" className="flex-1 sm:max-w-md">
                <Select
                  id="ta-org"
                  value={selectedId ?? ''}
                  onChange={(event) => setParams(event.target.value ? { org: event.target.value } : {}, { replace: true })}
                >
                  <option value="">Select an organization…</option>
                  {sorted.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.slug})
                    </option>
                  ))}
                </Select>
              </Field>
              {selected ? (
                <div className="flex items-center gap-3 pb-1.5">
                  <OrganizationStatusBadge status={selected.status} />
                  <Link to={`/platform/organizations/${selected.id}`} className="text-[13px] text-accent-fg hover:underline">
                    View organization
                  </Link>
                </div>
              ) : null}
            </div>
          )}
        </CardBody>
      </Card>

      {selected ? (
        <TenantAdminPanel organization={selected} />
      ) : selectedId != null && organizations.isSuccess ? (
        <ErrorState error={new Error(`Organization #${selectedId} wasn’t found. It may have been deleted.`)} />
      ) : null}
    </>
  );
}
