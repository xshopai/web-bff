# ============================================================================
# Azure Container Apps Deployment Script for Web BFF
# ============================================================================
# This script automates the deployment of Web BFF to Azure Container Apps
# with Dapr support for service invocation to backend microservices.
# ============================================================================

#Requires -Version 5.1

param(
    [switch]$SkipConfirmation
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Header {
    param([string]$Message)
    Write-Host "`n============================================================================" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "============================================================================`n" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Blue
}

function Get-UserInput {
    param(
        [string]$Prompt,
        [string]$Default
    )
    
    if ($Default) {
        $input = Read-Host "$Prompt [$Default]"
        if ([string]::IsNullOrWhiteSpace($input)) {
            return $Default
        }
        return $input
    }
    else {
        return Read-Host $Prompt
    }
}

function Get-SecureUserInput {
    param([string]$Prompt)
    
    $secureString = Read-Host $Prompt -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureString)
    return [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

# ============================================================================
# Prerequisites Check
# ============================================================================
Write-Header "Checking Prerequisites"

# Check Azure CLI
try {
    $null = az --version
    Write-Success "Azure CLI is installed"
}
catch {
    Write-Error "Azure CLI is not installed. Please install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
}

# Check Docker
try {
    $null = docker --version
    Write-Success "Docker is installed"
}
catch {
    Write-Error "Docker is not installed. Please install Docker first."
    exit 1
}

# Check if logged into Azure
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Warning "Not logged into Azure. Initiating login..."
    az login
    $account = az account show | ConvertFrom-Json
}
Write-Success "Logged into Azure as: $($account.user.name)"

# ============================================================================
# User Input Collection
# ============================================================================
Write-Header "Azure Configuration"

# List available subscriptions
Write-Host "`nAvailable Azure Subscriptions:" -ForegroundColor Blue
az account list --query "[].{Name:name, SubscriptionId:id, IsDefault:isDefault}" --output table

Write-Host ""
$SubscriptionId = Get-UserInput -Prompt "Enter Azure Subscription ID (leave empty for default)" -Default ""

if ($SubscriptionId) {
    az account set --subscription $SubscriptionId
    Write-Success "Subscription set to: $SubscriptionId"
}
else {
    $SubscriptionId = (az account show --query id --output tsv)
    Write-Info "Using default subscription: $SubscriptionId"
}

# Resource Group
Write-Host ""
$ResourceGroup = Get-UserInput -Prompt "Enter Resource Group name" -Default "rg-xshopai-aca"

# Location
Write-Host ""
Write-Host "Common Azure Locations:" -ForegroundColor Blue
Write-Host "  - swedencentral (Sweden Central)"
Write-Host "  - eastus (East US)"
Write-Host "  - westus2 (West US 2)"
Write-Host "  - westeurope (West Europe)"
Write-Host "  - northeurope (North Europe)"
$Location = Get-UserInput -Prompt "Enter Azure Location" -Default "swedencentral"

# Azure Container Registry
Write-Host ""
$AcrName = Get-UserInput -Prompt "Enter Azure Container Registry name (must be globally unique)" -Default "acrxshopaiaca"

# Container Apps Environment
Write-Host ""
$EnvironmentName = Get-UserInput -Prompt "Enter Container Apps Environment name" -Default "cae-xshopai-aca"

# Application Insights
Write-Host ""
$AiName = Get-UserInput -Prompt "Enter Application Insights name" -Default "ai-xshopai-aca"

# Log Analytics Workspace
Write-Host ""
$LogAnalyticsWorkspace = Get-UserInput -Prompt "Enter Log Analytics Workspace name" -Default "law-xshopai-aca"

# CORS Configuration
Write-Host ""
Write-Info "CORS origin for frontend applications (e.g., https://customer-ui.azurecontainerapps.io)"
$CorsOrigin = Get-UserInput -Prompt "Enter CORS Origin (use * for all origins in dev)" -Default "*"

# Service-to-Service Authentication Tokens
Write-Host ""
Write-Info "Service tokens are used for backend service authentication"
$AuthServiceToken = Get-UserInput -Prompt "Enter Auth Service Token" -Default "svc-auth-4ff5876fc86cc45a18d88e5d"
$UserServiceToken = Get-UserInput -Prompt "Enter User Service Token" -Default "svc-user-4ff5876fc86cc45a18d88e5d"
$ProductServiceToken = Get-UserInput -Prompt "Enter Product Service Token" -Default "svc-product-4ff5876fc86cc45a18d88e5d"
$InventoryServiceToken = Get-UserInput -Prompt "Enter Inventory Service Token" -Default "svc-inventory-4ff5876fc86cc45a18d88e5d"
$CartServiceToken = Get-UserInput -Prompt "Enter Cart Service Token" -Default "svc-cart-4ff5876fc86cc45a18d88e5d"
$OrderServiceToken = Get-UserInput -Prompt "Enter Order Service Token" -Default "svc-order-4ff5876fc86cc45a18d88e5d"
$ReviewServiceToken = Get-UserInput -Prompt "Enter Review Service Token" -Default "svc-review-4ff5876fc86cc45a18d88e5d"
$AdminServiceToken = Get-UserInput -Prompt "Enter Admin Service Token" -Default "svc-admin-4ff5876fc86cc45a18d88e5d"
$ChatServiceToken = Get-UserInput -Prompt "Enter Chat Service Token" -Default "svc-chat-4ff5876fc86cc45a18d88e5d"

# App name
$AppName = "web-bff"

# ============================================================================
# Confirmation
# ============================================================================
Write-Header "Deployment Configuration Summary"

Write-Host "Resource Group:           $ResourceGroup"
Write-Host "Location:                 $Location"
Write-Host "Container Registry:       $AcrName"
Write-Host "Environment:              $EnvironmentName"
Write-Host "Application Insights:     $AiName"
Write-Host "Log Analytics:            $LogAnalyticsWorkspace"
Write-Host "CORS Origin:              $CorsOrigin"
Write-Host "App Name:                 $AppName"
Write-Host ""

if (-not $SkipConfirmation) {
    $confirm = Read-Host "Do you want to proceed with deployment? (y/N)"
    if ($confirm -notmatch '^[Yy]$') {
        Write-Warning "Deployment cancelled by user"
        exit 0
    }
}

# ============================================================================
# Step 1: Create Resource Group
# ============================================================================
Write-Header "Step 1: Creating Resource Group"

az group create `
    --name $ResourceGroup `
    --location $Location `
    --output none

Write-Success "Resource group '$ResourceGroup' created/verified"

# ============================================================================
# Step 2: Create Azure Container Registry
# ============================================================================
Write-Header "Step 2: Creating Azure Container Registry"

$acrExists = az acr show --name $AcrName 2>$null
if ($acrExists) {
    Write-Info "ACR '$AcrName' already exists, skipping creation"
}
else {
    az acr create `
        --resource-group $ResourceGroup `
        --name $AcrName `
        --sku Basic `
        --admin-enabled true `
        --output none
    Write-Success "ACR '$AcrName' created"
}

