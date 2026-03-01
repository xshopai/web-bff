/**
 * Service Resolver — Service discovery for direct mode.
 *
 * Resolution order:
 *   1. Azure App Service: SERVICE_BASE_URL template (when set)
 *   2. Consul: query the service catalog via HTTP API (when CONSUL_URL is set)
 *   3. Convention fallback: static PORT_REGISTRY (localhost:{port})
 *
 * This module is only used when PLATFORM_MODE=direct.
 * In Dapr mode, the Dapr sidecar handles service discovery natively.
 */

/**
 * Static port registry for local development.
 * Maps service app-id → localhost port.
 * This is the convention-based fallback when Consul is not available.
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
 * When not set (local dev), falls through to Consul / port registry.
 */
const SERVICE_BASE_URL = process.env.SERVICE_BASE_URL || '';

/**
 * CONSUL_URL — base URL of the Consul HTTP API.
 * Example: http://localhost:8500
 * When set, the resolver queries Consul's service catalog for healthy instances.
 */
const CONSUL_URL = process.env.CONSUL_URL || '';

/** In-memory cache for Consul lookups (TTL-based). */
const consulCache: Map<string, { url: string; expiresAt: number }> = new Map();
const CACHE_TTL_MS = 30_000; // 30 seconds

/**
 * Query Consul for a healthy service instance.
 * Returns the first healthy instance's address:port, or null.
 */
async function queryConsul(appId: string): Promise<string | null> {
  if (!CONSUL_URL) return null;

  // Check cache first
  const cached = consulCache.get(appId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.url;
  }

  try {
    const res = await fetch(`${CONSUL_URL}/v1/health/service/${appId}?passing=true`);
    if (!res.ok) return null;

    const entries = (await res.json()) as Array<{
      Service: { Address: string; Port: number };
    }>;

    if (!entries || entries.length === 0) return null;

    const svc = entries[0].Service;
    const address = svc.Address || 'localhost';
    const url = `http://${address}:${svc.Port}`;

    consulCache.set(appId, { url, expiresAt: Date.now() + CACHE_TTL_MS });
    return url;
  } catch {
    // Consul unavailable — fall through to convention
    return null;
  }
}

/**
 * Resolve a service URL by app-id (async — queries Consul when available).
 *
 * @param appId - The service app-id (e.g. 'user-service', 'product-service')
 * @returns The full base URL for the service
 */
export async function resolveAsync(appId: string): Promise<string> {
  // 1. Azure / cloud: use SERVICE_BASE_URL template
  if (SERVICE_BASE_URL) {
    return SERVICE_BASE_URL.replace('{name}', appId);
  }

  // 2. Consul lookup
  const consulUrl = await queryConsul(appId);
  if (consulUrl) return consulUrl;

  // 3. Convention fallback: port registry
  const port = PORT_REGISTRY[appId];
  if (port) return `http://localhost:${port}`;

  throw new Error(
    `[ServiceResolver] Unknown service: '${appId}'. Add it to PORT_REGISTRY or set SERVICE_BASE_URL.`
  );
}

/**
 * Resolve a service URL by app-id (synchronous — convention-based only).
 * Use this when async is not possible. Does NOT query Consul.
 *
 * @param appId - The service app-id (e.g. 'user-service', 'product-service')
 * @returns The full base URL for the service
 */
export function resolve(appId: string): string {
  // Azure / cloud: use SERVICE_BASE_URL template
  if (SERVICE_BASE_URL) {
    return SERVICE_BASE_URL.replace('{name}', appId);
  }

  // Check Consul cache (sync — won't make a network call)
  const cached = consulCache.get(appId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.url;
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

export default { resolve, resolveAsync, PORT_REGISTRY };
