# SSL (HTTPS) for cewers.com.ng

Production server: **134.209.178.224**  
Domain: **https://cewers.com.ng**

## Quick setup (Let's Encrypt on the server)

1. **DNS**: Ensure `cewers.com.ng` and `www.cewers.com.ng` have an **A record** pointing to `134.209.178.224`.

2. **SSH into the server**:
   ```bash
   ssh root@134.209.178.224
   ```

3. **Run the setup script** (from the repo on the server, or copy the script):
   ```bash
   cd ~/ewers-w2   # or wherever the app is cloned
   sudo bash setup-letsencrypt-cewers.sh
   ```
   Or with a custom domain/port/email:
   ```bash
   sudo EWERS_DOMAIN=cewers.com.ng EWERS_PORT=4342 CERTBOT_EMAIL=you@example.com bash setup-letsencrypt-cewers.sh
   ```

4. **If port 80 is closed**, open it and reload:
   ```bash
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw reload
   ```

5. After success, use **https://cewers.com.ng**. HTTP will redirect to HTTPS.

## Manual Let's Encrypt (if you prefer)

```bash
sudo apt install -y certbot python3-certbot-nginx
# Point nginx server_name to cewers.com.ng and reload nginx, then:
sudo certbot --nginx -d cewers.com.ng -d www.cewers.com.ng
```

Certbot will update your Nginx config and add certificates. Renewal is usually automatic (certbot.timer or cron).

## App behind HTTPS

- Set **COOKIE_SECURE** (or keep default): in production the app already uses `cookie.secure: true` when not explicitly disabled, so sessions work over HTTPS.
- If you use a reverse proxy (Nginx), `trust proxy` is already set so the app sees `X-Forwarded-Proto: https` and behaves correctly.
