#!/bin/bash

# Claude Code 项目模板 - 快速初始化脚本
# 使用方法: ./init-project.sh <项目路径>

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}➜${NC} $1"
}

# 检查参数
if [ -z "$1" ]; then
    print_error "请指定项目路径"
    echo "使用方法: $0 <项目路径>"
    echo "示例: $0 ../my-new-project"
    exit 1
fi

PROJECT_PATH="$1"
TEMPLATE_PATH="$(dirname "$0")/.."

# 检查模板路径
if [ ! -d "$TEMPLATE_PATH/.claude" ]; then
    print_error "找不到模板目录"
    exit 1
fi

# 创建项目目录
print_info "创建项目目录: $PROJECT_PATH"
mkdir -p "$PROJECT_PATH"

# 复制 .claude 目录
print_info "复制 .claude 配置..."
cp -r "$TEMPLATE_PATH/.claude" "$PROJECT_PATH/"
print_success "Claude Code 配置已复制"

# 复制 docs 目录
print_info "复制文档模板..."
mkdir -p "$PROJECT_PATH/docs"
cp "$TEMPLATE_PATH/docs"/*.md "$PROJECT_PATH/docs/"
print_success "文档模板已复制"

# 复制 .env.example
print_info "复制环境变量模板..."
cp "$TEMPLATE_PATH/.env.example" "$PROJECT_PATH/"
print_success ".env.example 已复制"

# 复制 .gitignore
print_info "复制 .gitignore..."
cp "$TEMPLATE_PATH/.gitignore" "$PROJECT_PATH/"
print_success ".gitignore 已复制"

# 创建 README.md
print_info "创建 README.md..."
cat > "$PROJECT_PATH/README.md" << 'EOF'
# 项目名称

## 项目描述

[填写项目描述]

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境

```bash
cp .env.example .env
# 编辑 .env 文件
```

### 启动开发

```bash
npm run dev
```

## 文档

- [开发交接文档](docs/HANDOVER.md)
- [最佳实践](docs/BEST_PRACTICES.md)

## 开发规范

本项目使用 Claude Code 规则驱动开发，详见 `.claude/rules/` 目录。

---

**初始化日期**: [填写日期]
**基于**: Claude Code 项目模板
EOF
print_success "README.md 已创建"

# 初始化 Git
print_info "初始化 Git 仓库..."
cd "$PROJECT_PATH"
git init
print_success "Git 仓库已初始化"

# 创建初始提交
print_info "创建初始提交..."
git add -A
git commit -m "feat: initialize project with Claude Code template

- Add .claude/rules/ for Claude Code configuration
- Add docs/ templates (HANDOVER.md, BEST_PRACTICES.md)
- Add .env.example and .gitignore
- Ready for development with Claude Code
"
print_success "初始提交已创建"

# 完成
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  项目初始化完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
print_info "下一步："
echo "  1. cd $PROJECT_PATH"
echo "  2. 编辑 .claude/rules/base-template.md，填写技术栈"
echo "  3. 编辑 .claude/rules/code-template.md，填写代码规范"
echo "  4. 编辑 docs/HANDOVER.md，填写项目信息"
echo "  5. 编辑 docs/BEST_PRACTICES.md，填写最佳实践"
echo "  6. 重命名规则文件："
echo "     mv .claude/rules/base-template.md .claude/rules/base.md"
echo "     mv .claude/rules/code-template.md .claude/rules/code.md"
echo "  7. 启动 Claude Code 验证配置"
echo ""
print_success "祝开发顺利！"
