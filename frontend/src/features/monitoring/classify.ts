export type HealthState = 'healthy' | 'unhealthy' | 'unknown' | 'unavailable';

export interface RawProbe {
  /** null when no HTTP response arrived at all (network error / timeout). */
  status: number | null;
  data: unknown;
  /** The dev proxy flagged the upstream as refusing connections. */
  upstreamUnavailable: boolean;
}

export interface Classified {
  state: HealthState;
  detail: string;
  reported?: string;
}

function reportedStatus(data: unknown): string | undefined {
  if (data && typeof data === 'object' && 'status' in data) {
    const value = (data as { status: unknown }).status;
    return typeof value === 'string' ? value : undefined;
  }
  return undefined;
}

/**
 * Interprets a Spring Boot actuator /actuator/health response. A process that
 * merely answers is NOT assumed healthy: only an explicit "UP" counts.
 */
export function classifyActuator(probe: RawProbe): Classified {
  if (probe.status == null) return { state: 'unavailable', detail: 'No response — the request failed before reaching the service.' };
  if (probe.upstreamUnavailable) return { state: 'unavailable', detail: 'The service refused the connection. It is not running or not reachable.' };
  if (probe.status === 401 || probe.status === 403) {
    return {
      state: 'unknown',
      detail: `The health endpoint requires credentials this console can’t provide (HTTP ${probe.status}), so health can’t be confirmed.`,
    };
  }
  const reported = reportedStatus(probe.data);
  if (probe.status === 200 && reported === 'UP') return { state: 'healthy', detail: 'Actuator reports UP.', reported };
  if (reported === 'DOWN' || reported === 'OUT_OF_SERVICE') return { state: 'unhealthy', detail: `Actuator reports ${reported}.`, reported };
  if (probe.status === 503) return { state: 'unhealthy', detail: 'Actuator answered 503 Service Unavailable.', reported };
  if (probe.status === 404) return { state: 'unknown', detail: 'No health endpoint at /actuator/health.' };
  if (probe.status >= 500) return { state: 'unknown', detail: `The health endpoint failed with HTTP ${probe.status}.` };
  return { state: 'unknown', detail: reported ? `Actuator reports ${reported}.` : `Unexpected response (HTTP ${probe.status}).`, reported };
}

/**
 * Interprets GET /health on api-management-service (public HealthResponse):
 * `dbStatus` is the result of SELECT 1 against MySQL.
 */
export function classifyMysql(probe: RawProbe): Classified {
  if (probe.status == null || probe.upstreamUnavailable) {
    return { state: 'unknown', detail: 'MySQL is checked through API Management, which isn’t reachable.' };
  }
  if (probe.status !== 200) return { state: 'unknown', detail: `API Management /health answered HTTP ${probe.status}.` };
  const db = probe.data && typeof probe.data === 'object' ? (probe.data as { dbStatus?: unknown }).dbStatus : undefined;
  if (db === 'UP') return { state: 'healthy', detail: 'API Management ran SELECT 1 successfully.', reported: 'UP' };
  if (db === 'DOWN') return { state: 'unhealthy', detail: 'API Management could not query MySQL.', reported: 'DOWN' };
  return { state: 'unknown', detail: 'The response didn’t include a database status.' };
}
