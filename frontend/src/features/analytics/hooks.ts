import { useQuery } from '@tanstack/react-query';
import { isApiError } from '@/lib/errors';
import * as api from './api';

export const ANALYTICS_REFRESH_MS = 30_000;

/**
 * Refresh every 30 s while healthy. Stop polling after an auth/permission
 * failure: repeating a request the service has already rejected only adds load.
 */
export function analyticsRefetch(error: unknown): number | false {
  if (isApiError(error) && (error.kind === 'unauthorized' || error.kind === 'forbidden')) return false;
  return ANALYTICS_REFRESH_MS;
}

export const analyticsKeys = {
  all: ['analytics'] as const,
  summary: () => [...analyticsKeys.all, 'summary'] as const,
  routes: () => [...analyticsKeys.all, 'routes'] as const,
  slowRoutes: (limit: number) => [...analyticsKeys.all, 'slow-routes', limit] as const,
  rateLimit: () => [...analyticsKeys.all, 'rate-limit-rejections'] as const,
  idempotency: () => [...analyticsKeys.all, 'idempotency-replays'] as const,
};

export function useAnalyticsSummary() {
  return useQuery({ queryKey: analyticsKeys.summary(), queryFn: api.getSummary, refetchInterval: (query) => analyticsRefetch(query.state.error) });
}

export function useRouteStatistics() {
  return useQuery({ queryKey: analyticsKeys.routes(), queryFn: api.getRouteStatistics, refetchInterval: (query) => analyticsRefetch(query.state.error) });
}

export function useSlowRoutes(limit = 10) {
  return useQuery({ queryKey: analyticsKeys.slowRoutes(limit), queryFn: () => api.getSlowRoutes(limit), refetchInterval: (query) => analyticsRefetch(query.state.error) });
}

export function useRateLimitRejections() {
  return useQuery({ queryKey: analyticsKeys.rateLimit(), queryFn: api.getRateLimitRejections, refetchInterval: (query) => analyticsRefetch(query.state.error) });
}

export function useIdempotencyReplays() {
  return useQuery({ queryKey: analyticsKeys.idempotency(), queryFn: api.getIdempotencyReplays, refetchInterval: (query) => analyticsRefetch(query.state.error) });
}
