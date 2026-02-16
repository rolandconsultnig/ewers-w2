#!/usr/bin/env node

/**
 * cPanel startup script for IPCR Early Warning & Response System
 * 
 * This script handles starting the application with proper environment variables
 * and is designed to work with cPanel's Node.js application manager.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Determine application directory
const appRoot = __dirname;

// Load environment variables from .env file
dotenv.config({ path: path.join(appRoot, '.env') });

// Default port (can be overridden by PORT environment variable)
const port = process.env.PORT || 5000;

// Set environment variables
process.env.PORT = port;

console.log('Starting IPCR Early Warning & Response System...');
console.log(`Application root: ${appRoot}`);
console.log(`Port: ${port}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

// Start the application
const app = spawn('node', [path.join(appRoot, 'dist/index.js')], {
  stdio: 'inherit',
  env: process.env
});

app.on('close', (code) => {
  console.log(`Application process exited with code ${code}`);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT signal. Shutting down gracefully...');
  app.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal. Shutting down gracefully...');
  app.kill('SIGTERM');
});