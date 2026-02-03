import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import config from '@/core/config';
import routes from '@routes/index';
import { traceContextMiddleware } from '@middleware/traceContext.middleware';
import { errorMiddleware } from '@middleware/error.middleware';
import homeRoutes from '@routes/home.routes';
import operationalRoutes from '@routes/operational.routes';
import daprRoutes from '@routes/dapr.routes';

const app: Application = express();

// Trust proxy for accurate IP address extraction
app.set('trust proxy', true);

// CORS configuration
app.use(
  cors({
    origin: config.allowedOrigins,
    credentials: true,
    exposedHeaders: ['traceparent'],
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Custom middleware
app.use(traceContextMiddleware as express.RequestHandler); // W3C Trace Context

// API routes
app.use('/', homeRoutes);
app.use('/', operationalRoutes);
app.use('/', daprRoutes); // Dapr sidecar discovery endpoints
app.use('/api', routes);

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
    },
  });
});

// Error handling middleware (must be last)
app.use(errorMiddleware as express.ErrorRequestHandler);

export default app;
