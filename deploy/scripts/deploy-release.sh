#!/usr/bin/env bash
set -Eeuo pipefail

REPO_DIR="/var/www/marble-sales-website"
BACKEND_DIR="$REPO_DIR/backend"
FRONTEND_DIR="$REPO_DIR/frontend"
BACKEND_SERVICE="marble-backend"
FRONTEND_SERVICE="marble-frontend"
BRANCH=""
RUN_DB_SETUP="false"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

fail() {
  log "ERROR: $1"
  exit 1
}

usage() {
  cat <<'EOF'
Usage:
  deploy-release.sh [options]

Options:
  --repo-dir <path>      Repository path (default: /var/www/marble-sales-website)
  --branch <name>        Pull a specific branch before build (default: current branch)
  --with-db-setup        Run backend db:setup before backend build
  -h, --help             Show this help

Examples:
  ./deploy-release.sh
  ./deploy-release.sh --branch main
  ./deploy-release.sh --with-db-setup
EOF
}

run_systemctl() {
  if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    systemctl "$@"
  else
    sudo systemctl "$@"
  fi
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --repo-dir)
        REPO_DIR="${2:-}"
        [[ -n "$REPO_DIR" ]] || fail "--repo-dir requires a value"
        shift 2
        ;;
      --branch)
        BRANCH="${2:-}"
        [[ -n "$BRANCH" ]] || fail "--branch requires a value"
        shift 2
        ;;
      --with-db-setup)
        RUN_DB_SETUP="true"
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        fail "Unknown argument: $1"
        ;;
    esac
  done

  BACKEND_DIR="$REPO_DIR/backend"
  FRONTEND_DIR="$REPO_DIR/frontend"
}

git_update() {
  log "Updating git repository..."
  cd "$REPO_DIR"

  if [[ -n "$BRANCH" ]]; then
    git fetch origin "$BRANCH"
    git checkout "$BRANCH"
    git pull --ff-only origin "$BRANCH"
  else
    git pull --ff-only
  fi
}

build_backend() {
  log "Installing backend dependencies..."
  cd "$BACKEND_DIR"
  pnpm install --frozen-lockfile

  if [[ "$RUN_DB_SETUP" == "true" ]]; then
    log "Running backend db:setup..."
    pnpm run db:setup
  fi

  log "Building backend..."
  pnpm run build
}

build_frontend() {
  log "Installing frontend dependencies..."
  cd "$FRONTEND_DIR"
  pnpm install --frozen-lockfile

  log "Building frontend..."
  pnpm run build
}

restart_services() {
  log "Restarting services..."
  run_systemctl restart "$BACKEND_SERVICE" "$FRONTEND_SERVICE"
  run_systemctl status "$BACKEND_SERVICE" "$FRONTEND_SERVICE" --no-pager
}

verify_health() {
  require_cmd curl

  log "Checking backend health..."
  curl --fail --silent --show-error "http://127.0.0.1:4000/health" >/dev/null

  log "Checking frontend health..."
  curl --fail --silent --show-error "http://127.0.0.1:3000" >/dev/null
}

main() {
  parse_args "$@"

  require_cmd git
  require_cmd pnpm
  require_cmd node

  [[ -d "$REPO_DIR/.git" ]] || fail "Repository not found: $REPO_DIR"
  [[ -f "$BACKEND_DIR/package.json" ]] || fail "Backend package.json not found: $BACKEND_DIR"
  [[ -f "$FRONTEND_DIR/package.json" ]] || fail "Frontend package.json not found: $FRONTEND_DIR"

  git_update
  build_backend
  build_frontend
  restart_services
  verify_health

  log "Deploy completed successfully."
}

main "$@"
