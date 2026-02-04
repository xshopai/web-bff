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
  dapr: DaprConfig;
  services: {
    product: string;
    inventory: string;
    review: string;
    auth: string;
    user: string;
    cart: string;
    order: string;
    admin: string;
    chat: string;
  };
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
  dapr: {
    host: process.env.DAPR_HOST || 'localhost',
    httpPort: parseInt(process.env.DAPR_HTTP_PORT || '3514', 10),
    grpcPort: parseInt(process.env.DAPR_GRPC_PORT || '50014', 10),
    appPort: parseInt(process.env.PORT || '8014', 10),
    pubsubName: 'pubsub',
  },
  services: {
    product: process.env.PRODUCT_SERVICE_APP_ID || 'product-service',
    inventory: process.env.INVENTORY_SERVICE_APP_ID || 'inventory-service',
    review: process.env.REVIEW_SERVICE_APP_ID || 'review-service',
    auth: process.env.AUTH_SERVICE_APP_ID || 'auth-service',
    user: process.env.USER_SERVICE_APP_ID || 'user-service',
    cart: process.env.CART_SERVICE_APP_ID || 'cart-service',
    order: process.env.ORDER_SERVICE_APP_ID || 'order-service',
    admin: process.env.ADMIN_SERVICE_APP_ID || 'admin-service',
    chat: process.env.CHAT_SERVICE_APP_ID || 'chat-service',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || 'logs/web-bff.log',
  },
};

export default config;
