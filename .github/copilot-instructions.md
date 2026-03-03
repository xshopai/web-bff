# Copilot Instructions — web-bff

## Service Identity

- **Name**: web-bff
- **Purpose**: Backend for Frontend — API aggregation gateway for web UIs, proxies and composes data from downstream microservices
- **Port**: 8014
- **Language**: Node.js 20+ (TypeScript)
- **Framework**: Express 4.19+
- **Database**: Stateless — no own database; aggregates from downstream services
- **Dapr App ID**: `web-bff`

## Architecture

- **Pattern**: BFF (Backend for Frontend) — aggregates multiple microservice calls into UI-optimized responses
- **API Style**: RESTful JSON APIs matching UI needs
- **Authentication**: JWT validation + cookie-based auth forwarding
- **Service Communication**: Dapr service invocation OR direct HTTP (configurable via `PLATFORM_MODE`)
- **Security**: Helmet, CORS, trust proxy

## Project Structure

```
web-bff/
├── src/
│   ├── clients/           # Per-service client classes (typed)
│   │   ├── auth.client.ts
│   │   ├── user.client.ts
│   │   ├── product.client.ts
│   │   ├── order.client.ts
│   │   ├── cart.client.ts
│   │   └── inventory.client.ts
│   ├── core/              # Config, logger, Dapr client, service invoker/resolver, Consul
│   │   ├── config.ts
│   │   ├── logger.ts
│   │   ├── daprClient.ts
│   │   ├── serviceInvoker.ts
│   │   ├── serviceResolver.ts
│   │   └── baseServiceClient.ts
│   ├── middleware/         # Auth, error handling, trace context
│   ├── routes/            # Route definitions
│   ├── validators/        # Config validation
│   ├── tracing.ts         # OpenTelemetry + Zipkin setup
│   ├── app.ts             # Express app setup
│   └── server.ts          # Bootstrap entry point
├── tests/
│   └── unit/
├── .dapr/components/
├── tsc-alias.config.json  # Path alias resolution
└── package.json
```

## Code Conventions

- **TypeScript** with strict mode
- **Path aliases**: `@/` → `src/`, `@routes/` → `src/routes/`, `@middleware/` → `src/middleware/`, etc. (resolved via `tsc-alias`)
- Use `BaseServiceClient` abstract class for all downstream service clients
- **ServiceInvoker**: abstracts Dapr vs direct HTTP — `PLATFORM_MODE=dapr` uses Dapr SDK, `PLATFORM_MODE=direct` uses serviceResolver URL mapping
- JWT config fetched from auth-service and cached
- Structured logging via **Winston**
- W3C Trace Context propagation
- OpenTelemetry + Zipkin tracing integration
- Consul service registration for service discovery

## Key Patterns

- **Service Clients**: Typed client per downstream service (auth, user, product, order, cart, inventory)
- **ServiceInvoker**: Single abstraction for calling any service — handles Dapr or direct HTTP transparently
- **ServiceResolver**: Maps app IDs to URLs using port registry (local dev) or `SERVICE_BASE_URL` template (Azure)
- **Cookie-parser**: Extracts JWT from cookies for web UI auth flow
- **Config validator**: Blocking validation on startup — fails fast if required config missing

## Downstream Services

| Service           | Dapr App ID         | Direct Port |
| :---------------- | :------------------ | :---------- |
| auth-service      | `auth-service`      | 8004        |
| user-service      | `user-service`      | 8002        |
| product-service   | `product-service`   | 8001        |
| order-service     | `order-service`     | 8006        |
| cart-service      | `cart-service`      | 8008        |
| inventory-service | `inventory-service` | 8005        |

## Security Rules

- JWT MUST be validated on every request before proxying to downstream services
- Downstream services are called with the validated JWT forwarded in the `Authorization` header
- Never expose internal service URLs, ports, or Dapr app IDs in API responses
- CORS must restrict allowed origins to configured `ALLOWED_ORIGINS`
- Helmet middleware must be applied for HTTP security headers
- Rate limiting must be applied to all routes
- Sanitize query parameters and request bodies before forwarding

## Error Handling Contract

All errors MUST follow this JSON structure:

```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "Human readable message",
    "correlationId": "uuid"
  }
}
```

- Never expose stack traces in production
- Never leak downstream service error details to UI clients
- Use centralized error middleware only

## Logging Rules

- Use structured JSON logging only
- Include:
  - timestamp
  - level
  - serviceName
  - correlationId
  - message
- Never log JWT tokens
- Never log secrets

## Testing Requirements

- All new route handlers MUST have unit tests
- Use **Jest** with **ts-jest** as the test framework
- Mock downstream service clients in unit tests
- Do NOT call real downstream services in unit tests
- Test authentication failure, authorization failure, and service unavailability scenarios
- Run: `npm test` (with coverage)
- Unit: `npm run test:unit`

## Non-Goals

- This service is NOT responsible for business logic — it only aggregates and proxies
- This service does NOT own a database
- This service does NOT issue JWT tokens — handled by auth-service
- This service does NOT publish or consume domain events

## Environment Variables

```
PORT=8014
NODE_ENV=development
PLATFORM_MODE=dapr           # 'dapr' or 'direct'
MESSAGING_PROVIDER=dapr      # 'dapr' or 'rabbitmq'
DAPR_HOST=localhost
DAPR_HTTP_PORT=3500
DAPR_GRPC_PORT=50001
JWT_SECRET=<shared-secret>
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## Common Commands

```bash
npm run dev              # Dev with hot reload (tsx watch)
npm run build            # Compile TypeScript + resolve aliases
npm start                # Run compiled code
npm test                 # All tests with coverage
npm run lint             # ESLint
npm run type-check       # TypeScript type check (no emit)
```
