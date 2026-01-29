#!/bin/bash
# WinJin 开发框架一键安装脚本
# 版本: v2.0.0
# 更新日期: 2026-01-23

echo "🚀 安装 WinJin 开发框架..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. 创建目录结构
echo -e "${GREEN}📁 创建目录结构...${NC}"
mkdir -p .claude/{references,metrics,plan}
mkdir -p .claude/skills/{winjin-dev,node-dev,automation-dev}
mkdir -p scripts
mkdir -p templates
echo "✅ 目录结构创建完成"
echo ""

# 2. 设置权限
echo -e "${GREEN}🔐 设置权限...${NC}"
chmod +x scripts/*.sh 2>/dev/null || echo "⚠️  警告: 未找到 .sh 文件"
echo "✅ 权限设置完成"
echo ""

# 3. 验证安装
echo -e "${GREEN}✅ 验证安装...${NC}"

# 验证 skills 目录
if [ -d ".claude/skills/winjin-dev" ] && \
   [ -d ".claude/skills/node-dev" ] && \
   [ -d ".claude/skills/automation-dev" ]; then
    echo "✅ Skills 目录结构正确"
else
    echo -e "${RED}❌ Skills 目录结构不完整${NC}"
    exit 1
fi

# 验证 6层架构
layers=("00-philosophy" "01-fundamentals" "02-methodology" "03-node-development" "04-error-patterns" "05-automation")
for layer in "${layers[@]}"; do
    if [ -d ".claude/$layer" ]; then
        if [ -f ".claude/$layer/README.md" ]; then
            echo "✅ $layer/README.md 存在"
        else
            echo -e "${YELLOW}⚠️  $layer/README.md 缺失${NC}"
        fi
        if [ -d ".claude/$layer/references" ]; then
            echo "✅ $layer/references/ 存在"
        fi
    else
        echo -e "${RED}❌ $layer 目录不存在${NC}"
    fi
done

echo ""
echo -e "${GREEN}🎉 安装完成！${NC}"
echo ""
echo "📋 下一步操作："
echo "1. 复制 MCP 配置模板: cp templates/.env.mcp.template .env.mcp"
echo "2. 编辑 .env.mcp 填入 API 密钥"
echo "3. 运行 MCP 迁移脚本: bash scripts/migrate-mcp-config.sh"
echo "4. 重启 Claude Code 使配置生效"
