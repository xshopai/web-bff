/**
 * Service Resolver — Convention-based service discovery for direct mode.
 *
 * Resolves service URLs without per-service env vars:
 * - Local development: uses a static port registry (localhost:{port})
 * - Azure App Service: uses SERVICE_BASE_URL template (https://app-{name}-xshopai-{suffix}.azurewebsites.net)
 *
 * This module is only used when PLATFORM_MODE=direct.
 * In Dapr mode, the Dapr sidecar handles service discovery natively.
 *
 * Phase 1 of service discovery — future phases will add:
 * - Phase 2: Registry service (live service registry)
 * - Phase 3: Self-registration + health checks
 * - Phase 4: Client-side caching + load balancing
 * - Phase 5: Resilience (circuit breaker, stale cache, convention fallback)
 */

/**
 * Static port registry for local development.
 * Maps service app-id → localhost port.
 * This is the single source of truth for local service ports.
 */
const PORT_REGISTRY: Record<string, number> = {
  'product-service': 8001,
  'user-service': 8002,
  'admin-service': 8003,
  'auth-service': 8004,
  'inventory-service': 8005,
  'order-service': 8006,
  'cart-service': 8008,
  'payment-service': 8009,
  'review-service': 8010,
  'notification-service': 8011,
  'audit-service': 8012,
  'chat-service': 8013,
  'web-bff': 8014,
  'order-processor-service': 8007,
};

/**
 * SERVICE_BASE_URL — convention-based URL template for Azure App Service.
 * Format: https://app-{name}-xshopai-{suffix}.azurewebsites.net
 *
 * When set, the resolver replaces {name} with the service app-id.
 * When not set (local dev), falls back to localhost:{port} from the port registry.
 */
const SERVICE_BASE_URL = process.env.SERVICE_BASE_URL || '';

/**
 * Resolve a service URL by app-id.
 *
 * @param appId - The service app-id (e.g. 'user-service', 'product-service')
 * @returns The full base URL for the service (e.g. 'http://localhost:8002' or 'https://app-user-service-xshopai-abc.azurewebsites.net')
 */
export function resolve(appId: string): string {
  // Azure / cloud: use SERVICE_BASE_URL template
  if (SERVICE_BASE_URL) {
    return SERVICE_BASE_URL.replace('{name}', appId);
  }

  // Local development: use port registry
  const port = PORT_REGISTRY[appId];
  if (port) {
    return `http://localhost:${port}`;
  }

  // Unknown service — fail loudly
  throw new Error(
    `[ServiceResolver] Unknown service: '${appId}'. Add it to PORT_REGISTRY or set SERVICE_BASE_URL.`
  );
}

export default { resolve, PORT_REGISTRY };
