import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/Feedback';
import { PageHeader, Section, StatCard } from '@/components/ui/Page';
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import { formatDateTime, formatMs, formatNumber, formatPercent } from '@/lib/format';
import { AnalyticsFailure } from '@/features/analytics/AnalyticsNotices';
import { useAnalyticsSummary, useRateLimitRejections } from '@/features/analytics/hooks';
import { useOrganizations } from '@/features/organizations/hooks';
import { OrganizationStatusBadge } from '@/features/organizations/status';
import { useRouteCount } from '@/features/routes/hooks';

export function PlatformOverviewPage() {
  const organizations = useOrganizations();
  const totalRoutes = useRouteCount();
  const activeRoutes = useRouteCount(true);
  const summary = useAnalyticsSummary();
  const rateLimit = useRateLimitRejections();

  // One unpaged request returns every non-deleted organization, so these
  // counts are exact rather than estimated.
  const counts = useMemo(() => {
    const list = organizations.data ?? [];
    return {
      total: list.length,
      active: list.filter((org) => org.status === 'ACTIVE').length,
      pending: list.filter((org) => org.status === 'PENDING').length,
      suspended: list.filter((org) => org.status === 'SUSPENDED').length,
    };
  }, [organizations.data]);

  const attention = useMemo(
    () => (organizations.data ?? []).filter((org) => org.status !== 'ACTIVE').sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')).slice(0, 6),
    [organizations.data],
  );

  const orgState = organizations.isPending ? 'loading' : organizations.isError ? 'error' : 'ready';
  const state = (query: { isPending: boolean; isError: boolean }) => (query.isError ? 'error' : query.isPending ? 'loading' : 'ready');
  const s = summary.data;

  return (
    <>
      <PageHeader title="Platform overview" description="Organizations, routes and gateway traffic across NexGate." />

      <Section title="Organizations" actions={<Link to="/platform/organizations" className="text-[13px] font-medium text-accent-fg hover:underline">Manage organizations</Link>}>
        {organizations.isError ? (
          <ErrorState error={organizations.error} onRetry={() => organizations.refetch()} retrying={organizations.isFetching} />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total" state={orgState} value={formatNumber(counts.total)} tone="accent" />
            <StatCard label="Active" state={orgState} value={formatNumber(counts.active)} tone="success" />
            <StatCard label="Pending" state={orgState} value={formatNumber(counts.pending)} tone="warning" />
            <StatCard label="Suspended" state={orgState} value={formatNumber(counts.suspended)} tone="danger" />
          </div>
        )}
      </Section>

      <Section title="Routes" actions={<Link to="/platform/routes" className="text-[13px] font-medium text-accent-fg hover:underline">Inspect routes</Link>}>
        {totalRoutes.isError ? (
          <ErrorState error={totalRoutes.error} onRetry={() => totalRoutes.refetch()} />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total routes" state={state(totalRoutes)} value={formatNumber(totalRoutes.data)} tone="accent" />
            <StatCard label="Active routes" state={state(activeRoutes)} value={formatNumber(activeRoutes.data)} tone="success" />
            <StatCard
              label="Inactive routes"
              state={totalRoutes.isPending || activeRoutes.isPending ? 'loading' : totalRoutes.isError || activeRoutes.isError ? 'error' : 'ready'}
              value={formatNumber((totalRoutes.data ?? 0) - (activeRoutes.data ?? 0))}
            />
          </div>
        )}
      </Section>

      <Section title="Gateway traffic" description="All-time totals from the analytics service." actions={<Link to="/platform/analytics" className="text-[13px] font-medium text-accent-fg hover:underline">Open analytics</Link>}>
        {summary.isError ? (
          <div className="mb-3">
            <AnalyticsFailure error={summary.error} onRetry={() => { summary.refetch(); rateLimit.refetch(); }} retrying={summary.isFetching} />
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <StatCard label="Total requests" state={state(summary)} value={formatNumber(s?.totalRequests)} tone="accent" />
          <StatCard label="Successful" state={state(summary)} value={formatNumber(s?.successfulRequests)} detail={s ? formatPercent(s.successfulRequests, s.totalRequests) : undefined} tone="success" />
          <StatCard label="Failed" state={state(summary)} value={formatNumber(s?.failedRequests)} detail={s ? formatPercent(s.failedRequests, s.totalRequests) : undefined} tone="danger" />
          <StatCard label="Average response time" state={state(summary)} value={formatMs(s?.averageResponseTimeMs)} />
          <StatCard label="Rate-limit rejections" state={state(rateLimit)} value={formatNumber(rateLimit.data?.total)} tone="warning" />
        </div>
      </Section>

      <Card>
        <CardHeader title="Organizations needing attention" description="Pending or suspended organizations, most recently changed first." />
        {organizations.isPending ? (
          <div className="p-4">
            <LoadingBlock rows={3} label="Loading organizations" />
          </div>
        ) : organizations.isError ? null : attention.length === 0 ? (
          <EmptyState icon={<Building2 className="size-6" />} title="Every organization is active" className="py-8" />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Organization</Th>
                <Th>Status</Th>
                <Th>Last updated</Th>
              </tr>
            </THead>
            <TBody>
              {attention.map((org) => (
                <Tr key={org.id}>
                  <Td>
                    <Link to={`/platform/organizations/${org.id}`} className="font-medium hover:underline">
                      {org.name}
                    </Link>
                  </Td>
                  <Td>
                    <OrganizationStatusBadge status={org.status} />
                  </Td>
                  <Td className="text-fg-muted">{formatDateTime(org.updatedAt)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
