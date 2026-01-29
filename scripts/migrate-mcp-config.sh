#!/bin/bash
# MCP 配置迁移脚本
# 版本: v2.0.0
# 更新日期: 2026-01-23

echo "🔄 迁移 MCP 配置..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. 备份当前配置
echo -e "${GREEN}📦 备份当前配置...${NC}"
if [ -f ".claude/settings.local.json" ]; then
    backup_file=".claude/settings.local.json.backup.$(date +%Y%m%d%H%M%S)"
    cp ".claude/settings.local.json" "$backup_file"
    echo "✅ 已备份到: $backup_file"
else
    echo -e "${YELLOW}⚠️  未找到 settings.local.json，跳过备份${NC}"
fi
echo ""

# 2. 复制基础配置模板
echo -e "${GREEN}📋 应用基础配置模板...${NC}"
if [ -f "templates/mcp_config.base.json" ]; then
    cp templates/mcp_config.base.json .claude/settings.local.json
    echo "✅ MCP 基础配置已应用"
else
    echo -e "${RED}❌ 未找到 templates/mcp_config.base.json${NC}"
    exit 1
fi
echo ""

# 3. 提示设置环境变量
echo -e "${YELLOW}⚠️  请设置环境变量：${NC}"
echo "   cp templates/.env.mcp.template .env.mcp"
echo "   然后编辑 .env.mcp 填入真实的 API 密钥"
echo ""

# 4. 验证配置
echo -e "${GREEN}✅ MCP 配置迁移完成！${NC}"
echo ""
echo "📋 下一步操作："
echo "1. 复制环境变量模板: cp templates/.env.mcp.template .env.mcp"
echo "2. 编辑 .env.mcp 填入 API 密钥"
echo "3. 重启 Claude Code 使配置生效"
echo ""
echo "🔍 验证 MCP 工具："
echo "   - Memory: 创建和搜索实体"
echo "   - Context7: 查询库文档"
echo "   - Chrome DevTools: 浏览器自动化"
echo "   - Z-Read: 读取 GitHub 仓库"
