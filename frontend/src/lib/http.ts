import axios, { type AxiosInstance } from 'axios';
import { SERVICES, type ServiceKey } from '@/config/services';
import { normalizeError } from './errors';
import { sessionStore } from './session';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Do not attach the session token (e.g. the login call itself). */
    skipAuth?: boolean;
  }
}

interface ClientOptions {
  /** Attach the console session's bearer token. */
  attachToken: boolean;
  /**
   * A 401 from this service means the session itself is invalid (only true for
   * api-management-service, which issued the token). A 401 from any other
   * service must NOT sign the user out.
   */
  sessionAuthority: boolean;
}

export function createServiceClient(service: ServiceKey, options: ClientOptions): AxiosInstance {
  const client = axios.create({
    baseURL: SERVICES[service].base,
    timeout: 15000,
    headers: {
      Accept: 'application/json',
      // Makes Spring Security answer 401 instead of redirecting to a login page.
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  client.interceptors.request.use((config) => {
    if (options.attachToken && !config.skipAuth) {
      const token = sessionStore.token();
      if (token) config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const apiError = normalizeError(error, service);
      const sentToken = Boolean(error?.config?.headers?.Authorization);
      if (options.sessionAuthority && apiError.kind === 'unauthorized' && sentToken) {
        sessionStore.end('invalid');
      }
      return Promise.reject(apiError);
    },
  );

  return client;
}

export const managementClient = createServiceClient('management', { attachToken: true, sessionAuthority: true });
export const analyticsClient = createServiceClient('analytics', { attachToken: true, sessionAuthority: false });
