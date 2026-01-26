#!/bin/bash

# ============================================================================
# Azure Container Apps Deployment Script for Web BFF
# ============================================================================
# This script automates the deployment of Web BFF to Azure Container Apps
# with Dapr support for service invocation to backend microservices.
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_header() {
    echo -e "\n${BLUE}============================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# ============================================================================
# Prerequisites Check
# ============================================================================
print_header "Checking Prerequisites"

# Check Azure CLI
if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed. Please install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi
print_success "Azure CLI is installed"

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi
print_success "Docker is installed"

# Check if logged into Azure
if ! az account show &> /dev/null; then
    print_warning "Not logged into Azure. Initiating login..."
    az login
fi
print_success "Logged into Azure"

# ============================================================================
# User Input Collection
# ============================================================================
print_header "Azure Configuration"

# Function to prompt with default value
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local varname="$3"
    
    read -p "$prompt [$default]: " input
    eval "$varname=\"${input:-$default}\""
}

# Function to prompt for password (hidden input)
prompt_password() {
    local prompt="$1"
    local varname="$2"
    
    read -sp "$prompt: " input
    echo ""
    eval "$varname=\"$input\""
}

# List available subscriptions
echo -e "\n${BLUE}Available Azure Subscriptions:${NC}"
az account list --query "[].{Name:name, SubscriptionId:id, IsDefault:isDefault}" --output table

echo ""
prompt_with_default "Enter Azure Subscription ID (leave empty for default)" "" SUBSCRIPTION_ID

if [ -n "$SUBSCRIPTION_ID" ]; then
    az account set --subscription "$SUBSCRIPTION_ID"
    print_success "Subscription set to: $SUBSCRIPTION_ID"
else
    SUBSCRIPTION_ID=$(az account show --query id --output tsv)
    print_info "Using default subscription: $SUBSCRIPTION_ID"
fi

# Resource Group
echo ""
prompt_with_default "Enter Resource Group name" "rg-xshopai-aca" RESOURCE_GROUP

# Location
echo ""
echo -e "${BLUE}Common Azure Locations:${NC}"
echo "  - swedencentral (Sweden Central)"
echo "  - eastus (East US)"
echo "  - westus2 (West US 2)"
echo "  - westeurope (West Europe)"
echo "  - northeurope (North Europe)"
prompt_with_default "Enter Azure Location" "swedencentral" LOCATION

# Azure Container Registry
echo ""
prompt_with_default "Enter Azure Container Registry name (must be globally unique)" "acrxshopaiaca" ACR_NAME

# Container Apps Environment
echo ""
prompt_with_default "Enter Container Apps Environment name" "cae-xshopai-aca" ENVIRONMENT_NAME

# Application Insights
echo ""
prompt_with_default "Enter Application Insights name" "ai-xshopai-aca" AI_NAME

# Log Analytics Workspace
echo ""
prompt_with_default "Enter Log Analytics Workspace name" "law-xshopai-aca" LOG_ANALYTICS_WORKSPACE

# CORS Configuration
echo ""
print_info "CORS origin for frontend applications (e.g., https://customer-ui.azurecontainerapps.io)"
prompt_with_default "Enter CORS Origin (use * for all origins in dev)" "*" CORS_ORIGIN

