import { Badge } from '@/components/ui/Badge';

export function RouteStatusBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge tone="success" dot>
      Active
    </Badge>
  ) : (
    <Badge tone="neutral" dot>
      Inactive
    </Badge>
  );
}

export function MethodList({ methods }: { methods: string[] }) {
  const order = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
  const sorted = [...methods].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return (
    <span className="flex flex-wrap gap-1">
      {sorted.map((method) => (
        <span key={method} className="rounded border border-line px-1.5 py-px font-mono text-[11.5px] text-fg-muted">
          {method}
        </span>
      ))}
    </span>
  );
}
