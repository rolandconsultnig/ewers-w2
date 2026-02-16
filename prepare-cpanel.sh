#!/bin/bash

# Exit on error
set -e

# ANSI colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Banner
echo -e "${YELLOW}====================================================${NC}"
echo -e "${GREEN}IPCR Early Warning & Response System - cPanel Preparation${NC}"
echo -e "${YELLOW}====================================================${NC}"
echo ""

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm not found. Please install Node.js and npm first.${NC}"
    exit 1
fi

# Create deployment directory
echo -e "${YELLOW}Creating deployment package...${NC}"
if [ -d "cpanel-deploy" ]; then
    echo -e "${YELLOW}Removing existing deployment package...${NC}"
    rm -rf cpanel-deploy
fi

mkdir -p cpanel-deploy

# Install dependencies and build the application
echo -e "${YELLOW}Installing dependencies...${NC}"
npm ci

echo -e "${YELLOW}Building the application...${NC}"
npm run build

# Create additional files needed for cPanel
echo -e "${YELLOW}Creating additional deployment files...${NC}"

# Create .htaccess file for proxy (optional)
cat > cpanel-deploy/.htaccess << EOL
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteRule ^(.*)$ http://localhost:5000/$1 [P,L]
</IfModule>
EOL

# Create a default environment file
cat > cpanel-deploy/.env << EOL
NODE_ENV=production
DATABASE_URL=postgresql://db_user:db_password@localhost:5432/db_name
SESSION_SECRET=$(openssl rand -base64 32)

# Twitter/X (uncomment and set values if needed)
# TWITTER_API_KEY=your_twitter_api_key
# TWITTER_API_SECRET=your_twitter_api_secret
# TWITTER_ACCESS_TOKEN=your_twitter_access_token
# TWITTER_ACCESS_SECRET=your_twitter_access_secret

# Facebook (uncomment and set values if needed)
# FACEBOOK_APP_ID=your_facebook_app_id
# FACEBOOK_APP_SECRET=your_facebook_app_secret
# FACEBOOK_ACCESS_TOKEN=your_facebook_access_token

# Instagram (uncomment and set values if needed)
# INSTAGRAM_USERNAME=your_instagram_username
# INSTAGRAM_PASSWORD=your_instagram_password

# Twilio (uncomment and set values if needed)
# TWILIO_ACCOUNT_SID=your_twilio_account_sid
# TWILIO_AUTH_TOKEN=your_twilio_auth_token
# TWILIO_PHONE_NUMBER=your_twilio_phone_number
EOL

# Create startup script
cat > cpanel-deploy/start.js << EOL
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

// Determine application directory
const appRoot = __dirname;

// Load environment variables from .env file
require('dotenv').config({ path: path.join(appRoot, '.env') });

// Default port (can be overridden by PORT environment variable)
const port = process.env.PORT || 5000;

// Set environment variables
process.env.PORT = port;

console.log('Starting IPCR Early Warning & Response System...');
console.log(\`Application root: \${appRoot}\`);
console.log(\`Port: \${port}\`);
console.log(\`Environment: \${process.env.NODE_ENV || 'development'}\`);

// Start the application
const app = spawn('node', [path.join(appRoot, 'dist/index.js')], {
  stdio: 'inherit',
  env: process.env
});

app.on('close', (code) => {
  console.log(\`Application process exited with code \${code}\`);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT signal. Shutting down gracefully...');
  app.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal. Shutting down gracefully...');
  app.kill('SIGTERM');
});
EOL

# Create database migration helper
cat > cpanel-deploy/run-migration.js << EOL
/**
 * Database migration helper for cPanel deployment
 * 
 * Use with caution and ONLY for initial setup.
 * Remove this file after running migrations for security.
 */

const { execSync } = require('child_process');
require('dotenv').config();

// Security token (change this to a random string)
const SECURITY_TOKEN = 'change_this_to_a_random_string';

// Enable access control through a token
exports.handler = async (event, context) => {
  try {
    const queryParams = event.queryStringParameters || {};
    const providedToken = queryParams.token;
    
    if (!providedToken || providedToken !== SECURITY_TOKEN) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Access denied. Invalid token.' })
      };
    }
    
    // Verify database connection
    if (!process.env.DATABASE_URL) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'DATABASE_URL not set in environment variables.' })
      };
    }
    
    // Run migrations
    console.log('Running database migrations...');
    execSync('npx drizzle-kit push:pg', { stdio: 'inherit' });
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'Database migrations completed successfully. REMOVE THIS FILE NOW for security purposes.' 
      })
    };
  } catch (error) {
    console.error('Migration error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
EOL

# Create README for cPanel deployment
cat > cpanel-deploy/README.md << EOL
# IPCR Early Warning & Response System - cPanel Deployment

This package contains the IPCR Early Warning & Response System prepared for cPanel deployment.

## Deployment Steps

1. Upload all these files to your cPanel hosting
2. Edit the \`.env\` file with your specific database credentials and other settings
3. Set up the Node.js application in cPanel's Application Manager
   - Application root: The directory containing these files
   - Application URL: Your domain or subdomain
   - Application startup file: \`start.js\`
   - Node.js version: 16.x or newer
4. Run database migrations by accessing the migration helper:
   - First, edit \`run-migration.js\` and change the SECURITY_TOKEN
   - Access: \`https://yourdomain.com/path/to/run-migration.js?token=your_security_token\`
   - After migrations complete, DELETE \`run-migration.js\` for security

## Important Security Notes

- Change the database password in \`.env\` to a strong, unique password
- Generate a unique session secret in \`.env\`
- Remove \`run-migration.js\` after database setup
- Set proper file permissions (755 for directories, 644 for files)

For detailed deployment instructions, refer to the CPANEL_DEPLOYMENT.md file in the original repository.
EOL

# Copy required files to the deployment package
echo -e "${YELLOW}Copying application files...${NC}"
cp -r dist cpanel-deploy/
cp -r server cpanel-deploy/
cp -r migrations cpanel-deploy/
cp -r shared cpanel-deploy/
cp -r package.json package-lock.json cpanel-deploy/
chmod +x cpanel-deploy/start.js

# Create a zip archive
echo -e "${YELLOW}Creating deployment archive...${NC}"
cd cpanel-deploy
zip -r ../ipcr-cpanel-deploy.zip .
cd ..

echo -e "${GREEN}====================================================${NC}"
echo -e "${GREEN}cPanel deployment package created successfully!${NC}"
echo -e "${GREEN}====================================================${NC}"
echo -e "\n${YELLOW}Deployment package: ${NC}ipcr-cpanel-deploy.zip"
echo -e "${YELLOW}Deployment directory: ${NC}cpanel-deploy/"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. Upload the generated ipcr-cpanel-deploy.zip to your cPanel hosting"
echo -e "2. Extract the files in your desired directory"
echo -e "3. Configure your database settings in the .env file"
echo -e "4. Follow the instructions in the README.md file to complete the setup"
echo -e "\n${GREEN}Preparation completed successfully!${NC}"