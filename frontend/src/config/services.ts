/**
 * Same-origin proxy prefixes (see vite.config.ts). The browser never calls a
 * backend port directly; the Vite dev/preview server forwards these.
 */
export const SERVICES = {
  management: { label: 'API Management', base: '/proxy/management', upstream: import.meta.env.VITE_MANAGEMENT_API_URL },
  gateway: { label: 'Smart Gateway', base: '/proxy/gateway', upstream: import.meta.env.VITE_GATEWAY_API_URL },
  analytics: { label: 'Analytics', base: '/proxy/analytics', upstream: import.meta.env.VITE_ANALYTICS_API_URL },
  catalog: { label: 'Catalog', base: '/proxy/catalog', upstream: import.meta.env.VITE_CATALOG_API_URL },
  order: { label: 'Order', base: '/proxy/order', upstream: import.meta.env.VITE_ORDER_API_URL },
} as const;

export type ServiceKey = keyof typeof SERVICES;

/** Must match UPSTREAM_UNAVAILABLE_HEADER in vite.config.ts. */
export const UPSTREAM_UNAVAILABLE_HEADER = 'x-nexgate-proxy';
