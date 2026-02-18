#!/bin/bash
# QIM 배포 스크립트
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "=== QIM 배포 시작 ==="

# 1. 서버 빌드
echo "[1/4] 서버 빌드..."
cd server
npm install --production=false
npm run build
cd ..

# 2. 클라이언트 빌드
echo "[2/4] 클라이언트 빌드..."
cd client
npm install
npm run build
cd ..

# 3. DB 마이그레이션
echo "[3/4] DB 마이그레이션..."
cd server
npx knex migrate:latest --knexfile knexfile.ts
cd ..

# 4. PM2 재시작
echo "[4/4] PM2 서비스 재시작..."
pm2 startOrRestart ecosystem.config.js --env production

echo ""
echo "=== QIM 배포 완료 ==="
pm2 status
