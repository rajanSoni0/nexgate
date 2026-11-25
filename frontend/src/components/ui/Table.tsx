import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { Button } from './Button';

/** Tables scroll inside their own container so the page never scrolls sideways. */
export function Table({ className, children, minWidth = 640, style, ...rest }: HTMLAttributes<HTMLTableElement> & { minWidth?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full border-collapse text-left text-sm', className)} style={{ minWidth, ...style }} {...rest}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-line bg-surface-2/50 text-[12.5px] text-fg-muted">{children}</thead>;
}

export function Th({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope="col" className={cn('px-4 py-2.5 font-medium whitespace-nowrap', className)} {...rest} />;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>;
}

export function Tr({ className, interactive, ...rest }: HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) {
  return <tr className={cn(interactive && 'cursor-pointer transition-colors hover:bg-surface-2/60', className)} {...rest} />;
}

export function Td({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3 align-middle', className)} {...rest} />;
}

export function Pagination({
  page,
  totalPages,
  totalElements,
  size,
  onPageChange,
  disabled,
}: {
  page: number;
  totalPages: number;
  totalElements: number;
  size: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  if (totalElements === 0) return null;
  const from = page * size + 1;
  const to = Math.min(totalElements, (page + 1) * size);
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-[13px] text-fg-muted">
      <span>
        {formatNumber(from)}–{formatNumber(to)} of {formatNumber(totalElements)}
      </span>
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="ghost" onClick={() => onPageChange(page - 1)} disabled={disabled || page <= 0} icon={<ChevronLeft className="size-4" />}>
          Previous
        </Button>
        <span className="px-1">
          Page {page + 1} of {Math.max(totalPages, 1)}
        </span>
        <Button size="sm" variant="ghost" onClick={() => onPageChange(page + 1)} disabled={disabled || page + 1 >= totalPages}>
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
