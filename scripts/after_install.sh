#!/bin/bash

# Navigate to application directory
cd /var/app/current

# Install dependencies
npm ci

# Run database migrations
echo "Running database migrations..."
npm run db:push

# Verify that the health endpoint is reachable
echo "Waiting for the health endpoint to be ready..."
retry_count=0
max_retries=10
while [ $retry_count -lt $max_retries ]; do
    if curl -s http://localhost:5000/api/health | grep -q "healthy"; then
        echo "Health check passed!"
        break
    else
        retry_count=$((retry_count+1))
        if [ $retry_count -eq $max_retries ]; then
            echo "Health check failed after $max_retries attempts."
            exit 1
        fi
        echo "Health check attempt $retry_count failed. Retrying in 5 seconds..."
        sleep 5
    fi
done