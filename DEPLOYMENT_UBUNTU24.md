# Early Alert Network - Ubuntu 24 Deployment Guide

Step-by-step deployment guide for the Early Alert Network (IPCR Early Warning & Response System) on Ubuntu 24.04 LTS.

---

## One-Click Setup (Recommended)

Deploy everything with a single command (requires sudo):

```bash
curl -sSL https://raw.githubusercontent.com/rolandconsultnig/ewers-w2/main/one-click-setup.sh | sudo bash
```

Or with wget:

```bash
wget -qO- https://raw.githubusercontent.com/rolandconsultnig/ewers-w2/main/one-click-setup.sh | sudo bash
```

**What it installs:** Node.js 20, PostgreSQL, PM2, Nginx, clones the repo, builds, and starts the app.

**Default credentials:** admin / admin123 (change after first login)

**Credentials file:** Saved to `~/ewers-credentials.txt`

**Optional env vars** (set before running):
- `EWERS_NGINX=n` – Skip Nginx install
- `EWERS_PORT=5000` – Use different port
- `EWERS_DB_NAME=mydb` – Custom DB name

---

## Prerequisites

- Ubuntu 24.04 LTS server (fresh install recommended)
- Root or sudo access
- Domain name (optional, for production with SSL)

---

## Step 1: Update System

```bash
sudo apt update && sudo apt upgrade -y
```

---

## Step 2: Install Node.js 20 LTS

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version   # Should show v20.x.x
npm --version
```

---

## Step 3: Install PostgreSQL

```bash
# Install PostgreSQL 16
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify PostgreSQL is running
sudo systemctl status postgresql
```

---

## Step 4: Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# In the PostgreSQL prompt, run:
CREATE USER ewers_user WITH PASSWORD 'your_secure_password_here';
CREATE DATABASE ewers_db OWNER ewers_user;
GRANT ALL PRIVILEGES ON DATABASE ewers_db TO ewers_user;
\c ewers_db
GRANT ALL ON SCHEMA public TO ewers_user;
\q
```

Replace `your_secure_password_here` with a strong password. Save it for the `.env` file.

---

## Step 5: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

---

## Step 6: Clone the Repository

```bash
cd ~
git clone https://github.com/rolandconsultnig/ewers-w2.git
cd ewers-w2
```

---

## Step 7: Create Environment File

```bash
nano .env
```

Add the following (adjust values as needed):

```env
# Required
NODE_ENV=production
DATABASE_URL=postgresql://ewers_user:your_secure_password_here@localhost:5432/ewers_db
SESSION_SECRET=generate_a_random_32_char_string_here
PORT=4342

# Optional - JWT (uses SESSION_SECRET if not set)
JWT_SECRET=your_jwt_secret_here

# Optional - AI features (OpenAI or DeepSeek)
# OPENAI_API_KEY=sk-...
# DEEPSEEK_API_KEY=sk-...

# Optional - File uploads
UPLOAD_DIR=/var/lib/ewers/uploads

# Optional - External integrations (leave empty to skip)
# TWITTER_API_KEY=
# FACEBOOK_APP_ID=
# SENDGRID_API_KEY=
# TWILIO_ACCOUNT_SID=
```

Generate a secure `SESSION_SECRET`:
```bash
openssl rand -base64 32
```

Save and exit (Ctrl+X, then Y, then Enter).

---

## Step 8: Install Dependencies and Build

```bash
cd ~/ewers-w2

# Install dependencies
npm ci

# Build the application
npm run build
```

---

## Step 9: Push Database Schema

```bash
# Run Drizzle migrations (creates tables)
npm run db:push
```

If prompted about column changes, select **"create column"** (first option) and press Enter.

---

## Step 10: Seed Admin User

```bash
npm run db:seed
```

Default admin credentials:
- **Username:** `admin`
- **Password:** `admin123`

**Important:** Change the password immediately after first login.

---

## Step 11: Create Upload Directory (Optional)

```bash
sudo mkdir -p /var/lib/ewers/uploads
sudo chown $USER:$USER /var/lib/ewers/uploads
```

---

## Step 12: Start Application with PM2

```bash
cd ~/ewers-w2

# Start the application
pm2 start npm --name "ewers-app" -- start

# Verify it's running
pm2 status
pm2 logs ewers-app
```

---

## Step 13: Configure PM2 to Start on Boot

```bash
# Generate startup script
pm2 startup

# Copy and run the command it outputs (e.g. sudo env PATH=...)

# Save current process list
pm2 save
```

---

## Step 14: Configure Firewall (Optional)

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 4342/tcp   # If accessing app directly
sudo ufw enable
```

---

## Step 15: Install and Configure Nginx (Recommended for Production)

```bash
# Install Nginx
sudo apt install -y nginx

# Create site configuration
sudo nano /etc/nginx/sites-available/ewers
```

Add:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Or use _ for any host

    location / {
        proxy_pass http://127.0.0.1:4342;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/ewers /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 16: SSL with Let's Encrypt (Optional)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate (replace your-domain.com)
sudo certbot --nginx -d your-domain.com

# Certbot will auto-renew. Test renewal:
sudo certbot renew --dry-run
```

---

## Access the Application

- **Direct:** http://your-server-ip:4342
- **Via Nginx:** http://your-domain.com (or http://your-server-ip)

---

## Useful Commands

| Action | Command |
|--------|---------|
| View logs | `pm2 logs ewers-app` |
| Restart app | `pm2 restart ewers-app` |
| Stop app | `pm2 stop ewers-app` |
| Monitor | `pm2 monit` |

---

## Troubleshooting

### Database connection failed
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check `DATABASE_URL` in `.env` (user, password, database name)
- Ensure `ewers_user` has access: `sudo -u postgres psql -c "\du"`

### Port already in use
- Change `PORT` in `.env` (e.g. 4343)
- Update Nginx `proxy_pass` if using reverse proxy

### Build fails
- Ensure Node.js 18+ is installed
- Run `rm -rf node_modules && npm ci`
- Check for missing system deps: `sudo apt install build-essential`

### db:push hangs
- Run manually in a terminal; it may prompt for schema change decisions
- Select "create column" for new columns

---

## Quick Deploy Script

For automated deployment, use the existing script (run as root):

```bash
sudo bash deploy-ubuntu.sh
```

When prompted, use:
- **Repository URL:** `https://github.com/rolandconsultnig/ewers-w2.git`
- **Application port:** `4342`
