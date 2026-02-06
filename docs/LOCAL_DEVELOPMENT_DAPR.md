# Web BFF Service - Local Development with Dapr

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Dapr Configuration](#dapr-configuration)
4. [Starting Backend Services](#starting-backend-services)
5. [Running with Dapr](#running-with-dapr)
6. [Testing the Integration](#testing-the-integration)
7. [VS Code Integration](#vs-code-integration)
8. [Debugging](#debugging)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers running the Web BFF service **with Dapr** for full integration with backend services. Dapr provides:

- Service-to-service invocation
- Distributed tracing
- Retry and timeout policies

---

## Prerequisites

1. Complete [PREREQUISITES.md](./PREREQUISITES.md)
2. Dapr initialized: `dapr init`
3. Backend services available (at least auth, user, product, inventory)

**Verify Dapr:**

```powershell
dapr --version
# CLI version: 1.13.x
# Runtime version: 1.13.x

docker ps | findstr dapr
# Should show: dapr_placement, dapr_zipkin, dapr_redis
```

---

## Configure Environment for Dapr Mode

Copy the Dapr environment template to `.env`:

```bash
# On Linux / Mac / Bash:
cp .env.dapr .env

# On Windows (PowerShell):
Copy-Item .env.dapr .env
```

The `.env.dapr` file contains Dapr-specific configuration:

```env
# Server Configuration
PORT=3100
HOST=localhost
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Logging Configuration
LOG_LEVEL=debug

# Dapr Configuration
DAPR_HTTP_PORT=3500
DAPR_GRPC_PORT=50001
DAPR_APP_ID=web-bff

# Backend Services (Dapr App IDs)
AUTH_SERVICE_APP_ID=auth-service
USER_SERVICE_APP_ID=user-service
PRODUCT_SERVICE_APP_ID=product-service
INVENTORY_SERVICE_APP_ID=inventory-service
CART_SERVICE_APP_ID=cart-service
ORDER_SERVICE_APP_ID=order-service
REVIEW_SERVICE_APP_ID=review-service
ADMIN_SERVICE_APP_ID=admin-service
CHAT_SERVICE_APP_ID=chat-service

# Service-to-Service Authentication Tokens
# Pattern: SERVICE_{NAME}_TOKEN
SERVICE_AUTH_TOKEN=svc-auth-4ff5876fc86cc45a18d88e5d
SERVICE_USER_TOKEN=svc-user-4ff5876fc86cc45a18d88e5d
SERVICE_PRODUCT_TOKEN=svc-product-4ff5876fc86cc45a18d88e5d
SERVICE_INVENTORY_TOKEN=svc-inventory-4ff5876fc86cc45a18d88e5d
SERVICE_CART_TOKEN=svc-cart-4ff5876fc86cc45a18d88e5d
SERVICE_ORDER_TOKEN=svc-order-4ff5876fc86cc45a18d88e5d
SERVICE_REVIEW_TOKEN=svc-review-4ff5876fc86cc45a18d88e5d
SERVICE_ADMIN_TOKEN=svc-admin-4ff5876fc86cc45a18d88e5d
SERVICE_CHAT_TOKEN=svc-chat-4ff5876fc86cc45a18d88e5d
```

> **Note:** In Dapr mode, the BFF uses Dapr service invocation (via app IDs) instead of direct HTTP URLs. Dapr handles service discovery, load balancing, and mTLS automatically.

---

## Dapr Configuration

### Configuration File

The BFF uses `.dapr/config.yaml` for Dapr configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: web-bff-config
spec:
  tracing:
    samplingRate: '1'
    zipkin:
      endpointAddress: 'http://localhost:9411/api/v2/spans'
  features:
    - name: AppHealthCheck
      enabled: true
```

### Service Invocation

The BFF invokes backend services using Dapr's service invocation building block:

> **Note:** All services now use the standard Dapr ports (3500 for HTTP, 50001 for gRPC). This simplifies configuration and works consistently whether running via Docker Compose or individual service runs.

| Service           | Dapr App ID         | Default URL (via Dapr)                                           |
| ----------------- | ------------------- | ---------------------------------------------------------------- |
| Auth Service      | `auth-service`      | `http://localhost:3500/v1.0/invoke/auth-service/method/...`      |
| User Service      | `user-service`      | `http://localhost:3500/v1.0/invoke/user-service/method/...`      |
| Product Service   | `product-service`   | `http://localhost:3500/v1.0/invoke/product-service/method/...`   |
| Inventory Service | `inventory-service` | `http://localhost:3500/v1.0/invoke/inventory-service/method/...` |
| Cart Service      | `cart-service`      | `http://localhost:3500/v1.0/invoke/cart-service/method/...`      |
| Order Service     | `order-service`     | `http://localhost:3500/v1.0/invoke/order-service/method/...`     |

---

## Starting Backend Services

Before running the BFF, start the required backend services with their Dapr sidecars.

### Option 1: Start Individual Services

Open separate terminals for each service:

**Auth Service:**

```powershell
cd ../auth-service
dapr run --app-id auth-service --app-port 1001 --dapr-http-port 3500 --dapr-grpc-port 50001 --resources-path .dapr/components --config .dapr/config.yaml -- npm run dev
```

**User Service:**

```powershell
cd ../user-service
dapr run --app-id user-service --app-port 8002 --dapr-http-port 3500 --dapr-grpc-port 50001 --resources-path .dapr/components --config .dapr/config.yaml -- npm run dev
```

**Product Service:**

```powershell
cd ../product-service
dapr run --app-id product-service --app-port 8001 --dapr-http-port 3500 --dapr-grpc-port 50001 --resources-path .dapr/components --config .dapr/config.yaml -- python main.py
```

**Inventory Service:**

```powershell
cd ../inventory-service
dapr run --app-id inventory-service --app-port 5001 --dapr-http-port 3500 --dapr-grpc-port 50001 --resources-path .dapr/components --config .dapr/config.yaml -- python main.py
```

### Option 2: Use Docker Compose (Recommended)

Use the platform's docker-compose setup:

```powershell
cd ../scripts/docker-compose
docker-compose up -d
```

### Option 3: VS Code Tasks

If using VS Code, each service folder has tasks defined. Use **Terminal > Run Task** to start services.

---

## Running with Dapr

### Method 1: Using Dapr CLI

```powershell
# From web-bff directory
dapr run `
  --app-id web-bff `
  --app-port 3100 `
  --dapr-http-port 3500 `
  --dapr-grpc-port 50001 `
  --resources-path .dapr/components `
  --config .dapr/config.yaml `
  --log-level warn `
  -- npm run dev
```

**Expected Output:**

```
ℹ️  Starting Dapr with id web-bff. HTTP Port: 3500. gRPC Port: 50001
...
== APP == 2025-01-24T10:30:00.000Z info: Server running on http://0.0.0.0:3100
== APP == 2025-01-24T10:30:00.000Z info: Dapr sidecar available at http://localhost:3600
```

### Method 2: Using Run Script

```powershell
# Windows
.\run.ps1

# Linux/macOS
./run.sh
```

### Method 3: VS Code Task

1. Press `Ctrl+Shift+P`
2. Select "Tasks: Run Task"
3. Choose "Start Dapr Sidecar"

---

## Testing the Integration

### Health Check

```powershell
# BFF health
curl http://localhost:3100/health

# Via Dapr sidecar
curl http://localhost:3500/v1.0/healthz
```

### Service Discovery

```powershell
# List running Dapr apps
dapr list

# Expected output:
# APP ID            HTTP PORT  GRPC PORT  APP PORT  COMMAND
# web-bff           3500       50001      3100      npm run dev
# auth-service      3500       50001      1001      ...
# user-service      3500       50001      8002      ...
```

### Test API Endpoints

**Storefront (Aggregated):**

```powershell
curl http://localhost:3100/api/storefront
```

**Products (via Product Service):**

```powershell
curl http://localhost:3100/api/products
```

**Authentication:**

```powershell
# Login
curl -X POST http://localhost:3100/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"user@example.com","password":"password123"}'
```

### Distributed Tracing

View traces in Zipkin: http://localhost:9411

1. Open Zipkin UI
2. Search for service: `web-bff`
3. View trace timeline across services

---

## VS Code Integration

### Launch Configuration

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Web BFF (Direct)",
      "type": "node",
      "request": "launch",
      "runtimeArgs": ["-r", "ts-node/register"],
      "args": ["${workspaceFolder}/src/server.ts"],
      "env": {
        "NODE_ENV": "development",
        "PORT": "3100"
      },
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Web BFF (with Dapr)",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "restart": true,
      "preLaunchTask": "Start Dapr Sidecar"
    }
  ]
}
```

### Tasks Configuration

Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Dapr Sidecar",
      "type": "shell",
      "command": "dapr",
      "args": [
        "run",
        "--app-id",
        "web-bff",
        "--app-port",
        "3100",
        "--dapr-http-port",
        "3500",
        "--dapr-grpc-port",
        "50001",
        "--resources-path",
        ".dapr/components",
        "--config",
        ".dapr/config.yaml",
        "--log-level",
        "warn"
      ],
      "isBackground": true,
      "problemMatcher": []
    },
    {
      "label": "Stop Dapr Sidecar",
      "type": "shell",
      "command": "dapr",
      "args": ["stop", "--app-id", "web-bff"]
    }
  ]
}
```

---

## Debugging

### Debug with Dapr

1. Start Dapr sidecar (without app):

```powershell
dapr run --app-id web-bff --app-port 3100 --dapr-http-port 3500 --dapr-grpc-port 50001 --resources-path .dapr/components --config .dapr/config.yaml
```

2. Start app with debugger:

```powershell
node --inspect -r ts-node/register src/server.ts
```

3. Attach VS Code debugger

### Debug Service Calls

Enable debug logging:

```powershell
$env:LOG_LEVEL="debug"
npm run dev
```

View Dapr logs:

```powershell
dapr run --app-id web-bff ... --log-level debug
```

---

## Troubleshooting

### Dapr Not Starting

```powershell
# Check Dapr status
dapr status

# Reinitialize Dapr
dapr uninstall --all
dapr init

# Check Docker containers
docker ps | findstr dapr
```

### Service Not Found

```powershell
# Verify service is registered
dapr list

# Check app ID matches configuration
# Ensure backend service is running with correct --app-id
```

### Connection Refused

1. Verify backend service is running
2. Check port numbers match
3. Verify Dapr sidecar is running for both services

```powershell
# Check listening ports
netstat -ano | findstr :3100
netstat -ano | findstr :3600
```

### Timeout Errors

1. Check backend service health
2. Increase timeout in client configuration
3. Check network connectivity

```powershell
# Test direct service invocation via Dapr
curl http://localhost:3500/v1.0/invoke/product-service/method/health
```

### Tracing Not Working

1. Verify Zipkin is running: http://localhost:9411
2. Check tracing configuration in `.dapr/config.yaml`
3. Ensure `samplingRate` is set to "1" for development

---

## Stopping Services

### Stop Web BFF

```powershell
# Using Dapr CLI
dapr stop --app-id web-bff

# Using VS Code task
# Terminal > Run Task > Stop Dapr Sidecar

# Kill all Dapr processes (aggressive)
Get-Process -Name daprd -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Stop All Services

```powershell
# If using docker-compose
cd ../scripts/docker-compose
docker-compose down

# Stop all Dapr apps
dapr stop --all
```

---

## Next Steps

- **[ACA_DEPLOYMENT.md](./ACA_DEPLOYMENT.md)** - Deploy to Azure Container Apps
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Understand service architecture
