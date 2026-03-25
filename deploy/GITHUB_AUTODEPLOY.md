# GitHub + VPS (manual pull and auto deploy)

This repo already includes:

- Workflow: `.github/workflows/deploy-vps.yml`
- Deploy script on server: `deploy/scripts/deploy-release.sh`

## A) Connect VPS to GitHub for manual `git pull`

Run this on your VPS with the user that owns the app directory (recommended: non-root user):

```bash
cd ~
ssh-keygen -t ed25519 -C "vps-deploy-key" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Copy that public key and add it in GitHub:

1. Repository -> Settings -> Deploy keys
2. Add deploy key
3. Paste the public key
4. Enable write access only if you really need it (for pull, read-only is enough)

Now set your repo remote using SSH on VPS:

```bash
cd /var/www/marble-sales-website
git remote set-url origin git@github.com:<ORG_OR_USER>/<REPO>.git
git fetch origin
git pull --ff-only origin main
```

With that, your VPS can pull changes securely from GitHub.

## B) Auto deploy when pushing to `main`

The workflow connects from GitHub Actions to your VPS by SSH and runs:

```bash
./deploy/scripts/deploy-release.sh --branch main
```

### 1) Create key pair for GitHub Actions

On your local machine:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ./github-actions-deploy-key -N ""
```

You will get:

- private key: `github-actions-deploy-key`
- public key: `github-actions-deploy-key.pub`

### 2) Install public key on VPS

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
cat >> ~/.ssh/authorized_keys
# paste github-actions-deploy-key.pub content, then Ctrl+D
chmod 600 ~/.ssh/authorized_keys
```

### 3) Add GitHub repository secrets

Repository -> Settings -> Secrets and variables -> Actions -> New repository secret

Create these secrets:

- `VPS_HOST`: your server IP or domain
- `VPS_PORT`: usually `22`
- `VPS_USER`: ssh user on VPS (example: `deploy`)
- `VPS_APP_DIR`: app folder on VPS (example: `/var/www/marble-sales-website`)
- `VPS_SSH_KEY`: full private key content from `github-actions-deploy-key`
- Optional (recommended): `VPS_SSH_KEY_B64`: base64 version of private key (safer for multiline formatting)

Use one approach:
- If you set `VPS_SSH_KEY`, paste the key text with `BEGIN/END ... PRIVATE KEY`.
- If you set `VPS_SSH_KEY_B64`, paste only the base64 string.

Important: `VPS_SSH_KEY` must include full multi-line key with:

- `-----BEGIN OPENSSH PRIVATE KEY-----`
- `-----END OPENSSH PRIVATE KEY-----`
- Key must be unencrypted (no passphrase), for example generated with `-N ""`.
- Do not use PuTTY `.ppk` format directly.

If you prefer `VPS_SSH_KEY_B64`, generate it from the same private key file:

```bash
# Linux/macOS
base64 -w 0 ./github-actions-deploy-key
```

```powershell
# PowerShell (Windows)
[Convert]::ToBase64String([IO.File]::ReadAllBytes(".\github-actions-deploy-key"))
```

### 4) Validate

Push to `main` and check:

1. GitHub -> Actions -> `Deploy VPS`
2. VPS logs:
   - `journalctl -u marble-backend -f`
   - `journalctl -u marble-frontend -f`

## C) Manual run from GitHub UI

You can also run it from Actions -> `Deploy VPS` -> `Run workflow`.
The workflow supports:

- custom `branch`
- optional `with_db_setup=true`
