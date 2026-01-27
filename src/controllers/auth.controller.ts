/**
 * Auth Controller for Web BFF
 * Handles all authentication and authorization operations
 */

import { Response } from 'express';
import { asyncHandler } from '@middleware/asyncHandler.middleware';
import { authClient } from '@clients/auth.client';
import logger from '../core/logger';
import { RequestWithTraceContext } from '@middleware/traceContext.middleware';

/**
 * POST /api/auth/login
 * User login
 */
export const login = asyncHandler(async (req: RequestWithTraceContext, res: Response) => {
  const { traceId, spanId } = req;
  const { email, password } = req.body;

  // logger.info('Login attempt', {
  //   traceId, spanId,
  //   email,
  // });

  const data = await authClient.login(
    { email, password },
    {
      traceparent: `00-${traceId}-${spanId}-01`,
    }
  );

  res.json(data);
});

/**
 * POST /api/auth/register
 * User registration
 */
export const register = asyncHandler(async (req: RequestWithTraceContext, res: Response) => {
  const { traceId, spanId } = req;
  const { email, password, firstName, lastName, phoneNumber } = req.body;

  // DEBUG: Log what web-bff receives and forwards
  logger.info('Registration request received at BFF', {
    traceId,
    spanId,
    bodyKeys: Object.keys(req.body),
    hasFirstName: !!firstName,
    hasLastName: !!lastName,
    firstNameValue: firstName,
    lastNameValue: lastName,
    rawBody: JSON.stringify(req.body),
  });

  logger.info('Registration attempt', {
    traceId,
    spanId,
    email,
  });

  const data = await authClient.register(
    { email, password, firstName, lastName, phoneNumber },
    {
      traceparent: `00-${traceId}-${spanId}-01`,
    }
  );

  res.json(data);
});

/**
 * POST /api/auth/logout
 * User logout
 */
export const logout = asyncHandler(async (req: RequestWithTraceContext, res: Response) => {
  const { traceId, spanId } = req;
  const { refreshToken } = req.body;

  logger.info('Logout attempt', {
    traceId,
    spanId,
  });

  await authClient.logout(refreshToken, {
    traceparent: `00-${traceId}-${spanId}-01`,
  });

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
export const refreshToken = asyncHandler(async (req: RequestWithTraceContext, res: Response) => {
  const { traceId, spanId } = req;
  const { refreshToken } = req.body;

  logger.info('Token refresh attempt', {
    traceId,
    spanId,
  });

  const data = await authClient.refreshToken(
    { refreshToken },
    {
      traceparent: `00-${traceId}-${spanId}-01`,
    }
  );

  res.json(data);
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
export const getCurrentUser = async (
  req: RequestWithTraceContext,
  res: Response
): Promise<void> => {
  try {
    const { traceId, spanId } = req;
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({
        success: false,
        error: { message: 'No token provided' },
      });
      return;
    }

    logger.info('Get current user', {
      traceId,
      spanId,
    });

    const data = await authClient.getCurrentUser(token, {
      traceparent: `00-${traceId}-${spanId}-01`,
    });

    res.json(data);
  } catch (error: unknown) {
    const { traceId, spanId } = req;
    const err = error as Error & { response?: { status?: number; data?: { message?: string } } };
    logger.error('Get current user error', {
      traceId,
      spanId,
      error: err.message,
    });

    res.status(err.response?.status || 500).json({
      success: false,
      error: {
        message: err.response?.data?.message || 'Failed to get user',
      },
    });
  }
};

/**
 * GET /api/auth/verify
 * Verify JWT token (dedicated token verification endpoint)
 */
export const verifyToken = asyncHandler(async (req: RequestWithTraceContext, res: Response) => {
  const { traceId, spanId } = req;
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({
      success: false,
      error: { message: 'Authorization token required' },
    });
    return;
  }

  // logger.info('Token verification attempt', {
  //   traceId, spanId,
  // });

  const data = await authClient.verifyToken(token, {
    traceparent: `00-${traceId}-${spanId}-01`,
  });

  res.json(data);
});

/**
 * GET /api/auth/email/verify
 * Verify email with token
 */
export const verifyEmail = asyncHandler(async (req: RequestWithTraceContext, res: Response) => {
  const { traceId, spanId } = req;
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    res.status(400).json({
      success: false,
      error: { message: 'Token is required' },
    });
    return;
  }

  logger.info('Email verification attempt', {
    traceId,
    spanId,
  });

  const data = await authClient.verifyEmail(token, {
    traceparent: `00-${traceId}-${spanId}-01`,
  });

  res.json(data);
});

/**
 * POST /api/auth/email/resend
 * Resend verification email
 */
export const resendVerificationEmail = asyncHandler(
  async (req: RequestWithTraceContext, res: Response) => {
    const { traceId, spanId } = req;
    const { email } = req.body;

    logger.info('Resend verification email', {
      traceId,
      spanId,
      email,
    });

    const data = await authClient.resendVerificationEmail(email, {
      traceparent: `00-${traceId}-${spanId}-01`,
    });

    res.json(data);
  }
);

/**
 * POST /api/auth/password/forgot
 * Request password reset
 */
export const forgotPassword = asyncHandler(async (req: RequestWithTraceContext, res: Response) => {
  const { traceId, spanId } = req;
  const { email } = req.body;

  logger.info('Password reset request', {
    traceId,
    spanId,
    email,
  });

  const data = await authClient.forgotPassword(
    { email },
    {
      traceparent: `00-${traceId}-${spanId}-01`,
    }
  );

  res.json(data);
});

/**
 * POST /api/auth/password/reset
 * Reset password with token
 */
export const resetPassword = asyncHandler(async (req: RequestWithTraceContext, res: Response) => {
  const { traceId, spanId } = req;
  const { token, password } = req.body;

  logger.info('Password reset', {
    traceId,
    spanId,
  });

  const data = await authClient.resetPassword(
    { token, password },
    {
      traceparent: `00-${traceId}-${spanId}-01`,
    }
  );

  res.json(data);
});

/**
 * POST /api/auth/password/change
 * Change password for authenticated user
 */
export const changePassword = async (
  req: RequestWithTraceContext,
  res: Response
): Promise<void> => {
  try {
    const { traceId, spanId } = req;
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({
        success: false,
        error: { message: 'No token provided' },
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    logger.info('Password change attempt', {
      traceId,
      spanId,
    });

    const data = await authClient.changePassword({ currentPassword, newPassword }, token, {
      traceparent: `00-${traceId}-${spanId}-01`,
    });

    res.json(data);
  } catch (error: unknown) {
    const { traceId, spanId } = req;
    const err = error as Error & { response?: { status?: number; data?: { message?: string } } };
    logger.error('Password change error', {
      traceId,
      spanId,
      error: err.message,
    });

    res.status(err.response?.status || 500).json({
      success: false,
      error: {
        message: err.response?.data?.message || 'Password change failed',
      },
    });
  }
};
