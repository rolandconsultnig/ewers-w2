# Early Alert Network – Step-by-Step Deployment on Ubuntu Server 24

Complete deployment guide with every command and file content. Run each block in order.

---

## Prerequisites

- Ubuntu Server 24.04 LTS
- SSH access with sudo
- Internet connection

---

## Step 1: Connect and Update System

SSH into your server:

```bash
ssh your_username@your_server_ip
```

Update packages:

```bash
sudo apt update
```

```bash
sudo apt upgrade -y
```

---

## Step 2: Install Required System Packages

```bash
sudo apt install -y git curl build-essential
```

---

## Step 3: Install Node.js 20 LTS

Add NodeSource repository:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
```

Install Node.js:

```bash
sudo apt install -y nodejs
```

Verify:

```bash
node --version
```

Expected: `v20.x.x`

```bash
npm --version
```

---

## Step 4: Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
```

Start PostgreSQL:

```bash
sudo systemctl start postgresql
```

Enable on boot:

```bash
sudo systemctl enable postgresql
```

Check status:

```bash
sudo systemctl status postgresql
```

Press `q` to exit.

---

## Step 5: Create Database User and Database

Switch to postgres user:

```bash
sudo -u postgres psql
```

In the `postgres=#` prompt, run these one by one (replace `YourSecurePassword123` with a strong password):

```sql
CREATE USER ewers_user WITH PASSWORD 'YourSecurePassword123';
```

```sql
CREATE DATABASE ewers_db OWNER ewers_user;
```

```sql
GRANT ALL PRIVILEGES ON DATABASE ewers_db TO ewers_user;
```

```sql
\c ewers_db
```

```sql
GRANT ALL ON SCHEMA public TO ewers_user;
```

```sql
\q
```

Save the password for the `.env` file.

---

## Step 6: Install PM2

```bash
sudo npm install -g pm2
```

---

## Step 7: Clone the Repository

```bash
cd ~
```

```bash
git clone https://github.com/rolandconsultnig/ewers-w2.git
```

```bash
cd ewers-w2
```

---

## Step 8: Generate Session Secret

```bash
openssl rand -base64 32
```

Copy the output (e.g. `K7x9mP2qR5sT8vW1yZ4aB6cD0eF3gH...`). You will use it in the next step.

---

## Step 9: Create the .env File

Create the file:

```bash
nano .env
```

Paste this (replace placeholders with your values):

```
NODE_ENV=production
DATABASE_URL=postgresql://ewers_user:YourSecurePassword123@localhost:5432/ewers_db
SESSION_SECRET=PASTE_YOUR_GENERATED_SECRET_HERE
PORT=4342
```

Replace:
- `YourSecurePassword123` with the database password from Step 5
- `PASTE_YOUR_GENERATED_SECRET_HERE` with the output from Step 8

Save and exit: `Ctrl+X`, then `Y`, then `Enter`.

---

## Step 10: Install Dependencies

```bash
cd ~/ewers-w2
```

```bash
npm ci
```

---

## Step 11: Build the Application

```bash
npm run build
```

Wait until it finishes (Vite build + esbuild).

---

## Step 12: Push Database Schema

```bash
npm run db:push
```

If you see a prompt like:

```
Is related_incident_id column in feedbacks table created or renamed from another column?
❯ + related_incident_id               create column
```

Use arrow keys to select **create column**, then press `Enter`.

---

## Step 13: Seed Admin User

```bash
npm run db:seed
```

Expected output:

```
Admin user created successfully!
  Username: admin
  Password: admin123
```

If it says "Admin user already exists", the default admin is already there.

---

## Step 14: Start the Application with PM2

```bash
cd ~/ewers-w2
```

```bash
pm2 start npm --name "ewers-app" -- start
```

Check status:

```bash
pm2 status
```

View logs:

```bash
pm2 logs ewers-app
```

Press `Ctrl+C` to stop viewing logs.

---

## Step 15: Configure PM2 to Start on Boot

Generate startup script:

```bash
pm2 startup
```

You will see output like:

```
[PM2] To setup the Startup Script, copy/paste the following command:
sudo env PATH=...
```

Copy the full `sudo env PATH=...` line and run it.

