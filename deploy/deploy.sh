#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# TrackAudit — Re-deploy (pull → build → migrate → restart)
# Run as root or trackaudit from the project root: bash deploy/deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="/trackaudit"
VENV="$APP_DIR/backend/venv/bin"

echo "==> Pull latest code"
git -C "$APP_DIR" pull --ff-only

echo "==> Backend dependencies"
"$VENV/pip" install -r "$APP_DIR/backend/requirements.txt" -q

echo "==> Database migrations"
cd "$APP_DIR/backend"
DJANGO_SETTINGS_MODULE=trackaudit.settings.production \
    "$VENV/python" manage.py migrate --no-input

echo "==> Collect static files"
DJANGO_SETTINGS_MODULE=trackaudit.settings.production \
    "$VENV/python" manage.py collectstatic --no-input --clear

echo "==> Frontend build"
cd "$APP_DIR/frontend"
npm ci --silent
npm run build

echo "==> Restart services"
systemctl restart trackaudit-gunicorn
systemctl restart trackaudit-celery-worker
systemctl restart trackaudit-celery-beat

echo "==> Done"
systemctl --no-pager status trackaudit-gunicorn | head -5
