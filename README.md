# NexGate

NexGate is a custom API gateway and API management platform built with Java 21 and Spring Boot 3.x.

## Modules

- `api-management-service`: control plane and MySQL owner
- `smart-gateway-service`: public data plane
- `analytics-service`: Kafka consumer and MongoDB analytics owner
- `catalog-service`: downstream catalog demonstration
- `order-service`: downstream order demonstration
- `common`: dependency-light shared contracts

## Phase 1 commands

```powershell
.\mvnw.cmd clean test
.\mvnw.cmd spring-boot:run -pl api-management-service
.\mvnw.cmd spring-boot:run -pl smart-gateway-service
.\mvnw.cmd spring-boot:run -pl analytics-service
.\mvnw.cmd spring-boot:run -pl catalog-service
.\mvnw.cmd spring-boot:run -pl order-service
docker compose up --build
```

Health endpoints are available at `/actuator/health` on the configured application ports.

Infrastructure topics `gateway-access-events` and `gateway-configuration-events` are created by Compose initialization.

## Gateway JWT contract

The Smart Gateway validates HS256 JWTs locally. Configure:

```text
NEXGATE_JWT_SECRET=<shared HS256 secret, at least 32 bytes>
NEXGATE_JWT_ISSUER=gatekeeper-api-management
```

API Management issues `sub`, `role`, `iat`, `exp`, optional `organizationId`, and an issuer of `gatekeeper-api-management`. Protected routes require a Bearer token and at least one permitted role. Authorization forwarding is disabled unless the route explicitly contains a request `FORWARD` rule for `Authorization`.


## Demo service endpoints

### Catalog service

- `GET http://localhost:8082/api/catalog/products`
- `GET http://localhost:8082/api/catalog/products/p-100`
- `POST http://localhost:8082/api/catalog/products`
- `GET http://localhost:8082/api/catalog/delay?ms=1500`

Create a product:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8082/api/catalog/products `
  -ContentType application/json `
  -Body '{"name":"USB Hub","description":"Four ports","price":19.99,"stock":10}'
```

### Order service

- `POST http://localhost:8083/api/orders`
- `GET http://localhost:8083/api/orders/{id}`
- `GET http://localhost:8083/api/orders`
- `GET http://localhost:8083/api/orders/delay?ms=1500`

Create an order:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8083/api/orders `
  -ContentType application/json `
  -Body '{"customerId":"customer-1","note":"Demo","items":[{"productId":"p-100","quantity":2}]}'
```

When a Gateway route is configured to rewrite `/catalog/**` to `/api/catalog/**` or `/orders/**` to `/api/orders/**`, the same endpoints can be exercised through `http://localhost:8080`. Use a JWT Authorization header for protected routes and an `Idempotency-Key` header for configured POST idempotency routes.

## Redis route rate limiting

Route policies provide rateLimitEnabled, rateLimitRequests, rateLimitWindowSeconds, and rateLimitScope. The Gateway uses an atomic Redis Lua fixed-window counter. Keys include organization, route, scope, identity, and time bucket:

```text
nexgate:ratelimit:<organization>:<route>:<scope>:<identity>:<window-bucket>
```

Supported scopes are ROUTE, USER, TENANT, and IP. USER uses the validated JWT subject, IP uses the direct servlet remote address, and TENANT uses the route organization. Redis failures fail closed for rate-limited routes. Configure NEXGATE_REDIS_URL as the Redis connection URL.



## Redis POST idempotency

Routes with idempotencyEnabled=true require an Idempotency-Key on POST requests. Records are keyed by organization, route ID, and key. Redis stores processing or completed state with a TTL. Replays save status, body, and headers; concurrent duplicates or different payloads return 409; missing keys return 400; Redis failures return 503. Configure NEXGATE_IDEMPOTENCY_TTL_SECONDS (default 86400).


## Analytics access

`/api/analytics/**` requires a Bearer JWT issued by API Management with role `PLATFORM_ADMIN` (statistics span all tenants). Analytics needs the same `NEXGATE_JWT_SECRET` and `NEXGATE_JWT_ISSUER` as the other services.

## Startup order

The Smart Gateway loads routes from API Management at startup and retries (`nexgate.management.startup-max-attempts`, default 30, every `startup-retry-delay-ms`, default 2000) before refusing to start. Compose also waits for API Management to be healthy.
