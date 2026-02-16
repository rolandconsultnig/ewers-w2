#!/bin/bash

# Navigate to application directory
cd /var/app/current

# Start the application with PM2
echo "Starting the application with PM2..."
pm2 start npm --name "ipcr-app" -- start

# Save the PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup

# Create a file to indicate the application is running
touch /var/app/current/app_running.flag

echo "Application started successfully!"