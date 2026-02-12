/**
 * Chat Routes for Web BFF
 * Proxies chat requests to chat-service via Dapr
 */

import { Router, RequestHandler } from 'express';
import { HttpMethod } from '@dapr/dapr';
import { serviceInvoker } from '../core/serviceInvoker';
import config from '../core/config';
import logger, { withTraceContext } from '../core/logger';
import { requireAuth, optionalAuth, RequestWithAuth } from '@middleware/auth.middleware';

const router = Router();

/**
 * POST /api/chat/message
 * Send a chat message and get AI response
 * Uses optional auth - can work without login for product queries
 */
router.post(
  '/message',
  optionalAuth as unknown as RequestHandler,
  (async (req, res) => {
    const authReq = req as unknown as RequestWithAuth;
    const traceId = (req.headers['x-trace-id'] as string) || '';
    const log = withTraceContext(traceId, '');

    try {
      const { message, conversationId, context } = req.body;

      if (!message || typeof message !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Message is required and must be a string',
        });
        return;
      }

      // DEBUG: Log user context from optionalAuth
      logger.debug('[chat.routes] /message endpoint:', {
        hasUser: !!authReq.user,
        userId: authReq.user?.id,
        userEmail: authReq.user?.email,
        messagePreview: message.substring(0, 50),
      });

      log.info('Forwarding chat message to chat-service', {
        userId: authReq.user?.id,
        conversationId,
        messageLength: message.length,
      });

      // Get authorization header to pass through for order-service calls
      const authHeader = req.headers['authorization'] as string | undefined;

      // Forward to chat-service with user context
      const response = await serviceInvoker.invokeService(
        config.services.chat,
        'api/chat/message',
        HttpMethod.POST,
        {
          message,
          conversationId,
          context,
          userId: authReq.user?.id, // Will be undefined if not authenticated
          authToken: authHeader, // Pass auth token for downstream service calls
        }
      );

      res.json(response);
    } catch (error: unknown) {
      const err = error as Error;
      log.error('Failed to process chat message', {
        error: err.message,
        stack: err.stack,
      });

      // Handle specific error cases
      if (err.message?.includes('ECONNREFUSED') || err.message?.includes('not found')) {
        res.status(503).json({
          success: false,
          error: 'Service Unavailable',
          message: 'Chat service is currently unavailable. Please try again later.',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to process chat message',
      });
    }
  }) as RequestHandler
);

/**
 * GET /api/chat/history/:conversationId
 * Get conversation history (requires authentication)
 */
router.get(
  '/history/:conversationId',
  requireAuth as unknown as RequestHandler,
  (async (req, res) => {
    const authReq = req as unknown as RequestWithAuth;
    const traceId = (req.headers['x-trace-id'] as string) || '';
    const log = withTraceContext(traceId, '');

    try {
      const { conversationId } = req.params;

      log.info('Fetching chat history', {
        userId: authReq.user?.id,
        conversationId,
      });

      const response = await serviceInvoker.invokeService(
        config.services.chat,
        `api/chat/history/${conversationId}`,
        HttpMethod.GET
      );

      res.json(response);
    } catch (error: unknown) {
      const err = error as Error;
      log.error('Failed to fetch chat history', {
        error: err.message,
      });

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch chat history',
      });
    }
  }) as RequestHandler
);

export default router;
