import axios, { AxiosError, AxiosHeaders, type AxiosAdapter, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { analyticsClient, managementClient } from '@/lib/http';

export interface Reply {
  status: number;
  data?: unknown;
  headers?: Record<string, string>;
}

export type Handler = Reply | 'network' | ((config: InternalAxiosRequestConfig) => Reply | 'network' | Promise<Reply | 'network'>);

export interface RecordedCall {
  method: string;
  url: string;
  params?: unknown;
  body?: unknown;
  authorization?: string;
  client: string;
}

/**
 * Replaces axios's transport (not axios itself), so the real interceptors,
 * error normalization and session handling run in tests. Handlers are keyed
 * "METHOD /path" relative to the client's base URL; unmatched requests 404.
 */
export function mockHttp(handlers: Record<string, Handler>) {
  const calls: RecordedCall[] = [];

  function adapterFor(client: string): AxiosAdapter {
    return async (config) => {
      const method = (config.method ?? 'get').toUpperCase();
      const url = config.url ?? '';
      const headers = AxiosHeaders.from(config.headers);
      calls.push({
        method,
        url,
        params: config.params,
        body: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
        authorization: headers.get('Authorization') as string | undefined,
        client,
      });
      const handler = handlers[`${method} ${url}`] ?? { status: 404, data: { status: 404, error: 'Not Found', message: `No mock for ${method} ${url}` } };
      const reply = typeof handler === 'function' ? await handler(config) : handler;
      if (reply === 'network') {
        throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
      }
      const response = {
        data: reply.data ?? '',
        status: reply.status,
        statusText: String(reply.status),
        headers: AxiosHeaders.from(reply.headers ?? {}),
        config,
        request: {},
      };
      const valid = config.validateStatus ? config.validateStatus(reply.status) : reply.status < 400;
      if (!valid) {
        throw new AxiosError(`Request failed with status code ${reply.status}`, AxiosError.ERR_BAD_RESPONSE, config, {}, response);
      }
      return response;
    };
  }

  const targets: Array<[AxiosInstance, string]> = [
    [managementClient, 'management'],
    [analyticsClient, 'analytics'],
    [axios as unknown as AxiosInstance, 'raw'],
  ];
  for (const [instance, name] of targets) instance.defaults.adapter = adapterFor(name);

  return {
    calls,
    callsTo: (method: string, url: string) => calls.filter((call) => call.method === method && call.url === url),
  };
}
