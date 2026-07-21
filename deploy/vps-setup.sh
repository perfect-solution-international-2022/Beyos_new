#!/usr/bin/env bash
# Beyos Clothing — first-time VPS deploy script for Debian 13
# Run as root on 89.117.61.182: bash vps-setup.sh
set -euo pipefail

DOMAIN="beyosclothing.com"
REPO_URL="https://github.com/perfect-solution-international-2022/Beyos_new.git"
APP_DIR="/home/deploy/beyos"
DB_NAME="beyos"
DB_USER="beyos"

echo "== 1/8 Update system =="
apt update && apt upgrade -y

echo "== 2/8 Create deploy user (if missing) =="
if ! id -u deploy >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" deploy
  usermod -aG sudo deploy
fi

echo "== 3/8 Install Node.js 20, MySQL, Nginx, PM2 =="
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
apt install -y mysql-server nginx git
npm install -g pm2

echo "== 4/8 Configure MySQL =="
read -rsp "Set a password for MySQL user '${DB_USER}': " DB_PASSWORD
echo
mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS ${DB_NAME};
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

echo "== 5/8 Clone repo and install deps =="
su - deploy -c "
  if [ -d ${APP_DIR} ]; then
    cd ${APP_DIR} && git pull
  else
    git clone ${REPO_URL} ${APP_DIR}
  fi
  cd ${APP_DIR} && npm install
"

echo "== 6/8 Write .env.local =="
JWT_SECRET=$(openssl rand -base64 48)
read -rp "Resend API key (RESEND_API_KEY): " RESEND_API_KEY
read -rp "OnePay App ID (ONEPAY_APP_ID): " ONEPAY_APP_ID
read -rp "OnePay App Token (ONEPAY_APP_TOKEN): " ONEPAY_APP_TOKEN
read -rp "OnePay Hash Salt (ONEPAY_HASH_SALT): " ONEPAY_HASH_SALT
read -rp "Koombiyo account name (KOOMBIYO_ACCOUNT): " KOOMBIYO_ACCOUNT
read -rp "Koombiyo API key (KOOMBIYO_API_KEY): " KOOMBIYO_API_KEY
read -rp "Koombiyo contact phone (KOOMBIYO_PHONE): " KOOMBIYO_PHONE
read -rp "Koombiyo contact email (KOOMBIYO_EMAIL): " KOOMBIYO_EMAIL
read -rp "Dialog eSMS URL Message Key (ESMS_URL_MESSAGE_KEY): " ESMS_URL_MESSAGE_KEY

cat > ${APP_DIR}/.env.local <<ENVEOF
DB_HOST=localhost
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}

JWT_SECRET=${JWT_SECRET}
APP_BASE_URL=https://${DOMAIN}

RESEND_API_KEY=${RESEND_API_KEY}
MAIL_FROM=Beyos Clothing <no-reply@${DOMAIN}>

ONEPAY_APP_ID=${ONEPAY_APP_ID}
ONEPAY_APP_TOKEN=${ONEPAY_APP_TOKEN}
ONEPAY_HASH_SALT=${ONEPAY_HASH_SALT}

KOOMBIYO_CODE=KOOBIYO
KOOMBIYO_NAME=Koobiyo
KOOMBIYO_ACCOUNT=${KOOMBIYO_ACCOUNT}
KOOMBIYO_API_BASE_URL=https://application.koombiyodelivery.lk/api/
KOOMBIYO_API_KEY=${KOOMBIYO_API_KEY}
KOOMBIYO_PHONE=${KOOMBIYO_PHONE}
KOOMBIYO_EMAIL=${KOOMBIYO_EMAIL}
KOOMBIYO_DEFAULT_DISTRICT_ID=1
KOOMBIYO_DEFAULT_CITY_ID=1

ESMS_URL_MESSAGE_KEY=${ESMS_URL_MESSAGE_KEY}
ESMS_BASE_URL=https://e-sms.dialog.lk
ESMS_SOURCE_ADDRESS=BEYOS

NODE_ENV=production
ENVEOF
chown deploy:deploy ${APP_DIR}/.env.local
chmod 600 ${APP_DIR}/.env.local

echo "== 7/8 Run DB setup and build =="
su - deploy -c "
  cd ${APP_DIR}
  node --env-file=.env.local scripts/setup-db.mjs
  npm run build
"

echo "== 8/8 Start with PM2, configure Nginx =="
su - deploy -c "
  cd ${APP_DIR}
  pm2 delete beyos 2>/dev/null || true
  pm2 start npm --name beyos -- start
  pm2 save
"
env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /home/deploy | tail -1 | bash || true

cat > /etc/nginx/sites-available/${DOMAIN} <<NGINXEOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINXEOF
ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/${DOMAIN}
nginx -t && systemctl reload nginx

echo "== Firewall =="
ufw allow OpenSSH || true
ufw allow 'Nginx Full' || true
ufw --force enable || true

echo ""
echo "Done. Point DNS A records for ${DOMAIN} and www.${DOMAIN} to 89.117.61.182 if not already done."
echo "Once DNS has propagated, run:"
echo "  apt install -y certbot python3-certbot-nginx"
echo "  certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
