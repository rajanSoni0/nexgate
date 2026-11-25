import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  meta,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: Array<{ label: string; to?: string }>;
  meta?: ReactNode;
}) {
  return (
    <header className="mb-6">
      {breadcrumbs?.length ? (
        <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1 text-[13px] text-fg-muted">
          {breadcrumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
              {crumb.to ? (
                <Link to={crumb.to} className="hover:text-fg hover:underline">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current="page">{crumb.label}</span>
              )}
              {index < breadcrumbs.length - 1 ? <ChevronRight className="size-3.5 text-fg-subtle" aria-hidden /> : null}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.01em] text-fg">{title}</h1>
          {description ? <p className="mt-1.5 max-w-[68ch] text-fg-muted">{description}</p> : null}
          {meta ? <div className="mt-2.5 flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function Section({ title, description, actions, children, className }: { title: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('mb-8', className)} aria-label={title}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
          {description ? <p className="mt-0.5 text-[13px] text-fg-muted">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/**
 * Metric tile. `state` lets a tile honestly show loading, an error, or a
 * capability the backend doesn't offer, instead of a made-up number.
 */
export function StatCard({
  label,
  value,
  detail,
  state = 'ready',
  tone,
}: {
  label: string;
  value?: ReactNode;
  detail?: ReactNode;
  state?: 'ready' | 'loading' | 'error' | 'unavailable';
  tone?: 'success' | 'danger' | 'warning' | 'accent';
}) {
  const bar = tone ? { success: 'bg-success', danger: 'bg-danger', warning: 'bg-warning', accent: 'bg-accent' }[tone] : 'bg-line-strong';
  return (
    <div className="relative overflow-hidden rounded-[10px] border border-line bg-surface px-4 py-3.5 shadow-card">
      <span className={cn('absolute inset-y-0 left-0 w-[3px]', bar)} aria-hidden />
      <p className="text-[13px] text-fg-muted">{label}</p>
      <div className="mt-1.5 min-h-8">
        {state === 'loading' ? (
          <div className="skeleton h-7 w-20 rounded" role="status" aria-label={`Loading ${label}`} />
        ) : state === 'error' ? (
          <p className="text-[13px] text-fg-muted">Couldn’t load</p>
        ) : state === 'unavailable' ? (
          <p className="text-[13px] text-fg-subtle">Not available</p>
        ) : (
          <p className="text-[26px] leading-8 font-semibold tracking-[-0.02em] text-fg tabular-nums">{value}</p>
        )}
      </div>
      {detail ? <p className="mt-1 text-[12.5px] text-fg-subtle">{detail}</p> : null}
    </div>
  );
}
