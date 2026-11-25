# Live backend integration checklist

The automated tests exercise the console against recorded backend contracts (commit `42751c0`). This checklist verifies the same behavior against your running stack. Record a result for each step; anything marked **Expected limitation** confirms the console reports a backend gap correctly.

Never paste passwords or tokens into tickets, chats or this file.

## 0. Preparation

1. Start the backend from the repository root: `docker compose up --build`.
2. Confirm which applications are up:
   ```powershell
   foreach ($p in 8081,8082,8083,8084,8080) {
     try { "{0}: {1}" -f $p, (Invoke-WebRequest "http://localhost:$p/actuator/health" -SkipHttpErrorCheck -TimeoutSec 3).StatusCode }
     catch { "{0}: no response" -f $p }
   }
   ```
   Expect 8081 → 401 (needs a token), 8082/8083 → 200, 8084 → 401, and 8080 → no response while the gateway's startup issue persists.
3. Start the console: `cd nexgate-frontend`, `npm ci`, `npm run dev`, then open http://localhost:5173.
4. Keep browser DevTools open on the **Network** and **Application → Session Storage** tabs.

## 1. Authentication

| # | Step | Expected result | Result |
|---|---|---|---|
| 1.1 | Open http://localhost:5173/platform while signed out | Redirected to the sign-in page | |
| 1.2 | Submit the form empty | "Enter your username" and "Enter your password". No network request is made. | |
| 1.3 | Sign in as `platform-admin` with a wrong password | "Invalid username or password" (server message) | |
| 1.4 | Sign in as `platform-admin` correctly | Platform overview loads. Session Storage has `nexgate.session`; Local Storage has no token. | |
| 1.5 | Network tab: check request headers | `Authorization: Bearer …` appears only on `/proxy/management/**` and `/proxy/analytics/**` requests | |
| 1.6 | Console tab | No token text logged anywhere | |
| 1.7 | Reload the page | Still signed in | |
| 1.8 | Close the tab, open a new one at http://localhost:5173 | Signed out (sessionStorage is per tab) | |
| 1.9 | Sign in as `gateway-service` (password from your own configuration; don't paste it anywhere) | "This account can’t use the console". Nothing in Session Storage. | |
| 1.10 | Sidebar → Sign out | Back at the sign-in page; `nexgate.session` removed | |

## 2. Organizations (Platform admin)

| # | Step | Expected result | Result |
|---|---|---|---|
| 2.1 | Organizations → Create organization, name `Integration Test` | Slug auto-fills `integration-test`. Organization is created as **Pending**, and its page opens. | |
| 2.2 | Create another with slug `Integration Test` typed by hand | Field error about lowercase letters; no request sent | |
| 2.3 | Create another with an existing slug | "Organization slug already exists" on the slug field (409) | |
| 2.4 | Search and status filter on the list | Filtering happens instantly; only one `GET /api/platform/organizations` request in Network | |
| 2.5 | Edit the name | Saved; list and detail show the new name | |
| 2.6 | Status card → Active, then Suspended, then Pending | Each change asks for confirmation, then `PATCH …/status` returns the new status | |

## 3. Tenant administrator (Platform admin)

| # | Step | Expected result | Result |
|---|---|---|---|
| 3.1 | On the Integration Test page, Create administrator `it-admin` with a password of 8+ characters | Created and shown as Enabled | |
| 3.2 | Tenant administrators page | No administrator requests until an organization is chosen; then exactly one | |
| 3.3 | Edit → change nothing, enter a new password, leave the checkbox unticked, save | "Confirm that the current password will be replaced"; no request sent | |
| 3.4 | Tick the checkbox and save | `PUT …/tenant-admin` succeeds. Toast: "The previous password no longer works." | |
| 3.5 | Deactivate (with new password and checkbox) | Shown as Disabled | |
| 3.6 | Activate again (new password and checkbox) | Shown as Enabled | |

## 4. Tenant sign-in rules

| # | Step | Expected result | Result |
|---|---|---|---|
| 4.1 | Set Integration Test to **Pending**, sign out, sign in as `it-admin` | "The organization is not active", with an explanation (403) | |
| 4.2 | As platform admin set it to **Active**; sign in as `it-admin` | Tenant overview. Header shows the organization's ID. | |
| 4.3 | As tenant, open http://localhost:5173/platform/organizations | "This area is for platform admins". No `/api/platform` request is made. | |

## 5. Routes (Tenant admin)

| # | Step | Expected result | Result |
|---|---|---|---|
| 5.1 | My routes → Create route: ID `it-catalog`, name `IT Catalog`, path `/it-catalog/**`, target `http://catalog:8082`, methods GET | Created at version 1; detail page opens | |
| 5.2 | Network: inspect the POST body | No `organizationId` field; a full `policy` object is present | |
| 5.3 | Create a second route with ID `it-catalog` | "Route identifier already exists" on the Route ID field | |
| 5.4 | Edit → Policy: enable POST idempotency with only GET allowed | Field error; no request sent | |
| 5.5 | Edit → Headers: add a rule for `Authorization` | "Sensitive headers can’t be transformed" | |
| 5.6 | Edit → Policy: authentication on, role `USER`, rate limit 5 per 60 s scope User, rewrite to `/api/catalog`; save | Version 2. The pipeline on the Overview tab reflects every setting. | |
| 5.7 | Route policies → Edit policy → timeout 4000 | Version 3 | |
| 5.8 | Versions tab | Compare v2 with v3 shows `policy.timeoutMs`; "Snapshot" opens the JSON | |
| 5.9 | Restore v1 | Confirmation, then version 4 with change "Restored v1" | |
| 5.10 | Deactivate, then Activate | Each confirmed; the status badge updates | |
| 5.11 | Cross-tenant check: as tenant, open `/tenant/routes/<id of another organization's route>` | Error state "Not permitted" or "Not found" from the server. No data from the other tenant is shown. | |
| 5.12 | Delete `it-catalog` | Confirmed, then removed from the list | |

## 6. Route oversight (Platform admin)

| # | Step | Expected result | Result |
|---|---|---|---|
| 6.1 | Routes | All organizations' routes, with organization names | |
| 6.2 | Open any route | "Read-only oversight" badge; no Edit, Deactivate, Delete or Restore buttons | |
| 6.3 | Versions tab | Compare works; Restore is absent | |

## 7. Analytics

| # | Step | Expected result | Result |
|---|---|---|---|
| 7.1 | Platform analytics | **Expected limitation:** one "Access rejected by service" message explaining the missing JWT configuration in analytics-service; cards point to it | |
| 7.2 | Network after 1 minute | No repeated analytics requests after the 401 (polling stops) | |
| 7.3 | Still signed in after 7.1 | Yes. The analytics 401 does not end the session. | |
| 7.4 | As tenant, API analytics and Route analytics | Explanation shown; **zero** `/proxy/analytics` requests in Network | |
| 7.5 | *(After the backend accepts the token)* Platform analytics | KPI cards, success/failure chart, requests by route, most-requested and slowest tables populate; refreshes every 30 s | |

## 8. Monitoring (Platform admin)

| # | Step | Expected result | Result |
|---|---|---|---|
| 8.1 | Service health with the gateway not running | Smart Gateway: **Unavailable**, with the startup-dependency note | |
| 8.2 | Same page | API Management: Healthy. Catalog and Order: Healthy. Analytics: **Unknown** (HTTP 401). | |
| 8.3 | Stop the catalog container, click Check now | Catalog: **Unavailable** | |
| 8.4 | *(If the gateway runs)* Service health | Smart Gateway: **Unknown** (HTTP 401, default Spring Security), never Healthy | |
| 8.5 | Infrastructure health | MySQL: Healthy (from `/health` dbStatus). MongoDB, Redis, Kafka: **Unknown**, "No health source available". | |
| 8.6 | Stop MySQL, Check now | MySQL: Unhealthy (dbStatus DOWN), or Unknown if API Management itself fails | |

## 9. Session expiry (optional)

This needs a shorter token lifetime. Run API Management outside Compose with `NEXGATE_JWT_EXPIRATION_SECONDS=180` set for that process only; don't edit `compose.yaml`.

| # | Step | Expected result | Result |
|---|---|---|---|
| 9.1 | Sign in | Profile page shows the expiry time about 3 minutes ahead | |
| 9.2 | Wait about 1 minute | Banner: "Your session ends at …" | |
| 9.3 | Wait until expiry | Signed out with "Your session expired" | |

## 10. Layout and theme

| # | Step | Expected result | Result |
|---|---|---|---|
| 10.1 | Theme toggle (top bar) and Settings → Appearance | Light, dark and system modes; the preference persists | |
| 10.2 | DevTools device mode at 390 px width | Menu button opens the navigation drawer; tables scroll horizontally inside their cards; dialogs open as bottom sheets | |
| 10.3 | Keyboard only: Tab through the sign-in form and a dialog | Visible focus ring; Escape closes dialogs; focus stays inside open dialogs | |

## Cleanup

As platform admin, delete the `it-admin` administrator and the Integration Test organization. Organization deletion is a soft delete in the backend.
