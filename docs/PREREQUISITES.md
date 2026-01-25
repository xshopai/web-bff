# Web BFF Service - Prerequisites

## Table of Contents

1. [Overview](#overview)
2. [Required Software](#required-software)
   - [Node.js & npm](#nodejs--npm)
   - [Docker Desktop](#docker-desktop)
   - [Dapr CLI](#dapr-cli)
3. [Optional Tools](#optional-tools)
4. [Infrastructure Services](#infrastructure-services)
5. [Verification Checklist](#verification-checklist)

---

## Overview

This document outlines the prerequisites needed to develop and run the Web BFF Service locally. Complete all steps before proceeding to development setup.

---

## Required Software

### Node.js & npm

**Required Version:** Node.js 20.x or higher

**Installation:**

```powershell
# Windows (using winget)
winget install OpenJS.NodeJS.LTS

# Verify installation
node --version   # Should be v20.x.x or higher
npm --version    # Should be v10.x.x or higher
```

**Alternative (using nvm-windows):**

```powershell
# Install nvm-windows from https://github.com/coreybutler/nvm-windows/releases
nvm install 20
nvm use 20
```

### Docker Desktop

**Required Version:** Docker Desktop 4.x or higher

**Installation:**

1. Download from [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Run installer and follow prompts
3. Enable WSL 2 backend (recommended)
4. Start Docker Desktop

**Verify:**

```powershell
docker --version        # Docker version 24.x.x or higher
docker compose version  # Docker Compose version v2.x.x
```

### Dapr CLI

**Required Version:** Dapr CLI 1.13.x or higher

**Installation:**

```powershell
# Windows (using winget)
winget install Dapr.CLI

# Or using PowerShell
powershell -Command "iwr -useb https://raw.githubusercontent.com/dapr/cli/master/install/install.ps1 | iex"
```

**Initialize Dapr (Local Development):**

```powershell
# Initialize Dapr with Docker containers
dapr init

# Verify Dapr installation
dapr --version
```

**Expected Output:**

```
CLI version: 1.13.x
Runtime version: 1.13.x
```

**Verify Dapr Components:**

```powershell
docker ps

# Should show containers:
# - dapr_placement
# - dapr_zipkin
# - dapr_redis
```

---

## Optional Tools

### Visual Studio Code

Recommended IDE with extensions:

- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- REST Client
- Docker
- Dapr Extension

### Postman or Insomnia

For API testing and exploration.

### Git

For version control (likely already installed).

```powershell
winget install Git.Git
git --version
```

---

## Infrastructure Services

The Web BFF service communicates with multiple backend services via Dapr. For local development, ensure these services are available:

### Backend Services (Required)

| Service           | Default Port | Dapr HTTP Port | Dapr gRPC Port |
| ----------------- | ------------ | -------------- | -------------- |
| Auth Service      | 1001         | 3501           | 50001          |
| User Service      | 8002         | 3502           | 50002          |
| Product Service   | 8001         | 3503           | 50003          |
| Inventory Service | 5001         | 3504           | 50004          |
| Cart Service      | 8084         | 3505           | 50005          |
| Order Service     | 1006         | 3506           | 50006          |

### Backend Services (Optional)

| Service        | Default Port | Dapr HTTP Port | Dapr gRPC Port |
| -------------- | ------------ | -------------- | -------------- |
| Review Service | 3003         | 3507           | 50007          |
| Admin Service  | 3004         | 3508           | 50008          |
| Chat Service   | 3005         | 3509           | 50009          |

### Infrastructure Components

For Dapr local development, these are automatically started by `dapr init`:

| Component      | Purpose                 | Port  |
| -------------- | ----------------------- | ----- |
| Redis          | State store, pub/sub    | 6379  |
| Zipkin         | Distributed tracing     | 9411  |
| Dapr Placement | Actor placement service | 50005 |

---

## Verification Checklist

Run these commands to verify your environment is ready:

```powershell
# 1. Node.js
node --version
# ✓ Expected: v20.x.x or higher

# 2. npm
npm --version
# ✓ Expected: 10.x.x or higher

# 3. Docker
docker --version
docker compose version
# ✓ Expected: Docker 24.x, Compose v2.x

# 4. Dapr CLI
dapr --version
# ✓ Expected: CLI version 1.13.x, Runtime version 1.13.x

# 5. Dapr containers running
docker ps | findstr dapr
# ✓ Expected: dapr_placement, dapr_zipkin, dapr_redis
```

### Quick Verification Script

Create and run this PowerShell script to verify all prerequisites:

```powershell
# verify-prerequisites.ps1
Write-Host "Verifying Web BFF Prerequisites..." -ForegroundColor Cyan

$checks = @()

# Node.js
$nodeVersion = node --version 2>$null
if ($nodeVersion -match "v20|v21|v22") {
    $checks += @{Name="Node.js"; Status="✓"; Version=$nodeVersion}
} else {
    $checks += @{Name="Node.js"; Status="✗"; Version="Not found or wrong version"}
}

# npm
$npmVersion = npm --version 2>$null
if ($npmVersion) {
    $checks += @{Name="npm"; Status="✓"; Version=$npmVersion}
} else {
    $checks += @{Name="npm"; Status="✗"; Version="Not found"}
}

# Docker
$dockerVersion = docker --version 2>$null
if ($dockerVersion) {
    $checks += @{Name="Docker"; Status="✓"; Version=$dockerVersion}
} else {
    $checks += @{Name="Docker"; Status="✗"; Version="Not found"}
}

# Dapr
$daprVersion = dapr --version 2>$null
if ($daprVersion) {
    $checks += @{Name="Dapr CLI"; Status="✓"; Version="Installed"}
} else {
    $checks += @{Name="Dapr CLI"; Status="✗"; Version="Not found"}
}

# Output results
Write-Host "`nResults:" -ForegroundColor Yellow
$checks | ForEach-Object {
    $color = if ($_.Status -eq "✓") { "Green" } else { "Red" }
    Write-Host "$($_.Status) $($_.Name): $($_.Version)" -ForegroundColor $color
}
```

---

## Next Steps

After completing all prerequisites:

1. **[LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md)** - Run service without Dapr (direct mode)
2. **[LOCAL_DEVELOPMENT_DAPR.md](./LOCAL_DEVELOPMENT_DAPR.md)** - Run service with Dapr sidecar
