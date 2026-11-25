import type { ReactNode } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InlineAlert, Skeleton } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/Page';
import { SERVICES } from '@/config/services';
import { formatTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import { probeMysql, probeService, SERVICE_PROBES, type ProbeResult } from './api';
import type { HealthState } from './classify';
import { HealthBadge, healthLabel } from './HealthBadge';

export const HEALTH_REFRESH_MS = 30_000;

function stripe(state: HealthState) {
  return { healthy: 'bg-success', unhealthy: 'bg-danger', unknown: 'bg-warning', unavailable: 'bg-line-strong' }[state];
}

function HealthCard({
  name,
  subtitle,
  result,
  pending,
  note,
  source,
}: {
  name: string;
  subtitle?: ReactNode;
  result?: ProbeResult;
  pending: boolean;
  note?: string;
  source: ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden">
      <span className={cn('absolute inset-y-0 left-0 w-[3px]', result ? stripe(result.state) : 'bg-line')} aria-hidden />
      <div className="flex flex-col gap-3 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-semibold text-fg">{name}</h2>
            {subtitle ? <p className="text-[12.5px] text-fg-subtle">{subtitle}</p> : null}
          </div>
          {pending && !result ? <Skeleton className="h-5 w-20 rounded-full" /> : result ? <HealthBadge state={result.state} /> : null}
        </div>
        {pending && !result ? (
          <Skeleton className="h-4 w-3/4" />
        ) : result ? (
          <p className="text-[13px] text-fg-muted">{result.detail}</p>
        ) : null}
        {result?.state === 'unavailable' && note ? <InlineAlert tone="warning">{note}</InlineAlert> : null}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-line pt-3 text-[12.5px] sm:grid-cols-4">
          <div className="col-span-2">
            <dt className="text-fg-subtle">Source</dt>
            <dd className="font-mono break-all text-fg-muted">{source}</dd>
          </div>
          <div>
            <dt className="text-fg-subtle">HTTP</dt>
            <dd className="text-fg-muted tabular-nums">{result?.checkedAt ? (result.httpStatus ?? 'none') : '—'}</dd>
          </div>
          <div>
            <dt className="text-fg-subtle">Checked</dt>
            <dd className="text-fg-muted tabular-nums">{result?.checkedAt ? formatTime(result.checkedAt) : 'Not checked'}</dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}

function Summary({ results }: { results: Array<ProbeResult | undefined> }) {
  const counts: Record<HealthState, number> = { healthy: 0, unhealthy: 0, unknown: 0, unavailable: 0 };
  results.forEach((result) => result && counts[result.state]++);
  return (
    <p className="mb-5 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-fg-muted" aria-live="polite">
      {(Object.keys(counts) as HealthState[]).map((state) => (
        <span key={state} className="flex items-center gap-1.5">
          <span className={cn('size-2 rounded-full', stripe(state))} aria-hidden />
          {counts[state]} {healthLabel(state).toLowerCase()}
        </span>
      ))}
    </p>
  );
}

export function ServiceHealthPage() {
  const probes = useQueries({
    queries: SERVICE_PROBES.map((spec) => ({
      queryKey: ['health', 'service', spec.service],
      queryFn: () => probeService(spec),
      refetchInterval: HEALTH_REFRESH_MS,
      retry: false,
      staleTime: 0,
    })),
  });
  const fetching = probes.some((probe) => probe.isFetching);

  return (
    <>
      <PageHeader
        title="Service health"
        description="Live checks of each NexGate application’s health endpoint, every 30 seconds."
        actions={
          <Button size="sm" icon={<RefreshCw className="size-3.5" />} loading={fetching} onClick={() => probes.forEach((probe) => probe.refetch())}>
            Check now
          </Button>
        }
      />
      <Summary results={probes.map((probe) => probe.data)} />
      <div className="grid gap-4 lg:grid-cols-2">
        {SERVICE_PROBES.map((spec, index) => (
          <HealthCard
            key={spec.service}
            name={SERVICES[spec.service].label}
            subtitle={SERVICES[spec.service].upstream ?? undefined}
            result={probes[index].data}
            pending={probes[index].isPending}
            note={spec.note}
            source={spec.path}
          />
        ))}
      </div>
      <p className="mt-5 text-[12.5px] text-fg-subtle">
        Healthy means the actuator explicitly reported UP. A service that answers but won’t say, for example because its health
        endpoint needs credentials, shows as Unknown.
      </p>
    </>
  );
}

const UNOBSERVABLE: Array<{ name: string; reason: string }> = [
  {
    name: 'MongoDB',
    reason: 'Used by analytics-service. Its actuator hides component details and rejects the console session, so MongoDB status isn’t exposed.',
  },
  {
    name: 'Redis',
    reason: 'Used by the Smart Gateway for rate limiting and idempotency. No endpoint the console can reach reports Redis status.',
  },
  {
    name: 'Kafka',
    reason: 'Carries configuration and access events. No service exposes broker or consumer status to the console.',
  },
];

export function InfrastructureHealthPage() {
  const mysql = useQuery({ queryKey: ['health', 'mysql'], queryFn: probeMysql, refetchInterval: HEALTH_REFRESH_MS, retry: false, staleTime: 0 });

  return (
    <>
      <PageHeader
        title="Infrastructure health"
        description="Datastores and messaging behind NexGate, as far as the services report them."
        actions={
          <Button size="sm" icon={<RefreshCw className="size-3.5" />} loading={mysql.isFetching} onClick={() => mysql.refetch()}>
            Check now
          </Button>
        }
      />
      <InlineAlert tone="info" className="mb-5">
        The console never talks to datastores directly. It only shows what a NexGate service reports; a running container alone
        doesn’t count as healthy.
      </InlineAlert>
      <div className="grid gap-4 lg:grid-cols-2">
        <HealthCard name="MySQL" subtitle="Control-plane database" result={mysql.data} pending={mysql.isPending} source="API Management /health (dbStatus)" />
        {UNOBSERVABLE.map((item) => (
          <HealthCard
            key={item.name}
            name={item.name}
            result={{ state: 'unknown', detail: item.reason, endpoint: '—', httpStatus: null, latencyMs: null, checkedAt: null }}
            pending={false}
            source="No health source available"
          />
        ))}
      </div>
    </>
  );
}
