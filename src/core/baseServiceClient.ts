import logger from './logger';
import { HttpMethod } from '@dapr/dapr';
import { serviceInvoker } from './serviceInvoker';

/**
 * Base class for service clients
 * Works with both Dapr service invocation and direct HTTP calls
 * The transport is determined by MESSAGING_PROVIDER config at runtime
 */
export class BaseServiceClient {
  protected serviceName: string;
  protected appId: string;

  constructor(appId: string, serviceName: string) {
    this.appId = appId;
    this.serviceName = serviceName;
    logger.debug(`[ServiceClient] Initialized ${serviceName} (appId: ${appId})`);
  }

  /**
   * Make a request to another service (via Dapr or direct HTTP based on config)
   */
  private async serviceRequest<T>(
    method: string,
    url: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    const methodMap: Record<string, HttpMethod> = {
      GET: HttpMethod.GET,
      POST: HttpMethod.POST,
      PUT: HttpMethod.PUT,
      PATCH: HttpMethod.PATCH,
      DELETE: HttpMethod.DELETE,
    };

    // logger.debug(`Dapr ${method} request to ${this.serviceName}`, {
    //   url,
    //   correlationId: headers?.['x-correlation-id'],
    //   headers: headers || 'undefined',
    // });

    // Only pass metadata if headers exist and are not empty
    const metadata = headers && Object.keys(headers).length > 0 ? { headers } : undefined;

    const response = await serviceInvoker.invokeService<T>(
      this.appId,
      url,
      methodMap[method],
      method !== 'GET' && method !== 'DELETE' ? data : null,
      metadata
    );

    // logger.debug(`Dapr response from ${this.serviceName}`, {
    //   url,
    //   correlationId: headers?.['x-correlation-id'],
    // });

    return response;
  }

  /**
   * GET request
   */
  protected async get<T>(url: string, headers?: Record<string, string>): Promise<T> {
    return this.serviceRequest<T>('GET', url, undefined, headers);
  }

  /**
   * POST request
   */
  protected async post<T>(
    url: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.serviceRequest<T>('POST', url, data, headers);
  }

  /**
   * PUT request
   */
  protected async put<T>(
    url: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.serviceRequest<T>('PUT', url, data, headers);
  }

  /**
   * PATCH request
   */
  protected async patch<T>(
    url: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.serviceRequest<T>('PATCH', url, data, headers);
  }

  /**
   * DELETE request
   */
  protected async delete<T>(url: string, headers?: Record<string, string>): Promise<T> {
    return this.serviceRequest<T>('DELETE', url, undefined, headers);
  }
}
