import type { ReactNode } from 'react';
import { AlertTriangle, Ban, CircleSlash, Info, Lock, PlugZap, RefreshCw, ServerCrash, WifiOff } from 'lucide-react';
import { cn } from '@/lib/cn';
import { errorTitle, isApiError, type ApiError } from '@/lib/errors';
import { Button } from './Button';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md', className)} aria-hidden />;
}

/** Accessible loading region with skeleton rows. */
export function LoadingBlock({ rows = 4, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-2.5 py-1">
      <span className="sr-only">{label}…</span>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className={cn('h-9', index % 3 === 2 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
      {icon ? <div className="mb-3 text-fg-subtle">{icon}</div> : null}
      <p className="font-medium text-fg">{title}</p>
      {description ? <p className="mt-1 max-w-md text-[13px] text-fg-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function iconFor(error: ApiError) {
  switch (error.kind) {
    case 'network':
      return <WifiOff className="size-5" />;
    case 'unavailable':
      return <PlugZap className="size-5" />;
    case 'unauthorized':
      return <Lock className="size-5" />;
    case 'forbidden':
      return <Ban className="size-5" />;
    case 'server':
      return <ServerCrash className="size-5" />;
    default:
      return <AlertTriangle className="size-5" />;
  }
}

/** Never a blank screen: every failed request renders one of these. */
export function ErrorState({
  error,
  onRetry,
  retrying,
  compact = false,
  hint,
}: {
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  compact?: boolean;
  hint?: ReactNode;
}) {
  const apiError = isApiError(error) ? error : null;
  const title = apiError ? errorTitle(apiError) : 'Something went wrong';
  const message = apiError?.message ?? (error instanceof Error ? error.message : 'An unexpected error occurred.');
  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 rounded-lg border border-danger/25 bg-danger-soft text-left',
        compact ? 'px-3 py-2.5' : 'px-4 py-3.5',
      )}
    >
      <div className="mt-0.5 shrink-0 text-danger-fg">{apiError ? iconFor(apiError) : <AlertTriangle className="size-5" />}</div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-fg">
          {title}
          {apiError?.status ? <span className="ml-1.5 font-normal text-fg-muted">HTTP {apiError.status}</span> : null}
        </p>
        <p className="mt-0.5 text-[13px] text-fg-muted">{message}</p>
        {hint ? <div className="mt-1.5 text-[13px] text-fg-muted">{hint}</div> : null}
      </div>
      {onRetry ? (
        <Button size="sm" variant="secondary" onClick={onRetry} loading={retrying} icon={<RefreshCw className="size-3.5" />}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Marks a capability the backend does not provide. Used instead of fake data
 * everywhere an endpoint is missing; `reason` names the concrete gap.
 */
export function UnavailableNotice({
  title,
  reason,
  children,
  className,
  variant = 'panel',
}: {
  title: string;
  reason: ReactNode;
  children?: ReactNode;
  className?: string;
  variant?: 'panel' | 'inline';
}) {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-lg border border-dashed border-line-strong text-left',
        variant === 'panel' ? 'bg-surface-2/60 px-4 py-4' : 'px-3 py-2.5',
        className,
      )}
    >
      <CircleSlash className="mt-0.5 size-4.5 shrink-0 text-fg-subtle" aria-hidden />
      <div className="min-w-0">
        <p className="font-medium text-fg">{title}</p>
        <div className="mt-0.5 text-[13px] text-fg-muted">{reason}</div>
        {children ? <div className="mt-2 text-[13px] text-fg-muted">{children}</div> : null}
      </div>
    </div>
  );
}

export function InlineAlert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const styles = {
    info: 'border-accent/25 bg-accent-soft',
    warning: 'border-warning/30 bg-warning-soft',
    danger: 'border-danger/25 bg-danger-soft',
    success: 'border-success/25 bg-success-soft',
  }[tone];
  const iconColor = { info: 'text-accent-fg', warning: 'text-warning-fg', danger: 'text-danger-fg', success: 'text-success-fg' }[tone];
  const Icon = tone === 'info' ? Info : AlertTriangle;
  return (
    <div role={tone === 'danger' ? 'alert' : 'note'} className={cn('flex gap-2.5 rounded-lg border px-3.5 py-3', styles, className)}>
      <Icon className={cn('mt-0.5 size-4 shrink-0', iconColor)} aria-hidden />
      <div className="min-w-0 text-[13px] text-fg">
        {title ? <p className="font-medium">{title}</p> : null}
        <div className={title ? 'mt-0.5 text-fg-muted' : undefined}>{children}</div>
      </div>
    </div>
  );
}
