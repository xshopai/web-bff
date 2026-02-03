/**
 * Dapr Integration Routes
 *
 * These endpoints are called by the Dapr sidecar, not by external clients.
 * They enable Dapr to discover application capabilities on startup.
 *
 * Endpoints:
 *   GET /dapr/subscribe - Declare pub/sub topic subscriptions
 *   GET /dapr/config    - Declare app-level Dapr configuration
 *
 * See: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
 */

import { Router } from 'express';
import * as daprController from '@controllers/dapr.controller';

const router = Router();

// Dapr discovery endpoints
router.get('/dapr/subscribe', daprController.subscribe);
router.get('/dapr/config', daprController.config);

export default router;
