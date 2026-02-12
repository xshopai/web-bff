import winston from 'winston';

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_TEST = process.env.NODE_ENV === 'test';
const NAME = process.env.NAME || 'web-bff';
const LOG_FORMAT = process.env.LOG_FORMAT || (IS_PRODUCTION ? 'json' : 'console');

/**
 * Console formatter for development with color coding
 */
const consoleFormat = winston.format.printf(
  ({ level, message, timestamp, traceId, spanId, ...meta }) => {
    const colors: Record<string, string> = {
      error: '\x1b[31m',
      warn: '\x1b[33m',
      info: '\x1b[32m',
      debug: '\x1b[34m',
    };
    const reset = '\x1b[0m';
    const color = colors[level] || '';

    // Show first 8 chars of traceId in console for readability
    const traceIdShort =
      traceId && typeof traceId === 'string' ? traceId.substring(0, 8) : 'no-trace';
    const traceInfo = `[trace:${traceIdShort}]`;
    const metaStr = Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : '';

    return `${color}[${timestamp}] [${level.toUpperCase()}] ${NAME} ${traceInfo}: ${message}${metaStr}${reset}`;
  }
);

/**
 * JSON formatter for production
 */
const jsonFormat = winston.format.printf(
  ({ level, message, timestamp, traceId, spanId, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      service: NAME,
      traceId: traceId || null,
      spanId: spanId || null,
      message,
      ...meta,
    });
  }
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (IS_DEVELOPMENT ? 'debug' : 'info'),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    LOG_FORMAT === 'json' ? jsonFormat : consoleFormat
  ),
  transports: [
    new winston.transports.Console({
      silent: IS_TEST,
    }),
  ],
  exitOnError: false,
});

// Add trace context helper
export const withTraceContext = (traceId: string, spanId: string) => {
  return logger.child({ traceId, spanId });
};

export default logger;
