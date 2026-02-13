/**
 * Review Routes for Web BFF
 * Route definitions only - all logic is in review.controller.ts
 *
 * Customer routes: POST, PUT, DELETE own reviews (requires authentication)
 * Admin routes are handled separately in admin.routes.ts for consistency
 */

import { Router, RequestHandler } from 'express';
import * as reviewController from '@controllers/review.controller';
import { requireAuth } from '@middleware/auth.middleware';

const router = Router();

// Apply authentication to all review routes (customers can only manage their own reviews)
router.use(requireAuth as unknown as RequestHandler);

// Customer Review Routes
router.get('/my', reviewController.getMyReviews as unknown as RequestHandler);
router.post('/', reviewController.createReview as unknown as RequestHandler);
router.put('/:id', reviewController.updateReview as unknown as RequestHandler);
router.delete('/:id', reviewController.deleteReview as unknown as RequestHandler);

export default router;
