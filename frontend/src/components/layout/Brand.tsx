import { cn } from '@/lib/cn';

export function BrandMark({ tone = 'default', compact = false }: { tone?: 'default' | 'onNavy'; compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="7" className={tone === 'onNavy' ? 'fill-navy-800' : 'fill-navy-900'} />
        <path d="M8 22V10l8 8 8-8v12" fill="none" stroke="#5B92F5" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {compact ? null : (
        <span className={cn('text-[15px] font-semibold tracking-[-0.01em]', tone === 'onNavy' ? 'text-white' : 'text-fg')}>
          NexGate <span className={tone === 'onNavy' ? 'font-normal text-navy-300' : 'font-normal text-fg-muted'}>Console</span>
        </span>
      )}
    </span>
  );
}
