#!/usr/bin/env bash
# Beyos Clothing — redeploy script for future updates
# Run as the 'deploy' user on the VPS: bash redeploy.sh
set -euo pipefail

APP_DIR="/home/deploy/beyos"

cd "${APP_DIR}"
git pull
npm install
npm run build
pm2 restart beyos

echo "Redeployed. Check status with: pm2 status"
