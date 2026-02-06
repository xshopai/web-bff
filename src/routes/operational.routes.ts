/**
 * Operational Routes for Web BFF
 * Route definitions only - all logic is in operational.controller.ts
 * These endpoints are used by monitoring systems, load balancers, and DevOps tools
 */

import { Router } from 'express';
import * as operationalController from '@controllers/operational.controller';

const router = Router();

// Health check endpoints - Kubernetes standard convention
router.get('/health/ready', operationalController.readiness); // Standard path
router.get('/health/live', operationalController.liveness); // Standard path for Docker HEALTHCHECK
router.get('/metrics', operationalController.metrics);

export default router;
