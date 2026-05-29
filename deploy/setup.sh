#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# TrackAudit — First-time VPS setup (Ubuntu 24.04)
# Run once as root: bash setup.sh your-domain.com
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DOMAIN="${1:?Usage: bash setup.sh your-domain.com}"
APP_DIR="/var/www/trackaudit"
REPO_URL="${2:-}"   # optional: pass your git repo URL as second arg

echo "==> [1/10] System packages"
apt-get update -q
apt-get install -y -q \
    git curl wget build-essential \
    python3.12 python3.12-venv python3.12-dev \
    nginx redis-server \
    certbot python3-certbot-nginx \
    ufw fail2ban

echo "==> [2/10] Node.js 20"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y -q nodejs

echo "==> [3/10] App user"
id -u trackaudit &>/dev/null || useradd --system --shell /bin/bash \
    --home "$APP_DIR" --create-home trackaudit

echo "==> [4/10] App directory"
mkdir -p "$APP_DIR"/{frontend,backend/media/reports,backend/staticfiles}
mkdir -p /var/log/celery /var/run/celery
chown -R trackaudit:trackaudit "$APP_DIR" /var/log/celery

echo "==> [5/10] Clone / copy code"
if [ -n "$REPO_URL" ]; then
    git clone "$REPO_URL" /tmp/trackaudit-src
    cp -r /tmp/trackaudit-src/backend "$APP_DIR/"
    cp -r /tmp/trackaudit-src/frontend "$APP_DIR/"
    rm -rf /tmp/trackaudit-src
else
    echo "    No REPO_URL given — copy your code to $APP_DIR manually, then re-run from step 6."
fi

echo "==> [6/10] Python venv + dependencies"
python3.12 -m venv "$APP_DIR/backend/venv"
"$APP_DIR/backend/venv/bin/pip" install --upgrade pip -q
"$APP_DIR/backend/venv/bin/pip" install -r "$APP_DIR/backend/requirements.txt" -q

echo "==> [7/10] Frontend build"
cd "$APP_DIR/frontend"
npm ci --silent
npm run build

echo "==> [8/10] Django migrate + collectstatic"
cd "$APP_DIR/backend"
if [ ! -f .env ]; then
    echo "    WARNING: No .env found. Copy .env.production.example to .env and fill in values, then re-run steps 8-10."
else
    DJANGO_SETTINGS_MODULE=trackaudit.settings.production \
        "$APP_DIR/backend/venv/bin/python" manage.py migrate --no-input
    DJANGO_SETTINGS_MODULE=trackaudit.settings.production \
        "$APP_DIR/backend/venv/bin/python" manage.py collectstatic --no-input
fi

echo "==> [9/10] Systemd services"
DEPLOY_DIR="$(dirname "$(realpath "$0")")"
cp "$DEPLOY_DIR/gunicorn.service"      /etc/systemd/system/trackaudit-gunicorn.service
cp "$DEPLOY_DIR/celery-worker.service" /etc/systemd/system/trackaudit-celery-worker.service
cp "$DEPLOY_DIR/celery-beat.service"   /etc/systemd/system/trackaudit-celery-beat.service
systemctl daemon-reload
systemctl enable --now redis-server
systemctl enable --now trackaudit-gunicorn
systemctl enable --now trackaudit-celery-worker
systemctl enable --now trackaudit-celery-beat

echo "==> [10/10] Nginx + firewall"
# Replace YOUR_DOMAIN placeholder
sed "s/YOUR_DOMAIN/$DOMAIN/g" "$DEPLOY_DIR/nginx.conf" \
    > /etc/nginx/sites-available/trackaudit
ln -sf /etc/nginx/sites-available/trackaudit /etc/nginx/sites-enabled/trackaudit
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo ""
echo "==> SSL certificate"
echo "    Run: certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
echo "==> Done. Check service status:"
echo "    systemctl status trackaudit-gunicorn"
echo "    systemctl status trackaudit-celery-worker"
echo "    systemctl status trackaudit-celery-beat"
chown -R trackaudit:trackaudit "$APP_DIR"
