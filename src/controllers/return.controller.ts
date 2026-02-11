/**
 * Return Controller for Web BFF
 * Handles all return operations for authenticated users
 */

import { Response } from 'express';
import { asyncHandler } from '@middleware/asyncHandler.middleware';
import { orderClient } from '@clients/order.client';
import logger from '../core/logger';
import { RequestWithTraceContext } from '@middleware/traceContext.middleware';
import jwt from 'jsonwebtoken';

// ============================================================================
// Helper functions
// ============================================================================
const getToken = (req: RequestWithTraceContext): string | null => {
  return req.headers.authorization?.replace('Bearer ', '') || null;
};

const getUserIdFromToken = (token: string): string | null => {
  try {
    const decoded = jwt.decode(token) as { sub?: string; id?: string } | null;
    return decoded?.sub || decoded?.id || null;
  } catch (error) {
    logger.error('Error decoding JWT token', { error });
    return null;
  }
};

const requireAuth = (
  req: RequestWithTraceContext,
  res: Response
): { token: string; userId: string } | null => {
  const token = getToken(req);
  if (!token) {
    res.status(401).json({
      success: false,
      error: { message: 'Authentication required' },
    });
    return null;
  }

  const userId = getUserIdFromToken(token);
  if (!userId) {
    res.status(401).json({
      success: false,
      error: { message: 'Invalid authentication token' },
    });
    return null;
  }

  return { token, userId };
};

// ============================================================================
// Return Controllers
// ============================================================================

/**
 * POST /api/returns
 * Create a new return request (customer only)
 */
export const createReturn = asyncHandler(async (req: RequestWithTraceContext, res: Response) => {
  const { traceId, spanId } = req;
  const auth = requireAuth(req, res);
  if (!auth) return;

  const { orderId, reason, description, items } = req.body;

  // Validation
  if (!orderId || !reason || !description || !items || items.length === 0) {
    res.status(400).json({
      success: false,
      error: { message: 'Missing required fields: orderId, reason, description, items' },
    });
    return;
  }

  if (description.length < 10 || description.length > 1000) {
    res.status(400).json({
      success: false,
      error: { message: 'Description must be between 10 and 1000 characters' },
    });
    return;
  }

  logger.info('Creating return request', {
    traceId,
    spanId,
    customerId: auth.userId,
    orderId,
    reason,
    itemCount: items.length,
  });

  try {
    const headers = {
      Authorization: req.headers.authorization || '',
      'X-Correlation-ID': traceId,
    };

    const returnResponse = await orderClient.createReturn(
      {
        orderId,
        reason,
        description,
        items,
      },
      headers
    );

    logger.info('Return request created', {
      traceId,
      spanId,
      returnId: returnResponse.id,
      returnNumber: returnResponse.returnNumber,
    });

    res.status(201).json({
      success: true,
      data: returnResponse,
    });
  } catch (error: unknown) {
    const err = error as Error & { response?: { status?: number; data?: unknown } };
    logger.error('Failed to create return request', {
      traceId,
      spanId,
      error: err.message,
      statusCode: err.response?.status,
    });

    res.status(err.response?.status || 500).json({
      success: false,
      error: { message: err.message || 'Failed to create return request' },
    });
  }
});

/**
 * GET /api/returns/my
 * Get all returns for current customer
 */
export const getMyReturns = asyncHandler(async (req: RequestWithTraceContext, res: Response) => {
  const { traceId, spanId } = req;
  const auth = requireAuth(req, res);
  if (!auth) return;

  logger.info('Getting my returns', {
    traceId,
    spanId,
    customerId: auth.userId,
  });

  try {
    const headers = {
      Authorization: req.headers.authorization || '',
      'X-Correlation-ID': traceId,
    };

    const returns = await orderClient.getMyReturns(headers);

    logger.info('Retrieved returns', {
      traceId,
      spanId,
      returnCount: returns.length,
    });

    res.json({
      success: true,
      data: returns,
    });
  } catch (error: unknown) {
    const err = error as Error & { response?: { status?: number } };
    logger.error('Failed to get returns', {
      traceId,
      spanId,
      error: err.message,
    });

    res.status(err.response?.status || 500).json({
      success: false,
      error: { message: 'Failed to fetch returns' },
    });
  }
});

/**
 * GET /api/returns/:id
 * Get return by ID
 */
export const getReturnById = asyncHandler(async (req: RequestWithTraceContext, res: Response) => {
  const { traceId, spanId } = req;
  const auth = requireAuth(req, res);
  if (!auth) return;

  const { id } = req.params;

  logger.info('Getting return by ID', {
    traceId,
    spanId,
    returnId: id,
  });

  try {
    const headers = {
      Authorization: req.headers.authorization || '',
      'X-Correlation-ID': traceId,
    };

    const returnResponse = await orderClient.getReturnById(id, headers);

    logger.info('Retrieved return', {
      traceId,
      spanId,
      returnId: id,
      returnNumber: returnResponse.returnNumber,
    });

    res.json({
      success: true,
      data: returnResponse,
    });
  } catch (error: unknown) {
    const err = error as Error & { response?: { status?: number } };
    logger.error('Failed to get return', {
      traceId,
      spanId,
      returnId: id,
      error: err.message,
    });

    res.status(err.response?.status || 500).json({
      success: false,
      error: { message: 'Failed to fetch return' },
    });
  }
});

/**
 * GET /api/returns/order/:orderId
 * Get returns for specific order
 */
export const getReturnsByOrder = asyncHandler(
  async (req: RequestWithTraceContext, res: Response) => {
    const { traceId, spanId } = req;
    const auth = requireAuth(req, res);
    if (!auth) return;

    const { orderId } = req.params;

    logger.info('Getting returns for order', {
      traceId,
      spanId,
      orderId,
    });

    try {
      const headers = {
        Authorization: req.headers.authorization || '',
        'X-Correlation-ID': traceId,
      };

      const returns = await orderClient.getReturnsByOrder(orderId, headers);

      logger.info('Retrieved returns for order', {
        traceId,
        spanId,
        orderId,
        returnCount: returns.length,
      });

      res.json({
        success: true,
        data: returns,
      });
    } catch (error: unknown) {
      const err = error as Error & { response?: { status?: number } };
      logger.error('Failed to get returns for order', {
        traceId,
        spanId,
        orderId,
        error: err.message,
      });

      res.status(err.response?.status || 500).json({
        success: false,
        error: { message: 'Failed to fetch returns for order' },
      });
    }
  }
);

/**
 * GET /api/returns/eligibility/:orderId
 * Check if order is eligible for return
 */
export const checkReturnEligibility = asyncHandler(
  async (req: RequestWithTraceContext, res: Response) => {
    const { traceId, spanId } = req;
    const auth = requireAuth(req, res);
    if (!auth) return;

    const { orderId } = req.params;

    logger.info('Checking return eligibility', {
      traceId,
      spanId,
      orderId,
    });

    try {
      const headers = {
        Authorization: req.headers.authorization || '',
        'X-Correlation-ID': traceId,
      };

      const eligibility = await orderClient.checkReturnEligibility(orderId, headers);

      logger.info('Checked return eligibility', {
        traceId,
        spanId,
        orderId,
        isEligible: eligibility.isEligible,
      });

      res.json({
        success: true,
        data: eligibility,
      });
    } catch (error: unknown) {
      const err = error as Error & { response?: { status?: number } };
      logger.error('Failed to check return eligibility', {
        traceId,
        spanId,
        orderId,
        error: err.message,
      });

      res.status(err.response?.status || 500).json({
        success: false,
        error: { message: 'Failed to check return eligibility' },
      });
    }
  }
);
