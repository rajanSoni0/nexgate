/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';

/**
 * Every backend service is reached through a same-origin proxy prefix, because
 * no NexGate service configures CORS. The VITE_*_API_URL variables only choose
 * the proxy targets; the browser never talks to the services directly.
 */
const SERVICES = {
  management: { env: 'VITE_MANAGEMENT_API_URL', fallback: 'http://localhost:8081' },
  gateway: { env: 'VITE_GATEWAY_API_URL', fallback: 'http://localhost:8080' },
  analytics: { env: 'VITE_ANALYTICS_API_URL', fallback: 'http://localhost:8084' },
  catalog: { env: 'VITE_CATALOG_API_URL', fallback: 'http://localhost:8082' },
  order: { env: 'VITE_ORDER_API_URL', fallback: 'http://localhost:8083' },
} as const;

/** Header the proxy adds when the upstream service refused or dropped the connection. */
export const UPSTREAM_UNAVAILABLE_HEADER = 'x-nexgate-proxy';

function serviceProxy(name: string, target: string): ProxyOptions {
  const prefix = `/proxy/${name}`;
  return {
    target,
    changeOrigin: true,
    rewrite: (path) => path.slice(prefix.length) || '/',
    configure: (proxy) => {
      // Registered before Vite's own handler, so this response wins. It turns
      // ECONNREFUSED and similar into an explicit, machine-readable 502 instead
      // of an anonymous 500, letting the UI show "Unavailable" accurately.
      proxy.on('error', (error: NodeJS.ErrnoException, _req: IncomingMessage, res: unknown) => {
        const response = res as ServerResponse;
        if (!response || typeof response.writeHead !== 'function' || response.headersSent) return;
        response.writeHead(502, {
          'Content-Type': 'application/json',
          [UPSTREAM_UNAVAILABLE_HEADER]: 'upstream-unavailable',
        });
        response.end(
          JSON.stringify({
            status: 502,
            error: 'Upstream unavailable',
            message: `The ${name} service did not accept the connection (${error.code ?? 'connection error'}).`,
          }),
        );
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const proxy = Object.fromEntries(
    Object.entries(SERVICES).map(([name, { env: key, fallback }]) => [
      `/proxy/${name}`,
      serviceProxy(name, env[key] || fallback),
    ]),
  );

  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { port: 5173, strictPort: false, proxy },
    preview: { port: 4173, proxy },
    build: { sourcemap: false, chunkSizeWarningLimit: 900 },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      restoreMocks: true,
    },
  };
});
