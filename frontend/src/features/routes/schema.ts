import { z } from 'zod';
import {
  APPLICATION_ROLES,
  HTTP_METHODS,
  RATE_LIMIT_SCOPES,
  type HeaderRuleRequest,
  type Route,
  type RoutePolicy,
  type RouteRequest,
} from '@/types/api';

/**
 * Client-side validation mirrors, rule for rule, the backend's bean validation
 * on RouteRequest / RoutePolicyRequest / HeaderRuleRequest and the checks in
 * RoutePolicyValidator. The server remains authoritative; these only give
 * earlier, field-level feedback.
 */

const INT_MAX = 2_147_483_647;
const SENSITIVE_HEADERS = ['authorization', 'cookie', 'set-cookie'];

export const policyFormSchema = z.object({
  authenticationRequired: z.boolean(),
  permittedRoles: z.array(z.string()),
  rateLimitEnabled: z.boolean(),
  rateLimitRequests: z.string(),
  rateLimitWindowSeconds: z.string(),
  rateLimitScope: z.string(),
  timeoutMs: z.string(),
  idempotencyEnabled: z.boolean(),
  rewriteEnabled: z.boolean(),
  rewriteTargetPrefix: z.string(),
});
export type PolicyFormValues = z.infer<typeof policyFormSchema>;

export const headerRuleFormSchema = z.object({
  direction: z.enum(['REQUEST', 'RESPONSE']),
  action: z.enum(['ADD', 'REMOVE', 'FORWARD', 'MODIFY']),
  headerName: z.string(),
  headerValue: z.string(),
});
export type HeaderRuleFormValues = z.infer<typeof headerRuleFormSchema>;

function parsePositiveInt(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const number = Number(trimmed);
  return number >= 1 && number <= INT_MAX ? number : null;
}

type Issue = { path: (string | number)[]; message: string };

export function policyIssues(policy: PolicyFormValues, allowedMethods: string[]): Issue[] {
  const issues: Issue[] = [];
  const timeout = parsePositiveInt(policy.timeoutMs);
  if (timeout == null || timeout > 300_000) {
    issues.push({ path: ['timeoutMs'], message: 'Enter a whole number of milliseconds between 1 and 300000' });
  }
  if (policy.rateLimitEnabled) {
    if (parsePositiveInt(policy.rateLimitRequests) == null) {
      issues.push({ path: ['rateLimitRequests'], message: 'Enter a whole number of requests, 1 or more' });
    }
    if (parsePositiveInt(policy.rateLimitWindowSeconds) == null) {
      issues.push({ path: ['rateLimitWindowSeconds'], message: 'Enter a whole number of seconds, 1 or more' });
    }
  }
  if (policy.rateLimitScope && !(RATE_LIMIT_SCOPES as readonly string[]).includes(policy.rateLimitScope)) {
    issues.push({ path: ['rateLimitScope'], message: 'Choose a supported scope' });
  }
  if (policy.idempotencyEnabled && !allowedMethods.some((method) => method.toUpperCase() === 'POST')) {
    issues.push({ path: ['idempotencyEnabled'], message: 'POST idempotency requires POST in the allowed methods' });
  }
  for (const role of policy.permittedRoles) {
    if (!(APPLICATION_ROLES as readonly string[]).includes(role)) {
      issues.push({ path: ['permittedRoles'], message: `Unsupported application role: ${role}` });
    }
  }
  if (policy.rewriteTargetPrefix.length > 500) {
    issues.push({ path: ['rewriteTargetPrefix'], message: 'Use 500 characters or fewer' });
  }
  return issues;
}

