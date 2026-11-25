import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isApiError } from '@/lib/errors';
import type { OrganizationRequest, SettableOrganizationStatus, TenantAdmin, TenantAdminRequest } from '@/types/api';
import * as api from './api';

export const organizationKeys = {
  all: ['organizations'] as const,
  list: () => [...organizationKeys.all, 'list'] as const,
  detail: (id: number) => [...organizationKeys.all, 'detail', id] as const,
  tenantAdmin: (id: number) => [...organizationKeys.all, 'tenant-admin', id] as const,
};

export function useOrganizations(enabled = true) {
  return useQuery({ queryKey: organizationKeys.list(), queryFn: api.listOrganizations, enabled });
}

export function useOrganization(id: number) {
  return useQuery({ queryKey: organizationKeys.detail(id), queryFn: () => api.getOrganization(id), enabled: Number.isFinite(id) });
}

export function useCreateOrganization() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: OrganizationRequest) => api.createOrganization(request),
    onSuccess: () => client.invalidateQueries({ queryKey: organizationKeys.list() }),
  });
}

export function useUpdateOrganization(id: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: OrganizationRequest) => api.updateOrganization(id, request),
    onSuccess: (organization) => {
      client.setQueryData(organizationKeys.detail(id), organization);
      return client.invalidateQueries({ queryKey: organizationKeys.list() });
    },
  });
}

export function useChangeOrganizationStatus(id: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (status: SettableOrganizationStatus) => api.changeOrganizationStatus(id, status),
    onSuccess: (organization) => {
      client.setQueryData(organizationKeys.detail(id), organization);
      return client.invalidateQueries({ queryKey: organizationKeys.list() });
    },
  });
}

export function useDeleteOrganization(id: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.deleteOrganization(id),
    onSuccess: () => {
      client.removeQueries({ queryKey: organizationKeys.detail(id) });
      return client.invalidateQueries({ queryKey: organizationKeys.list() });
    },
  });
}

/**
 * The organization's tenant administrator, or null when it has none.
 * The backend answers 404 "Tenant administrator not found" in that case, which
 * is an expected state rather than an error.
 */
export function useTenantAdmin(organizationId: number | null) {
  return useQuery({
    queryKey: organizationKeys.tenantAdmin(organizationId ?? -1),
    enabled: organizationId != null,
    queryFn: async (): Promise<TenantAdmin | null> => {
      try {
        return await api.getTenantAdmin(organizationId as number);
      } catch (error) {
        if (isApiError(error) && error.kind === 'not_found' && /tenant administrator/i.test(error.message)) return null;
        throw error;
      }
    },
  });
}

export function useSaveTenantAdmin(organizationId: number, mode: 'create' | 'update') {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: TenantAdminRequest) =>
      mode === 'create' ? api.createTenantAdmin(organizationId, request) : api.updateTenantAdmin(organizationId, request),
    onSuccess: (admin) => client.setQueryData(organizationKeys.tenantAdmin(organizationId), admin),
  });
}

export function useDeleteTenantAdmin(organizationId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.deleteTenantAdmin(organizationId),
    onSuccess: () => client.setQueryData(organizationKeys.tenantAdmin(organizationId), null),
  });
}
