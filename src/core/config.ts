import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface DaprConfig {
  host: string;
  httpPort: number;
  grpcPort: number;
  appPort: number;
  pubsubName: string;
}

interface Config {
  env: string;
  port: number;
  host: string;
  allowedOrigins: string[];
  platformMode: 'direct' | 'dapr'; // For service-to-service calls
  messagingProvider: string; // 'dapr-pubsub' or 'rabbitmq' - for pub/sub events
  dapr: DaprConfig;
  logging: {
    level: string;
    filePath: string;
  };
}

const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8014', 10),
  host: process.env.HOST || '0.0.0.0',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  platformMode: (process.env.PLATFORM_MODE as 'direct' | 'dapr') || 'direct',
  messagingProvider: process.env.MESSAGING_PROVIDER || 'rabbitmq',
  dapr: {
    host: process.env.DAPR_HOST || 'localhost',
    httpPort: parseInt(process.env.DAPR_HTTP_PORT || '3514', 10),
    grpcPort: parseInt(process.env.DAPR_GRPC_PORT || '50014', 10),
    appPort: parseInt(process.env.PORT || '8014', 10),
    pubsubName: 'pubsub',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || 'logs/web-bff.log',
  },
};

export default config;
