/**
 * Authentication Middleware for Web BFF
 * Validates JWT tokens and attaches user information to requests
 */

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { HttpMethod } from '@dapr/dapr';
import { RequestWithTraceContext } from './traceContext.middleware';
import logger from '../core/logger';
import { serviceInvoker } from '../core/serviceInvoker';

// Extend request interface to include user information
export interface RequestWithAuth extends RequestWithTraceContext {
  user?: {
    id: string;
    email: string;
    username?: string;
    roles: string[];
    isAdmin: boolean;
    emailVerified: boolean;
  };
}

// Cache JWT config to avoid repeated Dapr calls
let jwtConfigCache: { secret: string; algorithm: string; issuer: string; audience: string } | null =
  null;

// Interface for JWT config response from auth service
interface JwtConfigResponse {
  secret: string;
  algorithm?: string;
  issuer?: string;
  audience?: string;
}

/**
 * Get JWT configuration from auth service
 */
async function getJwtConfig(): Promise<{
  secret: string;
  algorithm: string;
  issuer: string;
  audience: string;
}> {
  if (jwtConfigCache) {
    return jwtConfigCache;
  }

  try {
    // Get JWT secret from auth service via Dapr
    const secretStoreResponse = await serviceInvoker.invokeService<JwtConfigResponse>(
      'auth-service',
      'api/auth/config/jwt',
      HttpMethod.GET,
      null,
      {}
    );

    if (!secretStoreResponse?.secret) {
      throw new Error('JWT secret not found in auth service response');
    }

    jwtConfigCache = {
      secret: secretStoreResponse.secret,
      algorithm: secretStoreResponse.algorithm || 'HS256',
      issuer: secretStoreResponse.issuer || 'auth-service',
      audience: secretStoreResponse.audience || 'xshopai-platform',
    };

    return jwtConfigCache;
  } catch (error) {
    logger.error('Failed to fetch JWT config from auth service', { error });
    throw new Error('Unable to retrieve JWT configuration from auth service');
  }
}

/**
 * Extract token from Authorization header or cookies
 */
function extractToken(req: RequestWithAuth): string | null {
  // Check Authorization header
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }

  // Check cookies
  if (req.cookies?.jwt || req.cookies?.token) {
    return req.cookies.jwt || req.cookies.token;
  }

  return null;
}

/**
 * Middleware to require authentication
 * Validates JWT token and attaches user info to request
 */
export const requireAuth = async (
  req: RequestWithAuth,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // console.log(`[MIDDLEWARE] requireAuth called for ${req.method} ${req.path} at ${new Date().toISOString()}`);
  const { traceId, spanId } = req;

  try {
    const token = extractToken(req);
    // console.log(`[MIDDLEWARE] Token extracted: ${token ? token.substring(0, 20) + '...' : 'NONE'}`);

    if (!token) {
      logger.warn('Authentication required: No token provided', { traceId, spanId });
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
        traceId,
        spanId,
      });
      return;
    }

    // Get JWT config
    const jwtConfig = await getJwtConfig();

    // Verify token
    const decoded = jwt.verify(token, jwtConfig.secret, {
      algorithms: [jwtConfig.algorithm as jwt.Algorithm],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    }) as jwt.JwtPayload & {
      sub?: string;
      id?: string;
      email?: string;
      username?: string;
      name?: string;
      roles?: string[];
      isAdmin?: boolean;
      emailVerified?: boolean;
    };

    // Validate standard claims
    if (!decoded.sub && !decoded.id) {
      logger.warn('Invalid token: Missing user identifier', { traceId, spanId });
      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid token',
          code: 'INVALID_TOKEN',
        },
        traceId,
        spanId,
      });
      return;
    }

    // Attach user information to request
    req.user = {
      id: decoded.sub || decoded.id || '',
      email: decoded.email || '',
      username: decoded.username || decoded.name,
      roles: decoded.roles || [],
      isAdmin: (decoded.roles || []).includes('admin') || decoded.isAdmin || false,
      emailVerified: decoded.emailVerified || false,
    };

    // logger.info('User authenticated successfully', {
    //   traceId,
    //   spanId,
    //   userId: req.user.id,
    //   email: req.user.email,
    //   roles: req.user.roles,
    // });

    next();
  } catch (error: unknown) {
    const { traceId, spanId } = req;
    const err = error as Error & { name?: string; message?: string };

    // Handle specific JWT errors
    if (err.name === 'TokenExpiredError') {
      logger.warn('Token expired', { traceId, spanId, error: err.message });
      res.status(401).json({
        success: false,
        error: {
          message: 'Token expired',
          code: 'TOKEN_EXPIRED',
        },
        traceId,
        spanId,
      });
      return;
    }

    if (err.name === 'JsonWebTokenError') {
      logger.warn('Invalid token', { traceId, spanId, error: err.message });
      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid token',
          code: 'INVALID_TOKEN',
        },
        traceId,
        spanId,
      });
      return;
    }

    if (err.name === 'NotBeforeError') {
      logger.warn('Token not active yet', { traceId, spanId, error: err.message });
      res.status(401).json({
        success: false,
        error: {
          message: 'Token not active',
          code: 'TOKEN_NOT_ACTIVE',
        },
        traceId,
        spanId,
      });
      return;
    }

    // Generic authentication error
    logger.error('Authentication failed', { traceId, spanId, error: err });
    res.status(401).json({
      success: false,
      error: {
        message: 'Authentication failed',
        code: 'AUTH_FAILED',
      },
      traceId,
      spanId,
    });
  }
};

