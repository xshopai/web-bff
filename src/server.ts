// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

// Initialize Zipkin tracing BEFORE other imports
import './tracing.js';

import validateConfig from './validators/config.validator';

async function startServer() {
  try {
    // Validate configuration (blocking - must pass)
    validateConfig();

    // Dynamic imports AFTER env vars are loaded
    const { default: app } = await import('./app');
    const { default: config } = await import('./core/config');
    const { default: logger } = await import('./core/logger');

    const PORT = config.port;
    const HOST = config.host;

    app.listen(PORT, HOST, () => {
      logger.info(`Web BFF running on ${HOST}:${PORT} in ${config.env} mode`);
    });

    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start web-bff:', error);
    process.exit(1);
  }
}

startServer();