$AcrLoginServer = (az acr show --name $AcrName --query loginServer --output tsv)
Write-Info "ACR Login Server: $AcrLoginServer"

# ============================================================================
# Step 3: Build and Push Container Image
# ============================================================================
Write-Header "Step 3: Building and Pushing Container Image"

# Login to ACR
az acr login --name $AcrName
Write-Success "Logged into ACR"

# Navigate to service directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServiceDir = Split-Path -Parent $ScriptDir
Push-Location $ServiceDir

try {
    # Build Docker image
    Write-Info "Building Docker image..."
    docker build -t web-bff:latest .
    Write-Success "Docker image built"

    # Tag and push
    docker tag web-bff:latest "$AcrLoginServer/web-bff:latest"
    docker push "$AcrLoginServer/web-bff:latest"
    Write-Success "Image pushed to ACR"
}
finally {
    Pop-Location
}

# ============================================================================
# Step 4: Register Resource Providers
# ============================================================================
Write-Header "Step 4: Registering Resource Providers"

Write-Info "Registering microsoft.operationalinsights..."
az provider register --namespace microsoft.operationalinsights --wait

Write-Info "Registering microsoft.insights..."
az provider register --namespace microsoft.insights --wait

Write-Info "Registering Microsoft.App..."
az provider register --namespace Microsoft.App --wait

