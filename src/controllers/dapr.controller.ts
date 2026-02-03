/**
 * Dapr Integration Controller
 *
 * Handles Dapr sidecar discovery endpoints. These are called by the Dapr sidecar
 * on startup to discover application capabilities (pub/sub subscriptions, config).
 *
 * See: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
 */

import { Request, Response } from 'express';

/**
 * Dapr Subscribe endpoint - declare pub/sub subscriptions
 *
 * Called by Dapr sidecar on startup to discover what topics this app subscribes to.
 * Return an array of subscription objects, or empty array if no subscriptions.
 *
 * Example subscription object:
 * {
 *   pubsubname: "pubsub",
 *   topic: "orders",
 *   route: "/api/orders/events"
 * }
 */
export const subscribe = (_req: Request, res: Response): void => {
  // Web-BFF has no pub/sub subscriptions
  // It only uses Dapr for service-to-service invocation
  res.json([]);
};

/**
 * Dapr Config endpoint - app-level Dapr configuration
 *
 * Called by Dapr sidecar on startup to get application-specific configuration.
 * Return empty object for default behavior, or specify entities for actors, etc.
 *
 * Example config object:
 * {
 *   entities: ["orderActor", "userActor"]
 * }
 */
export const config = (_req: Request, res: Response): void => {
  // Web-BFF uses default Dapr configuration
  // No actors or special config needed
  res.json({});
};