# Service-to-Service Authentication Tokens
echo ""
print_info "Service tokens are used for backend service authentication"
prompt_with_default "Enter Auth Service Token" "svc-auth-4ff5876fc86cc45a18d88e5d" AUTH_SERVICE_TOKEN
prompt_with_default "Enter User Service Token" "svc-user-4ff5876fc86cc45a18d88e5d" USER_SERVICE_TOKEN
prompt_with_default "Enter Product Service Token" "svc-product-4ff5876fc86cc45a18d88e5d" PRODUCT_SERVICE_TOKEN
prompt_with_default "Enter Inventory Service Token" "svc-inventory-4ff5876fc86cc45a18d88e5d" INVENTORY_SERVICE_TOKEN
prompt_with_default "Enter Cart Service Token" "svc-cart-4ff5876fc86cc45a18d88e5d" CART_SERVICE_TOKEN
prompt_with_default "Enter Order Service Token" "svc-order-4ff5876fc86cc45a18d88e5d" ORDER_SERVICE_TOKEN
prompt_with_default "Enter Review Service Token" "svc-review-4ff5876fc86cc45a18d88e5d" REVIEW_SERVICE_TOKEN
prompt_with_default "Enter Admin Service Token" "svc-admin-4ff5876fc86cc45a18d88e5d" ADMIN_SERVICE_TOKEN
prompt_with_default "Enter Chat Service Token" "svc-chat-4ff5876fc86cc45a18d88e5d" CHAT_SERVICE_TOKEN

# App name
APP_NAME="web-bff"

# ============================================================================
# Confirmation
# ============================================================================
print_header "Deployment Configuration Summary"

echo "Resource Group:           $RESOURCE_GROUP"
echo "Location:                 $LOCATION"
echo "Container Registry:       $ACR_NAME"
echo "Environment:              $ENVIRONMENT_NAME"
echo "Application Insights:     $AI_NAME"
echo "Log Analytics:            $LOG_ANALYTICS_WORKSPACE"
echo "CORS Origin:              $CORS_ORIGIN"
echo "App Name:                 $APP_NAME"
echo ""

read -p "Do you want to proceed with deployment? (y/N): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    print_warning "Deployment cancelled by user"
    exit 0
fi

# ============================================================================
# Step 1: Create Resource Group
# ============================================================================
print_header "Step 1: Creating Resource Group"

az group create \
    --name "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --output none

print_success "Resource group '$RESOURCE_GROUP' created/verified"

# ============================================================================
# Step 2: Create Azure Container Registry
# ============================================================================
print_header "Step 2: Creating Azure Container Registry"

if az acr show --name "$ACR_NAME" &> /dev/null; then
    print_info "ACR '$ACR_NAME' already exists, skipping creation"
else
    az acr create \
        --resource-group "$RESOURCE_GROUP" \
        --name "$ACR_NAME" \
        --sku Basic \
        --admin-enabled true \
        --output none
    print_success "ACR '$ACR_NAME' created"
fi

ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer --output tsv)
print_info "ACR Login Server: $ACR_LOGIN_SERVER"

# ============================================================================
# Step 3: Build and Push Container Image
# ============================================================================
print_header "Step 3: Building and Pushing Container Image"

# Login to ACR
az acr login --name "$ACR_NAME"
print_success "Logged into ACR"

# Navigate to service directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"
cd "$SERVICE_DIR"

# Build Docker image
print_info "Building Docker image..."
docker build -t web-bff:latest .
print_success "Docker image built"

# Tag and push
docker tag web-bff:latest "$ACR_LOGIN_SERVER/web-bff:latest"
docker push "$ACR_LOGIN_SERVER/web-bff:latest"
print_success "Image pushed to ACR"

# ============================================================================
# Step 4: Register Resource Providers
# ============================================================================
print_header "Step 4: Registering Resource Providers"

print_info "Registering microsoft.operationalinsights..."
az provider register --namespace microsoft.operationalinsights --wait

print_info "Registering microsoft.insights..."
az provider register --namespace microsoft.insights --wait

print_info "Registering Microsoft.App..."
az provider register --namespace Microsoft.App --wait

print_success "All resource providers registered"

# ============================================================================
# Step 5: Create Application Insights
# ============================================================================
print_header "Step 5: Creating Application Insights"

if az monitor app-insights component show --app "$AI_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    print_info "Application Insights '$AI_NAME' already exists"
else
    az monitor app-insights component create \
        --app "$AI_NAME" \
        --location "$LOCATION" \
        --resource-group "$RESOURCE_GROUP" \
        --output none
    print_success "Application Insights '$AI_NAME' created"
