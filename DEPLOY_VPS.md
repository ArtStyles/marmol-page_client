# Deploy on VPS (Ubuntu + systemd + Nginx)

This project runs as:

- `frontend` (Next.js) on `127.0.0.1:3000`
- `backend` (Express) on `127.0.0.1:4000`
- `nginx` as reverse proxy for the domain

## 1) VPS requirements

```bash
sudo apt update
sudo apt install -y nginx postgresql postgresql-contrib curl git

# Node.js 22 LTS + pnpm
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo corepack enable
sudo corepack prepare pnpm@latest --activate
```

Verify binary paths (if they differ, update the `.service` files):

```bash
which node
which pnpm
```

## 2) Clone and install dependencies

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www
git clone <TU_REPO_GIT> marble-sales-website
cd marble-sales-website

cd backend
pnpm install --frozen-lockfile

cd ../frontend
pnpm install --frozen-lockfile
```

## 3) Environment variables

Backend:

```bash
cd /var/www/marble-sales-website/backend
cp .env.example .env
```

Set at least:

- `PORT=4000`
- `DATABASE_URL=postgresql://usuario:password@localhost:5432/marmol`
- `FRONTEND_ORIGIN=https://marble.example.com,https://www.marble.example.com`
- `AUTH_TOKEN_SECRET=<secreto-fuerte>`

Recommended for production bootstrap account:

- `SUPER_ADMIN_EMAIL=<correo-super-admin>`
- `SUPER_ADMIN_PASSWORD=<password-fuerte-super-admin>`

Frontend:

```bash
cd /var/www/marble-sales-website/frontend
cp .env.example .env.production
```

Recommended value:

- `NEXT_PUBLIC_API_BASE_URL=/api`

## 4) Build and DB setup

```bash
cd /var/www/marble-sales-website/backend
pnpm run db:setup
pnpm run build

cd /var/www/marble-sales-website/frontend
pnpm run build
```

If the database already exists and you only need pending migrations (for example, to ensure Super Admin user exists), run:

```bash
cd /var/www/marble-sales-website/backend
pnpm run db:migrate
```

## 5) systemd services

Copy templates:

```bash
sudo cp /var/www/marble-sales-website/deploy/systemd/marble-backend.service /etc/systemd/system/
sudo cp /var/www/marble-sales-website/deploy/systemd/marble-frontend.service /etc/systemd/system/
```

If needed, adjust `User=`, `WorkingDirectory=`, `ExecStart=` and `EnvironmentFile=`.

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable marble-backend marble-frontend
sudo systemctl restart marble-backend marble-frontend
sudo systemctl status marble-backend marble-frontend --no-pager
```

## 6) Nginx reverse proxy

```bash
sudo cp /var/www/marble-sales-website/deploy/nginx/marble-sales.conf /etc/nginx/sites-available/marble-sales.conf
sudo ln -s /etc/nginx/sites-available/marble-sales.conf /etc/nginx/sites-enabled/marble-sales.conf
sudo nginx -t
sudo systemctl reload nginx
```

Update `server_name` in `marble-sales.conf` with your real domain.

## 7) HTTPS (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d marble.example.com -d www.marble.example.com
```

## 8) Quick verification

```bash
curl http://127.0.0.1:4000/health
curl -I http://127.0.0.1:3000
curl -I https://marble.example.com
```

Logs:

```bash
sudo journalctl -u marble-backend -f
sudo journalctl -u marble-frontend -f
sudo tail -f /var/log/nginx/error.log
```

## 9) Automated deploy script

```bash
cd /var/www/marble-sales-website
chmod +x deploy/scripts/deploy-release.sh
./deploy/scripts/deploy-release.sh
```

The script runs: `git pull --ff-only`, dependency install, backend/frontend build, service restart, and local health checks.
It uses `sudo systemctl` when you are not root.

Optional examples:

```bash
# Pull and deploy a specific branch
./deploy/scripts/deploy-release.sh --branch main

# Include DB schema/data setup before backend build
./deploy/scripts/deploy-release.sh --with-db-setup
```

## 10) GitHub integration (auto deploy on push)

See:

- `deploy/GITHUB_AUTODEPLOY.md`

That guide covers both:

- manual secure `git pull` from VPS
- automatic deploy using GitHub Actions + SSH when pushing to `main`
