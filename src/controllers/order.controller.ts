/**
 * Order Controller for Web BFF
 * Handles all order operations for authenticated users
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
// Order Controllers
// ============================================================================

/**
 * POST /api/orders
 * Create a new order (customer only)
 */
export const createOrder = asyncHandler(async (req: RequestWithTraceContext, res: Response) => {
  const { traceId, spanId } = req;
  const auth = requireAuth(req, res);
  if (!auth) return;

  logger.info('Creating order', {
    traceId,
    spanId,
    customerId: auth.userId,
  });

  // Fetch user profile to capture customer information snapshot
  let customerName = '';
  let customerEmail = '';
  let customerPhone = '';

  try {
    const { userClient } = await import('../clients/user.client');
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');

    if (token) {
      const userProfile = await userClient.getProfile(token);
      customerName = `${userProfile.firstName} ${userProfile.lastName}`.trim();
      customerEmail = userProfile.email || '';
      customerPhone = userProfile.phoneNumber || '';

      logger.info('Fetched user profile for order', {
        traceId,
        spanId,
        customerId: auth.userId,
        customerName,
        customerPhone,
      });
    }
  } catch (error: unknown) {
    const err = error as Error;
    logger.warn('Failed to fetch user profile, using JWT data only', {
      traceId,
      spanId,
      error: err.message,
    });
  }

  // Set customer information from JWT token and user profile
  const orderData = {
    ...req.body,
    customerId: auth.userId,
    customerName,
    customerEmail,
    customerPhone,
  };

  // Forward JWT token to order service
  const headers: Record<string, string> = {};
  if (req.headers.authorization) {
    headers.Authorization = req.headers.authorization;
  }
  if (req.correlationId) {
    headers['X-Correlation-ID'] = req.correlationId;
  }

  logger.debug('[OrderController] Forwarding headers to order-service', { headers });

  const order = await orderClient.createOrder(orderData, headers);

  logger.info('Order created successfully', {
    traceId,
    spanId,
    orderId: order.id,
  });

  res.status(201).json({
    success: true,
    data: order,
  });
});

/**
 * GET /api/orders/my
 * Get current user's orders
 */
export const getMyOrders = asyncHandler(async (req: RequestWithTraceContext, res: Response) => {
  const { traceId, spanId } = req;
  const auth = requireAuth(req, res);
  if (!auth) return;

  logger.info('Fetching user orders', {
    traceId,
    spanId,
    customerId: auth.userId,
  });

  const headers: Record<string, string> = {};
  if (req.headers.authorization) {
    headers.Authorization = req.headers.authorization;
  }
  if (req.correlationId) {
    headers['X-Correlation-ID'] = req.correlationId;
  }

  const orders = await orderClient.getMyOrders(auth.userId, headers);

  res.json({
    success: true,
    data: orders,
  });
});

/**
 * GET /api/orders/my/paged
 * Get current user's orders with pagination
 */
export const getMyOrdersPaged = async (
  req: RequestWithTraceContext,
  res: Response
): Promise<void> => {
  try {
    const { traceId, spanId } = req;
    const auth = requireAuth(req, res);
    if (!auth) return;

    logger.info('Fetching user orders (paged)', {
      traceId,
      spanId,
      customerId: auth.userId,
      page: req.query.page,
      pageSize: req.query.pageSize,
    });

    const headers: Record<string, string> = {};
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }
    if (req.correlationId) {
      headers['X-Correlation-ID'] = req.correlationId;
    }

    const params = {
      page: String(req.query.page || '1'),
      pageSize: String(req.query.pageSize || '10'),
    };

    const pagedOrders = await orderClient.getMyOrdersPaged(auth.userId, headers, params);

    res.json({
      success: true,
      data: pagedOrders,
    });
  } catch (error: unknown) {
    const err = error as Error & { response?: { status?: number } };
    const { traceId, spanId } = req;
    logger.error('Error fetching user orders (paged)', {
      traceId,
      spanId,
      error: err.message,
    });

    res.status(err.response?.status || 500).json({
      success: false,
      error: {
        message: 'Failed to fetch orders',
      },
    });
  }
};

/**
 * GET /api/orders/:id
 * Get order by ID (customer can view own orders)
 */
export const getOrderById = asyncHandler(async (req: RequestWithTraceContext, res: Response) => {
  const { traceId, spanId } = req;
  const auth = requireAuth(req, res);
  if (!auth) return;

  const { id } = req.params;

  logger.info('Fetching order', {
    traceId,
    spanId,
    orderId: id,
  });

  const headers: Record<string, string> = {};
  if (req.headers.authorization) {
    headers.Authorization = req.headers.authorization;
  }
  if (req.correlationId) {
    headers['X-Correlation-ID'] = req.correlationId;
  }

  const order = await orderClient.getOrderById(id, headers);

  res.json({
    success: true,
    data: order,
  });
});

/**
 * POST /api/orders/:id/cancel
 * Cancel an order
 */
export const cancelOrder = asyncHandler(async (req: RequestWithTraceContext, res: Response) => {
  const { traceId, spanId } = req;
  const { id: orderId } = req.params;
  const { cancellationReason } = req.body;

  const auth = requireAuth(req, res);
  if (!auth) return;

  // Validate cancellation reason
  if (!cancellationReason || typeof cancellationReason !== 'string') {
    res.status(400).json({
      success: false,
      error: { message: 'Cancellation reason is required' },
    });
    return;
  }

  if (cancellationReason.trim().length < 5) {
    res.status(400).json({
      success: false,
      error: { message: 'Cancellation reason must be at least 5 characters' },
    });
    return;
  }

  if (cancellationReason.length > 500) {
    res.status(400).json({
      success: false,
      error: { message: 'Cancellation reason must be at most 500 characters' },
    });
    return;
  }

  logger.info('Cancelling order', {
    traceId,
    spanId,
    customerId: auth.userId,
    orderId,
  });

  const headers: Record<string, string> = {};
  if (req.headers.authorization) {
    headers.Authorization = req.headers.authorization;
  }
  if (req.correlationId) {
    headers['X-Correlation-ID'] = req.correlationId;
  }

  const cancelledOrder = await orderClient.cancelOrder(
    orderId,
    { cancellationReason: cancellationReason.trim() },
    headers
  );

  logger.info('Order cancelled successfully', {
    traceId,
    spanId,
    orderId,
    orderNumber: cancelledOrder.orderNumber,
  });

  res.json({
    success: true,
    data: cancelledOrder,
  });
});

/**
 * GET /api/orders/:id/tracking
 * Get order tracking information
 */
export const getOrderTracking = asyncHandler(
  async (req: RequestWithTraceContext, res: Response) => {
    const { traceId, spanId } = req;
    const { id: orderId } = req.params;

    const auth = requireAuth(req, res);
    if (!auth) return;

    logger.info('Getting order tracking', {
      traceId,
      spanId,
      customerId: auth.userId,
      orderId,
    });

    const headers: Record<string, string> = {};
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }
    if (req.correlationId) {
      headers['X-Correlation-ID'] = req.correlationId;
    }

    const trackingInfo = await orderClient.getOrderTracking(orderId, headers);

    logger.info('Order tracking retrieved successfully', {
      traceId,
      spanId,
      orderId,
      hasTracking: !!trackingInfo.trackingNumber,
    });

    res.json({
      success: true,
      data: trackingInfo,
    });
  }
);
