/**
 * Configuration Validator for Web BFF
 * Validates all required environment variables at application startup
 * Fails fast if any required configuration is missing or invalid
 *
 * NOTE: This module MUST NOT import logger, as the logger depends on validated config.
 * Use console.log for bootstrap messages - this is industry standard practice.
 */

/**
 * Validates a URL format
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validates a port number
 * @param {string|number} port - The port to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidPort = (port: string | number): boolean => {
  const portNum = parseInt(port.toString(), 10);
  return !isNaN(portNum) && portNum > 0 && portNum <= 65535;
};

/**
 * Validates NODE_ENV
 * @param {string} env - The environment to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidNodeEnv = (env: string): boolean => {
  const validEnvs = ['development', 'production', 'test'];
  return validEnvs.includes(env?.toLowerCase());
};

/**
 * Validates log level
 * @param {string} level - The log level to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidLogLevel = (level: string): boolean => {
  const validLevels = ['error', 'warn', 'info', 'debug', 'trace'];
  return validLevels.includes(level?.toLowerCase());
};

interface ValidationRule {
  required: boolean;
  validator?: (value: string) => boolean;
  errorMessage: string;
}

/**
 * Configuration validation rules
 */
const validationRules: Record<string, ValidationRule> = {
  // Server Configuration
  NODE_ENV: {
    required: true,
    validator: isValidNodeEnv,
    errorMessage: 'NODE_ENV must be one of: development, production, test',
  },
  PORT: {
    required: true,
    validator: (value) => isValidPort(value),
    errorMessage: 'PORT must be a valid port number (1-65535)',
  },
  HOST: {
    required: false,
    validator: (value) => !!(value && value.length > 0),
    errorMessage: 'HOST must be a non-empty string',
  },

  // Dapr Configuration
  DAPR_ENABLED: {
    required: false,
    validator: (value) => ['true', 'false'].includes(value.toLowerCase()),
    errorMessage: 'DAPR_ENABLED must be true or false',
  },
  DAPR_HOST: {
    required: false,
    validator: (value) => !!(value && value.length > 0),
    errorMessage: 'DAPR_HOST must be a non-empty string',
  },
  DAPR_HTTP_PORT: {
    required: false,
    validator: isValidPort,
    errorMessage: 'DAPR_HTTP_PORT must be a valid port number',
  },
  DAPR_GRPC_PORT: {
    required: false,
    validator: isValidPort,
    errorMessage: 'DAPR_GRPC_PORT must be a valid port number',
  },

  // CORS Configuration
  ALLOWED_ORIGINS: {
    required: false, // Has default in config.ts
    validator: (value) => {
      if (!value) return true; // Allow missing, will use default
      const origins = value.split(',').map((o) => o.trim());
      return origins.every((origin) => origin === '*' || isValidUrl(origin));
    },
    errorMessage: 'ALLOWED_ORIGINS must be a comma-separated list of valid URLs or *',
  },

  // Logging Configuration
  LOG_LEVEL: {
    required: false,
    validator: isValidLogLevel,
    errorMessage: 'LOG_LEVEL must be one of: error, warn, info, debug, trace',
  },
};

/**
 * Validates all environment variables according to the rules
 * @throws {Error} - If any required variable is missing or invalid
 */
const validateConfig = (): void => {
  const errors: string[] = [];

  // Validate each rule
  for (const [key, rule] of Object.entries(validationRules)) {
    const value = process.env[key];

    // Check if required variable is missing
    if (rule.required && !value) {
      errors.push(`❌ ${key} is required but not set`);
      continue;
    }

    // Skip validation if optional and not provided
    if (!rule.required && !value) {
      continue;
    }

    // Validate the value if provided
    if (rule.validator && value && !rule.validator(value)) {
      errors.push(`❌ ${key}: ${rule.errorMessage}`);
      if (value.length > 100) {
        errors.push(`   Current value: ${value.substring(0, 100)}...`);
      } else {
        errors.push(`   Current value: ${value}`);
      }
    }
  }

  // If there are errors, log them and throw
  if (errors.length > 0) {
    console.error('[CONFIG] ❌ Configuration validation failed:');
    errors.forEach((error) => console.error(`❌ ${error}`));
    console.error(
      '💡 Please check your .env file and ensure all required variables are set correctly.'
    );
    throw new Error(`Configuration validation failed with ${errors.length} error(s)`);
  }
};

/**
 * Gets a validated configuration value
 * Assumes validateConfig() has already been called
 * @param {string} key - The configuration key
 * @returns {string} - The configuration value
 */
const getConfig = (key: string): string | undefined => {
  return process.env[key];
};

/**
 * Gets a validated configuration value as boolean
 * @param {string} key - The configuration key
 * @returns {boolean} - The configuration value as boolean
 */
const getConfigBoolean = (key: string): boolean => {
  return process.env[key]?.toLowerCase() === 'true';
};

/**
 * Gets a validated configuration value as number
 * @param {string} key - The configuration key
 * @returns {number} - The configuration value as number
 */
const getConfigNumber = (key: string): number => {
  return parseInt(process.env[key] || '0', 10);
};

/**
 * Gets a validated configuration value as array (comma-separated)
 * @param {string} key - The configuration key
 * @returns {string[]} - The configuration value as array
 */
const getConfigArray = (key: string): string[] => {
  return process.env[key]?.split(',').map((item) => item.trim()) || [];
};

export default validateConfig;
export { getConfig, getConfigBoolean, getConfigNumber, getConfigArray };
