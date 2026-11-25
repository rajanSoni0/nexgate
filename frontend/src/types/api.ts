/**
 * Types mirror the backend DTOs exactly (api-management-service and
 * analytics-service, commit 42751c0). Field names and nullability follow the
 * Java records/classes; LocalDateTime values arrive as ISO strings without zone.
 */

export type Role = 'PLATFORM_ADMIN' | 'TENANT_ADMIN' | 'GATEWAY_SERVICE';
export type ConsoleRole = Exclude<Role, 'GATEWAY_SERVICE'>;

/** POST /api/auth/login — LoginRequest */
export interface LoginRequest {
  username: string;
  password: string;
}

/** LoginResponse */
export interface LoginResponse {
  token: string;
  tokenType: string;
  expiresInSeconds: number;
  role: string;
  organizationId: number | null;
}

/** ApiErrorResponse (GlobalExceptionHandler) */
export interface ApiErrorBody {
  timestamp?: string;
  status?: number;
  error?: string;
  message?: string;
  path?: string;
}

export type OrganizationStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DELETED';
/** Statuses settable through PATCH /{id}/status (DELETED is rejected there). */
export type SettableOrganizationStatus = Exclude<OrganizationStatus, 'DELETED'>;

/** OrganizationResponse */
export interface Organization {
  id: number;
  name: string;
  slug: string;
  status: OrganizationStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

/** OrganizationRequest */
export interface OrganizationRequest {
  name: string;
  slug: string;
}

/** TenantAdminResponse */
export interface TenantAdmin {
  id: number;
  organizationId: number;
  username: string;
  enabled: boolean;
}

/** TenantAdminRequest — password is mandatory on create AND update (backend @NotBlank @Size(min=8)). */
export interface TenantAdminRequest {
  username: string;
  password: string;
  enabled: boolean;
}

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

/** RoutePolicyValidator.APPLICATION_ROLES */
export const APPLICATION_ROLES = ['PLATFORM_ADMIN', 'TENANT_ADMIN', 'GATEWAY_SERVICE', 'USER', 'ADMIN'] as const;

/** Scopes understood by the gateway's RedisRateLimiter (unknown values fall back to ROUTE). */
export const RATE_LIMIT_SCOPES = ['ROUTE', 'USER', 'TENANT', 'IP'] as const;

export type HeaderRuleDirection = 'REQUEST' | 'RESPONSE';
export type HeaderRuleAction = 'ADD' | 'REMOVE' | 'FORWARD' | 'MODIFY';

/** HeaderRuleRequest */
export interface HeaderRuleRequest {
  direction: HeaderRuleDirection;
  action: HeaderRuleAction;
  headerName: string;
  headerValue: string | null;
}

/** HeaderRuleResponse */
export interface HeaderRule extends HeaderRuleRequest {
  id: number;
}

/** RoutePolicyRequest / RoutePolicyResponse (same shape) */
export interface RoutePolicy {
  authenticationRequired: boolean;
  permittedRoles: string[];
  rateLimitEnabled: boolean;
  rateLimitRequests: number | null;
  rateLimitWindowSeconds: number | null;
  rateLimitScope: string | null;
  timeoutMs: number;
  idempotencyEnabled: boolean;
  rewriteEnabled: boolean;
  rewriteTargetPrefix: string | null;
}

/** RouteResponse */
export interface Route {
  id: number;
  organizationId: number;
  routeId: string;
  name: string;
  description: string | null;
  pathPattern: string;
  targetUri: string;
  stripPrefix: boolean;
  allowedMethods: string[];
  active: boolean;
  deleted: boolean;
  configurationVersion: number;
  policy: RoutePolicy | null;
  headerRules: HeaderRule[];
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * RouteRequest. `organizationId` is only ever sent by a Platform Admin; the
 * console never sends it for Tenant Admins (the server derives it from the JWT).
 * `policy` must always be present: the backend validator dereferences it.
 */
export interface RouteRequest {
  organizationId?: number | null;
  routeId: string;
  name: string;
  description: string | null;
  pathPattern: string;
  targetUri: string;
  stripPrefix: boolean;
  allowedMethods: string[];
  active: boolean;
  policy: RoutePolicy;
  headerRules: HeaderRuleRequest[];
}

/** RouteVersionResponse — configurationSnapshot is a JSON-serialized RouteRequest. */
export interface RouteVersion {
  id: number;
  routeId: string;
  versionNumber: number;
  changeType: string;
  configurationSnapshot: string;
  createdBy: string;
  createdAt: string | null;
}

/** RouteVersionFieldDifference */
export interface VersionDifference {
  field: string;
  from: unknown;
  to: unknown;
}

/** RouteVersionComparisonResponse */
export interface VersionComparison {
  fromVersion: number;
  toVersion: number;
  differences: VersionDifference[];
}

/** Normalized Spring Data page (see lib/page.ts). */
export interface Page<T> {
  items: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

/** analytics-service AnalyticsSummaryResponse */
export interface AnalyticsSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTimeMs: number;
}

/** analytics-service RouteStatisticsResponse */
export interface RouteStatistics {
  routeId: string;
  routePath: string;
  requestCount: number;
  averageResponseTimeMs: number;
}

/** analytics-service CountResponse */
export interface CountResponse {
  total: number;
}

/** GET /health on api-management-service (public) — HealthResponse */
export interface ManagementHealth {
  serviceStatus: string;
  dbStatus: string;
  timestamp: string | null;
}
