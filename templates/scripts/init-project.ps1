# Claude Code 项目模板 - 快速初始化脚本 (Windows)
# 使用方法: .\init-project.ps1 <项目路径>

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath
)

$ErrorActionPreference = "Stop"

# 获取脚本所在目录的父目录（模板根目录）
$TemplatePath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

# 检查模板路径
if (-not (Test-Path "$TemplatePath\.claude")) {
    Write-Host "✗ 找不到模板目录" -ForegroundColor Red
    exit 1
}

# 创建项目目录
Write-Host "➜ 创建项目目录: $ProjectPath" -ForegroundColor Yellow
New-Item -ItemType Directory -Path $ProjectPath -Force | Out-Null
Write-Host "✓ 项目目录已创建" -ForegroundColor Green

# 复制 .claude 目录
Write-Host "➜ 复制 .claude 配置..." -ForegroundColor Yellow
Copy-Item -Path "$TemplatePath\.claude" -Destination "$ProjectPath\.claude" -Recurse
Write-Host "✓ Claude Code 配置已复制" -ForegroundColor Green

# 复制 docs 目录
Write-Host "➜ 复制文档模板..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "$ProjectPath\docs" -Force | Out-Null
Copy-Item -Path "$TemplatePath\docs\*.md" -Destination "$Project_PATH\docs\" -Force
Write-Host "✓ 文档模板已复制" -ForegroundColor Green

# 复制 .env.example
Write-Host "➜ 复制环境变量模板..." -ForegroundColor Yellow
Copy-Item -Path "$TemplatePath\.env.example" -Destination "$ProjectPath\.env.example" -Force
Write-Host "✓ .env.example 已复制" -ForegroundColor Green

# 复制 .gitignore
Write-Host "➜ 复制 .gitignore..." -ForegroundColor Yellow
Copy-Item -Path "$TemplatePath\.gitignore" -Destination "$ProjectPath\.gitignore" -Force
Write-Host "✓ .gitignore 已复制" -ForegroundColor Green

# 创建 README.md
Write-Host "➜ 创建 README.md..." -ForegroundColor Yellow
@"
# 项目名称

## 项目描述

[填写项目描述]

## 快速开始

### 安装依赖

\```bash
npm install
\```

### 配置环境

\```bash
cp .env.example .env
# 编辑 .env 文件
\```

### 启动开发

\```bash
npm run dev
\```

## 文档

- [开发交接文档](docs/HANDOVER.md)
- [最佳实践](docs/BEST_PRACTICES.md)

## 开发规范

本项目使用 Claude Code 规则驱动开发，详见 `.claude/rules/` 目录。

---

**初始化日期**: $(Get-Date -Format 'yyyy-MM-dd')
**基于**: Claude Code 项目模板
"@ | Out-File -FilePath "$ProjectPath\README.md" -Encoding UTF8
Write-Host "✓ README.md 已创建" -ForegroundColor Green

# 初始化 Git
Write-Host "➜ 初始化 Git 仓库..." -ForegroundColor Yellow
Push-Location $ProjectPath
git init
Pop-Location
Write-Host "✓ Git 仓库已初始化" -ForegroundColor Green

# 创建初始提交
Write-Host "➜ 创建初始提交..." -ForegroundColor Yellow
Push-Location $ProjectPath
git add -A
git commit -m "feat: initialize project with Claude Code template

- Add .claude/rules/ for Claude Code configuration
- Add docs/ templates (HANDOVER.md, BEST_PRACTICES.md)
- Add .env.example and .gitignore
- Ready for development with Claude Code
"
Pop-Location
Write-Host "✓ 初始提交已创建" -ForegroundColor Green

# 完成
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  项目初始化完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "➜ 下一步：" -ForegroundColor Yellow
Write-Host "  1. cd $ProjectPath"
Write-Host "  2. 编辑 .claude/rules/base-template.md，填写技术栈"
Write-Host "  3. 编辑 .claude/rules/code-template.md，填写代码规范"
Write-Host "  4. 编辑 docs/HANDOVER.md，填写项目信息"
Write-Host "  5. 编辑 docs/BEST_PRACTICES.md，填写最佳实践"
Write-Host "  6. 重命名规则文件："
Write-Host "     ren .claude\rules\base-template.md base.md"
Write-Host "     ren .claude\rules\code-template.md code.md"
Write-Host "  7. 启动 Claude Code 验证配置"
Write-Host ""
Write-Host "✓ 祝开发顺利！" -ForegroundColor Green
