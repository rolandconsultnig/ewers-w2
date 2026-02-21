#!/bin/bash
#
# Early Alert Network - One-Click Setup for Ubuntu 24
# Run: curl -sSL https://raw.githubusercontent.com/rolandconsultnig/ewers-w2/main/one-click-setup.sh | sudo bash
# Or:  wget -qO- https://raw.githubusercontent.com/rolandconsultnig/ewers-w2/main/one-click-setup.sh | sudo bash
#

set -e

# ANSI colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# Defaults (override with env vars: EWERS_DB_NAME, EWERS_PORT, etc.)
DB_NAME="${EWERS_DB_NAME:-ewers_db}"
DB_USER="${EWERS_DB_USER:-ewers_user}"
APP_PORT="${EWERS_PORT:-4342}"
REPO_URL="${EWERS_REPO:-https://github.com/rolandconsultnig/ewers-w2.git}"
APP_DIR="ewers-w2"
INSTALL_NGINX="${EWERS_NGINX:-y}"

# Check root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Run with sudo: curl -sSL <url> | sudo bash${NC}"
  exit 1
fi

# Get user
ACTUAL_USER="${SUDO_USER:-$USER}"
if [ "$ACTUAL_USER" = "root" ]; then
  ACTUAL_USER="ubuntu"
  if [ ! -d "/home/ubuntu" ]; then
    ACTUAL_USER=$(ls /home | head -1)
  fi
fi
HOME_DIR=$(eval echo ~$ACTUAL_USER)

# Generate secrets
DB_PASSWORD=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9')
SESSION_SECRET=$(openssl rand -base64 32)

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   Early Alert Network - One-Click Setup (Ubuntu 24)      ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}[1/10] Updating system...${NC}"
apt update -qq && apt upgrade -y -qq

echo -e "${YELLOW}[2/10] Installing dependencies...${NC}"
apt install -y -qq git curl build-essential

echo -e "${YELLOW}[3/10] Installing Node.js 20 LTS...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
apt install -y -qq nodejs

echo -e "${YELLOW}[4/10] Installing PostgreSQL...${NC}"
apt install -y -qq postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

echo -e "${YELLOW}[5/10] Creating database...${NC}"
sudo -u postgres psql -q -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || true
sudo -u postgres psql -q -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -q -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -q -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;" 2>/dev/null || true

echo -e "${YELLOW}[6/10] Installing PM2...${NC}"
npm install -g pm2 --silent

echo -e "${YELLOW}[7/10] Cloning and building application...${NC}"
cd $HOME_DIR
rm -rf $APP_DIR
git clone -q $REPO_URL $APP_DIR
chown -R $ACTUAL_USER:$ACTUAL_USER $APP_DIR

# Create .env
cat > $HOME_DIR/$APP_DIR/.env << EOL
NODE_ENV=production
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME
SESSION_SECRET=$SESSION_SECRET
PORT=$APP_PORT
EOL
chown $ACTUAL_USER:$ACTUAL_USER $HOME_DIR/$APP_DIR/.env

# Build
sudo -u $ACTUAL_USER bash -c "cd $HOME_DIR/$APP_DIR && npm ci --silent && npm run build"

echo -e "${YELLOW}[8/10] Setting up database schema...${NC}"
sudo -u $ACTUAL_USER bash -c "cd $HOME_DIR/$APP_DIR && npm run db:push" <<< "" 2>/dev/null || true

echo -e "${YELLOW}[9/10] Seeding admin user...${NC}"
sudo -u $ACTUAL_USER bash -c "cd $HOME_DIR/$APP_DIR && npm run db:seed" 2>/dev/null || true

echo -e "${YELLOW}[10/10] Starting application...${NC}"
sudo -u $ACTUAL_USER bash -c "cd $HOME_DIR/$APP_DIR && pm2 delete ewers-app 2>/dev/null; pm2 start npm --name 'ewers-app' -- start"
sudo -u $ACTUAL_USER bash -c "pm2 save"
pm2 startup systemd -u $ACTUAL_USER --hp $HOME_DIR 2>/dev/null | tail -1 | bash 2>/dev/null || true

# Nginx
if [[ "$INSTALL_NGINX" == "y" || "$INSTALL_NGINX" == "Y" || "$INSTALL_NGINX" == "1" ]]; then
  echo -e "${YELLOW}Configuring Nginx...${NC}"
  apt install -y -qq nginx
  cat > /etc/nginx/sites-available/ewers << EOL
server {
    listen 80 default_server;
    server_name _;
    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOL
  ln -sf /etc/nginx/sites-available/ewers /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default 2>/dev/null
  nginx -t 2>/dev/null && systemctl restart nginx
fi

# Save credentials
CREDS_FILE="$HOME_DIR/ewers-credentials.txt"
IP=$(hostname -I | awk '{print $1}')
if [[ "$INSTALL_NGINX" == "y" || "$INSTALL_NGINX" == "Y" || "$INSTALL_NGINX" == "1" ]]; then
  ACCESS_URL="http://$IP"
else
  ACCESS_URL="http://$IP:$APP_PORT"
fi
cat > $CREDS_FILE << EOL
============================================
Early Alert Network - Setup Complete
============================================

Admin Login:
  URL:      $ACCESS_URL
  Username: admin
  Password: admin123
  (Change password after first login!)

Database:
  Name:     $DB_NAME
  User:     $DB_USER
  Password: $DB_PASSWORD

Useful Commands:
  View logs:   pm2 logs ewers-app
  Restart:     pm2 restart ewers-app
  Status:      pm2 status

============================================
EOL
chown $ACTUAL_USER:$ACTUAL_USER $CREDS_FILE
chmod 600 $CREDS_FILE

echo -e "\n${GREEN}══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Setup complete!${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════════${NC}"
echo -e "\n${CYAN}Access:${NC} $ACCESS_URL"
echo -e "${CYAN}Login:${NC}  admin / admin123"
echo -e "\n${YELLOW}Credentials saved to: $CREDS_FILE${NC}\n"
