#!/bin/bash

# Web BFF - Run with Dapr

echo "Starting Web BFF with Dapr..."
echo "Service will be available at: http://localhost:8014"
echo "Dapr HTTP endpoint: http://localhost:3514"
echo "Dapr gRPC endpoint: localhost:50014"
echo ""

dapr run \
  --app-id web-bff \
  --app-port 8014 \
  --dapr-http-port 3514 \
  --dapr-grpc-port 50014 \
  --log-level info \
  --config ./.dapr/config.yaml \
  --resources-path ./.dapr/components \
  -- npx tsx watch src/server.ts

