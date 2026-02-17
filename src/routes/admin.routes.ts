/**
 * Admin Dashboard Routes for Web BFF
 * Route definitions only - all logic is in admin.controller.ts
 * All routes require admin authentication
 */

import { Router, RequestHandler } from 'express';
import * as adminController from '@controllers/admin.controller';
import { requireAuth, requireAdmin } from '@middleware/auth.middleware';

const router = Router();

// Apply authentication and admin role check to all admin routes
router.use(requireAuth as unknown as RequestHandler);
router.use(requireAdmin as unknown as RequestHandler);

// Dashboard Routes
router.get('/dashboard/stats', adminController.getDashboardStats as unknown as RequestHandler);

// User Management Routes
router.get('/users', adminController.getAllUsers as unknown as RequestHandler);
router.get('/users/:id', adminController.getUserById as unknown as RequestHandler);
router.post('/users', adminController.createUser as unknown as RequestHandler);
router.patch('/users/:id', adminController.updateUser as unknown as RequestHandler);
router.delete('/users/:id', adminController.deleteUser as unknown as RequestHandler);

// Product Management Routes
router.get('/products', adminController.getAllProducts as unknown as RequestHandler);
router.get('/products/:id', adminController.getProductById as unknown as RequestHandler);
router.post('/products', adminController.createProduct as unknown as RequestHandler);
router.patch('/products/:id', adminController.updateProduct as unknown as RequestHandler);
router.delete('/products/:id', adminController.deleteProduct as unknown as RequestHandler);
router.patch('/products/:id/reactivate', adminController.reactivateProduct as unknown as RequestHandler);

// Review Management Routes
router.get('/reviews', adminController.getAllReviews as unknown as RequestHandler);
router.get('/reviews/stats', adminController.getReviewStats as unknown as RequestHandler);
router.get('/reviews/:id', adminController.getReviewById as unknown as RequestHandler);
router.patch('/reviews/:id', adminController.updateReview as unknown as RequestHandler);
router.delete('/reviews/:id', adminController.deleteReview as unknown as RequestHandler);
router.post('/reviews/bulk-delete', adminController.bulkDeleteReviews as unknown as RequestHandler);

// Order Management Routes
router.get('/orders', adminController.getAllOrders as unknown as RequestHandler);
router.get('/orders/paged', adminController.getOrdersPaged as unknown as RequestHandler);
router.get('/orders/:id', adminController.getOrderById as unknown as RequestHandler);
router.get('/orders/:id/tracking', adminController.getOrderTracking as unknown as RequestHandler);
router.get('/orders/:id/payment', adminController.getOrderPayment as unknown as RequestHandler);
router.put('/orders/:id/status', adminController.updateOrderStatus as unknown as RequestHandler);
router.post(
  '/orders/:id/confirm-payment',
  adminController.confirmOrderPayment as unknown as RequestHandler
);
router.post(
  '/orders/:id/fail-payment',
  adminController.rejectOrderPayment as unknown as RequestHandler
);
router.delete('/orders/:id', adminController.deleteOrder as unknown as RequestHandler);

// Return Management Routes
router.get('/returns', adminController.getAllReturns as unknown as RequestHandler);
router.get('/returns/paged', adminController.getReturnsPaged as unknown as RequestHandler);
router.get('/returns/stats', adminController.getReturnStats as unknown as RequestHandler);
router.get('/returns/:id', adminController.getReturnById as unknown as RequestHandler);
router.put('/returns/:id/status', adminController.updateReturnStatus as unknown as RequestHandler);

export default router;
