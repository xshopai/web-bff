#!/bin/bash

# Web BFF - Run with direct RabbitMQ (local development)

echo "Starting Web BFF (Direct RabbitMQ)..."
echo "Service will be available at: http://localhost:8014"
echo ""

# Kill any process using port 8014 (prevents "address already in use" errors)
PORT=8014
for pid in $(netstat -ano 2>/dev/null | grep ":$PORT" | grep LISTENING | awk '{print $5}' | sort -u); do
    echo "Killing process $pid on port $PORT..."
    taskkill //F //PID $pid 2>/dev/null
done

# Copy .env.dev to .env for local development
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"
cd "$SERVICE_DIR"

if [ -f ".env.dev" ]; then
    cp ".env.dev" ".env"
    echo "✅ Copied .env.dev → .env"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Run in development mode with hot reload (without Dapr)
npm run dev
