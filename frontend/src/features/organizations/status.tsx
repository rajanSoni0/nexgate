import { Badge, type Tone } from '@/components/ui/Badge';
import type { OrganizationStatus } from '@/types/api';

const map: Record<OrganizationStatus, { label: string; tone: Tone; description: string }> = {
  ACTIVE: { label: 'Active', tone: 'success', description: 'Its tenant administrator can sign in and manage routes.' },
  PENDING: { label: 'Pending', tone: 'warning', description: 'Created but not yet activated. Its tenant administrator can’t sign in.' },
  SUSPENDED: { label: 'Suspended', tone: 'danger', description: 'Temporarily blocked. Its tenant administrator can’t sign in.' },
  DELETED: { label: 'Deleted', tone: 'neutral', description: 'Soft-deleted.' },
};

export function organizationStatusInfo(status: OrganizationStatus) {
  return map[status] ?? { label: status, tone: 'neutral' as Tone, description: '' };
}

export function OrganizationStatusBadge({ status }: { status: OrganizationStatus }) {
  const info = organizationStatusInfo(status);
  return (
    <Badge tone={info.tone} dot>
      {info.label}
    </Badge>
  );
}
