#!/bin/bash
# QIM 서비스 시작
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "QIM 서비스 시작..."
pm2 start ecosystem.config.js --env production
pm2 save
echo "QIM 서비스가 시작되었습니다."
pm2 status
