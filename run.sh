#!/usr/bin/env bash
# Run Web BFF with Dapr sidecar
# Usage: ./run.sh

echo -e "\033[0;32mStarting Web BFF with Dapr...\033[0m"
echo -e "\033[0;36mService will be available at: http://localhost:8014\033[0m"
echo -e "\033[0;36mDapr HTTP endpoint: http://localhost:3500\033[0m"
echo -e "\033[0;36mDapr gRPC endpoint: localhost:50001\033[0m"
echo ""

dapr run \
  --app-id web-bff \
  --app-port 8014 \
  --dapr-http-port 3500 \
  --dapr-grpc-port 50001 \
  --log-level warn \
  -- npx tsx watch src/server.ts
