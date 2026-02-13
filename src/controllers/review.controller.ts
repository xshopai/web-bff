/**
 * Review Controller for Web BFF
 * Handles review-related operations
 */

import { Response } from 'express';
import { asyncHandler } from '@middleware/asyncHandler.middleware';
import { RequestWithAuth } from '@middleware/auth.middleware';
import { reviewClient } from '@clients/review.client';
import logger from '@/core/logger';

// Response interface for type safety
interface ReviewResponse {
  data?: {
    id?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * POST /api/reviews
 * Create a new review
 */
export const createReview = asyncHandler(async (req: RequestWithAuth, res: Response) => {
  const { traceId, spanId } = req;
  const reviewData = req.body;

  logger.info('Creating review', {
    traceId,
    spanId,
    productId: reviewData.productId,
    userId: req.user?.id,
  });

  // Add user information from auth context
  const enrichedData = {
    ...reviewData,
    userId: req.user?.id,
    userEmail: req.user?.email || reviewData.email,
    userName: req.user?.username || reviewData.author,
  };

  const headers = {
    authorization: req.get('authorization') || '',
    'X-Correlation-Id': req.correlationId || 'no-correlation',
    traceparent: `00-${traceId}-${spanId}-01`,
  };

  const result = (await reviewClient.createReview(enrichedData, headers)) as ReviewResponse;

  logger.info('Review created successfully', {
    traceId,
    spanId,
    reviewId: result.data?.id,
  });

  res.status(201).json({
    success: true,
    data: result.data,
  });
});

/**
 * PUT /api/reviews/:id
 * Update an existing review
 */
export const updateReview = asyncHandler(async (req: RequestWithAuth, res: Response) => {
  const { traceId, spanId } = req;
  const { id } = req.params;
  const reviewData = req.body;

  logger.info('Updating review', {
    traceId,
    spanId,
    reviewId: id,
    userId: req.user?.id,
  });

  const headers = {
    authorization: req.get('authorization') || '',
    'X-Correlation-Id': req.correlationId || 'no-correlation',
    traceparent: `00-${traceId}-${spanId}-01`,
  };

  const result = (await reviewClient.updateReview(id, reviewData, headers)) as ReviewResponse;

  logger.info('Review updated successfully', {
    traceId,
    spanId,
    reviewId: id,
  });

  res.json({
    success: true,
    data: result.data,
  });
});

/**
 * DELETE /api/reviews/:id
 * Delete a review
 */
export const deleteReview = asyncHandler(async (req: RequestWithAuth, res: Response) => {
  const { traceId, spanId } = req;
  const { id } = req.params;

  logger.info('Deleting review', {
    traceId,
    spanId,
    reviewId: id,
    userId: req.user?.id,
  });

  const headers = {
    authorization: req.get('authorization') || '',
    'X-Correlation-Id': req.correlationId || 'no-correlation',
    traceparent: `00-${traceId}-${spanId}-01`,
  };

  await reviewClient.deleteReview(id, headers);

  logger.info('Review deleted successfully', {
    traceId,
    spanId,
    reviewId: id,
  });

  res.json({
    success: true,
    message: 'Review deleted successfully',
  });
});

/**
 * GET /api/reviews/my
 * Get authenticated user's own reviews
 */
export const getMyReviews = asyncHandler(async (req: RequestWithAuth, res: Response) => {
  const { traceId, spanId } = req;

  logger.info('Fetching user reviews', {
    traceId,
    spanId,
    userId: req.user?.id,
    query: req.query,
  });

  const headers = {
    authorization: req.get('authorization') || '',
    'X-Correlation-Id': req.correlationId || 'no-correlation',
    traceparent: `00-${traceId}-${spanId}-01`,
  };

  const params: Record<string, string> = {};
  if (req.query.page) params.page = String(req.query.page);
  if (req.query.limit) params.limit = String(req.query.limit);
  if (req.query.sort) params.sort = String(req.query.sort);
  if (req.query.status) params.status = String(req.query.status);

  const result = (await reviewClient.getUserReviews(headers, params)) as {
    data?: unknown;
    success?: boolean;
  };

  logger.info('User reviews fetched successfully', {
    traceId,
    spanId,
    userId: req.user?.id,
  });

  res.json({
    success: true,
    data: result.data,
  });
});
