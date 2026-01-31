/**
 * Application Insights instrumentation for web-bff
 *
 * IMPORTANT: This file must be imported FIRST before any other imports
 * to ensure all HTTP requests and dependencies are tracked.
 */
import dotenv from 'dotenv';
dotenv.config(); // Load env vars first (for local development)

// eslint-disable-next-line @typescript-eslint/no-require-imports
const appInsights = require('applicationinsights');

const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

if (connectionString) {
  appInsights
    .setup(connectionString)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true, true)
    .setUseDiskRetryCaching(true)
    .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C)
    .setSendLiveMetrics(true)
    .start();

  // Set cloud role name for Application Map
  if (appInsights.defaultClient) {
    appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] =
      'web-bff';
  }

  console.log('✅ Application Insights initialized for web-bff');
} else {
  console.log('⚠️ APPLICATIONINSIGHTS_CONNECTION_STRING not set - telemetry disabled');
}

export default appInsights;
