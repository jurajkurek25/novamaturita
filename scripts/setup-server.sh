#!/usr/bin/env bash
# =============================================================
# NovaMaturita – prvotné nastavenie VPS servera (Ubuntu 22.04)
# Spusti ako root: bash setup-server.sh
# =============================================================
set -euo pipefail

DOMAIN="novamaturita.sk"
APP_DIR="/opt/novamaturita"
APP_USER="novamaturita"

echo "==> Aktualizácia systému"
apt-get update -qq && apt-get upgrade -y -qq

echo "==> Inštalácia závislostí"
apt-get install -y -qq git curl ufw certbot

echo "==> Inštalácia Docker"
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi

echo "==> Inštalácia Docker Compose plugin"
apt-get install -y -qq docker-compose-plugin

echo "==> Firewall"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Systémový používateľ pre app"
if ! id "$APP_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$APP_USER"
  usermod -aG docker "$APP_USER"
fi

echo "==> Klonovanie repozitára"
mkdir -p "$APP_DIR"
chown "$APP_USER:$APP_USER" "$APP_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
  sudo -u "$APP_USER" git clone https://github.com/jurajkurek25/novamaturita.git "$APP_DIR"
fi

echo "==> SSL certifikát (Let's Encrypt)"
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  # Dočasne zastav nginx ak beží
  docker compose -f "$APP_DIR/docker-compose.yml" stop nginx 2>/dev/null || true
  certbot certonly --standalone -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN"
fi

echo "==> Kopírovanie SSL certifikátov do projektu"
cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$APP_DIR/nginx/certs/fullchain.pem"
cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem"   "$APP_DIR/nginx/certs/privkey.pem"
chown -R "$APP_USER:$APP_USER" "$APP_DIR/nginx/certs"

echo ""
echo "============================================================"
echo " Ďalší krok: vytvor .env.local súbor"
echo " cp $APP_DIR/.env.local.example $APP_DIR/.env.local"
echo " nano $APP_DIR/.env.local"
echo ""
echo " Potom spusti:"
echo " cd $APP_DIR && docker compose up -d --build"
echo "============================================================"
