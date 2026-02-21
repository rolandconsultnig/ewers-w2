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
echo -e "${GREEN}IPCR Early Warning & Response System - Ubuntu Deployment${NC}"
echo -e "${YELLOW}====================================================${NC}"
echo ""

# Check if script is run as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run this script as root or with sudo.${NC}"
  exit 1
fi

# Get the actual username (not root)
if [ -n "$SUDO_USER" ]; then
  ACTUAL_USER=$SUDO_USER
else
  echo -e "${YELLOW}Enter the username to run the application:${NC}"
  read ACTUAL_USER
fi

HOME_DIR=$(eval echo ~$ACTUAL_USER)
echo -e "${YELLOW}Installing as user:${NC} $ACTUAL_USER"
echo -e "${YELLOW}Home directory:${NC} $HOME_DIR"
echo ""

# Ask for configuration
echo -e "${YELLOW}Application Configuration${NC}"
echo "----------------------------"

# Database settings
read -p "PostgreSQL database name [ipcr_db]: " DB_NAME
DB_NAME=${DB_NAME:-ipcr_db}

read -p "PostgreSQL username [ipcr_user]: " DB_USER
DB_USER=${DB_USER:-ipcr_user}

read -s -p "PostgreSQL password [auto-generate]: " DB_PASSWORD
echo ""
if [ -z "$DB_PASSWORD" ]; then
  # Generate random password
  DB_PASSWORD=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9')
  echo -e "${GREEN}Generated database password:${NC} $DB_PASSWORD ${YELLOW}(SAVE THIS)${NC}"
fi

# Generate session secret
SESSION_SECRET=$(openssl rand -base64 32)

# Ask to install Nginx
read -p "Install and configure Nginx as reverse proxy? (y/n) [y]: " INSTALL_NGINX
INSTALL_NGINX=${INSTALL_NGINX:-y}

