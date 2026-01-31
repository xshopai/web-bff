/**
 * Application Insights instrumentation for web-bff
 *
 * IMPORTANT: This file must be imported FIRST before any other imports
 * to ensure all HTTP requests and dependencies are tracked.
 */
import dotenv from 'dotenv';
dotenv.config(); // Load env vars first (for local development)

const serviceName = process.env.SERVICE_NAME || 'web-bff';

// Set OTEL environment variables BEFORE loading applicationinsights
// (OpenTelemetry reads these before our code can set cloud role name)
process.env.OTEL_SERVICE_NAME = serviceName;
process.env.OTEL_RESOURCE_ATTRIBUTES = `service.name=${serviceName}`;

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
    .setSendLiveMetrics(true);

  // Set cloud role name BEFORE starting (required for Application Map)
  appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] =
    serviceName;
  appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRoleInstance] =
    process.env.HOSTNAME || serviceName;

  appInsights.start();

  console.log(`✅ Application Insights initialized for ${serviceName}`);
} else {
  console.log('⚠️ APPLICATIONINSIGHTS_CONNECTION_STRING not set - telemetry disabled');
}

export default appInsights;
