import { managementClient } from '@/lib/http';
import { normalizePage } from '@/lib/page';
import type { Page, Route, RoutePolicy, RouteRequest, RouteVersion, VersionComparison } from '@/types/api';

const BASE = '/api/gateway/admin/routes';

export interface RouteListParams {
  page: number;
  size: number;
  /** Server-side filter; omit for all non-deleted routes. */
  active?: boolean;
  /** Spring Data sort, e.g. "updatedAt,desc". */
  sort?: string;
}

/**
 * GET /api/gateway/admin/routes — paged. Scope is decided by the server from
 * the JWT: Tenant Admins only ever receive their own organization's routes.
 */
export async function listRoutes(params: RouteListParams): Promise<Page<Route>> {
  const { data } = await managementClient.get(BASE, {
    params: { page: params.page, size: params.size, active: params.active, sort: params.sort },
  });
  return normalizePage<Route>(data);
}

export async function getRoute(id: number): Promise<Route> {
  const { data } = await managementClient.get<Route>(`${BASE}/${id}`);
  return data;
}

export async function createRoute(request: RouteRequest): Promise<Route> {
  const { data } = await managementClient.post<Route>(BASE, request);
  return data;
}

export async function updateRoute(id: number, request: RouteRequest): Promise<Route> {
  const { data } = await managementClient.put<Route>(`${BASE}/${id}`, request);
  return data;
}

/** Soft delete: the route is deactivated and hidden; its version history is kept. */
export async function deleteRoute(id: number): Promise<void> {
  await managementClient.delete(`${BASE}/${id}`);
}

export async function setRouteActive(id: number, active: boolean): Promise<Route> {
  const { data } = await managementClient.patch<Route>(`${BASE}/${id}/status`, { active });
  return data;
}

export async function updateRoutePolicy(id: number, policy: RoutePolicy): Promise<Route> {
  const { data } = await managementClient.put<Route>(`${BASE}/${id}/policy`, policy);
  return data;
}

/** Newest first. */
export async function listRouteVersions(id: number): Promise<RouteVersion[]> {
  const { data } = await managementClient.get<RouteVersion[]>(`${BASE}/${id}/versions`);
  return data;
}

export async function compareRouteVersions(id: number, from: number, to: number): Promise<VersionComparison> {
  const { data } = await managementClient.get<VersionComparison>(`${BASE}/${id}/versions/compare`, { params: { from, to } });
  return data;
}

/** Applies the snapshot as a new version ("RESTORE:<n>"). */
export async function restoreRouteVersion(id: number, version: number): Promise<Route> {
  const { data } = await managementClient.post<Route>(`${BASE}/${id}/versions/${version}/restore`);
  return data;
}
