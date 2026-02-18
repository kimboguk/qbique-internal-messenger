#!/bin/bash
# QIM 서비스 중지
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "QIM 서비스 중지..."
pm2 stop ecosystem.config.js
echo "QIM 서비스가 중지되었습니다."
pm2 status
