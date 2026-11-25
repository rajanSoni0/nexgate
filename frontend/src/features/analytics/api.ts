import { analyticsClient } from '@/lib/http';
import type { AnalyticsSummary, CountResponse, RouteStatistics } from '@/types/api';

/**
 * analytics-service endpoints. All are platform-wide aggregates with no
 * organization or time-range parameters, so only Platform Admin views call them.
 * NOTE: at commit 42751c0 the service rejects every caller with 401 (no JWT
 * configuration); the console surfaces that instead of hiding it.
 */
export async function getSummary(): Promise<AnalyticsSummary> {
  const { data } = await analyticsClient.get<AnalyticsSummary>('/api/analytics/summary');
  return data;
}

export async function getRouteStatistics(): Promise<RouteStatistics[]> {
  const { data } = await analyticsClient.get<RouteStatistics[]>('/api/analytics/routes');
  return data;
}

/** Server clamps limit to 1..100. */
export async function getSlowRoutes(limit: number): Promise<RouteStatistics[]> {
  const { data } = await analyticsClient.get<RouteStatistics[]>('/api/analytics/slow-routes', { params: { limit } });
  return data;
}

export async function getRateLimitRejections(): Promise<CountResponse> {
  const { data } = await analyticsClient.get<CountResponse>('/api/analytics/rate-limit-rejections');
  return data;
}

export async function getIdempotencyReplays(): Promise<CountResponse> {
  const { data } = await analyticsClient.get<CountResponse>('/api/analytics/idempotency-replays');
  return data;
}