export function headerRuleIssues(rule: HeaderRuleFormValues): Issue[] {
  const issues: Issue[] = [];
  const name = rule.headerName.trim();
  if (!name) issues.push({ path: ['headerName'], message: 'Enter a header name' });
  else if (name.length > 200) issues.push({ path: ['headerName'], message: 'Use 200 characters or fewer' });
  else if (SENSITIVE_HEADERS.includes(name.toLowerCase())) {
    issues.push({ path: ['headerName'], message: `Sensitive headers can’t be transformed: ${name}` });
  }
  if ((rule.action === 'ADD' || rule.action === 'MODIFY') && !rule.headerValue.trim()) {
    issues.push({ path: ['headerValue'], message: 'A value is required for ADD and MODIFY rules' });
  }
  if (rule.headerValue.length > 2000) issues.push({ path: ['headerValue'], message: 'Use 2000 characters or fewer' });
  return issues;
}

/** Same acceptance as Java's URI.create + scheme/host checks in RoutePolicyValidator. */
export function targetUriIssue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Enter the upstream URI';
  if (trimmed.length > 1000) return 'Use 1000 characters or fewer';
  if (/\s/.test(trimmed)) return 'The URI can’t contain spaces';
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return 'Target URI is invalid';
  }
  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || !url.hostname) {
    return 'Target URI must be an absolute HTTP or HTTPS URI';
  }
  return null;
}

export const routeFormSchema = z
  .object({
    routeId: z.string().trim().min(1, 'Enter a route ID').max(100, 'Use 100 characters or fewer'),
    name: z.string().trim().min(1, 'Enter a name').max(200, 'Use 200 characters or fewer'),
    description: z.string().max(1000, 'Use 1000 characters or fewer'),
    pathPattern: z
      .string()
      .trim()
      .min(1, 'Enter a path pattern')
      .max(500, 'Use 500 characters or fewer')
      .refine((value) => value.startsWith('/'), 'Path pattern must start with “/”'),
    targetUri: z.string(),
    stripPrefix: z.boolean(),
    allowedMethods: z.array(z.string()).min(1, 'Choose at least one HTTP method'),
    active: z.boolean(),
    policy: policyFormSchema,
    headerRules: z.array(headerRuleFormSchema),
  })
  .superRefine((values, ctx) => {
    const uriIssue = targetUriIssue(values.targetUri);
    if (uriIssue) ctx.addIssue({ code: 'custom', path: ['targetUri'], message: uriIssue });
    for (const method of values.allowedMethods) {
      if (!(HTTP_METHODS as readonly string[]).includes(method.toUpperCase())) {
        ctx.addIssue({ code: 'custom', path: ['allowedMethods'], message: `Invalid HTTP method: ${method}` });
      }
    }
    for (const issue of policyIssues(values.policy, values.allowedMethods)) {
      ctx.addIssue({ code: 'custom', path: ['policy', ...issue.path], message: issue.message });
    }
    values.headerRules.forEach((rule, index) => {
      for (const issue of headerRuleIssues(rule)) {
        ctx.addIssue({ code: 'custom', path: ['headerRules', index, ...issue.path], message: issue.message });
      }
    });
  });
export type RouteFormValues = z.infer<typeof routeFormSchema>;

/** Policy-only edit (PUT /{id}/policy): validated against the route's current methods. */
export function makePolicyOnlySchema(allowedMethods: string[]) {
  return z.object({ policy: policyFormSchema }).superRefine((values, ctx) => {
    for (const issue of policyIssues(values.policy, allowedMethods)) {
      ctx.addIssue({ code: 'custom', path: ['policy', ...issue.path], message: issue.message });
    }
  });
}
export type PolicyOnlyFormValues = { policy: PolicyFormValues };

// ---------- defaults and conversions ----------

export const DEFAULT_POLICY_FORM: PolicyFormValues = {
  authenticationRequired: true,
  permittedRoles: [],
  rateLimitEnabled: false,
  rateLimitRequests: '100',
  rateLimitWindowSeconds: '60',
  rateLimitScope: 'ROUTE',
  timeoutMs: '30000',
  idempotencyEnabled: false,
  rewriteEnabled: false,
  rewriteTargetPrefix: '',
};

