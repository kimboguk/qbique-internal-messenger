#!/bin/bash
# QIM 서비스 상태 확인

echo "=== PM2 프로세스 상태 ==="
pm2 status

echo ""
echo "=== 서버 포트 확인 ==="
echo -n "Node.js (3003): "
if ss -tlnp 2>/dev/null | grep -q ":3003 " ; then echo "RUNNING"; else echo "STOPPED"; fi

echo -n "AI Service (8008): "
if ss -tlnp 2>/dev/null | grep -q ":8008 " ; then echo "RUNNING"; else echo "STOPPED"; fi

echo -n "PostgreSQL (5432): "
if ss -tlnp 2>/dev/null | grep -q ":5432 " ; then echo "RUNNING"; else echo "STOPPED"; fi

echo -n "Nginx (443): "
if ss -tlnp 2>/dev/null | grep -q ":443 " ; then echo "RUNNING"; else echo "STOPPED"; fi

echo ""
echo "=== 최근 로그 (서버) ==="
pm2 logs qim-server --lines 5 --nostream 2>/dev/null || echo "(로그 없음)"

echo ""
echo "=== 최근 로그 (AI) ==="
pm2 logs qim-ai --lines 5 --nostream 2>/dev/null || echo "(로그 없음)"
