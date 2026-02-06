/**
 * Secret Manager
 * Provides configuration from environment variables
 */

import logger from '../core/logger.js';

class SecretManager {
  constructor() {
    logger.info('Secret manager initialized (using environment variables)', {
      event: 'secret_manager_init',
    });
  }

  /**
   * Get a secret value from environment variables
   */
  getSecret(secretName: string): string {
    const value = process.env[secretName];
    if (!value) {
      throw new Error(`${secretName} not found in environment variables`);
    }
    return value;
  }

  /**
   * Get a secret with fallback to empty string
   */
  getSecretOrDefault(secretName: string, defaultValue: string = ''): string {
    return process.env[secretName] || defaultValue;
  }

  /**
   * Get JWT configuration from environment variables
   */
  getJwtConfig(): { secret: string; issuer: string; audience: string } {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not found in environment variables');
    }
    return {
      secret,
      issuer: process.env.JWT_ISSUER || 'auth-service',
      audience: process.env.JWT_AUDIENCE || 'xshopai-platform',
    };
  }
}

// Global instance
export const secretManager = new SecretManager();
