#!/bin/bash
#
# Let's Encrypt SSL for cewers.com.ng on production server (134.209.178.224).
# Run ON THE SERVER as root: sudo bash setup-letsencrypt-cewers.sh
#
# Prerequisites:
#   - Domain cewers.com.ng points to this server's public IP (A record).
#   - Nginx is installed and the app runs on port 4342 (or set EWERS_PORT).
#
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Run as root: sudo bash setup-letsencrypt-cewers.sh${NC}"
  exit 1
fi

DOMAIN="${EWERS_DOMAIN:-cewers.com.ng}"
APP_PORT="${EWERS_PORT:-4342}"
# Optional: your email for Let's Encrypt expiry/security notices
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"

echo -e "${YELLOW}Setting up Let's Encrypt for $DOMAIN (app port $APP_PORT)${NC}"

# Install certbot and nginx plugin
if ! command -v certbot &>/dev/null; then
  echo -e "${YELLOW}Installing certbot and python3-certbot-nginx...${NC}"
  apt-get update -qq
  apt-get install -y -qq certbot python3-certbot-nginx
fi

# Nginx config: HTTP only first so certbot can do ACME challenge; certbot adds HTTPS
cat > /etc/nginx/sites-available/ewers << NGINXCONF
map \$http_upgrade \$connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    client_max_body_size 50M;
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;
    proxy_temp_file_write_size 256k;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
NGINXCONF

ln -sf /etc/nginx/sites-available/ewers /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default 2>/dev/null

nginx -t || { echo -e "${RED}Nginx config test failed. Fix errors above.${NC}"; exit 1; }
systemctl reload nginx

echo -e "${YELLOW}Obtaining Let's Encrypt certificate for $DOMAIN (and www.$DOMAIN)...${NC}"
CERTBOT_OPTS="--nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos"
if [ -n "$CERTBOT_EMAIL" ]; then
  CERTBOT_OPTS="$CERTBOT_OPTS --email $CERTBOT_EMAIL"
else
  CERTBOT_OPTS="$CERTBOT_OPTS --register-unsafely-without-email"
fi

if certbot $CERTBOT_OPTS; then
  echo -e "${GREEN}SSL certificate installed. HTTPS: https://$DOMAIN${NC}"
  # Ensure auto-renewal is scheduled (Ubuntu/Debian usually has a cron or systemd timer)
  if ! systemctl is-enabled certbot.timer &>/dev/null; then
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
    echo -e "${YELLOW}Added cron for certificate renewal.${NC}"
  fi
else
  echo -e "${RED}Certbot failed. Common causes:${NC}"
  echo "  - DNS for $DOMAIN does not point to this server (A record to $(curl -sS ifconfig.me 2>/dev/null || echo 'this IP'))."
  echo "  - Port 80 is blocked by a firewall (allow: sudo ufw allow 80; sudo ufw reload)."
  echo "  - Another service is using port 80."
  exit 1
fi

systemctl reload nginx
echo -e "\n${GREEN}Done. Use https://$DOMAIN (or https://www.$DOMAIN).${NC}"
