#!/bin/bash

# Check if the application is running using PM2
if pm2 list | grep -q "ipcr-app"; then
    echo "Stopping the application..."
    pm2 stop ipcr-app
    pm2 delete ipcr-app
    echo "Application stopped."
else
    echo "Application is not running."
fi

# Remove the application running flag
if [ -f /var/app/current/app_running.flag ]; then
    rm /var/app/current/app_running.flag
fi