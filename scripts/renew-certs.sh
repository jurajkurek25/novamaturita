#!/usr/bin/env bash
# Obnova SSL certifikátov (spúšťaj cez cron každý mesiac)
# crontab: 0 3 1 * * /opt/novamaturita/scripts/renew-certs.sh >> /var/log/cert-renew.log 2>&1
set -euo pipefail

DOMAIN="novamaturita.sk"
APP_DIR="/opt/novamaturita"

certbot renew --quiet

cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$APP_DIR/nginx/certs/fullchain.pem"
cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem"   "$APP_DIR/nginx/certs/privkey.pem"

docker compose -f "$APP_DIR/docker-compose.yml" exec nginx nginx -s reload
echo "$(date): Certifikáty obnovené"
