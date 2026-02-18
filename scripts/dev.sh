#!/bin/bash
# QIM 개발 서버 시작 (모든 서비스를 백그라운드에서 실행)
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

# 기존 프로세스 정리
echo "기존 개발 프로세스 정리..."
pkill -f "ts-node-dev.*qim-server" 2>/dev/null || true
pkill -f "uvicorn app.main:app.*8008" 2>/dev/null || true
sleep 1

# 로그 디렉토리
mkdir -p logs

echo "=== QIM 개발 서버 시작 ==="

# 1. Node.js 백엔드
echo "[1/3] Node.js 서버 시작 (port 3003)..."
cd server
npm run dev > ../logs/dev-server.log 2>&1 &
SERVER_PID=$!
cd ..

# 2. AI 서비스
echo "[2/3] AI 서비스 시작 (port 8008)..."
cd ai-service
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8008 --reload > ../logs/dev-ai.log 2>&1 &
AI_PID=$!
cd ..

# 3. Vite 프론트엔드
echo "[3/3] Vite 개발 서버 시작 (port 5174)..."
cd client
npm run dev > ../logs/dev-client.log 2>&1 &
CLIENT_PID=$!
cd ..

echo ""
echo "=== 개발 서버 시작 완료 ==="
echo "  Node.js:  http://localhost:3003  (PID: $SERVER_PID)"
echo "  AI:       http://localhost:8008  (PID: $AI_PID)"
echo "  Client:   http://localhost:5174  (PID: $CLIENT_PID)"
echo ""
echo "로그 확인: tail -f logs/dev-server.log"
echo "전체 중지: scripts/dev-stop.sh"
