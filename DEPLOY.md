# Deploying updates to production

**Source of truth:** GitHub `main` branch.  
**Goal:** Production server always runs the same code as `main`.

---

## 1. You (development machine)

When you have new changes:

```bash
git add -A
git commit -m "Your message"
git push origin main
```

---

## 2. Production server (Ubuntu)

SSH into the server, then run the deploy script so the server matches GitHub and restarts the app:

```bash
cd ~/ewers-w2
chmod +x scripts/deploy-production.sh   # only first time
./scripts/deploy-production.sh
```

The script will:

- `git fetch` + `git reset --hard origin/main` (server matches GitHub)
- `npm install`
- `npm run build`
- Restart the app (PM2 or systemctl, if detected)

**Optional:** If you added new database tables or columns, uncomment the `npm run db:push` line in `scripts/deploy-production.sh` so migrations run on each deploy.

---

## One-time fix if the server is out of sync

If you already see "divergent branches" or the server has old code:

```bash
cd ~/ewers-w2
git fetch origin
git reset --hard origin/main
npm install
npm run build
pm2 restart all
```

After that, use the deploy script for future updates.
