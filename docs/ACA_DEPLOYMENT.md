# Web BFF Service - Azure Container Apps Deployment Guide

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Azure Infrastructure Setup](#azure-infrastructure-setup)
4. [Container Image](#container-image)
5. [Deployment Steps](#deployment-steps)
6. [Configuration](#configuration)
7. [Dapr Configuration in ACA](#dapr-configuration-in-aca)
8. [Health Probes](#health-probes)
9. [Scaling](#scaling)
10. [Monitoring](#monitoring)
11. [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers deploying the Web BFF service to Azure Container Apps (ACA) with Dapr integration.

**Deployment Architecture:**

- Azure Container Apps Environment with Dapr enabled
- Managed identity for secure service communication
- Azure Container Registry for image storage
- Azure Monitor for logging and metrics

---

## Prerequisites

### Local Requirements

- Azure CLI installed and logged in
- Docker Desktop (for local image building)
- Access to Azure subscription with appropriate permissions

### Azure Resources (Already Created)

| Resource                   | Description    |
| -------------------------- | -------------- |
| Resource Group             | `xshopai-rg`   |
| Container Apps Environment | `xshopai-env`  |
| Container Registry         | `xshopaiacr`   |
| Log Analytics Workspace    | `xshopai-logs` |

### Verify Azure CLI

```powershell
az --version    # 2.50.0 or higher
az account show # Verify correct subscription
```

---

## Azure Infrastructure Setup

### 1. Create Resource Group (if not exists)

```powershell
az group create `
  --name xshopai-rg `
  --location eastus
```

### 2. Create Container Registry (if not exists)

```powershell
az acr create `
  --resource-group xshopai-rg `
  --name xshopaiacr `
  --sku Basic `
  --admin-enabled true
```

### 3. Create Container Apps Environment (if not exists)

```powershell
# Create Log Analytics workspace
az monitor log-analytics workspace create `
  --resource-group xshopai-rg `
  --workspace-name xshopai-logs

# Get Log Analytics credentials
$LOG_ANALYTICS_WORKSPACE_ID = az monitor log-analytics workspace show `
  --resource-group xshopai-rg `
  --workspace-name xshopai-logs `
  --query customerId -o tsv

$LOG_ANALYTICS_KEY = az monitor log-analytics workspace get-shared-keys `
  --resource-group xshopai-rg `
  --workspace-name xshopai-logs `
  --query primarySharedKey -o tsv

# Create Container Apps Environment with Dapr
az containerapp env create `
  --name xshopai-env `
  --resource-group xshopai-rg `
  --location eastus `
  --logs-workspace-id $LOG_ANALYTICS_WORKSPACE_ID `
  --logs-workspace-key $LOG_ANALYTICS_KEY `
  --dapr-instrumentation-key "" `
  --enable-workload-profiles
```

---

## Container Image

### 1. Build Image Locally

```powershell
# Navigate to web-bff directory
cd web-bff

# Build Docker image
docker build -t web-bff:latest .
```

### 2. Tag for ACR

```powershell
docker tag web-bff:latest xshopaiacr.azurecr.io/web-bff:latest
docker tag web-bff:latest xshopaiacr.azurecr.io/web-bff:$(git rev-parse --short HEAD)
```

### 3. Push to ACR

```powershell
# Login to ACR
az acr login --name xshopaiacr

# Push images
docker push xshopaiacr.azurecr.io/web-bff:latest
docker push xshopaiacr.azurecr.io/web-bff:$(git rev-parse --short HEAD)
```

---

## Deployment Steps

### Method 1: Azure CLI

```powershell
# Get ACR credentials
$ACR_USERNAME = az acr credential show -n xshopaiacr --query username -o tsv
$ACR_PASSWORD = az acr credential show -n xshopaiacr --query "passwords[0].value" -o tsv

# Deploy Container App
az containerapp create `
  --name web-bff `
  --resource-group xshopai-rg `
  --environment xshopai-env `
  --image xshopaiacr.azurecr.io/web-bff:latest `
  --registry-server xshopaiacr.azurecr.io `
  --registry-username $ACR_USERNAME `
  --registry-password $ACR_PASSWORD `
  --target-port 3100 `
  --ingress external `
  --min-replicas 1 `
  --max-replicas 10 `
  --cpu 0.5 `
  --memory 1.0Gi `
  --env-vars `
    NODE_ENV=production `
    PORT=3100 `
    LOG_LEVEL=info `
    ALLOWED_ORIGINS="https://customer.xshopai.com,https://admin.xshopai.com" `
  --dapr-enabled true `
  --dapr-app-id web-bff `
  --dapr-app-port 3100 `
  --dapr-app-protocol http
```

### Method 2: YAML Deployment

Create `deployment.yaml`:

```yaml
# web-bff-deployment.yaml
apiVersion: apps.azurecontainerapps.io/v1
kind: ContainerApp
metadata:
  name: web-bff
  namespace: xshopai-rg
spec:
  configuration:
    activeRevisionsMode: Single
    ingress:
      external: true
      targetPort: 3100
      transport: http
      corsPolicy:
        allowedOrigins:
          - 'https://customer.xshopai.com'
          - 'https://admin.xshopai.com'
        allowedMethods:
          - GET
          - POST
          - PUT
          - DELETE
          - PATCH
          - OPTIONS
        allowedHeaders:
          - '*'
        allowCredentials: true
    dapr:
      enabled: true
      appId: web-bff
      appPort: 3100
      appProtocol: http
    secrets:
      - name: acr-password
        value: <ACR_PASSWORD>
    registries:
      - server: xshopaiacr.azurecr.io
        username: xshopaiacr
        passwordSecretRef: acr-password
  template:
    containers:
      - name: web-bff
        image: xshopaiacr.azurecr.io/web-bff:latest
        resources:
          cpu: 0.5
          memory: 1Gi
        env:
          - name: NODE_ENV
            value: production
          - name: PORT
            value: '3100'
          - name: LOG_LEVEL
            value: info
          - name: ALLOWED_ORIGINS
            value: 'https://customer.xshopai.com,https://admin.xshopai.com'
        probes:
          - type: Liveness
            httpGet:
              path: /health/live
              port: 3100
            initialDelaySeconds: 10
            periodSeconds: 10
          - type: Readiness
            httpGet:
              path: /health/ready
              port: 3100
            initialDelaySeconds: 5
            periodSeconds: 5
    scale:
      minReplicas: 1
      maxReplicas: 10
      rules:
        - name: http-rule
          http:
            metadata:
              concurrentRequests: '100'
```

Deploy using:

```powershell
az containerapp create `
  --name web-bff `
  --resource-group xshopai-rg `
  --environment xshopai-env `
  --yaml deployment.yaml
```

---

## Configuration

### Environment Variables

| Variable          | Production Value                                         |
| ----------------- | -------------------------------------------------------- |
| `NODE_ENV`        | `production`                                             |
| `PORT`            | `3100`                                                   |
| `LOG_LEVEL`       | `info`                                                   |
| `ALLOWED_ORIGINS` | `https://customer.xshopai.com,https://admin.xshopai.com` |

### Update Environment Variables

```powershell
az containerapp update `
  --name web-bff `
  --resource-group xshopai-rg `
  --set-env-vars `
    LOG_LEVEL=debug
```

---

## Dapr Configuration in ACA

### Service Invocation

In ACA, Dapr service invocation uses the Container Apps Environment's internal DNS:

| Service           | Dapr App ID         | ACA Internal URL           |
| ----------------- | ------------------- | -------------------------- |
| Auth Service      | `auth-service`      | `http://auth-service`      |
| User Service      | `user-service`      | `http://user-service`      |
| Product Service   | `product-service`   | `http://product-service`   |
| Inventory Service | `inventory-service` | `http://inventory-service` |

### Dapr Components

Dapr components are configured at the Container Apps Environment level:

```powershell
# Example: Add a state store component
az containerapp env dapr-component set `
  --name xshopai-env `
  --resource-group xshopai-rg `
  --dapr-component-name statestore `
  --yaml dapr-components/statestore.yaml
```

---

## Health Probes

### Liveness Probe

```yaml
probes:
  - type: Liveness
    httpGet:
      path: /health/live
      port: 3100
    initialDelaySeconds: 10
    periodSeconds: 10
    failureThreshold: 3
```

### Readiness Probe

```yaml
probes:
  - type: Readiness
    httpGet:
      path: /health/ready
      port: 3100
    initialDelaySeconds: 5
    periodSeconds: 5
    failureThreshold: 3
```

---

## Scaling

### HTTP Scaling Rule

```powershell
az containerapp update `
  --name web-bff `
  --resource-group xshopai-rg `
  --min-replicas 2 `
  --max-replicas 20 `
  --scale-rule-name http-scaling `
  --scale-rule-type http `
  --scale-rule-http-concurrency 100
```

### CPU Scaling Rule

```powershell
az containerapp update `
  --name web-bff `
  --resource-group xshopai-rg `
  --scale-rule-name cpu-scaling `
  --scale-rule-type cpu `
  --scale-rule-metadata type=Utilization value=70
```

---

## Monitoring

### View Logs

```powershell
# Stream logs
az containerapp logs show `
  --name web-bff `
  --resource-group xshopai-rg `
  --follow

# Query logs
az containerapp logs show `
  --name web-bff `
  --resource-group xshopai-rg `
  --type console `
  --tail 100
```

### View Metrics

```powershell
# Get app URL
az containerapp show `
  --name web-bff `
  --resource-group xshopai-rg `
  --query properties.configuration.ingress.fqdn -o tsv
```

### Azure Portal

1. Navigate to Container Apps in Azure Portal
2. Select `web-bff`
3. View Metrics, Logs, and Revision management

---

## Troubleshooting

### Deployment Failures

```powershell
# Check revision status
az containerapp revision list `
  --name web-bff `
  --resource-group xshopai-rg `
  --output table

# View revision logs
az containerapp logs show `
  --name web-bff `
  --resource-group xshopai-rg `
  --revision <revision-name>
```

### Service Not Starting

1. Check health probe endpoints return 200
2. Verify PORT environment variable matches target port
3. Check container logs for startup errors

### Dapr Issues

```powershell
# Verify Dapr is enabled
az containerapp show `
  --name web-bff `
  --resource-group xshopai-rg `
  --query properties.configuration.dapr

# Check Dapr sidecar logs
az containerapp logs show `
  --name web-bff `
  --resource-group xshopai-rg `
  --type system
```

### Network Issues

1. Verify CORS origins are correctly configured
2. Check ingress settings (external vs internal)
3. Verify backend services are deployed and accessible

---

## Rollback

### Rollback to Previous Revision

```powershell
# List revisions
az containerapp revision list `
  --name web-bff `
  --resource-group xshopai-rg `
  --output table

# Activate previous revision
az containerapp revision activate `
  --name web-bff `
  --resource-group xshopai-rg `
  --revision <previous-revision-name>

# Deactivate current revision
az containerapp revision deactivate `
  --name web-bff `
  --resource-group xshopai-rg `
  --revision <current-revision-name>
```

---

## CI/CD Integration

### GitHub Actions (Example)

```yaml
# .github/workflows/deploy-web-bff.yml
name: Deploy Web BFF

on:
  push:
    branches: [main]
    paths: ['web-bff/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Login to ACR
        run: az acr login --name xshopaiacr

      - name: Build and Push
        run: |
          docker build -t xshopaiacr.azurecr.io/web-bff:${{ github.sha }} ./web-bff
          docker push xshopaiacr.azurecr.io/web-bff:${{ github.sha }}

      - name: Deploy to ACA
        run: |
          az containerapp update \
            --name web-bff \
            --resource-group xshopai-rg \
            --image xshopaiacr.azurecr.io/web-bff:${{ github.sha }}
```

---

## Related Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Service architecture
- **[PRD.md](./PRD.md)** - Product requirements
- **[LOCAL_DEVELOPMENT_DAPR.md](./LOCAL_DEVELOPMENT_DAPR.md)** - Local Dapr development
