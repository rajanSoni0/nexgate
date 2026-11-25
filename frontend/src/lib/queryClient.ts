import { QueryClient } from '@tanstack/react-query';
import { isApiError } from './errors';

/** Retry only failures that a retry could plausibly fix. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (!isApiError(error)) return failureCount < 1;
  return ['network', 'unavailable', 'server'].includes(error.kind) && failureCount < 1;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
}
