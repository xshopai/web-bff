/**
 * Return Routes for Web BFF
 * Route definitions only - all logic is in return.controller.ts
 * All routes require authentication
 */

import { Router, RequestHandler } from 'express';
import * as returnController from '@controllers/return.controller';
import { requireAuth } from '@middleware/auth.middleware';

const router = Router();

// Apply authentication to all return routes
router.use(requireAuth as unknown as RequestHandler);

// Customer Return Routes
router.post('/', returnController.createReturn as unknown as RequestHandler);
router.get('/my', returnController.getMyReturns as unknown as RequestHandler);
router.get('/:id', returnController.getReturnById as unknown as RequestHandler);
router.get('/order/:orderId', returnController.getReturnsByOrder as unknown as RequestHandler);
router.get(
  '/eligibility/:orderId',
  returnController.checkReturnEligibility as unknown as RequestHandler
);

export default router;
