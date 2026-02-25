#!/bin/bash
# Run this on the PRODUCTION SERVER to pull latest from GitHub and restart the app.
# Usage: ./scripts/deploy-production.sh   (from repo root: cd ~/ewers-w2)

set -e
cd "$(dirname "$0")/.."

echo "Fetching latest from GitHub..."
git fetch origin

echo "Resetting to origin/main (server will match GitHub exactly)..."
git reset --hard origin/main

echo "Installing dependencies..."
npm install

echo "Building app..."
npm run build

# Uncomment if you use database migrations and want them applied on deploy:
# echo "Applying database migrations..."
# npm run db:push

echo "Restarting app..."
if command -v pm2 &> /dev/null; then
  pm2 restart all
  echo "Done. App restarted with PM2."
elif command -v systemctl &> /dev/null && systemctl is-active --quiet ewers-w2 2>/dev/null; then
  sudo systemctl restart ewers-w2
  echo "Done. App restarted with systemctl."
else
  echo "Please restart the app manually (e.g. pm2 restart all or systemctl restart ewers-w2)"
fi
