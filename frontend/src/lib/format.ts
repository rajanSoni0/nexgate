const numberFormat = new Intl.NumberFormat(undefined);
const compactFormat = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });

export function formatNumber(value: number | null | undefined): string {
  return value == null || Number.isNaN(value) ? '—' : numberFormat.format(value);
}

export function formatCompact(value: number | null | undefined): string {
  return value == null || Number.isNaN(value) ? '—' : compactFormat.format(value);
}

export function formatMs(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  if (value >= 1000) return `${Number((value / 1000).toFixed(2))} s`;
  return `${value.toFixed(value < 10 ? 1 : 0)} ms`;
}

export function formatPercent(part: number, whole: number): string {
  if (!whole) return '—';
  return `${((part / whole) * 100).toFixed(1)}%`;
}

/** Backend LocalDateTime strings carry no zone; they are shown as server-local time. */
export function parseServerDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const timeFormat = new Intl.DateTimeFormat(undefined, { timeStyle: 'medium' });

export function formatDateTime(value: string | number | Date | null | undefined): string {
  if (value == null) return '—';
  const date = typeof value === 'string' ? parseServerDate(value) : new Date(value);
  return date ? dateTimeFormat.format(date) : '—';
}

export function formatTime(value: number | Date): string {
  return timeFormat.format(new Date(value));
}

export function formatRelative(target: number, now = Date.now()): string {
  const seconds = Math.round((target - now) / 1000);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (abs < 60) return rtf.format(seconds, 'second');
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour');
  return rtf.format(Math.round(seconds / 86400), 'day');
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function roleLabel(role: string): string {
  if (role === 'PLATFORM_ADMIN') return 'Platform admin';
  if (role === 'TENANT_ADMIN') return 'Tenant admin';
  if (role === 'GATEWAY_SERVICE') return 'Gateway service';
  return titleCase(role);
}