Write-Success "All resource providers registered"

# ============================================================================
# Step 5: Create Application Insights
# ============================================================================
Write-Header "Step 5: Creating Application Insights"

$aiExists = az monitor app-insights component show --app $AiName --resource-group $ResourceGroup 2>$null
if ($aiExists) {
    Write-Info "Application Insights '$AiName' already exists"
}
else {
    az monitor app-insights component create `
        --app $AiName `
        --location $Location `
        --resource-group $ResourceGroup `
        --output none
    Write-Success "Application Insights '$AiName' created"
}

$AiKey = (az monitor app-insights component show `
    --app $AiName `
    --resource-group $ResourceGroup `
    --query instrumentationKey `
    --output tsv)
Write-Info "App Insights Key: $AiKey"

# ============================================================================
# Step 6: Create Log Analytics Workspace
# ============================================================================
Write-Header "Step 6: Creating Log Analytics Workspace"

$lawExists = az monitor log-analytics workspace show --resource-group $ResourceGroup --workspace-name $LogAnalyticsWorkspace 2>$null
if ($lawExists) {
    Write-Info "Log Analytics Workspace '$LogAnalyticsWorkspace' already exists"
}
else {
    az monitor log-analytics workspace create `
        --resource-group $ResourceGroup `
        --workspace-name $LogAnalyticsWorkspace `
        --location $Location `
        --output none
    Write-Success "Log Analytics Workspace '$LogAnalyticsWorkspace' created"
}

$LogAnalyticsWorkspaceId = (az monitor log-analytics workspace show `
    --resource-group $ResourceGroup `
    --workspace-name $LogAnalyticsWorkspace `
    --query customerId `
    --output tsv)

$LogAnalyticsKey = (az monitor log-analytics workspace get-shared-keys `
    --resource-group $ResourceGroup `
    --workspace-name $LogAnalyticsWorkspace `
    --query primarySharedKey `
    --output tsv)

Write-Info "Log Analytics Workspace ID: $LogAnalyticsWorkspaceId"

# ============================================================================
# Step 7: Create Container Apps Environment
# ============================================================================
Write-Header "Step 7: Creating Container Apps Environment"

$envExists = az containerapp env show --name $EnvironmentName --resource-group $ResourceGroup 2>$null
if ($envExists) {
    Write-Info "Container Apps Environment '$EnvironmentName' already exists"
}
else {
    az containerapp env create `
        --name $EnvironmentName `
        --resource-group $ResourceGroup `
        --location $Location `
        --dapr-instrumentation-key $AiKey `
        --logs-workspace-id $LogAnalyticsWorkspaceId `
        --logs-workspace-key $LogAnalyticsKey `
        --enable-workload-profiles false `
        --output none
    Write-Success "Container Apps Environment '$EnvironmentName' created"
}

# ============================================================================
# Step 8: Deploy Container App
# ============================================================================
Write-Header "Step 8: Deploying Container App"

$AcrPassword = (az acr credential show --name $AcrName --query "passwords[0].value" --output tsv)

