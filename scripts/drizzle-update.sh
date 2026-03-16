#!/bin/bash

# Drizzle database update script
# Uses drizzle-kit to push schema changes

echo "🔍 Using Drizzle to update database schema..."

# Set environment variables for database connection
export DATABASE_URL="postgresql://ewers_user:Samolan123@localhost:5432/ewers_db?sslmode=disable"
export NODE_TLS_REJECT_UNAUTHORIZED=0

echo "📊 Current database URL: ${DATABASE_URL}"

# Pull current schema first
echo "📥 Pulling current schema from database..."
npx drizzle-kit pull

# Push schema changes
echo "📤 Pushing schema changes to database..."
npx drizzle-kit push

echo "✅ Database schema update completed!"
