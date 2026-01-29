#!/bin/bash
# ========================================
# WinJin AIGC 停止开发环境 (Linux/Mac)
# ========================================

# 配置
BACKEND_PORT=9000
FRONTEND_PORT=5173

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ========================================
# 欢迎信息
# ========================================
clear
echo "========================================"
echo "  WinJin AIGC 停止开发环境"
echo "========================================"
echo ""

# ========================================
# 停止后端
# ========================================
echo "[1/2] 停止后端服务器..."
BACKEND_STOPPED=0
if lsof -ti :$BACKEND_PORT &> /dev/null; then
    lsof -ti :$BACKEND_PORT | xargs kill -9 2>/dev/null
    BACKEND_STOPPED=1
fi

if [ $BACKEND_STOPPED -eq 0 ]; then
    echo -e "${YELLOW}[提示] 后端服务未运行${NC}"
else
    echo -e "${GREEN}[✓] 后端服务已停止${NC}"
fi
echo ""

# ========================================
# 停止前端
# ========================================
echo "[2/2] 停止前端开发服务器..."
FRONTEND_STOPPED=0
if lsof -ti :$FRONTEND_PORT &> /dev/null; then
    lsof -ti :$FRONTEND_PORT | xargs kill -9 2>/dev/null
    FRONTEND_STOPPED=1
fi

if [ $FRONTEND_STOPPED -eq 0 ]; then
    echo -e "${YELLOW}[提示] 前端服务未运行${NC}"
else
    echo -e "${GREEN}[✓] 前端服务已停止${NC}"
fi
echo ""

# ========================================
# 完成提示
# ========================================
echo "========================================"
echo "  ✓ 开发环境已停止"
echo "========================================"
echo ""

sleep 2