# Build env-vars array
$envVars = @(
    "NODE_ENV=production",
    "PORT=3100",
    "HOST=0.0.0.0",
    "LOG_LEVEL=info",
    "CORS_ORIGIN=$CorsOrigin",
    "DAPR_HTTP_PORT=3500",
    "DAPR_GRPC_PORT=50001",
    "DAPR_APP_ID=web-bff",
    "AUTH_SERVICE_APP_ID=auth-service",
    "USER_SERVICE_APP_ID=user-service",
    "PRODUCT_SERVICE_APP_ID=product-service",
    "INVENTORY_SERVICE_APP_ID=inventory-service",
    "CART_SERVICE_APP_ID=cart-service",
    "ORDER_SERVICE_APP_ID=order-service",
    "REVIEW_SERVICE_APP_ID=review-service",
    "ADMIN_SERVICE_APP_ID=admin-service",
    "CHAT_SERVICE_APP_ID=chat-service",
    "AUTH_SERVICE_TOKEN=$AuthServiceToken",
    "USER_SERVICE_TOKEN=$UserServiceToken",
    "PRODUCT_SERVICE_TOKEN=$ProductServiceToken",
    "INVENTORY_SERVICE_TOKEN=$InventoryServiceToken",
    "CART_SERVICE_TOKEN=$CartServiceToken",
    "ORDER_SERVICE_TOKEN=$OrderServiceToken",
    "REVIEW_SERVICE_TOKEN=$ReviewServiceToken",
    "ADMIN_SERVICE_TOKEN=$AdminServiceToken",
    "CHAT_SERVICE_TOKEN=$ChatServiceToken"
)

$envVarsString = $envVars -join " "

$appExists = az containerapp show --name $AppName --resource-group $ResourceGroup 2>$null
if ($appExists) {
    Write-Info "Container app '$AppName' already exists, updating..."
    az containerapp update `
        --name $AppName `
        --resource-group $ResourceGroup `
        --image "$AcrLoginServer/web-bff:latest" `
        --set-env-vars $envVarsString `
        --output none
}
else {
    az containerapp create `
        --name $AppName `
        --resource-group $ResourceGroup `
        --environment $EnvironmentName `
        --image "$AcrLoginServer/web-bff:latest" `
        --registry-server $AcrLoginServer `
        --registry-username $AcrName `
        --registry-password $AcrPassword `
        --target-port 3100 `
        --ingress external `
        --min-replicas 1 `
        --max-replicas 10 `
        --cpu 0.5 `
        --memory 1.0Gi `
        --enable-dapr `
        --dapr-app-id web-bff `
        --dapr-app-port 3100 `
        --env-vars $envVarsString `
        --output none
}

Write-Success "Container app '$AppName' deployed"

# ============================================================================
# Step 9: Verify Deployment
# ============================================================================
Write-Header "Step 9: Verifying Deployment"

$AppUrl = (az containerapp show `
    --name $AppName `
    --resource-group $ResourceGroup `
    --query properties.configuration.ingress.fqdn `
    --output tsv)

Write-Success "Deployment completed successfully!"
Write-Host ""
Write-Info "Application URL: https://$AppUrl"
Write-Info "Health Check: https://$AppUrl/health"
Write-Host ""

# Test health endpoint
Write-Info "Testing health endpoint..."
Start-Sleep -Seconds 10  # Wait for app to start

try {
    $response = Invoke-WebRequest -Uri "https://$AppUrl/health" -TimeoutSec 30 -UseBasicParsing
    Write-Success "Health check passed!"
}
catch {
    Write-Warning "Health check failed or timed out. The app may still be starting."
}

# ============================================================================
# Summary
# ============================================================================
Write-Header "Deployment Summary"

Write-Host "Resource Group:       $ResourceGroup"
Write-Host "Location:             $Location"
Write-Host "Container Registry:   $AcrLoginServer"
Write-Host "Environment:          $EnvironmentName"
Write-Host "Application URL:      https://$AppUrl"
Write-Host "CORS Origin:          $CorsOrigin"
Write-Host ""
Write-Host "Backend Services (Dapr App IDs):"
Write-Host "  - auth-service"
Write-Host "  - user-service"
Write-Host "  - product-service"
Write-Host "  - inventory-service"
Write-Host "  - cart-service"
Write-Host "  - order-service"
Write-Host "  - review-service"
Write-Host "  - admin-service"
Write-Host "  - chat-service"
Write-Host ""
Write-Info "To view logs: az containerapp logs show --name $AppName --resource-group $ResourceGroup --follow"
Write-Info "To delete: az containerapp delete --name $AppName --resource-group $ResourceGroup --yes"
Write-Host ""
Write-Warning "Note: Ensure all backend services are deployed with matching Dapr app IDs for service invocation to work."
