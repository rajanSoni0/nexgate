import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Route as RouteIcon, Search } from 'lucide-react';
import { Code } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, InlineAlert, LoadingBlock } from '@/components/ui/Feedback';
import { Input, Select } from '@/components/ui/Form';
import { PageHeader } from '@/components/ui/Page';
import { Pagination, Table, TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import { formatDateTime } from '@/lib/format';
import { useSession } from '@/features/auth/AuthProvider';
import { useOrganizations } from '@/features/organizations/hooks';
import { useRoutes } from './hooks';
import { MethodList, RouteStatusBadge } from './parts';

const PAGE_SIZE = 20;
type ActiveFilter = 'all' | 'active' | 'inactive';

export function RoutesListPage() {
  const session = useSession();
  const readOnly = session.role === 'PLATFORM_ADMIN';
  const base = readOnly ? '/platform/routes' : '/tenant/routes';
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [sort, setSort] = useState('updatedAt,desc');
  const [search, setSearch] = useState('');

  const routes = useRoutes({
    page,
    size: PAGE_SIZE,
    sort,
    active: activeFilter === 'all' ? undefined : activeFilter === 'active',
  });
  const organizations = useOrganizations(readOnly);
  const orgNames = useMemo(() => new Map((organizations.data ?? []).map((org) => [org.id, org.name])), [organizations.data]);

  // The backend has no route search parameter; this filter only narrows the page already loaded.
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const items = routes.data?.items ?? [];
    if (!term) return items;
    return items.filter((route) =>
      [route.name, route.routeId, route.pathPattern, route.targetUri, readOnly ? orgNames.get(route.organizationId) ?? '' : '']
        .some((value) => value.toLowerCase().includes(term)),
    );
  }, [routes.data, search, orgNames, readOnly]);

  return (
    <>
      <PageHeader
        title={readOnly ? 'Routes' : 'My routes'}
        description={
          readOnly
            ? 'Every route across all organizations. Platform oversight is read-only.'
            : 'Routes your organization exposes through the NexGate gateway.'
        }
        actions={
          readOnly ? null : (
            <Link to={`${base}/new`}>
              <Button variant="primary" icon={<Plus className="size-4" />}>
                Create route
              </Button>
            </Link>
          )
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <Input type="search" aria-label="Filter this page" placeholder="Filter this page by name, ID, path or target" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select
            aria-label="Filter by status"
            className="md:w-40"
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value as ActiveFilter);
              setPage(0);
            }}
          >
            <option value="all">All routes</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <Select
            aria-label="Sort routes"
            className="md:w-48"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(0);
            }}
          >
            <option value="updatedAt,desc">Recently updated</option>
            <option value="name,asc">Name (A–Z)</option>
            <option value="routeId,asc">Route ID (A–Z)</option>
            <option value="createdAt,desc">Newest first</option>
          </Select>
        </div>

        {routes.isPending ? (
          <div className="p-4">
            <LoadingBlock rows={6} label="Loading routes" />
          </div>
        ) : routes.isError ? (
          <div className="p-4">
            <ErrorState error={routes.error} onRetry={() => routes.refetch()} retrying={routes.isFetching} />
          </div>
        ) : routes.data.totalElements === 0 ? (
          <EmptyState
            icon={<RouteIcon className="size-7" />}
            title={activeFilter === 'all' ? 'No routes yet' : `No ${activeFilter} routes`}
            description={readOnly ? 'Routes appear here once tenant administrators create them.' : 'Create a route to expose an upstream service through the gateway.'}
            action={
              readOnly || activeFilter !== 'all' ? null : (
                <Link to={`${base}/new`}>
                  <Button variant="primary" icon={<Plus className="size-4" />}>
                    Create route
                  </Button>
                </Link>
              )
            }
          />
        ) : (
          <>
            {search ? (
              <InlineAlert tone="info" className="m-4 mb-0">
                Filtering applies to the {routes.data.items.length} routes on this page only; the backend has no route search.
              </InlineAlert>
            ) : null}
            {visible.length === 0 ? (
              <EmptyState title="Nothing on this page matches" description="Clear the filter or move to another page." />
            ) : (
              <Table aria-busy={routes.isFetching}>
                <THead>
                  <tr>
                    <Th>Route</Th>
                    {readOnly ? <Th>Organization</Th> : null}
                    <Th>Path</Th>
                    <Th>Methods</Th>
                    <Th>Target</Th>
                    <Th>Status</Th>
                    <Th>Version</Th>
                    <Th>Updated</Th>
                  </tr>
                </THead>
                <TBody>
                  {visible.map((route) => (
                    <Tr key={route.id} interactive onClick={() => navigate(`${base}/${route.id}`)}>
                      <Td>
                        <Link to={`${base}/${route.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-fg hover:underline">
                          {route.name}
                        </Link>
                        <span className="block font-mono text-[12px] text-fg-subtle">{route.routeId}</span>
                      </Td>
                      {readOnly ? <Td>{orgNames.get(route.organizationId) ?? <span className="font-mono text-fg-muted">#{route.organizationId}</span>}</Td> : null}
                      <Td>
                        <Code>{route.pathPattern}</Code>
                      </Td>
                      <Td>
                        <MethodList methods={route.allowedMethods} />
                      </Td>
                      <Td className="max-w-[16rem]">
                        <span className="block truncate font-mono text-[12.5px] text-fg-muted" title={route.targetUri}>
                          {route.targetUri}
                        </span>
                      </Td>
                      <Td>
                        <RouteStatusBadge active={route.active} />
                      </Td>
                      <Td className="font-mono text-fg-muted">v{route.configurationVersion}</Td>
                      <Td className="whitespace-nowrap text-fg-muted">{formatDateTime(route.updatedAt)}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
            <Pagination
              page={routes.data.page}
              totalPages={routes.data.totalPages}
              totalElements={routes.data.totalElements}
              size={routes.data.size}
              onPageChange={setPage}
              disabled={routes.isFetching}
            />
          </>
        )}
      </Card>
    </>
  );
}
