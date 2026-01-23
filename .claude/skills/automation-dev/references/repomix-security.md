# Repomix 安全打包完整指南

## 概述

Safely package codebases with repomix by automatically detecting and removing hardcoded credentials.

This skill prevents accidental credential exposure when packaging code with repomix. It scans for hardcoded secrets (API keys, database credentials, tokens), reports findings, and ensures safe packaging.

**使用场景**: 使用 repomix 打包代码分发、创建可分享的参考包、或存在硬编码凭据安全顾虑时。

## 核心工作流

### 标准安全打包

使用 `safe_pack.py` 完整工作流：扫描 → 报告 → 打包。

```bash
python3 scripts/safe_pack.py <directory>
```

**功能**:
1. 扫描目录中的硬编码凭据
2. 报告发现（文件/行号详情）
3. 发现密钥时阻止打包
4. 扫描干净时才打包

**示例**:
```bash
python3 scripts/safe_pack.py ./my-project
```

**干净输出**:
```
🔍 Scanning ./my-project for hardcoded secrets...
✅ No secrets detected!
📦 Packing ./my-project with repomix...
✅ Packaging complete!
   Package is safe to distribute.
```

**发现密钥输出**:
```
🔍 Scanning ./my-project for hardcoded secrets...
⚠️  Security Scan Found 3 Potential Secrets:

🔴 supabase_url: 1 instance(s)
   - src/client.ts:5
     Match: https://ghyttjckzmzdxumxcixe.supabase.co

❌ Cannot pack: Secrets detected!
```

### 选项

**自定义输出文件**:
```bash
python3 scripts/safe_pack.py \
  ./my-project \
  --output package.xml
```

**使用 repomix 配置**:
```bash
python3 scripts/safe_pack.py \
  ./my-project \
  --config repomix.config.json
```

**从扫描中排除模式**:
```bash
python3 scripts/safe_pack.py \
  ./my-project \
  --exclude '.*test.*' '.*\.example'
```

**强制打包（危险，跳过扫描）**:
```bash
python3 scripts/safe_pack.py \
  ./my-project \
  --force  # ⚠️ 不推荐
```

## 独立密钥扫描

使用 `scan_secrets.py` 仅扫描（不打包）。

```bash
python3 scripts/scan_secrets.py <directory>
```

**使用场景**:
- 验证删除凭据后的清理
- 提交前安全检查
- 审计现有代码库

**示例**:
```bash
python3 scripts/scan_secrets.py ./my-project
```

**程序化使用的 JSON 输出**:
```bash
python3 scripts/scan_secrets.py \
  ./my-project \
  --json
```

**排除模式**:
```bash
python3 scripts/scan_secrets.py \
  ./my-project \
  --exclude '.*test.*' '.*example.*' '.*SECURITY_AUDIT\.md'
```

## 检测的密钥类型

扫描器检测常见凭据模式：

### 云服务商

- **AWS Access Keys**: `AKIA...`
- **Cloudflare R2**: Account IDs and Access Keys
- **Supabase**: Project URLs and Anon Keys

### API Keys

- **Stripe Keys**: `sk_live_...`, `pk_live_...`
- **OpenAI API Keys**: `sk-...`
- **Google Gemini API Keys**: `AIza...`
- **Generic API Keys**

### 认证

- **JWT Tokens**: `eyJ...`
- **OAuth Client Secrets**
- **Private Keys**: `-----BEGIN PRIVATE KEY-----`
- **Turnstile Keys**: `0x...`

## 处理检测到的密钥

### Step 1: 审查发现

检查每个发现以验证是否是真实凭据（非占位符或示例）。

### Step 2: 替换为环境变量

**替换前**:
```javascript
const SUPABASE_URL = "https://ghyttjckzmzdxumxcixe.supabase.co";
const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

**替换后**:
```javascript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://your-project-ref.supabase.co";
const API_KEY = import.meta.env.VITE_API_KEY || "your-api-key-here";

