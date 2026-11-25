import { Link } from 'react-router-dom';
import { Plus, Route as RouteIcon } from 'lucide-react';
import { Code } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/Feedback';
import { PageHeader, Section, StatCard } from '@/components/ui/Page';
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import { formatDateTime, formatNumber } from '@/lib/format';
import { useSession } from '@/features/auth/AuthProvider';
import { TenantAnalyticsWithheld } from '@/features/analytics/AnalyticsNotices';
import { useRouteCount, useRoutes } from '@/features/routes/hooks';
import { RouteStatusBadge } from '@/features/routes/parts';

export function TenantOverviewPage() {
  const session = useSession();
  const total = useRouteCount();
  const active = useRouteCount(true);
  const recent = useRoutes({ page: 0, size: 5, sort: 'updatedAt,desc' });
  const state = (query: { isPending: boolean; isError: boolean }) => (query.isError ? 'error' : query.isPending ? 'loading' : 'ready');

  return (
    <>
      <PageHeader
        title="Overview"
        description={`Signed in as ${session.username}. Everything here is scoped to your organization by the server.`}
        actions={
          <Link to="/tenant/routes/new">
            <Button variant="primary" icon={<Plus className="size-4" />}>
              Create route
            </Button>
          </Link>
        }
      />

      <Section title="Routes">
        {total.isError ? (
          <ErrorState error={total.error} onRetry={() => total.refetch()} />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard label="Total routes" state={state(total)} value={formatNumber(total.data)} tone="accent" />
            <StatCard label="Active routes" state={state(active)} value={formatNumber(active.data)} tone="success" />
            <StatCard
              label="Inactive routes"
              state={total.isPending || active.isPending ? 'loading' : active.isError ? 'error' : 'ready'}
              value={formatNumber((total.data ?? 0) - (active.data ?? 0))}
            />
          </div>
        )}
      </Section>

      <Section title="Traffic">
        <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {['Total requests', 'Successful', 'Failed', 'Average response time', 'Rate-limit rejections', 'Top routes'].map((label) => (
            <StatCard key={label} label={label} state="unavailable" />
          ))}
        </div>
        <TenantAnalyticsWithheld subject="Traffic metrics" />
      </Section>

      <Card>
        <CardHeader title="Recently changed routes" actions={<Link to="/tenant/routes" className="text-[13px] font-medium text-accent-fg hover:underline">All routes</Link>} />
        {recent.isPending ? (
          <div className="p-4">
            <LoadingBlock rows={3} label="Loading routes" />
          </div>
        ) : recent.isError ? (
          <div className="p-4">
            <ErrorState error={recent.error} onRetry={() => recent.refetch()} compact />
          </div>
        ) : recent.data.items.length === 0 ? (
          <EmptyState
            icon={<RouteIcon className="size-6" />}
            title="No routes yet"
            description="Create your first route to expose a service through the gateway."
            className="py-8"
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Route</Th>
                <Th>Path</Th>
                <Th>Status</Th>
                <Th>Version</Th>
                <Th>Updated</Th>
              </tr>
            </THead>
            <TBody>
              {recent.data.items.map((route) => (
                <Tr key={route.id}>
                  <Td>
                    <Link to={`/tenant/routes/${route.id}`} className="font-medium hover:underline">
                      {route.name}
                    </Link>
                  </Td>
                  <Td>
                    <Code>{route.pathPattern}</Code>
                  </Td>
                  <Td>
                    <RouteStatusBadge active={route.active} />
                  </Td>
                  <Td className="font-mono text-fg-muted">v{route.configurationVersion}</Td>
                  <Td className="text-fg-muted">{formatDateTime(route.updatedAt)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
