# NexGate Console

The administration frontend for NexGate, the custom API gateway and API management platform in this repository. It gives platform administrators and tenant administrators a console over the existing Spring Boot services, without changing any of them.

Built against backend commit `42751c0`. Every screen uses only endpoints that exist at that commit; where the backend has no endpoint, the console says so instead of showing placeholder data.

## Requirements

- Node.js `^20.19.0` or `>=22.12.0` (Vite 8 requirement), npm 10+
- The NexGate backend running locally (`docker compose up --build` from the repository root, or the services started individually)

## Quick start

```powershell
cd nexgate-frontend
npm ci
Copy-Item .env.example .env.local   # only needed if your service ports differ
npm run dev
```

Open http://localhost:5173 and sign in with an administrator account. The console never ships credentials; use the accounts your backend provides.

| Command | What it does |
|---|---|
| `npm run dev` | Development server with the backend proxy (port 5173) |
| `npm run build` | Type-check (`tsc -b`) and production build into `dist/` |
| `npm run preview` | Serve `dist/` with the same proxy (port 4173) |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run typecheck` | Type-check only |

## How the console reaches the backend

No NexGate service configures CORS, and the backend must not be changed. The console therefore calls same-origin paths, and the Vite dev and preview servers proxy them:

| Console path | Proxied to (default) | Variable |
|---|---|---|
| `/proxy/management/**` | `http://localhost:8081` | `VITE_MANAGEMENT_API_URL` |
| `/proxy/gateway/**` | `http://localhost:8080` | `VITE_GATEWAY_API_URL` |
| `/proxy/analytics/**` | `http://localhost:8084` | `VITE_ANALYTICS_API_URL` |
| `/proxy/catalog/**` | `http://localhost:8082` | `VITE_CATALOG_API_URL` |
| `/proxy/order/**` | `http://localhost:8083` | `VITE_ORDER_API_URL` |

`VITE_ORDER_API_URL` was added because order-service health has to be checked too. When an upstream refuses the connection, the proxy answers `502` with the header `x-nexgate-proxy: upstream-unavailable`, which the console shows as **Unavailable** instead of a generic error.

As agreed, deployment is the Vite dev server only. `npm run preview` also works because it reuses the proxy. Serving `dist/` from any other web server would need an equivalent reverse proxy, or CORS on the backend, which this project does not change.

## Authentication and sessions

- **Login:** `POST /api/auth/login` returns an HS256 JWT with `sub`, `role`, `iat`, `exp`, an optional `organizationId`, and issuer `gatekeeper-api-management`. The default lifetime is 3600 s (`NEXGATE_JWT_EXPIRATION_SECONDS`).
- **No refresh:** the backend has no refresh-token endpoint. As agreed, the token is kept in `sessionStorage` only: it survives a reload, is cleared when the tab closes, and is never logged or rendered.
- **Expiry:** the console warns 2 minutes before the token's `exp` and signs the user out at `exp`. A 401 from API Management also ends the session.
- **401 from other services:** a 401 from any other service, such as Analytics, does **not** end the session.
- **Token scope:** the token is attached only to API Management and Analytics requests. It is never sent to the gateway, catalog or order services.
- **Role checks at login:** `GATEWAY_SERVICE` logins are refused by the console and the token is discarded. Only `PLATFORM_ADMIN` and `TENANT_ADMIN` get a dashboard.
- **Authorization:** role checks in the UI only decide what to render. Spring Security in api-management-service remains the authorization boundary. The console never sends an `organizationId` when writing routes; the server derives the tenant from the JWT.

## What each role can do

**Platform admin** (`/platform`):
- Platform overview.
- Organizations: list, search, filter, create, edit, change status, delete.
- Tenant administrators: create, view, edit, activate/deactivate, delete.
- Read-only route oversight across organizations, with version comparison.
- Platform analytics.
- Service and infrastructure health.
- Audit log and settings pages (see limitations).

**Tenant admin** (`/tenant`):
- Overview.
- Route management: create, edit, activate/deactivate, delete.
- Policies: authentication, roles, rate limits, timeout, idempotency, rewriting, header rules.
- Version history with compare and restore.
- Organization details (limited; see below).
- Analytics pages are intentionally withheld (see below).

## Backend APIs integrated

| Endpoint | Used for |
|---|---|
| `POST /api/auth/login` | Sign-in |
| `GET/POST /api/platform/organizations` | Organization list, create |
| `GET/PUT/DELETE /api/platform/organizations/{id}` | Organization detail, edit, soft delete |
| `PATCH /api/platform/organizations/{id}/status` | Activate, suspend, set pending |
| `GET/POST/PUT/DELETE /api/platform/organizations/{id}/tenant-admin` | Tenant administrator management |
| `GET/POST /api/gateway/admin/routes` | Paged route list (`page`, `size`, `sort`, `active`), create |
| `GET/PUT/DELETE /api/gateway/admin/routes/{id}` | Route detail, edit, soft delete |
| `PATCH /api/gateway/admin/routes/{id}/status` | Activate or deactivate |
| `PUT /api/gateway/admin/routes/{id}/policy` | Policy-only edit |
| `GET /api/gateway/admin/routes/{id}/versions` | Version history |
| `GET /api/gateway/admin/routes/{id}/versions/compare?from&to` | Version comparison |
| `POST /api/gateway/admin/routes/{id}/versions/{v}/restore` | Restore |
| `GET /api/analytics/summary`, `/routes`, `/slow-routes?limit`, `/rate-limit-rejections`, `/idempotency-replays` | Platform analytics |
| `GET /health` (api-management, public) | MySQL status via `dbStatus` |
| `GET /actuator/health` on all five applications | Service health |

Not used on purpose: `GET /api/gateway/routes` (GATEWAY_SERVICE only) and `GET /api/gateway/admin/routes/{id}/versions/{v}`, because the history list already includes each snapshot.

## Missing or unsupported backend capabilities

| Wanted | Why it isn't available | What the console does |
|---|---|---|
| Working analytics | analytics-service has Spring Security but no JWT configuration, so every caller gets 401 (verified: 401 with and without a Platform Admin token) | Calls the real endpoints and shows one clear "rejected by service" message. Stops polling after a 401. The session is unaffected. Data appears automatically once the backend accepts the token. |
| Tenant analytics | Analytics endpoints have no organization filter. Showing platform totals would leak other tenants' traffic, and `routeId` is only unique within an organization. | Tenant analytics pages make **no** analytics requests and explain why (agreed decision). |
| Time ranges (15 min to 30 d, custom), timelines, latency trends, status-code distribution, top organizations, recent or failed request lists | No endpoint accepts time parameters or returns events or groupings | Listed as unavailable on the analytics pages. No time filter is shown. |
| Organization analytics | No grouping by organization | Unavailable notice |
| Audit logs | Records are written to `control_plane_audit_records` (route operations only), but no endpoint reads them | Explains what is recorded. No table is shown. |
| Tenant admin list | No list endpoint; one request per organization would be needed | Organization selector, one organization at a time (agreed decision) |
| Tenant reading own organization | All organization endpoints are under `/api/platform/**`, and there are no `/api/tenant/**` endpoints | Shows the organization ID and username from the session only |
| Route search | List endpoint supports only `active`, paging and sorting | The filter box narrows the current page and says so |
| Cross-route version feed | Versions exist per route only | Index of routes ordered by last change, linking to each history |
| Platform settings | No endpoint | Settings page holds console preferences only |
| Token refresh | No endpoint | Expiry warning, then sign-out |

## Known limitations and backend observations

1. **Smart Gateway startup dependency.** `RouteStartupLoader` logs in to API Management at `http://api-management:8081` during startup. On `ConnectException` it exits with *"Management route loading failed; refusing to start"*. Compose's `depends_on: service_started` does not wait for API Management to be ready, so the gateway can exit when it starts first. The console shows the gateway as **Unavailable** with this explanation. No backend or Compose files were changed.
2. **Gateway and analytics health need credentials the console can't supply.** Both services include Spring Security without configuration, so `/actuator/health` answers 401 when they run. The console shows **Unknown** in that case, never Healthy.
3. **Redis, MongoDB and Kafka health are not observable.** `management.endpoint.health.show-details` is off everywhere and no service reports these components. They show **Unknown** with the reason. A running container is not treated as healthy.
4. **Tenant administrator updates always replace the password.** `TenantAdminRequest.password` is `@NotBlank @Size(min = 8)` on updates too. Every edit, activation or deactivation therefore needs a new password. The console states this up front and requires an explicit confirmation checkbox.
5. **Authorization FORWARD rules can't be created.** The repository README says Authorization forwarding requires a `FORWARD` rule for `Authorization`, but `RoutePolicyValidator` rejects any header rule naming `Authorization`, `Cookie` or `Set-Cookie`. The console follows the validator and explains the restriction in the header editor.
6. **Route `policy` must never be null.** `RoutePolicyValidator` dereferences it, so a missing policy causes a 500. The console always sends a complete policy.
7. **Authenticated routes with no permitted roles reject everyone.** The gateway returns 403 for every request to such a route, and API Management allows saving it. The console warns about this but does not block it, matching the backend.
8. **Rate-limit values when disabled.** `@Min(1)` applies even when rate limiting is off, so the console sends `null` for empty or invalid values in that case.
9. **Organization delete is soft and has no undelete endpoint.** The console requires typing the slug to confirm. Route delete is also soft, and its version history is kept.
10. **Fonts.** IBM Plex Sans and Mono load from Google Fonts, with system fallbacks when offline.
11. **Test output.** One Recharts warning ("width(0) and height(0)") appears in the test log because jsdom has no layout. It does not occur in browsers.
12. **npm.** Installing from `package-lock.json` with `npm ci` works cleanly. Some npm 10 versions hit an internal error (`Cannot read properties of null (reading 'edgesOut')`) when adding new packages alongside Vitest; if that happens, retry with `--legacy-peer-deps`.

## Project structure

```text
nexgate-frontend/
├── docs/INTEGRATION_CHECKLIST.md   Live backend verification steps
├── src/
│   ├── components/
│   │   ├── layout/                 App shell, sidebar, role navigation, brand
│   │   └── ui/                     Buttons, forms, dialogs, tables, tabs, toasts, states
│   ├── config/services.ts          Proxy prefixes per backend service
│   ├── features/
│   │   ├── auth/                   Login, AuthProvider (expiry timers), role guards
│   │   ├── organizations/          List, detail, form, status
│   │   ├── tenant-admins/          Selector page, panel, password-replacement dialog
│   │   ├── routes/                 List, detail, pipeline view, form, policies, versions
│   │   ├── analytics/              Platform analytics, unavailable notices
│   │   ├── monitoring/             Health probes and classification
│   │   ├── overview/               Platform and tenant overviews
│   │   ├── admin/                  Audit logs, settings
│   │   └── profile/                Profile, tenant organization page
│   ├── lib/                        HTTP clients, errors, session, JWT, paging, formatting
│   ├── test/                       Test adapter, fixtures, render helpers
│   ├── theme/                      Light/dark theme provider
│   ├── types/api.ts                Types mirroring the backend DTOs
│   └── routes.tsx                  Route table
├── .env.example
└── vite.config.ts                  Proxy, build and test configuration
```

## Stack

React 19, TypeScript 5.9, Vite 8, Tailwind CSS 4, React Router 7, TanStack Query 5, Axios, React Hook Form with Zod 4, Recharts 3, Lucide icons, Vitest 5 and React Testing Library. Versions are pinned exactly in `package.json`. Each was released at least two weeks before it was chosen, and `npm audit` reported no known vulnerabilities at that time.

## Testing

`npm test` runs 86 tests in 12 files. They replace only axios's transport, so the real interceptors, error handling and session logic run under test. Covered:

- **Authentication:** login for both roles, the GATEWAY_SERVICE refusal, 401 and 403 messages, network failure, session invalidation, the expiry warning, sign-out, and a check that the token is never written to the console.
- **Access control:** protected routes and role-specific navigation.
- **Validation:** route, policy, header-rule, organization and tenant-admin rules, each mirroring the backend.
- **Organizations:** creation with slug suggestion and conflict handling; status changes behind confirmation.
- **Tenant administrators:** the password-replacement confirmation and the selector-only loading.
- **Routes:**
  - Creation without an `organizationId`.
  - Jumping to the tab that holds the first validation error.
  - Conflict mapping back onto the right field.
  - The pipeline view.
  - Version compare and restore.
  - Server-side paging.
  - Platform read-only behavior.
- **Analytics:**
  - Loading, data, empty and 401 states.
  - Polling stops after a 401.
  - Tenant pages make zero analytics requests.
- **Health:** classification of every state, and a check that the token goes only to control-plane services.

## Security notes

- No credentials, tokens or secrets in the code, configuration or tests. Test tokens are unsigned fixtures.
- Tokens are stored in `sessionStorage` only, never in `localStorage`, and never logged.
- All data is cleared from the query cache when a session ends, so one user's data is never shown to the next.
- Backend authorization is never weakened or bypassed. The console relies on server-side scoping for tenant data.
