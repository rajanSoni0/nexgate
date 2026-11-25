import { isAxiosError } from 'axios';
import { SERVICES, UPSTREAM_UNAVAILABLE_HEADER, type ServiceKey } from '@/config/services';
import type { ApiErrorBody } from '@/types/api';

export type ApiErrorKind =
  | 'network'
  | 'unavailable'
  | 'unauthorized'
  | 'forbidden'
  | 'validation'
  | 'not_found'
  | 'conflict'
  | 'server'
  | 'unknown';

/** A single, consistent error type for every request the console makes. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly service: ServiceKey;
  readonly path?: string;
  /** True when the message came from the backend's ApiErrorResponse. */
  readonly fromServer: boolean;

  constructor(init: {
    kind: ApiErrorKind;
    message: string;
    service: ServiceKey;
    status?: number;
    path?: string;
    fromServer?: boolean;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.kind = init.kind;
    this.status = init.status;
    this.service = init.service;
    this.path = init.path;
    this.fromServer = init.fromServer ?? false;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 400 || status === 422) return 'validation';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status >= 500) return 'server';
  return 'unknown';
}

function defaultMessage(kind: ApiErrorKind, service: ServiceKey, status?: number): string {
  const label = SERVICES[service].label;
  switch (kind) {
    case 'network':
      return `Can’t reach the ${label} service. Check that the console’s dev server is running and the service is up.`;
    case 'unavailable':
      return `The ${label} service isn’t accepting connections.`;
    case 'unauthorized':
      return service === 'management'
        ? 'Your session is no longer valid. Sign in again.'
        : `The ${label} service rejected this session.`;
    case 'forbidden':
      return 'Your role does not have permission for this action.';
    case 'validation':
      return 'The server rejected the request as invalid.';
    case 'not_found':
      return 'The requested resource was not found.';
    case 'conflict':
      return 'The request conflicts with existing data.';
    case 'server':
      return `The ${label} service returned an error${status ? ` (HTTP ${status})` : ''}.`;
    default:
      return `Unexpected response from the ${label} service${status ? ` (HTTP ${status})` : ''}.`;
  }
}

function readServerMessage(data: unknown): { message?: string; path?: string } {
  if (!data || typeof data !== 'object') return {};
  const body = data as ApiErrorBody;
  const message = typeof body.message === 'string' && body.message.trim() ? body.message.trim() : undefined;
  return { message, path: typeof body.path === 'string' ? body.path : undefined };
}

/** Convert anything thrown by axios (or elsewhere) into an ApiError. */
export function normalizeError(error: unknown, service: ServiceKey): ApiError {
  if (isApiError(error)) return error;

  if (isAxiosError(error)) {
    const response = error.response;
    if (!response) {
      return new ApiError({ kind: 'network', service, message: defaultMessage('network', service) });
    }
    const status = response.status;
    const proxyUnavailable = response.headers?.[UPSTREAM_UNAVAILABLE_HEADER] === 'upstream-unavailable';
    const kind: ApiErrorKind = proxyUnavailable ? 'unavailable' : kindForStatus(status);
    const server = proxyUnavailable ? {} : readServerMessage(response.data);
    // The backend's catch-all handler hides details behind a generic 500
    // message; prefer our own wording in that case.
    const useServer = Boolean(server.message) && kind !== 'server' && !(kind === 'unauthorized' && service !== 'management');
    return new ApiError({
      kind,
      service,
      status,
      path: server.path,
      fromServer: useServer,
      message: useServer ? (server.message as string) : defaultMessage(kind, service, status),
    });
  }

  return new ApiError({
    kind: 'unknown',
    service,
    message: error instanceof Error ? error.message : 'Something went wrong.',
  });
}

/** Short title for an error, for headings in error states. */
export function errorTitle(error: ApiError): string {
  switch (error.kind) {
    case 'network':
      return 'Connection failed';
    case 'unavailable':
      return 'Service unavailable';
    case 'unauthorized':
      return error.service === 'management' ? 'Session expired' : 'Access rejected by service';
    case 'forbidden':
      return 'Not permitted';
    case 'validation':
      return 'Invalid request';
    case 'not_found':
      return 'Not found';
    case 'conflict':
      return 'Conflict';
    case 'server':
      return 'Server error';
    default:
      return 'Something went wrong';
  }
}
