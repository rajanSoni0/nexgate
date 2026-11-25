import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RoutePolicy, RouteRequest } from '@/types/api';
import * as api from './api';

export const routeKeys = {
  all: ['routes'] as const,
  lists: () => [...routeKeys.all, 'list'] as const,
  list: (params: api.RouteListParams) => [...routeKeys.lists(), params] as const,
  detail: (id: number) => [...routeKeys.all, 'detail', id] as const,
  versions: (id: number) => [...routeKeys.all, 'versions', id] as const,
  compare: (id: number, from: number, to: number) => [...routeKeys.all, 'compare', id, from, to] as const,
};

export function useRoutes(params: api.RouteListParams, enabled = true) {
  return useQuery({ queryKey: routeKeys.list(params), queryFn: () => api.listRoutes(params), placeholderData: keepPreviousData, enabled });
}

/** Total count for a filter, fetched as a single one-item page. */
export function useRouteCount(active?: boolean) {
  return useQuery({
    queryKey: [...routeKeys.lists(), 'count', active ?? 'all'],
    queryFn: async () => (await api.listRoutes({ page: 0, size: 1, active })).totalElements,
  });
}

export function useRoute(id: number) {
  return useQuery({ queryKey: routeKeys.detail(id), queryFn: () => api.getRoute(id), enabled: Number.isFinite(id) });
}

export function useRouteVersions(id: number, enabled = true) {
  return useQuery({ queryKey: routeKeys.versions(id), queryFn: () => api.listRouteVersions(id), enabled: enabled && Number.isFinite(id) });
}

export function useRouteComparison(id: number, from: number | null, to: number | null) {
  return useQuery({
    queryKey: routeKeys.compare(id, from ?? -1, to ?? -1),
    queryFn: () => api.compareRouteVersions(id, from as number, to as number),
    enabled: from != null && to != null && from !== to,
    staleTime: Infinity, // versions are immutable
  });
}

function useRouteInvalidation() {
  const client = useQueryClient();
  return (id?: number) =>
    Promise.all([
      client.invalidateQueries({ queryKey: routeKeys.lists() }),
      id != null ? client.invalidateQueries({ queryKey: routeKeys.versions(id) }) : Promise.resolve(),
    ]);
}

export function useCreateRoute() {
  const invalidate = useRouteInvalidation();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: RouteRequest) => api.createRoute(request),
    onSuccess: (route) => {
      client.setQueryData(routeKeys.detail(route.id), route);
      return invalidate();
    },
  });
}

export function useUpdateRoute(id: number) {
  const invalidate = useRouteInvalidation();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: RouteRequest) => api.updateRoute(id, request),
    onSuccess: (route) => {
      client.setQueryData(routeKeys.detail(id), route);
      return invalidate(id);
    },
  });
}

export function useSetRouteActive(id: number) {
  const invalidate = useRouteInvalidation();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (active: boolean) => api.setRouteActive(id, active),
    onSuccess: (route) => {
      client.setQueryData(routeKeys.detail(id), route);
      return invalidate(id);
    },
  });
}

export function useUpdateRoutePolicy(id: number) {
  const invalidate = useRouteInvalidation();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (policy: RoutePolicy) => api.updateRoutePolicy(id, policy),
    onSuccess: (route) => {
      client.setQueryData(routeKeys.detail(id), route);
      return invalidate(id);
    },
  });
}

export function useDeleteRoute(id: number) {
  const invalidate = useRouteInvalidation();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.deleteRoute(id),
    onSuccess: () => {
      client.removeQueries({ queryKey: routeKeys.detail(id) });
      return invalidate();
    },
  });
}

export function useRestoreRouteVersion(id: number) {
  const invalidate = useRouteInvalidation();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (version: number) => api.restoreRouteVersion(id, version),
    onSuccess: (route) => {
      client.setQueryData(routeKeys.detail(id), route);
      return invalidate(id);
    },
  });
}
