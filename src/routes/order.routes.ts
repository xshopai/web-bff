/**
 * Order Routes for Web BFF
 * Route definitions only - all logic is in order.controller.ts
 * All routes require authentication
 */

import { Router, RequestHandler } from 'express';
import * as orderController from '@controllers/order.controller';
import { requireAuth } from '@middleware/auth.middleware';

const router = Router();

// Apply authentication to all order routes
router.use(requireAuth as unknown as RequestHandler);

// Order Routes
router.post('/', orderController.createOrder as unknown as RequestHandler);
router.get('/my', orderController.getMyOrders as unknown as RequestHandler);
router.get('/my/paged', orderController.getMyOrdersPaged as unknown as RequestHandler);
router.get('/:id', orderController.getOrderById as unknown as RequestHandler);
router.post('/:id/cancel', orderController.cancelOrder as unknown as RequestHandler);
router.get('/:id/tracking', orderController.getOrderTracking as unknown as RequestHandler);

export default router;