// 验证
if (!import.meta.env.VITE_SUPABASE_URL) {
  console.error("⚠️ Missing VITE_SUPABASE_URL environment variable");
}
```

### Step 3: 创建 .env.example

```bash
# 环境变量示例
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_API_KEY=your-api-key-here

# 说明：
# 1. 复制此文件为 .env
# 2. 将占位符替换为真实值
# 3. 永远不要提交 .env 到版本控制
```

### Step 4: 验证清理

再次运行扫描器以确认密钥已删除：

```bash
python3 scripts/scan_secrets.py ./my-project
```

### Step 5: 安全打包

清理后安全打包：

```bash
python3 scripts/safe_pack.py ./my-project
```

## 曝露后操作

如果凭据已被暴露（如提交到 git、公开共享）：

1. **立即轮换凭据** - 生成新密钥/令牌
2. **撤销旧凭据** - 禁用受损凭据
3. **审计使用** - 检查日志中的未授权访问
4. **监控** - 设置异常活动警报
5. **更新部署** - 使用新凭据部署代码
6. **记录事件** - 记录暴露内容和采取的操作

## 常见误报

扫描器跳过常见误报：

### 占位符

- `your-api-key`, `example-key`, `placeholder-value`
- `<YOUR_API_KEY>`, `${API_KEY}`, `TODO: add key`

### 测试/示例文件

- 匹配 `.*test.*`, `.*example.*`, `.*sample.*` 的文件

### 注释

- 以 `//`, `#`, `/*`, `*` 开头的行

### 环境变量引用（正确用法）

- `process.env.API_KEY`
- `import.meta.env.VITE_API_KEY`
- `Deno.env.get('API_KEY')`

如需要，使用 `--exclude` 跳过额外模式。

## 与 Repomix 集成

此技能与标准 repomix 配合使用：

**默认用法**（无配置）:
```bash
python3 scripts/safe_pack.py ./project
```

**使用 repomix 配置**:
```bash
python3 scripts/safe_pack.py \
  ./project \
  --config repomix.config.json
```

**自定义输出位置**:
```bash
python3 scripts/safe_pack.py \
  ./project \
  --output ~/Downloads/package-clean.xml
```

技能在安全验证后内部运行 repomix，传递配置和输出选项。

## 示例工作流

### 工作流 1: 打包干净项目

```bash
# 一条命令扫描并打包
python3 scripts/safe_pack.py \
  ~/workspace/my-project \
  --output ~/Downloads/my-project-package.xml
```

### 工作流 2: 清理并打包有密钥的项目

```bash
# Step 1: 扫描以发现密钥
python3 scripts/scan_secrets.py ~/workspace/my-project

# Step 2: 审查发现并将凭据替换为环境变量
# （手动编辑文件或使用自动化）

# Step 3: 验证清理
python3 scripts/scan_secrets.py ~/workspace/my-project

# Step 4: 安全打包
python3 scripts/safe_pack.py \
  ~/workspace/my-project \
  --output ~/Downloads/my-project-clean.xml
```

### 工作流 3: 提交前审计

```bash
# 提交钩子：扫描密钥
python3 scripts/scan_secrets.py . --json

# 如发现密钥，退出码 1（阻止提交）
# 如干净，退出码 0（允许提交）
```

## 资源

**参考文档**:
- `references/common_secrets.md` - 完整的凭据模式目录

**脚本**:
- `scripts/scan_secrets.py` - 独立安全扫描器
- `scripts/safe_pack.py` - 完整的扫描 → 打包工作流

**相关技能**:
- `repomix-unmixer` - 从 repomix 包中提取文件
- `skill-creator` - 创建新的 Claude Code skills

## 安全说明

此技能检测常见模式，但可能无法捕获所有凭据类型。始终：
- 手动审查发现
- 轮换已暴露的凭据
- 使用 .env.example 模板
- 验证环境变量
- 监控未授权访问

**不替代**: CI/CD 中的密钥扫描、git 历史扫描或全面的安全审计。

---

**最后更新**: 2026-01-23
**来源**: repomix-safe-mixer skill (316 lines)