fi

AI_KEY=$(az monitor app-insights component show \
    --app "$AI_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query instrumentationKey \
    --output tsv)
print_info "App Insights Key: $AI_KEY"

# ============================================================================
# Step 6: Create Log Analytics Workspace
# ============================================================================
print_header "Step 6: Creating Log Analytics Workspace"

if az monitor log-analytics workspace show --resource-group "$RESOURCE_GROUP" --workspace-name "$LOG_ANALYTICS_WORKSPACE" &> /dev/null; then
    print_info "Log Analytics Workspace '$LOG_ANALYTICS_WORKSPACE' already exists"
else
    az monitor log-analytics workspace create \
        --resource-group "$RESOURCE_GROUP" \
        --workspace-name "$LOG_ANALYTICS_WORKSPACE" \
        --location "$LOCATION" \
        --output none
    print_success "Log Analytics Workspace '$LOG_ANALYTICS_WORKSPACE' created"
fi

LOG_ANALYTICS_WORKSPACE_ID=$(az monitor log-analytics workspace show \
    --resource-group "$RESOURCE_GROUP" \
    --workspace-name "$LOG_ANALYTICS_WORKSPACE" \
    --query customerId \
    --output tsv)

LOG_ANALYTICS_KEY=$(az monitor log-analytics workspace get-shared-keys \
    --resource-group "$RESOURCE_GROUP" \
    --workspace-name "$LOG_ANALYTICS_WORKSPACE" \
    --query primarySharedKey \
    --output tsv)

print_info "Log Analytics Workspace ID: $LOG_ANALYTICS_WORKSPACE_ID"

# ============================================================================
# Step 7: Create Container Apps Environment
# ============================================================================
print_header "Step 7: Creating Container Apps Environment"

if az containerapp env show --name "$ENVIRONMENT_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    print_info "Container Apps Environment '$ENVIRONMENT_NAME' already exists"
else
    az containerapp env create \
        --name "$ENVIRONMENT_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --dapr-instrumentation-key "$AI_KEY" \
        --logs-workspace-id "$LOG_ANALYTICS_WORKSPACE_ID" \
        --logs-workspace-key "$LOG_ANALYTICS_KEY" \
        --enable-workload-profiles false \
        --output none
    print_success "Container Apps Environment '$ENVIRONMENT_NAME' created"
fi

# ============================================================================
# Step 8: Deploy Container App
# ============================================================================
print_header "Step 8: Deploying Container App"

ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" --output tsv)

# Build env-vars string
ENV_VARS="NODE_ENV=production PORT=3100 HOST=0.0.0.0 LOG_LEVEL=info"
ENV_VARS="$ENV_VARS CORS_ORIGIN=$CORS_ORIGIN"
ENV_VARS="$ENV_VARS DAPR_HTTP_PORT=3500 DAPR_GRPC_PORT=50001 DAPR_APP_ID=web-bff"
ENV_VARS="$ENV_VARS AUTH_SERVICE_APP_ID=auth-service"
ENV_VARS="$ENV_VARS USER_SERVICE_APP_ID=user-service"
ENV_VARS="$ENV_VARS PRODUCT_SERVICE_APP_ID=product-service"
ENV_VARS="$ENV_VARS INVENTORY_SERVICE_APP_ID=inventory-service"
ENV_VARS="$ENV_VARS CART_SERVICE_APP_ID=cart-service"
ENV_VARS="$ENV_VARS ORDER_SERVICE_APP_ID=order-service"
ENV_VARS="$ENV_VARS REVIEW_SERVICE_APP_ID=review-service"
ENV_VARS="$ENV_VARS ADMIN_SERVICE_APP_ID=admin-service"
ENV_VARS="$ENV_VARS CHAT_SERVICE_APP_ID=chat-service"
ENV_VARS="$ENV_VARS AUTH_SERVICE_TOKEN=$AUTH_SERVICE_TOKEN"
ENV_VARS="$ENV_VARS USER_SERVICE_TOKEN=$USER_SERVICE_TOKEN"
ENV_VARS="$ENV_VARS PRODUCT_SERVICE_TOKEN=$PRODUCT_SERVICE_TOKEN"
ENV_VARS="$ENV_VARS INVENTORY_SERVICE_TOKEN=$INVENTORY_SERVICE_TOKEN"
ENV_VARS="$ENV_VARS CART_SERVICE_TOKEN=$CART_SERVICE_TOKEN"
ENV_VARS="$ENV_VARS ORDER_SERVICE_TOKEN=$ORDER_SERVICE_TOKEN"
ENV_VARS="$ENV_VARS REVIEW_SERVICE_TOKEN=$REVIEW_SERVICE_TOKEN"
ENV_VARS="$ENV_VARS ADMIN_SERVICE_TOKEN=$ADMIN_SERVICE_TOKEN"
ENV_VARS="$ENV_VARS CHAT_SERVICE_TOKEN=$CHAT_SERVICE_TOKEN"

if az containerapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    print_info "Container app '$APP_NAME' already exists, updating..."
    az containerapp update \
        --name "$APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --image "$ACR_LOGIN_SERVER/web-bff:latest" \
        --set-env-vars $ENV_VARS \
        --output none
else
    az containerapp create \
        --name "$APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --environment "$ENVIRONMENT_NAME" \
        --image "$ACR_LOGIN_SERVER/web-bff:latest" \
        --registry-server "$ACR_LOGIN_SERVER" \
        --registry-username "$ACR_NAME" \
        --registry-password "$ACR_PASSWORD" \
        --target-port 3100 \
        --ingress external \
        --min-replicas 1 \
        --max-replicas 10 \
        --cpu 0.5 \
        --memory 1.0Gi \
        --enable-dapr \
        --dapr-app-id web-bff \
        --dapr-app-port 3100 \
        --env-vars $ENV_VARS \
        --output none
fi

print_success "Container app '$APP_NAME' deployed"

# ============================================================================
# Step 9: Verify Deployment
# ============================================================================
print_header "Step 9: Verifying Deployment"

APP_URL=$(az containerapp show \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query properties.configuration.ingress.fqdn \
    --output tsv)

print_success "Deployment completed successfully!"
echo ""
print_info "Application URL: https://$APP_URL"
print_info "Health Check: https://$APP_URL/health"
echo ""

# Test health endpoint
print_info "Testing health endpoint..."
sleep 10  # Wait for app to start

if curl -s --max-time 30 "https://$APP_URL/health" > /dev/null; then
    print_success "Health check passed!"
else
    print_warning "Health check failed or timed out. The app may still be starting."
fi

# ============================================================================
# Summary
# ============================================================================
print_header "Deployment Summary"

echo "Resource Group:       $RESOURCE_GROUP"
echo "Location:             $LOCATION"
echo "Container Registry:   $ACR_LOGIN_SERVER"
echo "Environment:          $ENVIRONMENT_NAME"
echo "Application URL:      https://$APP_URL"
echo "CORS Origin:          $CORS_ORIGIN"
echo ""
echo "Backend Services (Dapr App IDs):"
echo "  - auth-service"
echo "  - user-service"
echo "  - product-service"
echo "  - inventory-service"
echo "  - cart-service"
echo "  - order-service"
echo "  - review-service"
echo "  - admin-service"
echo "  - chat-service"
echo ""
print_info "To view logs: az containerapp logs show --name $APP_NAME --resource-group $RESOURCE_GROUP --follow"
print_info "To delete: az containerapp delete --name $APP_NAME --resource-group $RESOURCE_GROUP --yes"
echo ""
print_warning "Note: Ensure all backend services are deployed with matching Dapr app IDs for service invocation to work."
