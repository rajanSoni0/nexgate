import axios from 'axios';
import { SERVICES, UPSTREAM_UNAVAILABLE_HEADER, type ServiceKey } from '@/config/services';
import { sessionStore } from '@/lib/session';
import { classifyActuator, classifyMysql, type Classified, type RawProbe } from './classify';

export interface ProbeResult extends Classified {
  endpoint: string;
  httpStatus: number | null;
  latencyMs: number | null;
  checkedAt: number | null;
}

/**
 * Health probes use a bare axios call that accepts every status code: a 401
 * or 503 is information here, not an exception, and must never end the session.
 */
async function rawProbe(service: ServiceKey, path: string, withToken: boolean): Promise<RawProbe & { latencyMs: number | null }> {
  const started = performance.now();
  const headers: Record<string, string> = { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
  const token = withToken ? sessionStore.token() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const response = await axios.get(`${SERVICES[service].base}${path}`, { headers, timeout: 8000, validateStatus: () => true });
    return {
      status: response.status,
      data: response.data,
      upstreamUnavailable: response.headers?.[UPSTREAM_UNAVAILABLE_HEADER] === 'upstream-unavailable',
      latencyMs: Math.round(performance.now() - started),
    };
  } catch {
    return { status: null, data: null, upstreamUnavailable: false, latencyMs: null };
  }
}

export interface ServiceProbeSpec {
  service: ServiceKey;
  path: string;
  /** Send the console session token (only to NexGate's own control-plane services). */
  withToken: boolean;
  note?: string;
}

/**
 * Which endpoint each application is checked through, and why:
 * - API Management: /actuator/health is not in its permitAll list, so it needs the session token.
 * - Analytics: Spring Security defaults reject every caller (no JWT config).
 * - Smart Gateway: Spring Security defaults as well; currently also not running.
 * - Catalog / Order: no Spring Security, actuator is public.
 */
export const SERVICE_PROBES: ServiceProbeSpec[] = [
  { service: 'gateway', path: '/actuator/health', withToken: false, note: 'The gateway refuses to start when it can’t load active routes from API Management at startup.' },
  { service: 'management', path: '/actuator/health', withToken: true },
  { service: 'analytics', path: '/actuator/health', withToken: true },
  { service: 'catalog', path: '/actuator/health', withToken: false },
  { service: 'order', path: '/actuator/health', withToken: false },
];

export async function probeService(spec: ServiceProbeSpec): Promise<ProbeResult> {
  const raw = await rawProbe(spec.service, spec.path, spec.withToken);
  return { ...classifyActuator(raw), endpoint: `${spec.path}`, httpStatus: raw.status, latencyMs: raw.latencyMs, checkedAt: Date.now() };
}

export async function probeMysql(): Promise<ProbeResult> {
  const raw = await rawProbe('management', '/health', false);
  return { ...classifyMysql(raw), endpoint: '/health', httpStatus: raw.status, latencyMs: raw.latencyMs, checkedAt: Date.now() };
}
