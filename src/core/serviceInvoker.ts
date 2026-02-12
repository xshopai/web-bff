import { DaprClient, HttpMethod, CommunicationProtocolEnum } from '@dapr/dapr';
import config from '../core/config.js';
import logger from './logger';

interface InvokeMetadata {
  headers?: Record<string, string>;
}

/**
 * Service Invoker - handles service-to-service communication
 * Supports both Dapr service invocation and direct HTTP calls
 * Mode is determined by MESSAGING_PROVIDER config at runtime
 */
class ServiceInvoker {
  private daprClient: DaprClient | null = null;
  private useDapr: boolean;

  constructor() {
    this.useDapr = config.messagingProvider === 'dapr';

    if (this.useDapr) {
      logger.info('[ServiceInvoker] Using Dapr service invocation');
    } else {
      logger.info('[ServiceInvoker] Using direct HTTP service calls');
    }
  }

  private ensureDaprClient(): DaprClient {
    if (!this.daprClient && this.useDapr) {
      this.daprClient = new DaprClient({
        daprHost: config.dapr.host,
        daprPort: String(config.dapr.httpPort),
        communicationProtocol: CommunicationProtocolEnum.HTTP,
      });
    }
    return this.daprClient!;
  }

  /**
   * Get direct service URL for a given app ID
   */
  private getServiceUrl(appId: string): string {
    const serviceUrlMap: Record<string, string> = {
      'product-service': config.serviceUrls.product,
      'inventory-service': config.serviceUrls.inventory,
      'review-service': config.serviceUrls.review,
      'auth-service': config.serviceUrls.auth,
      'user-service': config.serviceUrls.user,
      'cart-service': config.serviceUrls.cart,
      'order-service': config.serviceUrls.order,
      'admin-service': config.serviceUrls.admin,
      'chat-service': config.serviceUrls.chat,
    };

    return serviceUrlMap[appId] || `http://${appId}:8000`;
  }

  /**
   * Invoke a method on another service (via Dapr or direct HTTP)
   * @param appId - The app-id of the target service
   * @param methodName - The API endpoint/method to call (e.g., 'api/users')
   * @param httpMethod - HTTP method (GET, POST, PUT, DELETE, etc.)
   * @param data - Request payload (optional)
   * @param metadata - Additional metadata like headers (optional)
   * @returns Response data from the invoked service
   */
  async invokeService<T = unknown>(
    appId: string,
    methodName: string,
    httpMethod: HttpMethod,
    data?: unknown,
    metadata?: InvokeMetadata
  ): Promise<T> {
    try {
      const cleanMethodName = methodName.startsWith('/') ? methodName.slice(1) : methodName;

      let url: string;
      if (this.useDapr) {
        // Use Dapr service invocation
        url = `http://${config.dapr.host}:${config.dapr.httpPort}/v1.0/invoke/${appId}/method/${cleanMethodName}`;
      } else {
        // Direct HTTP call
        const serviceUrl = this.getServiceUrl(appId);
        url = `${serviceUrl}/${cleanMethodName}`;
      }

      const fetchHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...metadata?.headers,
      };

      logger.info(`[${this.useDapr ? 'Dapr' : 'Direct'}] Invoking ${appId}/${cleanMethodName}`, {
        url,
        method: httpMethod.toUpperCase(),
        hasData: !!data,
        dataKeys: data && typeof data === 'object' ? Object.keys(data as object) : 'N/A',
        dataPayload: JSON.stringify(data),
      });

      const response = await fetch(url, {
        method: httpMethod.toUpperCase(),
        headers: fetchHeaders,
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(
          `[${this.useDapr ? 'Dapr' : 'Direct'}] HTTP ${response.status} from ${appId}: ${errorText}`
        );
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return (await response.json()) as T;
    } catch (error: unknown) {
      const err = error as Error;
      logger.error(
        `[${this.useDapr ? 'Dapr' : 'Direct'}] Service invocation failed: ${appId}/${methodName}`,
        {
          error: err.message,
          stack: err.stack,
        }
      );
      throw error;
    }
  }

  /**
   * Publish an event to a pub/sub topic
   * @param topicName - The name of the topic
   * @param eventData - The event payload
   * @returns Promise that resolves when the event is published
   */
  async publishEvent(topicName: string, eventData: unknown): Promise<void> {
    try {
      const client = this.ensureDaprClient();

      // CRITICAL: Tell Dapr the payload is already CloudEvents formatted
      // This prevents double-wrapping and ensures subscribers receive the data correctly
      const publishOptions = {
        metadata: {
          rawPayload: 'true',
        },
      };

      await client.pubsub.publish(
        config.dapr.pubsubName,
        topicName,
        eventData as string | object,
        publishOptions
      );
      logger.info(`[ServiceInvoker] Event published to topic: ${topicName}`);
    } catch (error: unknown) {
      const err = error as Error;
      logger.error(`[ServiceInvoker] Failed to publish event to ${topicName}`, {
        error: err.message,
        stack: err.stack,
      });
      throw error;
    }
  }

  /**
   * Get the underlying Dapr client (for advanced use cases)
   */
  getDaprClient(): DaprClient {
    return this.ensureDaprClient();
  }
}

// Export singleton instance
export const serviceInvoker = new ServiceInvoker();
// Keep daprClient export for backward compatibility
export const daprClient = serviceInvoker;
export default serviceInvoker;