Then save the process list:

```bash
pm2 save
```

---

## Step 16: Test the Application

Get your server IP:

```bash
hostname -I | awk '{print $1}'
```

Open in a browser: `http://YOUR_SERVER_IP:4342`

Login: `admin` / `admin123`

---

## Step 17: Install Nginx (Reverse Proxy)

```bash
sudo apt install -y nginx
```

---

## Step 18: Create Nginx Site Configuration

```bash
sudo nano /etc/nginx/sites-available/ewers
```

Paste this (replace `your-domain.com` with your domain or `_` for any host):

```nginx
server {
    listen 80;
    server_name your-domain.com;

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

Save: `Ctrl+X`, `Y`, `Enter`.

---

## Step 19: Enable Nginx Site

```bash
sudo ln -s /etc/nginx/sites-available/ewers /etc/nginx/sites-enabled/
```

Remove default site (optional):

```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

Test Nginx config:

```bash
sudo nginx -t
```

Restart Nginx:

```bash
sudo systemctl restart nginx
```

---

## Step 20: Configure Firewall

```bash
sudo ufw allow 22
```

```bash
sudo ufw allow 80
```

```bash
sudo ufw allow 443
```

```bash
sudo ufw allow 4342/tcp
```

```bash
sudo ufw enable
```

Type `y` and press `Enter` when asked.

---

## Step 21: Access via Nginx (Port 80)

Open in browser: `http://YOUR_SERVER_IP` (no port needed).

---

## Step 22: SSL with Let's Encrypt (Optional)

Install Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Get certificate (replace `your-domain.com` with your domain):

```bash
sudo certbot --nginx -d your-domain.com
```

Follow prompts (email, agree to terms).

Test auto-renewal:

```bash
sudo certbot renew --dry-run
```

---

## Step 23: Create Upload Directory (Optional)

```bash
sudo mkdir -p /var/lib/ewers/uploads
```

```bash
sudo chown $USER:$USER /var/lib/ewers/uploads
```

Add to `.env`:

```bash
nano ~/ewers-w2/.env
```

Add this line:

```
UPLOAD_DIR=/var/lib/ewers/uploads
```

Save and restart:

```bash
pm2 restart ewers-app
```

---

## Useful Commands Reference

| Task | Command |
|------|---------|
| View logs | `pm2 logs ewers-app` |
| Restart app | `pm2 restart ewers-app` |
| Stop app | `pm2 stop ewers-app` |
| Start app | `pm2 start ewers-app` |
| PM2 monitor | `pm2 monit` |
| List processes | `pm2 list` |

---

## Troubleshooting Commands

Check PostgreSQL:

```bash
sudo systemctl status postgresql
```

Check if port 4342 is in use:

```bash
sudo ss -tlnp | grep 4342
```

Check Nginx:

```bash
sudo nginx -t
```

```bash
sudo systemctl status nginx
```

View app logs:

```bash
pm2 logs ewers-app --lines 100
```

Rebuild from scratch:

```bash
cd ~/ewers-w2
rm -rf node_modules dist
npm ci
npm run build
pm2 restart ewers-app
```

---

## Summary Checklist

- [ ] Step 1: System updated
- [ ] Step 2: git, curl, build-essential installed
- [ ] Step 3: Node.js 20 installed
- [ ] Step 4: PostgreSQL installed and running
- [ ] Step 5: Database and user created
- [ ] Step 6: PM2 installed
- [ ] Step 7: Repository cloned
- [ ] Step 8: Session secret generated
- [ ] Step 9: .env file created
- [ ] Step 10: npm ci completed
- [ ] Step 11: npm run build completed
- [ ] Step 12: db:push completed
- [ ] Step 13: db:seed completed
- [ ] Step 14: PM2 started
- [ ] Step 15: PM2 startup configured
- [ ] Step 16: App accessible on port 4342
- [ ] Step 17: Nginx installed
- [ ] Step 18: Nginx config created
- [ ] Step 19: Nginx site enabled
- [ ] Step 20: Firewall configured
- [ ] Step 21: App accessible on port 80
- [ ] Step 22: SSL configured (optional)
- [ ] Step 23: Upload directory created (optional)
