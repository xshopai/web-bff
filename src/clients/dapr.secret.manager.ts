/**
 * Dapr Secret Management Service
 * Provides secret management using Dapr's secret store building block.
 *
 * NOTE: Environment variables are loaded in server.ts before this module is imported
 */

import { DaprClient } from '@dapr/dapr';
import logger from '../core/logger.js';

class DaprSecretManager {
  private environment: string;
  private daprHost: string;
  private daprPort: string;
  private secretStoreName: string;
  private client: DaprClient;

  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.daprHost = process.env.DAPR_HOST || '127.0.0.1';
    this.daprPort = process.env.DAPR_HTTP_PORT || '3500';

    this.secretStoreName = 'secretstore';

    this.client = new DaprClient({
      daprHost: this.daprHost,
      daprPort: this.daprPort,
    });

    logger.info('Secret manager initialized', {
      event: 'secret_manager_init',
      daprEnabled: true,
      environment: this.environment,
      secretStore: this.secretStoreName,
    });
  }

  /**
   * Get a secret value from Dapr secret store
   * @param secretName - Name of the secret to retrieve
   * @returns Secret value
   */
  async getSecret(secretName: string): Promise<string> {
    try {
      const response = await this.client.secret.get(this.secretStoreName, secretName);

      // Handle different response types
      if (response && typeof response === 'object') {
        // Response is typically an object like { secretName: 'value' }
        const responseObj = response as Record<string, any>;
        const value = responseObj[secretName];
        if (value !== undefined && value !== null) {
          logger.debug('Retrieved secret from Dapr', {
            event: 'secret_retrieved',
            secretName,
            source: 'dapr',
            store: this.secretStoreName,
          });
          return String(value);
        }

        // If not found by key, try getting first value
        const values = Object.values(responseObj);
        if (values.length > 0 && values[0] !== undefined) {
          logger.debug('Retrieved secret from Dapr (first value)', {
            event: 'secret_retrieved',
            secretName,
            source: 'dapr',
            store: this.secretStoreName,
          });
          return String(values[0]);
        }
      }

      throw new Error(`Secret '${secretName}' not found in Dapr store`);
    } catch (error) {
      logger.error(`Failed to get secret from Dapr: ${(error as Error).message}`, {
        event: 'secret_retrieval_error',
        secretName,
        error: (error as Error).message,
        store: this.secretStoreName,
      });
      throw error;
    }
  }

  /**
   * Get a secret with Dapr first, ENV fallback
   * @param secretName - Name of the secret
   * @returns Secret value
   */
  async getSecretWithFallback(secretName: string): Promise<string> {
    // Priority 1: Try Dapr secret store first
    try {
      const value = await this.getSecret(secretName);
      logger.debug(`${secretName} retrieved from Dapr secret store`);
      return value;
    } catch (error) {
      logger.debug(`${secretName} not in Dapr store, trying ENV variable`);

      // Priority 2: Fallback to environment variable (from .env file)
      const envValue = process.env[secretName];
      if (envValue) {
        logger.debug(`${secretName} retrieved from ENV variable`);
        return envValue;
      }

      throw new Error(`${secretName} not found in Dapr secret store or ENV variables`);
    }
  }

  /**
   * Get JWT configuration from Dapr secret store (preferred) or ENV variables (fallback)
   * @returns JWT configuration parameters
   */
  async getJwtConfig(): Promise<{
    secret: string;
    algorithm: string;
    issuer: string;
  }> {
    const secret = await this.getSecretWithFallback('JWT_SECRET');

    return {
      secret,
      algorithm: process.env.JWT_ALGORITHM || 'HS256',
      issuer: process.env.JWT_ISSUER || 'web-bff',
    };
  }
}

// Global instance
export const secretManager = new DaprSecretManager();

// Helper function for easy access
export const getJwtConfig = () => secretManager.getJwtConfig();
