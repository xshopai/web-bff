/**
 * Unit tests for Configuration Validator
 */

// Store original env
const originalEnv = { ...process.env };

describe('Config Validator', () => {
  beforeEach(() => {
    // Reset modules and restore env
    jest.resetModules();
    process.env = { ...originalEnv };
    // Set minimum required env vars
    process.env.NODE_ENV = 'test';
    process.env.PORT = '8014';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isValidUrl', () => {
    it('should validate correct URLs', async () => {
      // Import fresh module
      const { default: validateConfig } = await import('../../../src/validators/config.validator');

      process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
      expect(() => validateConfig()).not.toThrow();
    });

    it('should validate https URLs', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator');

      process.env.ALLOWED_ORIGINS = 'https://example.com';
      expect(() => validateConfig()).not.toThrow();
    });

    it('should accept wildcard origin', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator');

      process.env.ALLOWED_ORIGINS = '*';
      expect(() => validateConfig()).not.toThrow();
    });

    it('should accept comma-separated origins', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator');

      process.env.ALLOWED_ORIGINS = 'http://localhost:3000,https://example.com';
      expect(() => validateConfig()).not.toThrow();
    });
  });

  describe('isValidPort', () => {
    it('should accept valid port numbers', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator');

      process.env.PORT = '3000';
      expect(() => validateConfig()).not.toThrow();
    });

    it('should accept port 80', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator');

      process.env.PORT = '80';
      expect(() => validateConfig()).not.toThrow();
    });

    it('should accept port 65535', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator');

      process.env.PORT = '65535';
      expect(() => validateConfig()).not.toThrow();
    });

    it('should reject port 0', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator');

      process.env.PORT = '0';
      expect(() => validateConfig()).toThrow();
    });

    it('should reject port > 65535', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator');

      process.env.PORT = '70000';
      expect(() => validateConfig()).toThrow();
    });

    it('should reject non-numeric port', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator');

      process.env.PORT = 'abc';
      expect(() => validateConfig()).toThrow();
    });
  });

  describe('isValidNodeEnv', () => {
    it.each(['development', 'production', 'test'])('should accept %s', async (env) => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator');

      process.env.NODE_ENV = env;
      expect(() => validateConfig()).not.toThrow();
    });

    it('should reject invalid NODE_ENV', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator');

      process.env.NODE_ENV = 'invalid';
      expect(() => validateConfig()).toThrow();
    });
  });

  describe('isValidLogLevel', () => {
    it.each(['error', 'warn', 'info', 'debug', 'trace'])('should accept %s', async (level) => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator');

      process.env.LOG_LEVEL = level;
      expect(() => validateConfig()).not.toThrow();
    });

    it('should reject invalid log level', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator');

      process.env.LOG_LEVEL = 'invalid';
      expect(() => validateConfig()).toThrow();
    });
  });

  describe('validateConfig', () => {
    it('should throw if required PORT is missing', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator');

      delete process.env.PORT;
      expect(() => validateConfig()).toThrow();
    });

    it('should throw if required NODE_ENV is missing', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator');

      delete process.env.NODE_ENV;
      expect(() => validateConfig()).toThrow();
    });

    it('should pass with all valid required configurations', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator');

      process.env.NODE_ENV = 'production';
      process.env.PORT = '8014';
      expect(() => validateConfig()).not.toThrow();
    });

    it('should validate DAPR_ENABLED boolean values', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator');

      process.env.DAPR_ENABLED = 'true';
      expect(() => validateConfig()).not.toThrow();

      jest.resetModules();
      const { default: validateConfig2 } = await import('../../../src/validators/config.validator');
      process.env.DAPR_ENABLED = 'false';
      expect(() => validateConfig2()).not.toThrow();
    });

    it('should reject invalid DAPR_ENABLED values', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator');

      process.env.DAPR_ENABLED = 'yes';
      expect(() => validateConfig()).toThrow();
    });

    it('should validate Dapr ports', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator');

      process.env.DAPR_HTTP_PORT = '3500';
      process.env.DAPR_GRPC_PORT = '50001';
      expect(() => validateConfig()).not.toThrow();
    });

    it('should reject invalid Dapr HTTP port', async () => {
      const { default: validateConfig } = await import('../../../src/validators/config.validator');

      process.env.DAPR_HTTP_PORT = 'invalid';
      expect(() => validateConfig()).toThrow();
    });
  });

  describe('Helper Functions', () => {
    describe('getConfig', () => {
      it('should return environment variable value', async () => {
        const { getConfig } = await import('../../../src/validators/config.validator');

        process.env.TEST_VAR = 'test-value';
        expect(getConfig('TEST_VAR')).toBe('test-value');
      });

      it('should return undefined for missing variable', async () => {
        const { getConfig } = await import('../../../src/validators/config.validator');

        delete process.env.MISSING_VAR;
        expect(getConfig('MISSING_VAR')).toBeUndefined();
      });
    });

    describe('getConfigBoolean', () => {
      it('should return true for "true" string', async () => {
        const { getConfigBoolean } = await import('../../../src/validators/config.validator');

        process.env.BOOL_VAR = 'true';
        expect(getConfigBoolean('BOOL_VAR')).toBe(true);
      });

      it('should return true for "TRUE" string (case insensitive)', async () => {
        const { getConfigBoolean } = await import('../../../src/validators/config.validator');

        process.env.BOOL_VAR = 'TRUE';
        expect(getConfigBoolean('BOOL_VAR')).toBe(true);
      });

      it('should return false for "false" string', async () => {
        const { getConfigBoolean } = await import('../../../src/validators/config.validator');

        process.env.BOOL_VAR = 'false';
        expect(getConfigBoolean('BOOL_VAR')).toBe(false);
      });

      it('should return false for missing variable', async () => {
        const { getConfigBoolean } = await import('../../../src/validators/config.validator');

        delete process.env.MISSING_BOOL;
        expect(getConfigBoolean('MISSING_BOOL')).toBe(false);
      });
    });

    describe('getConfigNumber', () => {
      it('should return parsed number', async () => {
        const { getConfigNumber } = await import('../../../src/validators/config.validator');

        process.env.NUM_VAR = '42';
        expect(getConfigNumber('NUM_VAR')).toBe(42);
      });

      it('should return 0 for missing variable', async () => {
        const { getConfigNumber } = await import('../../../src/validators/config.validator');

        delete process.env.MISSING_NUM;
        expect(getConfigNumber('MISSING_NUM')).toBe(0);
      });

      it('should return NaN for non-numeric string', async () => {
        const { getConfigNumber } = await import('../../../src/validators/config.validator');

        process.env.NUM_VAR = 'abc';
        expect(getConfigNumber('NUM_VAR')).toBeNaN();
      });
    });

    describe('getConfigArray', () => {
      it('should return array from comma-separated values', async () => {
        const { getConfigArray } = await import('../../../src/validators/config.validator');

        process.env.ARRAY_VAR = 'a,b,c';
        expect(getConfigArray('ARRAY_VAR')).toEqual(['a', 'b', 'c']);
      });

      it('should trim whitespace from array items', async () => {
        const { getConfigArray } = await import('../../../src/validators/config.validator');

        process.env.ARRAY_VAR = ' a , b , c ';
        expect(getConfigArray('ARRAY_VAR')).toEqual(['a', 'b', 'c']);
      });

      it('should return empty array for missing variable', async () => {
        const { getConfigArray } = await import('../../../src/validators/config.validator');

        delete process.env.MISSING_ARRAY;
        expect(getConfigArray('MISSING_ARRAY')).toEqual([]);
      });

      it('should handle single value', async () => {
        const { getConfigArray } = await import('../../../src/validators/config.validator');

        process.env.ARRAY_VAR = 'single';
        expect(getConfigArray('ARRAY_VAR')).toEqual(['single']);
      });
    });
  });
});