/**
 * Optional authentication middleware
 * Sets user if token is valid, but doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: RequestWithAuth,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const { traceId, spanId } = req;

  try {
    const token = extractToken(req);

    // DEBUG: Log token extraction result
    logger.debug('[optionalAuth] Token extraction:', {
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 30)}...` : 'NONE',
      authHeader: req.headers.authorization ? 'present' : 'missing',
      path: req.path,
    });

    if (!token) {
      // No token provided, continue without user
      logger.debug('[optionalAuth] No token, continuing as anonymous');
      req.user = undefined;
      return next();
    }

    // Get JWT config
    const jwtConfig = await getJwtConfig();
    logger.debug('[optionalAuth] JWT config:', {
      hasSecret: !!jwtConfig.secret,
      algorithm: jwtConfig.algorithm,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });

    // Verify token
    const decoded = jwt.verify(token, jwtConfig.secret, {
      algorithms: [jwtConfig.algorithm as jwt.Algorithm],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    }) as jwt.JwtPayload & {
      sub?: string;
      id?: string;
      email?: string;
      username?: string;
      name?: string;
      roles?: string[];
      isAdmin?: boolean;
      emailVerified?: boolean;
    };

    logger.debug('[optionalAuth] Token decoded:', {
      sub: decoded.sub,
      id: decoded.id,
      email: decoded.email,
      roles: decoded.roles,
    });

    // Attach user information if valid
    if (decoded.sub || decoded.id) {
      req.user = {
        id: decoded.sub || decoded.id || '',
        email: decoded.email || '',
        username: decoded.username || decoded.name,
        roles: decoded.roles || [],
        isAdmin: (decoded.roles || []).includes('admin') || decoded.isAdmin || false,
        emailVerified: decoded.emailVerified || false,
      };

      logger.debug('[optionalAuth] User attached to request:', {
        userId: req.user.id,
        email: req.user.email,
      });

      logger.debug('Optional auth: User authenticated', {
        traceId,
        spanId,
        userId: req.user.id,
      });
    }

    next();
  } catch (error: unknown) {
    // Token is invalid, but we don't fail the request
    const err = error as Error;
    logger.debug('[optionalAuth] Token verification FAILED:', {
      errorName: err.name,
      errorMessage: err.message,
    });

    logger.debug('Optional auth: Token invalid, continuing without user', {
      traceId,
      spanId,
      error: err.message,
    });

    req.user = undefined;
    next();
  }
};

/**
 * Middleware to require specific roles
 * Must be used after requireAuth middleware
 */
export const requireRoles = (...roles: string[]) => {
  return (req: RequestWithAuth, res: Response, next: NextFunction): void => {
    const { traceId, spanId } = req;

    if (!req.user) {
      logger.warn('Authorization check failed: No user in request', { traceId, spanId });
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
        traceId,
        spanId,
      });
      return;
    }

    const userRoles = req.user.roles || [];
    const hasRequiredRole = roles.some((role) => userRoles.includes(role));

    if (!hasRequiredRole) {
      logger.warn('Authorization check failed: Insufficient permissions', {
        traceId,
        spanId,
        userId: req.user.id,
        userRoles,
        requiredRoles: roles,
      });
      res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
          details: `Required roles: ${roles.join(', ')}`,
        },
        traceId,
        spanId,
      });
      return;
    }

    // logger.debug('Authorization check passed', {
    //   traceId,
    //   spanId,
    //   userId: req.user.id,
    //   userRoles,
    //   requiredRoles: roles,
    // });

    next();
  };
};

/**
 * Middleware to require admin role
 * Convenience wrapper around requireRoles
 */
export const requireAdmin = requireRoles('admin');
