import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Code } from '@/components/ui/Badge';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/Feedback';
import { Input, Select } from '@/components/ui/Form';
import { PageHeader } from '@/components/ui/Page';
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime, formatNumber } from '@/lib/format';
import type { OrganizationStatus } from '@/types/api';
import { useCreateOrganization, useOrganizations } from './hooks';
import { OrganizationFormDialog } from './OrganizationFormDialog';
import { OrganizationStatusBadge } from './status';

type StatusFilter = 'ALL' | Exclude<OrganizationStatus, 'DELETED'>;

export function OrganizationsPage() {
  const organizations = useOrganizations();
  const create = useCreateOrganization();
  const toast = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [creating, setCreating] = useState(false);

  // The backend returns every non-deleted organization in one response, so
  // search and status filtering run locally over the complete list.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (organizations.data ?? [])
      .filter((org) => status === 'ALL' || org.status === status)
      .filter((org) => !term || org.name.toLowerCase().includes(term) || org.slug.includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [organizations.data, search, status]);

  return (
    <>
      <PageHeader
        title="Organizations"
        description="Tenants of the NexGate platform. Each organization owns its routes and has one tenant administrator."
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
            Create organization
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <Input
              type="search"
              aria-label="Search organizations"
              placeholder="Search by name or slug"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <Select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className="sm:w-48">
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="SUSPENDED">Suspended</option>
          </Select>
        </div>

        {organizations.isPending ? (
          <div className="p-4">
            <LoadingBlock rows={5} label="Loading organizations" />
          </div>
        ) : organizations.isError ? (
          <div className="p-4">
            <ErrorState error={organizations.error} onRetry={() => organizations.refetch()} retrying={organizations.isFetching} />
          </div>
        ) : organizations.data.length === 0 ? (
          <EmptyState
            icon={<Building2 className="size-7" />}
            title="No organizations yet"
            description="Create the first organization, then add its tenant administrator."
            action={
              <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
                Create organization
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState title="No organizations match these filters" description="Clear the search or choose a different status." />
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <Th>Name</Th>
                  <Th>Slug</Th>
                  <Th>Status</Th>
                  <Th>Created</Th>
                  <Th>Last updated</Th>
                </tr>
              </THead>
              <TBody>
                {filtered.map((org) => (
                  <Tr key={org.id} interactive onClick={() => navigate(`/platform/organizations/${org.id}`)}>
                    <Td>
                      <Link to={`/platform/organizations/${org.id}`} className="font-medium text-fg hover:underline" onClick={(e) => e.stopPropagation()}>
                        {org.name}
                      </Link>
                    </Td>
                    <Td>
                      <Code>{org.slug}</Code>
                    </Td>
                    <Td>
                      <OrganizationStatusBadge status={org.status} />
                    </Td>
                    <Td className="text-fg-muted">{formatDateTime(org.createdAt)}</Td>
                    <Td className="text-fg-muted">{formatDateTime(org.updatedAt)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            <p className="border-t border-line px-4 py-2.5 text-[13px] text-fg-muted">
              Showing {formatNumber(filtered.length)} of {formatNumber(organizations.data.length)} organizations
            </p>
          </>
        )}
      </Card>

      <OrganizationFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={async (request) => {
          const created = await create.mutateAsync(request);
          toast.success('Organization created', `${created.name} is pending. Activate it when it’s ready.`);
          navigate(`/platform/organizations/${created.id}`);
        }}
      />
    </>
  );
}
