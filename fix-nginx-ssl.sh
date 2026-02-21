#!/bin/bash
# Quick fix for EWERS: WebSocket support + optional SSL
# Run on the server: sudo bash fix-nginx-ssl.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root: sudo bash fix-nginx-ssl.sh${NC}"
  exit 1
fi

APP_PORT=${1:-4342}
echo -e "${YELLOW}Fixing Nginx config for port $APP_PORT...${NC}"

# Remove old default site if it conflicts
rm -f /etc/nginx/sites-enabled/default

# Write the corrected config with WebSocket support
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

sed -i "s/APPPORT/$APP_PORT/g" /etc/nginx/sites-available/ewers
ln -sf /etc/nginx/sites-available/ewers /etc/nginx/sites-enabled/

echo -e "${GREEN}WebSocket config applied.${NC}"

# --- SSL setup ---
echo ""
echo -e "${YELLOW}Set up HTTPS? (self-signed certificate for IP address)${NC}"
read -p "Enable SSL? (y/n) [y]: " ENABLE_SSL
ENABLE_SSL=${ENABLE_SSL:-y}

if [[ "$ENABLE_SSL" == "y" || "$ENABLE_SSL" == "Y" ]]; then
  SERVER_IP=$(hostname -I | awk '{print $1}')
  echo -e "${YELLOW}Generating self-signed SSL certificate for $SERVER_IP...${NC}"

  mkdir -p /etc/nginx/ssl
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/ewers.key -out /etc/nginx/ssl/ewers.crt \
    -subj "/C=NG/ST=FCT/L=Abuja/O=IPCR/CN=$SERVER_IP" 2>/dev/null

  # Append HTTPS server block
  cat >> /etc/nginx/sites-available/ewers << 'SSLEOF'

server {
    listen 443 ssl http2;
    server_name _;

    ssl_certificate     /etc/nginx/ssl/ewers.crt;
    ssl_certificate_key /etc/nginx/ssl/ewers.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

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
        proxy_set_header X-Forwarded-Proto https;
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
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
SSLEOF

  sed -i "s/APPPORT/$APP_PORT/g" /etc/nginx/sites-available/ewers

  # Also redirect HTTP to HTTPS
  sed -i '/server_name _;/{n;s/.*/\n    return 301 https:\/\/$host$request_uri;/;}' /etc/nginx/sites-available/ewers

  echo -e "${GREEN}SSL certificate generated and HTTPS enabled.${NC}"
  echo -e "${YELLOW}Note: Browser will show a security warning for self-signed certs — this is expected.${NC}"
  echo -e "${YELLOW}For a trusted certificate, get a domain name and use Let's Encrypt:${NC}"
  echo -e "  sudo apt install certbot python3-certbot-nginx"
  echo -e "  sudo certbot --nginx -d yourdomain.com"
fi

# Test and reload
nginx -t
systemctl reload nginx

echo ""
echo -e "${GREEN}Done! Nginx reloaded.${NC}"

SERVER_IP=$(hostname -I | awk '{print $1}')
echo -e "HTTP:  http://$SERVER_IP"
if [[ "$ENABLE_SSL" == "y" || "$ENABLE_SSL" == "Y" ]]; then
  echo -e "HTTPS: https://$SERVER_IP"
fi
