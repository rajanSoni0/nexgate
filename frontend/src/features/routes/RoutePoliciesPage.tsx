import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/Page';
import { Pagination, Table, TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import { formatMs } from '@/lib/format';
import type { Route } from '@/types/api';
import { useRoutes } from './hooks';
import { RouteStatusBadge } from './parts';
import { PolicyDialog } from './PolicyDialog';

const PAGE_SIZE = 20;

function yesNo(value: boolean | undefined) {
  return value ? <span className="text-fg">On</span> : <span className="text-fg-subtle">Off</span>;
}

export function RoutePoliciesPage() {
  const [page, setPage] = useState(0);
  const routes = useRoutes({ page, size: PAGE_SIZE, sort: 'name,asc' });
  const [editing, setEditing] = useState<Route | null>(null);

  return (
    <>
      <PageHeader title="Route policies" description="Authentication, rate limits, timeouts, idempotency and rewriting for each of your routes." />
      <Card>
        {routes.isPending ? (
          <div className="p-4">
            <LoadingBlock rows={6} label="Loading policies" />
          </div>
        ) : routes.isError ? (
          <div className="p-4">
            <ErrorState error={routes.error} onRetry={() => routes.refetch()} />
          </div>
        ) : routes.data.totalElements === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="size-7" />}
            title="No routes to configure"
            description="Policies belong to routes. Create a route first."
            action={
              <Link to="/tenant/routes/new">
                <Button variant="primary">Create route</Button>
              </Link>
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <Th>Route</Th>
                  <Th>Status</Th>
                  <Th>Authentication</Th>
                  <Th>Rate limit</Th>
                  <Th>Timeout</Th>
                  <Th>Idempotency</Th>
                  <Th>Rewrite</Th>
                  <Th className="text-right">
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </THead>
              <TBody>
                {routes.data.items.map((route) => {
                  const policy = route.policy;
                  return (
                    <Tr key={route.id}>
                      <Td>
                        <Link to={`/tenant/routes/${route.id}?tab=policy`} className="font-medium hover:underline">
                          {route.name}
                        </Link>
                        <span className="block font-mono text-[12px] text-fg-subtle">{route.routeId}</span>
                      </Td>
                      <Td>
                        <RouteStatusBadge active={route.active} />
                      </Td>
                      <Td>
                        {policy?.authenticationRequired ? (
                          <span>
                            Required
                            <span className="block font-mono text-[12px] text-fg-muted">
                              {policy.permittedRoles.length ? policy.permittedRoles.join(', ') : 'No roles, so every call gets 403'}
                            </span>
                          </span>
                        ) : (
                          <span className="text-fg-subtle">Public</span>
                        )}
                      </Td>
                      <Td>
                        {policy?.rateLimitEnabled ? (
                          <span className="font-mono text-[12.5px]">
                            {policy.rateLimitRequests} per {policy.rateLimitWindowSeconds}s, {(policy.rateLimitScope ?? 'ROUTE').toLowerCase()}
                          </span>
                        ) : (
                          <span className="text-fg-subtle">Off</span>
                        )}
                      </Td>
                      <Td className="font-mono text-[12.5px]">{formatMs(policy?.timeoutMs)}</Td>
                      <Td>{yesNo(policy?.idempotencyEnabled)}</Td>
                      <Td>{policy?.rewriteEnabled ? <span className="font-mono text-[12.5px]">{policy.rewriteTargetPrefix || '/'}</span> : yesNo(false)}</Td>
                      <Td className="text-right">
                        <Button size="sm" onClick={() => setEditing(route)}>
                          Edit policy
                        </Button>
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
            <Pagination page={routes.data.page} totalPages={routes.data.totalPages} totalElements={routes.data.totalElements} size={routes.data.size} onPageChange={setPage} disabled={routes.isFetching} />
          </>
        )}
      </Card>
      {editing ? <PolicyDialog route={editing} open onClose={() => setEditing(null)} /> : null}
    </>
  );
}