export const DEFAULT_ROUTE_FORM: RouteFormValues = {
  routeId: '',
  name: '',
  description: '',
  pathPattern: '',
  targetUri: '',
  stripPrefix: true,
  allowedMethods: ['GET'],
  active: false,
  policy: DEFAULT_POLICY_FORM,
  headerRules: [],
};

export function policyToForm(policy: RoutePolicy | null | undefined): PolicyFormValues {
  if (!policy) return { ...DEFAULT_POLICY_FORM };
  return {
    authenticationRequired: policy.authenticationRequired,
    permittedRoles: [...(policy.permittedRoles ?? [])].sort(),
    rateLimitEnabled: policy.rateLimitEnabled,
    rateLimitRequests: policy.rateLimitRequests != null ? String(policy.rateLimitRequests) : '',
    rateLimitWindowSeconds: policy.rateLimitWindowSeconds != null ? String(policy.rateLimitWindowSeconds) : '',
    rateLimitScope: policy.rateLimitScope ?? '',
    timeoutMs: String(policy.timeoutMs),
    idempotencyEnabled: policy.idempotencyEnabled,
    rewriteEnabled: policy.rewriteEnabled,
    rewriteTargetPrefix: policy.rewriteTargetPrefix ?? '',
  };
}

export function formToPolicy(values: PolicyFormValues): RoutePolicy {
  const requests = parsePositiveInt(values.rateLimitRequests);
  const window = parsePositiveInt(values.rateLimitWindowSeconds);
  return {
    authenticationRequired: values.authenticationRequired,
    permittedRoles: [...values.permittedRoles],
    rateLimitEnabled: values.rateLimitEnabled,
    // Backend applies @Min(1) even when rate limiting is off, so invalid or
    // empty values are sent as null rather than rejected.
    rateLimitRequests: requests,
    rateLimitWindowSeconds: window,
    rateLimitScope: values.rateLimitScope || null,
    timeoutMs: Number(values.timeoutMs.trim()),
    idempotencyEnabled: values.idempotencyEnabled,
    rewriteEnabled: values.rewriteEnabled,
    rewriteTargetPrefix: values.rewriteTargetPrefix.trim() || null,
  };
}

export function routeToForm(route: Route): RouteFormValues {
  return {
    routeId: route.routeId,
    name: route.name,
    description: route.description ?? '',
    pathPattern: route.pathPattern,
    targetUri: route.targetUri,
    stripPrefix: route.stripPrefix,
    allowedMethods: [...route.allowedMethods].map((method) => method.toUpperCase()),
    active: route.active,
    policy: policyToForm(route.policy),
    headerRules: route.headerRules.map((rule) => ({
      direction: rule.direction,
      action: rule.action,
      headerName: rule.headerName,
      headerValue: rule.headerValue ?? '',
    })),
  };
}

/**
 * Build the RouteRequest body. The console never sends `organizationId`:
 * only Tenant Admins write routes here, and the server derives their
 * organization from the JWT (never from client input).
 */
export function formToRouteRequest(values: RouteFormValues): RouteRequest {
  const methodOrder = HTTP_METHODS as readonly string[];
  const request: RouteRequest = {
    routeId: values.routeId.trim(),
    name: values.name.trim(),
    description: values.description.trim() || null,
    pathPattern: values.pathPattern.trim(),
    targetUri: values.targetUri.trim(),
    stripPrefix: values.stripPrefix,
    allowedMethods: [...new Set(values.allowedMethods.map((m) => m.toUpperCase()))].sort((a, b) => methodOrder.indexOf(a) - methodOrder.indexOf(b)),
    active: values.active,
    policy: formToPolicy(values.policy),
    headerRules: values.headerRules.map(
      (rule): HeaderRuleRequest => ({
        direction: rule.direction,
        action: rule.action,
        headerName: rule.headerName.trim(),
        headerValue: rule.headerValue.trim() ? rule.headerValue : null,
      }),
    ),
  };
  return request;
}
