# Web BFF Service - Local Development Guide (Direct Mode)

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Running the Service](#running-the-service)
5. [Testing the Service](#testing-the-service)
6. [Development Workflow](#development-workflow)
7. [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers running the Web BFF service **without Dapr** (direct mode). This is useful for:

- Quick testing of BFF logic in isolation
- Frontend development when backend services are mocked
- Simple debugging scenarios

> **Note:** For full integration with backend services, see [LOCAL_DEVELOPMENT_DAPR.md](./LOCAL_DEVELOPMENT_DAPR.md).

---

## Prerequisites

Complete all steps in [PREREQUISITES.md](./PREREQUISITES.md) before continuing.

**Quick Check:**

```powershell
node --version   # v20.x.x or higher
npm --version    # 10.x.x or higher
```

---

## Environment Setup

### 1. Clone Repository (if not done)

```powershell
git clone https://github.com/xshopai/web-bff.git
cd web-bff
```

### 2. Install Dependencies

```powershell
npm install
```

### 3. Configure Environment for Non-Dapr Mode

Copy the local environment template to `.env`:

```powershell
# On Windows (PowerShell):
Copy-Item .env.local .env

# On Linux/macOS (Bash):
cp .env.local .env
```

The `.env.local` file contains:

```bash
NODE_ENV=development
PORT=3100
HOST=0.0.0.0
NAME=web-bff
VERSION=1.0.0

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:9999

# Logging Configuration
LOG_LEVEL=debug
LOG_FORMAT=console
LOG_TO_CONSOLE=true
LOG_TO_FILE=false
LOG_FILE_PATH=./logs/web-bff.log

# Direct Service URLs (for non-Dapr mode)
AUTH_SERVICE_URL=http://localhost:8003
USER_SERVICE_URL=http://localhost:8002
PRODUCT_SERVICE_URL=http://localhost:8001
INVENTORY_SERVICE_URL=http://localhost:8004
CART_SERVICE_URL=http://localhost:8084
ORDER_SERVICE_URL=http://localhost:1006
REVIEW_SERVICE_URL=http://localhost:3003
ADMIN_SERVICE_URL=http://localhost:3004
CHAT_SERVICE_URL=http://localhost:3005

# Service Tokens (for service-to-service authentication)
AUTH_SERVICE_TOKEN=svc-auth-service-4ff5876fc86cc45a18d88e5d
USER_SERVICE_TOKEN=svc-user-service-4ff5876fc86cc45a18d88e5d
# ... (additional tokens)
```

> **Note**:
>
> - In non-Dapr mode, the BFF calls backend services directly via HTTP using the `*_SERVICE_URL` variables
> - Service tokens are used for service-to-service authentication
> - For Dapr mode with service invocation, see [LOCAL_DEVELOPMENT_DAPR.md](./LOCAL_DEVELOPMENT_DAPR.md)

---

## Running the Service

### Development Mode (with Hot Reload)

```powershell
# Start in development mode with TypeScript watch
npm run dev
```

**Expected Output:**

```
[nodemon] 3.x.x
[nodemon] watching path(s): src/**/*
[nodemon] watching extensions: ts
[nodemon] starting `ts-node src/server.ts`
2025-01-24T10:30:00.000Z info: Server running on http://0.0.0.0:3100
2025-01-24T10:30:00.000Z info: Environment: development
```

### Production Build

```powershell
# Build TypeScript
npm run build

# Start production server
npm start
```

### Using Run Script

```powershell
# Windows
.\run.ps1

# Linux/macOS
./run.sh
```

---

## Testing the Service

### Health Check

```powershell
# Basic health check
Invoke-RestMethod -Uri "http://localhost:3100/health"

# Or using curl
curl http://localhost:3100/health
```

**Expected Response:**

```json
{
  "status": "healthy",
  "service": "web-bff",
  "timestamp": "2025-01-24T10:30:00.000Z"
}
```

### Root Endpoint

```powershell
Invoke-RestMethod -Uri "http://localhost:3100/"
```

**Expected Response:**

```json
{
  "service": "web-bff",
  "version": "1.0.0",
  "environment": "development"
}
```

### Public Endpoints (Will Fail Without Backend)

```powershell
# Products (will fail without product-service)
Invoke-RestMethod -Uri "http://localhost:3100/api/products"

# Storefront aggregation (will fail without backend services)
Invoke-RestMethod -Uri "http://localhost:3100/api/storefront"
```

> **Note:** In direct mode without backend services, these calls will return service unavailable errors. Use [LOCAL_DEVELOPMENT_DAPR.md](./LOCAL_DEVELOPMENT_DAPR.md) for full integration.

---

## Development Workflow

### Project Structure

```
web-bff/
├── src/
│   ├── controllers/    # Request handlers
│   ├── routes/         # Route definitions
│   ├── clients/        # Backend service clients
│   ├── middleware/     # Express middleware
│   ├── core/           # Core utilities (config, logger)
│   ├── aggregators/    # Data aggregation logic
│   ├── types/          # TypeScript types
│   ├── app.ts          # Express app setup
│   └── server.ts       # Entry point
└── tests/
    ├── unit/           # Unit tests
    └── integration/    # Integration tests
```

### Running Tests

```powershell
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Linting & Formatting

```powershell
# Run ESLint
npm run lint

# Fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format
```

### Building

```powershell
# TypeScript compilation
npm run build

# Watch mode for development
npm run build:watch
```

---

## Troubleshooting

### Port Already in Use

```powershell
# Find process using port 3100
netstat -ano | findstr :3100

# Kill the process
Stop-Process -Id <PID> -Force

# Or use different port
$env:PORT="3101"
npm run dev
```

### Module Not Found Errors

```powershell
# Clear node_modules and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### TypeScript Compilation Errors

```powershell
# Clean and rebuild
Remove-Item -Recurse -Force dist
npm run build
```

### Path Alias Issues

The service uses TypeScript path aliases. If you encounter import issues:

```powershell
# Ensure tsc-alias runs after build
npm run build
```

Check `tsconfig.json` and `tsc-alias.config.json` for path mappings.

### Environment Variable Issues

```powershell
# Verify environment variables are loaded
npm run dev

# Check for .env file
Test-Path .env

# View .env contents (be careful with secrets)
Get-Content .env
```

---

## Next Steps

- **[LOCAL_DEVELOPMENT_DAPR.md](./LOCAL_DEVELOPMENT_DAPR.md)** - Run with Dapr for full service integration
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Understand the service architecture
- **[PRD.md](./PRD.md)** - Review product requirements
