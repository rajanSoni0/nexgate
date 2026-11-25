import { managementClient } from '@/lib/http';
import type { Organization, OrganizationRequest, SettableOrganizationStatus, TenantAdmin, TenantAdminRequest } from '@/types/api';

const BASE = '/api/platform/organizations';

/** GET /api/platform/organizations — all non-deleted organizations (unpaged). PLATFORM_ADMIN only. */
export async function listOrganizations(): Promise<Organization[]> {
  const { data } = await managementClient.get<Organization[]>(BASE);
  return data;
}

export async function getOrganization(id: number): Promise<Organization> {
  const { data } = await managementClient.get<Organization>(`${BASE}/${id}`);
  return data;
}

/** New organizations are always created as PENDING by the backend. */
export async function createOrganization(request: OrganizationRequest): Promise<Organization> {
  const { data } = await managementClient.post<Organization>(BASE, request);
  return data;
}

export async function updateOrganization(id: number, request: OrganizationRequest): Promise<Organization> {
  const { data } = await managementClient.put<Organization>(`${BASE}/${id}`, request);
  return data;
}

export async function changeOrganizationStatus(id: number, status: SettableOrganizationStatus): Promise<Organization> {
  const { data } = await managementClient.patch<Organization>(`${BASE}/${id}/status`, { status });
  return data;
}

/** Soft delete (status becomes DELETED; the organization disappears from listings). */
export async function deleteOrganization(id: number): Promise<void> {
  await managementClient.delete(`${BASE}/${id}`);
}

/** GET .../{id}/tenant-admin — 404 when the organization has none. */
export async function getTenantAdmin(organizationId: number): Promise<TenantAdmin> {
  const { data } = await managementClient.get<TenantAdmin>(`${BASE}/${organizationId}/tenant-admin`);
  return data;
}

export async function createTenantAdmin(organizationId: number, request: TenantAdminRequest): Promise<TenantAdmin> {
  const { data } = await managementClient.post<TenantAdmin>(`${BASE}/${organizationId}/tenant-admin`, request);
  return data;
}

/** Always replaces the password: the backend requires one on every update. */
export async function updateTenantAdmin(organizationId: number, request: TenantAdminRequest): Promise<TenantAdmin> {
  const { data } = await managementClient.put<TenantAdmin>(`${BASE}/${organizationId}/tenant-admin`, request);
  return data;
}

/** Hard delete of the tenant administrator account. */
export async function deleteTenantAdmin(organizationId: number): Promise<void> {
  await managementClient.delete(`${BASE}/${organizationId}/tenant-admin`);
}
