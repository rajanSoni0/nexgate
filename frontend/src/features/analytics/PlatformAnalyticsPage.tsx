import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState, LoadingBlock, Skeleton } from '@/components/ui/Feedback';
import { PageHeader, Section, StatCard } from '@/components/ui/Page';
import { Table, TBody, Td, Th, THead } from '@/components/ui/Table';
import { formatMs, formatNumber, formatPercent, formatTime } from '@/lib/format';
import type { RouteStatistics } from '@/types/api';
import { AnalyticsFailure, MissingAnalyticsList } from './AnalyticsNotices';
import { useChartColors } from './chartColors';
import { ANALYTICS_REFRESH_MS, useAnalyticsSummary, useIdempotencyReplays, useRateLimitRejections, useRouteStatistics, useSlowRoutes } from './hooks';

const TOP = 10;

function routeLabel(stat: RouteStatistics) {
  return stat.routeId || stat.routePath || '(unknown)';
}

/** Card-level failure: the page banner above carries the full explanation. */
function CardFailure() {
  return (
    <p role="status" className="py-6 text-center text-[13px] text-fg-muted">
      Couldn’t load this data. See the error at the top of the page.
    </p>
  );
}

function ChartFrame({ height = 280, children }: { height?: number; children: React.ReactElement }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 480, height }}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function PlatformAnalyticsPage() {
  const summary = useAnalyticsSummary();
  const routes = useRouteStatistics();
  const slow = useSlowRoutes(TOP);
  const rateLimit = useRateLimitRejections();
  const replays = useIdempotencyReplays();
  const colors = useChartColors();

  const all = [summary, routes, slow, rateLimit, replays];
  const firstError = all.find((query) => query.isError)?.error;
  const anyFetching = all.some((query) => query.isFetching);
  const refetchAll = () => all.forEach((query) => query.refetch());
  const lastUpdated = Math.max(...all.map((query) => query.dataUpdatedAt));

  const mostRequested = useMemo(() => [...(routes.data ?? [])].sort((a, b) => b.requestCount - a.requestCount).slice(0, TOP), [routes.data]);

  const tileState = (query: { isPending: boolean; isError: boolean }) => (query.isError ? 'error' : query.isPending ? 'loading' : 'ready');
  const s = summary.data;
  const outcome = s
    ? [
        { name: 'Successful', value: s.successfulRequests, color: colors.success },
        { name: 'Failed', value: s.failedRequests, color: colors.danger },
      ]
    : [];
  const tooltipStyle = { background: colors.surface, border: `1px solid ${colors.grid}`, borderRadius: 8, color: colors.fg, fontSize: 12.5 };

  return (
    <>
      <PageHeader
        title="Platform analytics"
        description="All-time gateway traffic across every organization, from the analytics service."
        actions={
          <>
            <span className="text-[12.5px] text-fg-subtle">
              {lastUpdated > 0 ? `Updated ${formatTime(lastUpdated)}. ` : ''}Refreshes every {ANALYTICS_REFRESH_MS / 1000} s
            </span>
            <Button size="sm" icon={<RefreshCw className="size-3.5" />} onClick={refetchAll} loading={anyFetching}>
              Refresh
            </Button>
          </>
        }
      />

      {firstError ? (
        <div className="mb-6">
          <AnalyticsFailure error={firstError} onRetry={refetchAll} retrying={anyFetching} />
        </div>
      ) : null}

      <Section title="Traffic">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Total requests" state={tileState(summary)} value={formatNumber(s?.totalRequests)} tone="accent" />
          <StatCard label="Successful" state={tileState(summary)} value={formatNumber(s?.successfulRequests)} detail={s ? formatPercent(s.successfulRequests, s.totalRequests) : undefined} tone="success" />
          <StatCard label="Failed" state={tileState(summary)} value={formatNumber(s?.failedRequests)} detail={s ? formatPercent(s.failedRequests, s.totalRequests) : undefined} tone="danger" />
          <StatCard label="Average latency" state={tileState(summary)} value={formatMs(s?.averageResponseTimeMs)} />
          <StatCard label="Rate-limited" state={tileState(rateLimit)} value={formatNumber(rateLimit.data?.total)} tone="warning" />
          <StatCard label="Idempotent replays" state={tileState(replays)} value={formatNumber(replays.data?.total)} />
        </div>
      </Section>

      <div className="mb-8 grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card>
          <CardHeader title="Success and failure" description="Status below 400 counts as success." />
          <CardBody>
            {summary.isPending ? (
              <Skeleton className="h-[260px] w-full" />
            ) : summary.isError ? (
              <CardFailure />
            ) : !s || s.totalRequests === 0 ? (
              <EmptyState icon={<BarChart3 className="size-6" />} title="No traffic recorded yet" description="Requests appear after the gateway publishes access events." />
            ) : (
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <div className="h-[220px] w-full sm:w-1/2">
                  <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 220, height: 220 }}>
                    <PieChart>
                      <Pie data={outcome} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="88%" stroke={colors.surface} strokeWidth={2} isAnimationActive={false}>
                        {outcome.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatNumber(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="flex w-full flex-col gap-2 sm:w-1/2">
                  {outcome.map((entry) => (
                    <li key={entry.name} className="flex items-center justify-between gap-3 text-[13px]">
                      <span className="flex items-center gap-2 text-fg-muted">
                        <span className="size-2.5 rounded-sm" style={{ background: entry.color }} aria-hidden />
                        {entry.name}
                      </span>
                      <span className="font-medium text-fg tabular-nums">
                        {formatNumber(entry.value)} <span className="font-normal text-fg-subtle">({formatPercent(entry.value, s.totalRequests)})</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Requests by route" description={`Top ${TOP} routes by request count.`} />
          <CardBody>
            {routes.isPending ? (
              <Skeleton className="h-[260px] w-full" />
            ) : routes.isError ? (
              <CardFailure />
            ) : mostRequested.length === 0 ? (
              <EmptyState title="No route traffic yet" />
            ) : (
              <ChartFrame height={Math.max(200, mostRequested.length * 30 + 40)}>
                <BarChart data={mostRequested.map((r) => ({ name: routeLabel(r), requests: r.requestCount }))} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid horizontal={false} stroke={colors.grid} />
                  <XAxis type="number" tick={{ fill: colors.axis, fontSize: 12 }} stroke={colors.grid} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fill: colors.axis, fontSize: 12 }} stroke={colors.grid} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: colors.grid, opacity: 0.4 }} formatter={(value) => formatNumber(Number(value))} />
                  <Bar dataKey="requests" name="Requests" fill={colors.accent} radius={[0, 4, 4, 0]} isAnimationActive={false} />
                </BarChart>
              </ChartFrame>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mb-8 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Most requested routes" />
          {routes.isPending ? (
            <CardBody>
              <LoadingBlock rows={4} label="Loading route statistics" />
            </CardBody>
          ) : routes.isError ? (
            <CardBody>
              <CardFailure />
            </CardBody>
          ) : (
            <RouteStatsTable rows={mostRequested} total={s?.totalRequests} emptyTitle="No route traffic yet" />
          )}
        </Card>
        <Card>
          <CardHeader title="Slowest routes" description="By all-time average response time." />
          {slow.isPending ? (
            <CardBody>
              <LoadingBlock rows={4} label="Loading slowest routes" />
            </CardBody>
          ) : slow.isError ? (
            <CardBody>
              <CardFailure />
            </CardBody>
          ) : (
            <RouteStatsTable rows={slow.data} emptyTitle="No latency data yet" highlightLatency />
          )}
        </Card>
      </div>

      <Section title="Not available from the analytics service" description="These views need endpoints the backend doesn’t provide yet.">
        <MissingAnalyticsList />
      </Section>
    </>
  );
}

function RouteStatsTable({ rows, total, emptyTitle, highlightLatency }: { rows: RouteStatistics[]; total?: number; emptyTitle: string; highlightLatency?: boolean }) {
  if (rows.length === 0) return <EmptyState title={emptyTitle} className="py-8" />;
  return (
    <Table minWidth={360}>
      <THead>
        <tr>
          <Th>Route</Th>
          <Th className="text-right">Requests</Th>
          {total ? <Th className="text-right">Share</Th> : null}
          <Th className="text-right">Avg latency</Th>
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => (
          <tr key={`${row.routeId}|${row.routePath}`}>
            <Td>
              <span className="block font-mono text-[12.5px] text-fg">{row.routeId || '—'}</span>
              {row.routePath ? <span className="block font-mono text-[12px] text-fg-subtle">{row.routePath}</span> : null}
            </Td>
            <Td className="text-right tabular-nums">{formatNumber(row.requestCount)}</Td>
            {total ? <Td className="text-right text-fg-muted tabular-nums">{formatPercent(row.requestCount, total)}</Td> : null}
            <Td className={`text-right tabular-nums ${highlightLatency ? 'font-medium' : ''}`}>{formatMs(row.averageResponseTimeMs)}</Td>
          </tr>
        ))}
      </TBody>
    </Table>
  );
}
