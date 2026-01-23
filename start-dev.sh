#!/bin/bash
# ========================================
# WinJin AIGC 开发环境启动工具 (Linux/Mac)
# ========================================

# 配置
BACKEND_PORT=9000
FRONTEND_PORT=5173
BROWSER_URL="http://localhost:$FRONTEND_PORT/"

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
echo "  WinJin AIGC 开发环境启动工具"
echo "========================================"
echo ""

# ========================================
# 1. 环境检查
# ========================================
echo "[1/5] 检查环境..."
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[错误] 未找到 Node.js${NC}"
    echo "请先安装 Node.js: https://nodejs.org/"
    echo ""
    exit 1
fi
echo -e "${GREEN}[✓] Node.js 已安装${NC} $(node -v)"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}[错误] 未找到 npm${NC}"
    echo "请重新安装 Node.js"
    echo ""
    exit 1
fi
echo -e "${GREEN}[✓] npm 已安装${NC} $(npm -v)"

# 检查 .env 文件
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}[警告] 未找到 .env 文件${NC}"
        echo "正在从 .env.example 复制..."
        cp ".env.example" ".env"
        echo -e "${GREEN}[✓] 已创建 .env 文件${NC}"
        echo -e "${YELLOW}[提示] 请编辑 .env 文件并填写 API Key${NC}"
        echo ""
    else
        echo -e "${RED}[错误] 未找到 .env 文件和 .env.example${NC}"
        echo "请创建 .env 文件并填写配置"
        echo ""
        exit 1
    fi
else
    echo -e "${GREEN}[✓] .env 文件存在${NC}"
fi
echo ""

# ========================================
# 2. 端口检查与清理
# ========================================
echo "[2/5] 检查端口占用..."
echo ""

# 检查端口函数
check_and_kill_port() {
    local port=$1
    local port_name=$2

    if lsof -ti :$port &> /dev/null; then
        echo -e "${YELLOW}[警告] 端口 $port 已被占用${NC}"
        read -p "是否终止占用端口的进程? (Y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            lsof -ti :$port | xargs kill -9 2>/dev/null
            sleep 2
            echo -e "${GREEN}[✓] 端口 $port 已清理${NC}"
        else
            echo -e "${YELLOW}[提示] 跳过端口清理，可能启动失败${NC}"
        fi
    else
        echo -e "${GREEN}[✓] 端口 $port 可用${NC}"
    fi
    echo ""
}

# 检查后端端口
check_and_kill_port $BACKEND_PORT "后端"

# 检查前端端口
check_and_kill_port $FRONTEND_PORT "前端"

# ========================================
# 3. 启动服务
# ========================================
echo "[3/5] 启动后端服务器..."
# 在新的终端窗口启动后端（macOS）
if [[ "$OSTYPE" == "darwin"* ]]; then
    osascript -e "tell app \"Terminal\" to do script \"cd $(pwd) && npm run server\"" &> /dev/null
# Linux：使用 gnome-terminal 或 xterm
elif command -v gnome-terminal &> /dev/null; then
    gnome-terminal -- bash -c "cd $(pwd) && npm run server; exec bash" &
elif command -v xterm &> /dev/null; then
    xterm -e "cd $(pwd) && npm run server" &
else
    # 后台运行（降级方案）
    npm run server &
fi
echo -e "${GREEN}[✓] 后端启动中...${NC}"
echo ""

echo "[4/5] 启动前端开发服务器..."
# 在新的终端窗口启动前端（macOS）
if [[ "$OSTYPE" == "darwin"* ]]; then
    osascript -e "tell app \"Terminal\" to do script \"cd $(pwd)/src/client && npm run dev\"" &> /dev/null
# Linux：使用 gnome-terminal 或 xterm
elif command -v gnome-terminal &> /dev/null; then
    gnome-terminal -- bash -c "cd $(pwd)/src/client && npm run dev; exec bash" &
elif command -v xterm &> /dev/null; then
    xterm -e "cd $(pwd)/src/client && npm run dev" &
else
    # 后台运行（降级方案）
    cd src/client
    npm run dev &
    cd ../..
fi
echo -e "${GREEN}[✓] 前端启动中...${NC}"
echo ""

# ========================================
# 4. 等待服务启动
# ========================================
echo "[5/5] 等待服务启动..."
sleep 5
echo ""

# ========================================
# 5. 打开浏览器
# ========================================
echo "正在打开浏览器..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "$BROWSER_URL"
elif command -v xdg-open &> /dev/null; then
    xdg-open "$BROWSER_URL"
else
    echo -e "${YELLOW}[提示] 无法自动打开浏览器${NC}"
    echo "请手动访问: $BROWSER_URL"
fi
echo -e "${GREEN}[✓] 浏览器已打开${NC}"
echo ""

# ========================================
# 6. 完成提示
# ========================================
echo "========================================"
echo "  ✓ 开发环境已启动"
echo "========================================"
echo "后端: http://localhost:$BACKEND_PORT/"
echo "前端: http://localhost:$FRONTEND_PORT/"
echo ""
echo "提示: 运行 ./stop-dev.sh 停止所有服务"
echo "========================================"
echo ""
