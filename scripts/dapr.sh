#!/bin/bash

# Web BFF - Run with Dapr Pub/Sub

echo "Starting Web BFF (Dapr Pub/Sub)..."
echo "Service will be available at: http://localhost:8014"
echo "Dapr HTTP endpoint: http://localhost:3514"
echo "Dapr gRPC endpoint: localhost:50014"
echo ""

# Kill any processes using required ports (prevents "address already in use" errors)
for PORT in 8014 3514 50014; do
    for pid in $(netstat -ano 2>/dev/null | grep ":$PORT" | grep LISTENING | awk '{print $5}' | sort -u); do
        echo "Killing process $pid on port $PORT..."
        taskkill //F //PID $pid 2>/dev/null
    done
done

dapr run \
  --app-id web-bff \
  --app-port 8014 \
  --dapr-http-port 3514 \
  --dapr-grpc-port 50014 \
  --log-level info \
  --config ./.dapr/config.yaml \
  --resources-path ./.dapr/components \
  -- npx tsx watch src/server.ts

