/**
 * Azure Monitor OpenTelemetry instrumentation for web-bff
 *
 * IMPORTANT: This file must be imported FIRST before any other imports
 * to ensure all HTTP requests and dependencies are tracked.
 *
 * Uses @azure/monitor-opentelemetry for consistent telemetry reporting
 * across all xshopai services (Python and Node.js).
 */
import dotenv from 'dotenv';
dotenv.config(); // Load env vars first (for local development)

const serviceName = process.env.SERVICE_NAME || 'web-bff';

// Set OTEL environment variables BEFORE loading Azure Monitor
process.env.OTEL_SERVICE_NAME = serviceName;
process.env.OTEL_RESOURCE_ATTRIBUTES = `service.name=${serviceName}`;

const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

let azureMonitorEnabled = false;

if (connectionString) {
  try {
    // Synchronous initialization using require
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useAzureMonitor } = require('@azure/monitor-opentelemetry');

    // Configure Azure Monitor
    useAzureMonitor({
      azureMonitorExporterOptions: {
        connectionString: connectionString,
      },
      instrumentationOptions: {
        // Enable all auto-instrumentations
        http: { enabled: true },
      },
      // Enable live metrics
      enableLiveMetrics: true,
      // Enable standard metrics
      enableStandardMetrics: true,
    });

    azureMonitorEnabled = true;
    console.log(`✅ Azure Monitor OpenTelemetry initialized for ${serviceName}`);
  } catch (error) {
    console.error(`❌ Failed to initialize Azure Monitor: ${(error as Error).message}`);
  }
} else {
  console.log('⚠️ APPLICATIONINSIGHTS_CONNECTION_STRING not set - telemetry disabled');
}

export { azureMonitorEnabled };
export default { enabled: azureMonitorEnabled };
