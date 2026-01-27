# 🌐 Web BFF (Backend for Frontend)

API aggregation and orchestration service for xshopai - provides a unified API layer for web clients, aggregating data from multiple microservices and handling client-specific logic.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **Dapr CLI** 1.16+ ([Install Guide](https://docs.dapr.io/getting-started/install-dapr-cli/))

### Setup

**1. Clone & Install**

```bash
git clone https://github.com/xshopai/web-bff.git
cd web-bff
npm install
```

**2. Configure Environment**

```bash
# Copy environment template
cp .env.example .env

# Edit .env - update these values:
# JWT_SECRET=your-secret-key-change-in-production
# AUTH_SERVICE_URL=http://localhost:8003
# USER_SERVICE_URL=http://localhost:8002
# PRODUCT_SERVICE_URL=http://localhost:8001
```

**3. Initialize Dapr**

```bash
# First time only
dapr init
```

**4. Run Service**

```bash
# Start with Dapr (recommended)
npm run dev

# Or use platform-specific scripts
./run.sh       # Linux/Mac
.\run.ps1      # Windows
```

**5. Verify**

```bash
# Check health
curl http://localhost:3100/health

# Should return: {"status":"UP","service":"web-bff"...}

# Via Dapr
curl http://localhost:3600/v1.0/invoke/web-bff/method/health
```

### Common Commands

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Lint code
npm run lint

# Type check
npm run type-check

# Build TypeScript
npm run build

# Production mode
npm start
```

## 📚 Documentation

| Document                                      | Description                             |
| --------------------------------------------- | --------------------------------------- |
| [📖 Developer Guide](docs/DEVELOPER_GUIDE.md) | Local setup, debugging, daily workflows |
| [📘 Technical Reference](docs/TECHNICAL.md)   | Architecture, security, monitoring      |
| [🤝 Contributing](docs/CONTRIBUTING.md)       | Contribution guidelines and workflow    |

**API Documentation**: See `src/routes/` for endpoint definitions and `tests/integration/` for API contract examples.

## ⚙️ Configuration

### Required Environment Variables

```bash
# Service
NODE_ENV=development              # Environment: development, production, test
PORT=3100                         # HTTP server port

# Security
JWT_SECRET=your-secret-key        # JWT signing secret (32+ characters)
CORS_ORIGIN=http://localhost:3000 # Allowed CORS origins

# External Services (via Dapr)
AUTH_SERVICE_APP_ID=auth-service
USER_SERVICE_APP_ID=user-service
PRODUCT_SERVICE_APP_ID=product-service
ORDER_SERVICE_APP_ID=order-service
CART_SERVICE_APP_ID=cart-service
REVIEW_SERVICE_APP_ID=review-service

# Dapr
DAPR_HTTP_PORT=3600              # Dapr sidecar HTTP port
DAPR_GRPC_PORT=50060             # Dapr sidecar gRPC port
DAPR_APP_ID=web-bff              # Dapr application ID
```

See [.env.example](.env.example) for complete configuration options.

## ✨ Key Features

- **API Aggregation** - Combines data from multiple microservices
- **Request/Response Transformation** - Adapts backend APIs for frontend needs
- **Caching Strategy** - Reduces backend load with intelligent caching
- **Authentication Gateway** - JWT validation and user context propagation
- **Error Handling** - Unified error responses for web clients
- **Rate Limiting** - Protects backend services from overload
- **Service Orchestration** - Coordinates multi-service operations
- **TypeScript** - Full type safety with strict mode
- **Comprehensive Logging** - Structured logging with correlation IDs
- **Health Checks** - Monitors downstream service availability

## 🏗️ Architecture

**BFF Pattern (Backend for Frontend):**

```
Web Client → Web BFF → Multiple Microservices
                ↓
         Aggregated Response
```

**Key Responsibilities:**

- Aggregate data from auth-service, user-service, product-service, etc.
- Transform responses to match web client requirements
- Handle session management and authentication
- Implement client-specific business logic
- Reduce chatty API calls from frontend
- Provide optimized endpoints for web UI

**Service Communication:**

- Uses Dapr service invocation for inter-service calls
- Implements circuit breaker patterns
- Handles retries and timeouts
- Maintains correlation IDs across requests

## 🔗 Related Services

- [auth-service](https://github.com/xshopai/auth-service) - Authentication and authorization
- [user-service](https://github.com/xshopai/user-service) - User profile management
- [product-service](https://github.com/xshopai/product-service) - Product catalog
- [order-service](https://github.com/xshopai/order-service) - Order management
- [cart-service](https://github.com/xshopai/cart-service) - Shopping cart
- [review-service](https://github.com/xshopai/review-service) - Product reviews

## 📄 License

MIT License - see [LICENSE](LICENSE)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/xshopai/web-bff/issues)
- **Discussions**: [GitHub Discussions](https://github.com/xshopai/web-bff/discussions)
- **Documentation**: [docs/](docs/)