# Repository URL
read -p "Git repository URL [https://github.com/rolandconsultnig/ewers-w2.git]: " REPO_URL
REPO_URL=${REPO_URL:-https://github.com/rolandconsultnig/ewers-w2.git}

# App port
read -p "Application port [4342]: " APP_PORT
APP_PORT=${APP_PORT:-4342}

# API keys
echo -e "${YELLOW}Do you want to configure external services? (Social media, SMS) (y/n) [n]:${NC} "
read CONFIGURE_EXTERNAL
CONFIGURE_EXTERNAL=${CONFIGURE_EXTERNAL:-n}

if [[ "$CONFIGURE_EXTERNAL" == "y" || "$CONFIGURE_EXTERNAL" == "Y" ]]; then
  echo -e "${YELLOW}Twitter/X Configuration (leave empty to skip)${NC}"
  read -p "API Key: " TWITTER_API_KEY
  read -p "API Secret: " TWITTER_API_SECRET
  read -p "Access Token: " TWITTER_ACCESS_TOKEN
  read -p "Access Secret: " TWITTER_ACCESS_SECRET
  
  echo -e "${YELLOW}Facebook Configuration (leave empty to skip)${NC}"
  read -p "App ID: " FACEBOOK_APP_ID
  read -p "App Secret: " FACEBOOK_APP_SECRET
  read -p "Access Token: " FACEBOOK_ACCESS_TOKEN
  
  echo -e "${YELLOW}Instagram Configuration (leave empty to skip)${NC}"
  read -p "Username: " INSTAGRAM_USERNAME
  read -s -p "Password: " INSTAGRAM_PASSWORD
  echo ""
  
  echo -e "${YELLOW}Twilio Configuration (leave empty to skip)${NC}"
  read -p "Account SID: " TWILIO_ACCOUNT_SID
  read -p "Auth Token: " TWILIO_AUTH_TOKEN
  read -p "Phone Number: " TWILIO_PHONE_NUMBER
fi

# Create admin user
echo -e "${YELLOW}Admin User Configuration${NC}"
read -p "Admin username [admin]: " ADMIN_USERNAME
ADMIN_USERNAME=${ADMIN_USERNAME:-admin}
read -s -p "Admin password [auto-generate]: " ADMIN_PASSWORD
echo ""
if [ -z "$ADMIN_PASSWORD" ]; then
  # Generate random password
  ADMIN_PASSWORD=$(openssl rand -base64 8 | tr -dc 'a-zA-Z0-9')
  echo -e "${GREEN}Generated admin password:${NC} $ADMIN_PASSWORD ${YELLOW}(SAVE THIS)${NC}"
fi

# Get confirmation
echo ""
echo -e "${YELLOW}Deployment Summary:${NC}"
echo "-------------------"
echo "User: $ACTUAL_USER"
echo "Database: $DB_NAME"
echo "Database User: $DB_USER"
echo "Application Port: $APP_PORT"
echo "Install Nginx: $INSTALL_NGINX"
echo "Repository URL: $REPO_URL"
echo "Admin Username: $ADMIN_USERNAME"
echo ""

read -p "Proceed with installation? (y/n) [y]: " CONFIRM
CONFIRM=${CONFIRM:-y}

if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo -e "${RED}Deployment cancelled.${NC}"
  exit 1
fi

# Start installation
echo -e "\n${YELLOW}Starting deployment...${NC}"

# Update system
echo -e "\n${YELLOW}Updating system packages...${NC}"
apt update
apt upgrade -y

# Install essential packages
echo -e "\n${YELLOW}Installing required packages...${NC}"
apt install -y git curl build-essential

# Install Node.js 20 LTS
echo -e "\n${YELLOW}Installing Node.js 20 LTS...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Check Node.js installation
NODE_VERSION=$(node --version)
echo -e "${GREEN}Node.js version:${NC} $NODE_VERSION"

# Install PostgreSQL
echo -e "\n${YELLOW}Installing PostgreSQL...${NC}"
apt install -y postgresql postgresql-contrib

# Ensure PostgreSQL is running
systemctl start postgresql
systemctl enable postgresql

# Create database and user
echo -e "\n${YELLOW}Setting up PostgreSQL database...${NC}"
su - postgres -c "psql -c \"CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';\""
su - postgres -c "psql -c \"CREATE DATABASE $DB_NAME OWNER $DB_USER;\""
su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;\""

# Install PM2
echo -e "\n${YELLOW}Installing PM2 process manager...${NC}"
npm install -g pm2

# Clone repository
echo -e "\n${YELLOW}Cloning application repository...${NC}"
cd $HOME_DIR
APP_DIR="ewers-w2"
if [ -d "$APP_DIR" ]; then
  echo -e "${YELLOW}Directory already exists. Removing...${NC}"
  rm -rf $APP_DIR
fi

git clone $REPO_URL $APP_DIR
chown -R $ACTUAL_USER:$ACTUAL_USER $APP_DIR
cd $APP_DIR

# Create environment file
echo -e "\n${YELLOW}Creating environment configuration...${NC}"
cat > .env << EOL
NODE_ENV=production
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME
SESSION_SECRET=$SESSION_SECRET
PORT=$APP_PORT
EOL

# Add external service configurations if provided
if [[ "$CONFIGURE_EXTERNAL" == "y" || "$CONFIGURE_EXTERNAL" == "Y" ]]; then
  if [ -n "$TWITTER_API_KEY" ]; then
    cat >> .env << EOL
TWITTER_API_KEY=$TWITTER_API_KEY
TWITTER_API_SECRET=$TWITTER_API_SECRET
TWITTER_ACCESS_TOKEN=$TWITTER_ACCESS_TOKEN
TWITTER_ACCESS_SECRET=$TWITTER_ACCESS_SECRET
EOL
  fi
  
  if [ -n "$FACEBOOK_APP_ID" ]; then
    cat >> .env << EOL
FACEBOOK_APP_ID=$FACEBOOK_APP_ID
FACEBOOK_APP_SECRET=$FACEBOOK_APP_SECRET
FACEBOOK_ACCESS_TOKEN=$FACEBOOK_ACCESS_TOKEN
EOL
  fi
  
  if [ -n "$INSTAGRAM_USERNAME" ]; then
    cat >> .env << EOL
INSTAGRAM_USERNAME=$INSTAGRAM_USERNAME
INSTAGRAM_PASSWORD=$INSTAGRAM_PASSWORD
EOL
  fi
  
  if [ -n "$TWILIO_ACCOUNT_SID" ]; then
    cat >> .env << EOL
TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER=$TWILIO_PHONE_NUMBER
EOL
  fi
fi

chown $ACTUAL_USER:$ACTUAL_USER .env

# Install dependencies and build app
echo -e "\n${YELLOW}Installing dependencies and building application...${NC}"
sudo -u $ACTUAL_USER bash -c "cd $HOME_DIR/$APP_DIR && npm ci"
sudo -u $ACTUAL_USER bash -c "cd $HOME_DIR/$APP_DIR && npm run build"

# Run database migrations
echo -e "\n${YELLOW}Running database migrations...${NC}"
sudo -u $ACTUAL_USER bash -c "cd $HOME_DIR/$APP_DIR && npm run db:push" || echo -e "${YELLOW}If db:push prompted for input, run manually: cd $HOME_DIR/$APP_DIR && npm run db:push${NC}"

# Create admin user via seed script
echo -e "\n${YELLOW}Creating admin user...${NC}"
sudo -u $ACTUAL_USER bash -c "cd $HOME_DIR/$APP_DIR && npm run db:seed" || echo -e "${YELLOW}Admin may already exist. Default: admin/admin123${NC}"

# Install and configure Nginx if requested
if [[ "$INSTALL_NGINX" == "y" || "$INSTALL_NGINX" == "Y" ]]; then
  echo -e "\n${YELLOW}Installing and configuring Nginx...${NC}"
  apt install -y nginx
  
  # Create Nginx configuration with WebSocket support
  cat > /etc/nginx/sites-available/ewers << 'NGINXEOF'
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80;
    server_name _;

    client_max_body_size 50M;

    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;
    proxy_temp_file_write_size 256k;

    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    location / {
        proxy_pass http://127.0.0.1:APPPORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:APPPORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
NGINXEOF

  # Substitute the actual port into the config
  sed -i "s/APPPORT/$APP_PORT/g" /etc/nginx/sites-available/ewers
  
  # Enable site
  ln -sf /etc/nginx/sites-available/ewers /etc/nginx/sites-enabled/
  
  # Check configuration
  nginx -t
  
  # Restart Nginx
  systemctl restart nginx
  systemctl enable nginx
  
  echo -e "${GREEN}Nginx configured successfully.${NC}"
fi

# Create desktop shortcut
echo -e "\n${YELLOW}Creating desktop shortcut...${NC}"
DESKTOP_DIR="$HOME_DIR/Desktop"
if [ -d "$DESKTOP_DIR" ]; then
  cat > "$DESKTOP_DIR/IPCR System.desktop" << EOL
[Desktop Entry]
Version=1.0
Type=Application
Name=IPCR Early Warning System
Comment=Launch IPCR Early Warning & Response System
Exec=xdg-open http://localhost:$APP_PORT
Icon=applications-internet
Terminal=false
StartupNotify=true
Categories=Network;Application;
EOL
  
  chmod +x "$DESKTOP_DIR/IPCR System.desktop"
  chown $ACTUAL_USER:$ACTUAL_USER "$DESKTOP_DIR/IPCR System.desktop"
  echo -e "${GREEN}Desktop shortcut created.${NC}"
else
  echo -e "${YELLOW}Desktop directory not found. Skipping shortcut creation.${NC}"
fi

# Start application with PM2
echo -e "\n${YELLOW}Starting application with PM2...${NC}"
cd $HOME_DIR/$APP_DIR
sudo -u $ACTUAL_USER bash -c "cd $HOME_DIR/$APP_DIR && pm2 start npm --name 'ewers-app' -- start"

# Setup PM2 to start on boot
pm2_startup=$(sudo -u $ACTUAL_USER bash -c "pm2 startup systemd -u $ACTUAL_USER --hp $HOME_DIR 2>/dev/null | tail -n 1")
eval "$pm2_startup" 2>/dev/null || true
sudo -u $ACTUAL_USER bash -c "pm2 save"

# Create uninstall script
echo -e "\n${YELLOW}Creating uninstall script...${NC}"
cat > $HOME_DIR/uninstall-ewers.sh << EOL
#!/bin/bash

# ANSI colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if script is run as root
if [ "\$EUID" -ne 0 ]; then
  echo -e "\${RED}Please run this script as root or with sudo.\${NC}"
  exit 1
fi

echo -e "\${YELLOW}Uninstalling IPCR Early Warning & Response System...\${NC}"

# Get confirmation
read -p "Are you sure you want to uninstall? This will remove all data. (y/n): " CONFIRM
if [[ "\$CONFIRM" != "y" && "\$CONFIRM" != "Y" ]]; then
  echo -e "\${RED}Uninstallation cancelled.\${NC}"
  exit 1
fi

# Get information about installation
ACTUAL_USER="$ACTUAL_USER"
HOME_DIR="$HOME_DIR"
DB_NAME="$DB_NAME"
DB_USER="$DB_USER"

# Stop PM2 app
echo -e "\${YELLOW}Stopping application...\${NC}"
sudo -u \$ACTUAL_USER bash -c "pm2 delete ewers-app 2>/dev/null" || true
sudo -u \$ACTUAL_USER bash -c "pm2 save"

# Remove Nginx configuration
if [ -f /etc/nginx/sites-enabled/ewers ]; then
  echo -e "\${YELLOW}Removing Nginx configuration...\${NC}"
  rm -f /etc/nginx/sites-enabled/ewers
  rm -f /etc/nginx/sites-available/ewers
  systemctl restart nginx
fi

# Remove desktop shortcut
if [ -f "\$HOME_DIR/Desktop/IPCR System.desktop" ]; then
  echo -e "\${YELLOW}Removing desktop shortcut...\${NC}"
  rm -f "\$HOME_DIR/Desktop/IPCR System.desktop"
fi

# Ask if database should be dropped
read -p "Do you want to drop the PostgreSQL database? (y/n): " DROP_DB
if [[ "\$DROP_DB" == "y" || "\$DROP_DB" == "Y" ]]; then
  echo -e "\${YELLOW}Dropping database...\${NC}"
  su - postgres -c "psql -c 'DROP DATABASE IF EXISTS $DB_NAME;'"
  su - postgres -c "psql -c 'DROP USER IF EXISTS $DB_USER;'"
fi

# Remove application directory
echo -e "\${YELLOW}Removing application files...\${NC}"
rm -rf "\$HOME_DIR/ewers-w2"

echo -e "\${GREEN}Uninstallation completed successfully!\${NC}"
EOL

chmod +x $HOME_DIR/uninstall-ewers.sh
chown $ACTUAL_USER:$ACTUAL_USER $HOME_DIR/uninstall-ewers.sh

# Display information
echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}IPCR Early Warning & Response System deployment complete!${NC}"
echo -e "${GREEN}====================================================${NC}"
echo -e "\n${YELLOW}Access Information:${NC}"
echo -e "Local URL: http://localhost:$APP_PORT"

if [[ "$INSTALL_NGINX" == "y" || "$INSTALL_NGINX" == "Y" ]]; then
  IP_ADDRESS=$(hostname -I | awk '{print $1}')
  echo -e "Public URL: http://$IP_ADDRESS"
fi

echo -e "\n${YELLOW}Database Information:${NC}"
echo -e "Name: $DB_NAME"
echo -e "User: $DB_USER"
echo -e "Password: $DB_PASSWORD"

echo -e "\n${YELLOW}Admin User:${NC}"
echo -e "Username: $ADMIN_USERNAME"
echo -e "Password: $ADMIN_PASSWORD"

echo -e "\n${YELLOW}Application logs can be viewed with:${NC}"
echo -e "sudo -u $ACTUAL_USER bash -c 'pm2 logs ewers-app'"

echo -e "\n${YELLOW}To restart the application:${NC}"
echo -e "sudo -u $ACTUAL_USER bash -c 'pm2 restart ewers-app'"

echo -e "\n${YELLOW}To uninstall the application:${NC}"
echo -e "sudo $HOME_DIR/uninstall-ewers.sh"

echo -e "\n${GREEN}Deployment completed successfully!${NC}"

# Open browser (if running in desktop environment)
if [ -n "$DISPLAY" ]; then
  echo -e "\n${YELLOW}Opening application in browser...${NC}"
  sudo -u $ACTUAL_USER bash -c "xdg-open http://localhost:$APP_PORT"
fi