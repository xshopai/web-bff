// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

async function startServer() {
  try {
    // Initialize tracing AFTER dotenv (dynamic import to avoid hoisting)
    await import('./tracing.js');

    // Dynamic import to ensure env vars are loaded first
    const { default: validateConfig } = await import('./validators/config.validator');

    // Validate configuration (blocking - must pass)
    validateConfig();

    // Dynamic imports AFTER env vars are loaded
    const { default: app } = await import('./app');
    const { default: config } = await import('./core/config');
    const { default: logger } = await import('./core/logger');
    const { register: consulRegister, deregister: consulDeregister } = await import(
      './core/consulRegistration'
    );

    const PORT = config.port;
    const HOST = config.host;
    const displayHost = HOST === '0.0.0.0' ? 'localhost' : HOST;

    app.listen(PORT, HOST, async () => {
      logger.info(`Web BFF running on ${displayHost}:${PORT} in ${config.env} mode`);
      await consulRegister('web-bff', PORT, HOST);
    });

    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      await consulDeregister();
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
