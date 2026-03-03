<div align="center">

# 🌐 Web BFF (Backend for Frontend)

**API aggregation and orchestration gateway for the xshopai e-commerce platform**

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Express](https://img.shields.io/badge/Express-4.18+-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![Dapr](https://img.shields.io/badge/Dapr-Enabled-0D597F?style=for-the-badge&logo=dapr&logoColor=white)](https://dapr.io)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

[Getting Started](#-getting-started) •
[Documentation](#-documentation) •
[API Reference](#-architecture) •
[Contributing](#-contributing)

</div>

---

## 🎯 Overview

The **Web BFF** provides a unified API layer for web clients, aggregating data from multiple microservices and handling client-specific logic. It reduces chatty frontend calls, transforms backend responses for UI needs, manages authentication gateway concerns, and implements caching, rate limiting, and circuit breaker patterns for resilient service orchestration.

---

## ✨ Key Features

<table>
<tr>
<td width="50%">

### 📡 API Aggregation

- Combines data from multiple services
- Request/response transformation
- Optimized endpoints for web UI
- Reduces frontend API chattiness

</td>
<td width="50%">

### 🔐 Authentication Gateway

- JWT validation & user context propagation
- Session management
- Cookie-based authentication support
- Service-to-service token forwarding

</td>
</tr>
<tr>
<td width="50%">

### ⚡ Performance & Resilience

- Intelligent caching strategies
- Circuit breaker patterns
- Retry mechanisms with backoff
- Rate limiting protection

</td>
<td width="50%">

### 📊 Observability

- Structured logging with correlation IDs
- Downstream health monitoring
- Comprehensive error handling
- Unified error responses

</td>
</tr>
</table>

---

## 🏗️ Architecture

**BFF Pattern (Backend for Frontend):**

```
┌─────────────┐     ┌─────────┐     ┌──────────────────┐
│ customer-ui │────▶│ Web BFF │────▶│ auth-service     │
│ admin-ui    │     │         │     │ user-service     │
└─────────────┘     │  Dapr   │     │ product-service  │
                    │ Sidecar │     │ order-service    │
                    └─────────┘     │ cart-service     │
                                    │ review-service   │
                                    └──────────────────┘
```

**Key Responsibilities:**

- Aggregate data from auth, user, product, order, cart, review services
- Transform responses for web client requirements
- Handle session management and authentication flow
- Implement client-specific business logic

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (optional)
- Dapr CLI (for production-like setup)

### Quick Start with Docker Compose

```bash
# Clone the repository
git clone https://github.com/xshopai/web-bff.git
cd web-bff

# Start all services
docker-compose up -d

# Verify the service is healthy
curl http://localhost:8014/health/ready
```

### Local Development Setup

<details>
<summary><b>🔧 Without Dapr (Simple Setup)</b></summary>

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start the service
npm run dev
```

📖 See [Local Development Guide](docs/LOCAL_DEVELOPMENT.md) for detailed instructions.

</details>

<details>
<summary><b>⚡ With Dapr (Production-like)</b></summary>

```bash
# Ensure Dapr is initialized
dapr init

# Start with Dapr sidecar
npm run dev:dapr

# Or use platform-specific scripts
./run.sh       # Linux/Mac
.\run.ps1      # Windows
```

> **Note:** All services now use the standard Dapr ports (3500 for HTTP, 50001 for gRPC).

📖 See [Dapr Development Guide](docs/LOCAL_DEVELOPMENT_DAPR.md) for detailed instructions.

</details>

---

## 📚 Documentation

| Document                                                         | Description                            |
| :--------------------------------------------------------------- | :------------------------------------- |
| 📘 [Local Development](docs/LOCAL_DEVELOPMENT.md)                | Step-by-step local setup without Dapr  |
| ⚡ [Local Development with Dapr](docs/LOCAL_DEVELOPMENT_DAPR.md) | Local setup with full Dapr integration |
| 📘 [Technical Reference](docs/TECHNICAL.md)                      | Architecture, security, monitoring     |

**API Documentation**: See `src/routes/` for endpoint definitions and `tests/integration/` for API contract examples.

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Lint code
npm run lint

# Type check
npm run type-check

# Build TypeScript
npm run build
```

### Test Coverage

| Metric        | Status               |
| :------------ | :------------------- |
| Unit Tests    | ✅ Passing           |
| Code Coverage | ✅ Target 80%+       |
| Security Scan | ✅ 0 vulnerabilities |

---

## 🏗️ Project Structure

```
web-bff/
├── 📁 src/                       # Application source code
│   ├── 📁 controllers/           # Route handlers
│   ├── 📁 services/              # Service aggregation logic
│   ├── 📁 routes/                # Route definitions
│   ├── 📁 middlewares/           # Auth, logging, rate limiting
│   ├── 📁 clients/               # Service client wrappers (Dapr)
│   ├── 📁 core/                  # Config, logger, errors
│   ├── 📄 app.ts                 # Express app setup
│   └── 📄 server.ts              # Entry point
├── 📁 tests/                     # Test suite
│   ├── 📁 unit/                  # Unit tests
│   └── 📁 integration/           # Integration tests
├── 📁 .dapr/                     # Dapr configuration
│   ├── 📁 components/            # Service invocation, state
│   └── 📄 config.yaml            # Dapr runtime configuration
├── 📁 docs/                      # Documentation
├── 📄 docker-compose.yml         # Local containerized environment
├── 📄 Dockerfile                 # Production container image
└── 📄 package.json               # Node.js dependencies
```

---

## 🔧 Technology Stack

| Category          | Technology                               |
| :---------------- | :--------------------------------------- |
| 🟢 Runtime        | Node.js 20+ with TypeScript 5.0+         |
| 🌐 Framework      | Express 4.18+                            |
| 📡 Service Mesh   | Dapr Service Invocation                  |
| 🔐 Authentication | JWT Tokens + Cookie-based sessions       |
| ⚡ Resilience     | Circuit breakers, retries, rate limiting |
| 🧪 Testing        | Jest with coverage reporting             |
| 📊 Observability  | Structured logging + correlation IDs     |

---

## ⚙️ Configuration

| Variable                 | Description          | Default                 |
| :----------------------- | :------------------- | :---------------------- |
| `PORT`                   | HTTP server port     | `8014`                  |
| `NODE_ENV`               | Environment          | `development`           |
| `JWT_SECRET`             | JWT signing secret   | (required)              |
| `CORS_ORIGIN`            | Allowed CORS origins | `http://localhost:3000` |
| `AUTH_SERVICE_APP_ID`    | Dapr app ID          | `auth-service`          |
| `USER_SERVICE_APP_ID`    | Dapr app ID          | `user-service`          |
| `PRODUCT_SERVICE_APP_ID` | Dapr app ID          | `product-service`       |
| `ORDER_SERVICE_APP_ID`   | Dapr app ID          | `order-service`         |
| `CART_SERVICE_APP_ID`    | Dapr app ID          | `cart-service`          |
| `REVIEW_SERVICE_APP_ID`  | Dapr app ID          | `review-service`        |
| `DAPR_HTTP_PORT`         | Dapr sidecar HTTP    | `3500`                  |
| `DAPR_GRPC_PORT`         | Dapr sidecar gRPC    | `50001`                 |

---

## ⚡ Quick Reference

```bash
# 🐳 Docker Compose
docker-compose up -d              # Start all services
docker-compose down               # Stop all services
docker-compose logs -f web-bff    # View logs

# 🟢 Local Development
npm run dev                       # Run without Dapr
npm run dev:dapr                  # Run with Dapr sidecar
npm run build                     # Build TypeScript

# 🧪 Testing
npm test                          # Run all tests
npm run test:coverage             # Run with coverage
npm run lint                      # Lint code
npm run type-check                # TypeScript check

# 🔍 Health Check
curl http://localhost:8014/health/ready
curl http://localhost:8014/health/live
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Write** tests for your changes
4. **Run** the test suite
   ```bash
   npm test && npm run lint
   ```
5. **Commit** your changes
   ```bash
   git commit -m 'feat: add amazing feature'
   ```
6. **Push** to your branch
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open** a Pull Request

Please ensure your PR:

- ✅ Passes all existing tests
- ✅ Includes tests for new functionality
- ✅ Follows the existing code style
- ✅ Updates documentation as needed

---

## 🆘 Support

| Resource         | Link                                                                 |
| :--------------- | :------------------------------------------------------------------- |
| 🐛 Bug Reports   | [GitHub Issues](https://github.com/xshopai/web-bff/issues)           |
| 📖 Documentation | [docs/](docs/)                                                       |
| 💬 Discussions   | [GitHub Discussions](https://github.com/xshopai/web-bff/discussions) |

---

## 📄 License

This project is part of the **xshopai** e-commerce platform.
Licensed under the MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**[⬆ Back to Top](#-web-bff-backend-for-frontend)**

Made with ❤️ by the xshopai team

</div>
