import type { ReactNode } from 'react';
import { ArrowDownUp, Gauge, KeyRound, Lock, LockOpen, Repeat, Route as RouteIcon, Server, Split } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatMs } from '@/lib/format';
import type { Route } from '@/types/api';
import { MethodList } from './parts';

interface Stage {
  key: string;
  title: string;
  icon: ReactNode;
  enabled: boolean;
  body: ReactNode;
}

function rewriteExample(route: Route): ReactNode {
  const policy = route.policy;
  if (policy?.rewriteEnabled) {
    return (
      <>
        Prefix replaced with <code className="font-mono text-fg">{policy.rewriteTargetPrefix || '/'}</code>
      </>
    );
  }
  if (route.stripPrefix) return 'Matched prefix stripped';
  return 'Path forwarded unchanged';
}

/**
 * The route as the gateway executes it, stage by stage, built only from this
 * route's saved configuration. Disabled stages stay visible but muted so the
 * whole chain is always readable.
 */
export function RoutePipeline({ route }: { route: Route }) {
  const policy = route.policy;
  const requestRules = route.headerRules.filter((rule) => rule.direction === 'REQUEST').length;
  const responseRules = route.headerRules.length - requestRules;

  const stages: Stage[] = [
    {
      key: 'match',
      title: 'Match',
      icon: <RouteIcon className="size-4" />,
      enabled: true,
      body: (
        <>
          <code className="block font-mono text-[12.5px] break-all text-fg">{route.pathPattern}</code>
          <div className="mt-1.5">
            <MethodList methods={route.allowedMethods} />
          </div>
        </>
      ),
    },
    {
      key: 'auth',
      title: 'Authenticate',
      icon: policy?.authenticationRequired ? <Lock className="size-4" /> : <LockOpen className="size-4" />,
      enabled: Boolean(policy?.authenticationRequired),
      body: policy?.authenticationRequired ? (
        policy.permittedRoles.length ? (
          <>Bearer JWT with role {policy.permittedRoles.join(' or ')}</>
        ) : (
          <span className="text-warning-fg">Bearer JWT required, but no roles are permitted, so every call gets 403</span>
        )
      ) : (
        'Public. No token required.'
      ),
    },
    {
      key: 'rate',
      title: 'Rate limit',
      icon: <Gauge className="size-4" />,
      enabled: Boolean(policy?.rateLimitEnabled),
      body: policy?.rateLimitEnabled ? (
        <>
          {policy.rateLimitRequests ?? '?'} requests / {policy.rateLimitWindowSeconds ?? '?'} s per {(policy.rateLimitScope || 'ROUTE').toLowerCase()}
        </>
      ) : (
        'Off'
      ),
    },
    {
      key: 'idem',
      title: 'Idempotency',
      icon: <Repeat className="size-4" />,
      enabled: Boolean(policy?.idempotencyEnabled),
      body: policy?.idempotencyEnabled ? (
        <>
          POST needs <code className="font-mono text-fg">Idempotency-Key</code>
        </>
      ) : (
        'Off'
      ),
    },
    {
      key: 'transform',
      title: 'Transform',
      icon: <Split className="size-4" />,
      enabled: Boolean(policy?.rewriteEnabled || route.stripPrefix || route.headerRules.length),
      body: (
        <>
          {rewriteExample(route)}
          {route.headerRules.length ? (
            <span className="mt-1 block text-fg-muted">
              <ArrowDownUp className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />
              {requestRules} request, {responseRules} response header rule{route.headerRules.length === 1 ? '' : 's'}
            </span>
          ) : null}
        </>
      ),
    },
    {
      key: 'forward',
      title: 'Forward',
      icon: <Server className="size-4" />,
      enabled: true,
      body: (
        <>
          <code className="block font-mono text-[12.5px] break-all text-fg">{route.targetUri}</code>
          <span className="mt-1 block text-fg-muted">Timeout {formatMs(policy?.timeoutMs)}</span>
        </>
      ),
    },
  ];

  return (
    <figure aria-label="Request pipeline" className="m-0">
      <ol className="grid grid-cols-1 gap-0 md:grid-cols-3 xl:grid-cols-6">
        {stages.map((stage, index) => (
          <li key={stage.key} className="relative flex md:block">
            {/* connector: vertical on small screens, horizontal from md */}
            <span className="flex w-8 shrink-0 flex-col items-center md:hidden" aria-hidden>
              <span className={cn('w-px flex-1', index === 0 ? 'bg-transparent' : 'bg-line-strong')} />
              <span className={cn('size-3 rounded-full border-2', stage.enabled ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface')} />
              <span className={cn('w-px flex-1', index === stages.length - 1 ? 'bg-transparent' : 'bg-line-strong')} />
            </span>
            <span className="hidden items-center md:flex" aria-hidden>
              <span className={cn('h-px flex-1', index === 0 ? 'bg-transparent' : 'bg-line-strong')} />
              <span className={cn('size-3 rounded-full border-2', stage.enabled ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface')} />
              <span className={cn('h-px flex-1', index === stages.length - 1 ? 'bg-transparent' : 'bg-line-strong')} />
            </span>
            <div className={cn('min-w-0 flex-1 px-2 py-2 md:px-3 md:pt-3 md:text-center', !stage.enabled && 'opacity-60')}>
              <p className={cn('flex items-center gap-1.5 text-[13px] font-semibold md:justify-center', stage.enabled ? 'text-fg' : 'text-fg-muted')}>
                <span className={stage.enabled ? 'text-accent-fg' : 'text-fg-subtle'} aria-hidden>
                  {stage.icon}
                </span>
                {stage.title}
                {!stage.enabled ? <span className="sr-only">(off)</span> : null}
              </p>
              <div className="mt-1 text-[12.5px] leading-snug text-fg-muted">{stage.body}</div>
            </div>
          </li>
        ))}
      </ol>
      <figcaption className="mt-3 flex items-center gap-1.5 text-[12.5px] text-fg-subtle">
        <KeyRound className="size-3.5" aria-hidden />
        Stages run left to right for every request. Muted stages are switched off for this route.
      </figcaption>
    </figure>
  );
}
