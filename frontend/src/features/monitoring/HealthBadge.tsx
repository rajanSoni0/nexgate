import { Badge, type Tone } from '@/components/ui/Badge';
import type { HealthState } from './classify';

const map: Record<HealthState, { label: string; tone: Tone }> = {
  healthy: { label: 'Healthy', tone: 'success' },
  unhealthy: { label: 'Unhealthy', tone: 'danger' },
  unknown: { label: 'Unknown', tone: 'warning' },
  unavailable: { label: 'Unavailable', tone: 'neutral' },
};

export function HealthBadge({ state }: { state: HealthState }) {
  return (
    <Badge tone={map[state].tone} dot>
      {map[state].label}
    </Badge>
  );
}

export function healthLabel(state: HealthState) {
  return map[state].label;
}
