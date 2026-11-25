import { managementClient } from '@/lib/http';
import type { LoginRequest, LoginResponse } from '@/types/api';

/** POST /api/auth/login (public). The only authentication endpoint the backend exposes. */
export async function login(request: LoginRequest): Promise<LoginResponse> {
  const { data } = await managementClient.post<LoginResponse>('/api/auth/login', request, { skipAuth: true });
  return data;
}
