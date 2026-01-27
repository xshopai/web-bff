#!/usr/bin/env pwsh
# Run Web BFF with Dapr sidecar
# Usage: .\run.ps1

# Set terminal title - use both methods to ensure it persists
$host.ui.RawUI.WindowTitle = "Web BFF"
[Console]::Title = "Web BFF"

Write-Host "Starting Web BFF with Dapr..." -ForegroundColor Green
Write-Host "Service will be available at: http://localhost:8014" -ForegroundColor Cyan
Write-Host "Dapr HTTP endpoint: http://localhost:3514" -ForegroundColor Cyan
Write-Host "Dapr gRPC endpoint: localhost:50014" -ForegroundColor Cyan
Write-Host ""

dapr run `
  --app-id web-bff `
  --app-port 8014 `
  --dapr-http-port 3514 `
  --dapr-grpc-port 50014 `
  --log-level warn `
  -- npx tsx watch src/server.ts
