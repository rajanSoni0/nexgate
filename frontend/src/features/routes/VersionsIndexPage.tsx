import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { GitCompareArrows } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, InlineAlert, LoadingBlock } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/Page';
import { Pagination, Table, TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import { formatDateTime } from '@/lib/format';
import { useSession } from '@/features/auth/AuthProvider';
import { useOrganizations } from '@/features/organizations/hooks';
import { useRoutes } from './hooks';
import { RouteStatusBadge } from './parts';

const PAGE_SIZE = 20;

/**
 * Versions are tracked per route (GET /routes/{id}/versions); there is no
 * cross-route version feed. This index lists routes by most recent change and
 * links into each route's history.
 */
export function VersionsIndexPage() {
  const session = useSession();
  const readOnly = session.role === 'PLATFORM_ADMIN';
  const base = readOnly ? '/platform/routes' : '/tenant/routes';
  const [page, setPage] = useState(0);
  const routes = useRoutes({ page, size: PAGE_SIZE, sort: 'updatedAt,desc' });
  const organizations = useOrganizations(readOnly);
  const orgNames = useMemo(() => new Map((organizations.data ?? []).map((org) => [org.id, org.name])), [organizations.data]);

  return (
    <>
      <PageHeader
        title="Configuration versions"
        description="Every route change is stored as a numbered snapshot. Open a route to inspect, compare or restore its versions."
      />
      <InlineAlert tone="info" className="mb-5">
        NexGate records versions per route; there’s no combined change feed. Routes are listed by their most recent change.
      </InlineAlert>
      <Card>
        {routes.isPending ? (
          <div className="p-4">
            <LoadingBlock rows={6} label="Loading routes" />
          </div>
        ) : routes.isError ? (
          <div className="p-4">
            <ErrorState error={routes.error} onRetry={() => routes.refetch()} />
          </div>
        ) : routes.data.totalElements === 0 ? (
          <EmptyState icon={<GitCompareArrows className="size-7" />} title="No routes yet" description="Versions appear once routes are created." />
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <Th>Route</Th>
                  {readOnly ? <Th>Organization</Th> : null}
                  <Th>Current version</Th>
                  <Th>Status</Th>
                  <Th>Last changed</Th>
                  <Th className="text-right">
                    <span className="sr-only">History</span>
                  </Th>
                </tr>
              </THead>
              <TBody>
                {routes.data.items.map((route) => (
                  <Tr key={route.id}>
                    <Td>
                      <span className="font-medium">{route.name}</span>
                      <span className="block font-mono text-[12px] text-fg-subtle">{route.routeId}</span>
                    </Td>
                    {readOnly ? <Td>{orgNames.get(route.organizationId) ?? `#${route.organizationId}`}</Td> : null}
                    <Td className="font-mono">v{route.configurationVersion}</Td>
                    <Td>
                      <RouteStatusBadge active={route.active} />
                    </Td>
                    <Td className="text-fg-muted">{formatDateTime(route.updatedAt)}</Td>
                    <Td className="text-right">
                      <Link to={`${base}/${route.id}?tab=versions`} className="text-[13px] font-medium text-accent-fg hover:underline">
                        View history
                      </Link>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            <Pagination page={routes.data.page} totalPages={routes.data.totalPages} totalElements={routes.data.totalElements} size={routes.data.size} onPageChange={setPage} disabled={routes.isFetching} />
          </>
        )}
      </Card>
    </>
  );
}
