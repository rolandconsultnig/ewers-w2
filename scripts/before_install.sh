#!/bin/bash

# Update system packages
yum update -y

# Install nodejs if not already installed
if ! command -v node &> /dev/null; then
    echo "Node.js not found, installing..."
    curl -sL https://rpm.nodesource.com/setup_16.x | bash -
    yum install -y nodejs
fi

# Install or update PM2 globally
npm install -g pm2

# Create app directory if it doesn't exist
if [ ! -d /var/app/current ]; then
    mkdir -p /var/app/current
fi

# Stop any existing application
if pm2 list | grep -q "ipcr-app"; then
    pm2 stop ipcr-app
    pm2 delete ipcr-app
fi