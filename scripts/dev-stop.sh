#!/bin/bash
# QIM 개발 서버 중지

echo "QIM 개발 서버 중지..."
pkill -f "ts-node-dev.*src/index.ts" 2>/dev/null && echo "  Node.js 서버 중지됨" || echo "  Node.js 서버가 실행 중이 아님"
pkill -f "uvicorn app.main:app.*8008" 2>/dev/null && echo "  AI 서비스 중지됨" || echo "  AI 서비스가 실행 중이 아님"
pkill -f "vite.*5174" 2>/dev/null && echo "  Vite 개발 서버 중지됨" || echo "  Vite 개발 서버가 실행 중이 아님"
echo "완료."
