# WinJin 验证系统使用指南

> **版本**: v1.0.0
> **更新日期**: 2026-01-09
> **目标读者**: 开发者、测试人员、项目维护者

---

## 目录

1. [快速开始](#快速开始)
2. [Phase 1: 基础验证](#phase-1-基础验证)
3. [Phase 2: 数据流验证](#phase-2-数据流验证)
4. [Phase 3: 自动修复](#phase-3-自动修复) ⭐ 新增
5. [最佳实践](#最佳实践)
6. [故障排查](#故障排查)
7. [常见问题](#常见问题)

---

## 快速开始

### 环境准备

```bash
# 1. 克隆项目
git clone <repository-url>
cd winjin

# 2. 安装依赖
npm install

# 3. 验证安装
node --version  # 应该 >= 16.x
npm --version   # 应该 >= 8.x
```

### 运行验证

```bash
# 运行所有验证
npm run validate:all

# 运行特定验证
npm run validate:registry    # 节点注册表
npm run validate:nodes       # 节点语法
npm run validate:data-flow   # 数据流完整性

# 自动修复
npm run fix:scan             # 扫描可修复的问题
npm run fix:dry-run          # 干运行测试修复
npm run fix:backup           # 修复前备份

# 指标查看
npm run metrics:trend        # 查看趋势报告
```

---

## Phase 1: 基础验证

### 验证目标

Phase 1 提供基础的质量保障，确保代码库的基本完整性：

| 验证类型 | 脚本 | 检查内容 |
|---------|------|----------|
| 节点注册表 | `validate-registry.js` | 节点定义与注册表一致性 |
| 节点语法 | `validate-nodes.js` | JSX 语法、导出规范 |
| 文档验证 | `validate-docs.js` | 文档引用完整性、孤立节点 |

### 使用场景

**场景1: 日常开发**
```bash
# 提交代码前运行
npm run validate:all
```

**场景2: 持续集成**
```bash
# Git pre-commit hook 自动运行
git commit -m "feat: add new node"
# → 自动运行验证脚本
```

**场景3: 快速检查**
```bash
# 只检查节点语法
npm run validate:nodes
```

### 输出示例

```
✅ WinJin 节点注册表验证
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 统计信息:
   注册表节点: 16
   实际节点文件: 16
   匹配: ✅

✅ 验证通过
```

---

## Phase 2: 数据流验证

### 验证目标

Phase 2 深入分析节点间的数据传递，发现隐藏的集成问题：

| 验证类型 | 脚本 | 检查内容 |
|---------|------|----------|
| 数据契约检测 | `detect-data-contracts.js` | 节点读取/写入的字段 |
| 数据流验证 | `validate-data-flow.js` | 数据流完整性、依赖缺失 |

### 使用场景

**场景1: 新增节点后验证**
```bash
# 1. 创建新节点
# src/client/src/nodes/process/MyNewNode.jsx

# 2. 运行数据契约检测
npm run detect:contracts

# 3. 查看新节点的数据契约
# 输出: MyNewNode 读取: [prompt], 写入: [result]
```

**场景2: 分析影响范围**
```bash
# 修改节点字段前，分析影响
npm run analyze:impact -- --node=VideoGenerateNode

# 输出: VideoGenerateNode 的 manualPrompt 被以下节点读取:
#   - PromptOptimizerNode
#   - TextNode
```

**场景3: 验证数据流完整性**
```bash
# 运行完整的数据流验证
npm run validate:data-flow

# 输出警告示例:
# ⚠️  警告: data.manualPrompt 被读取但未监听
#    位置: VideoGenerateNode.jsx:42
```

### 输出示例

```
✅ WinJin 数据流完整性验证
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 数据契约统计:
   读取契约: 34
   写入契约: 28
   依赖声明: 16

⚠️  发现 3 个警告:
   1. 缺少依赖: data.manualPrompt
      位置: VideoGenerateNode.jsx:42
   2. 源节点未写入: apiConfig.model
      位置: APISettingsNode → VideoGenerateNode
```

---

## Phase 3: 自动修复 ⭐ 新增

### 验证目标

Phase 3 提供自动修复能力，减少人工干预，提升开发效率：

| 功能 | 命令 | 说明 |
|------|------|------|
| 扫描问题 | `fix:scan` | 扫描可自动修复的问题 |
| 应用修复 | `fix:all` | 应用所有修复 |
| 干运行 | `fix:dry-run` | 模拟修复（不实际修改） |
| 备份修复 | `fix:backup` | 修复前自动备份 |
| 指标趋势 | `metrics:trend` | 查看验证趋势 |

### 扫描可修复的问题

```bash
npm run fix:scan
```

**输出示例**:
```
🔍 扫描可修复的问题...

找到 3 个可修复的问题:

1. [warning] orphaned-node-001
   孤立节点引用: CharacterCreateNode
   修复策略: 孤立节点引用修复
   置信度: 95%
   风险: low

2. [warning] missing-dependency-002
   缺少依赖: data.manualPrompt
   修复策略: useEffect 依赖缺失修复
   置信度: 80%
   风险: medium
   ⚠️  需要用户确认: 可能影响组件渲染性能

3. [warning] source-not-writing-003
   源节点未写入: data.characters
   修复策略: 源节点未写入修复
   置信度: 60%
   风险: high
   ⚠️  需要用户确认: 可能影响其他节点
```

### 干运行修复

```bash
npm run fix:dry-run
```

**功能**: 模拟修复过程，不实际修改文件

**输出示例**:
```
🔧 开始自动修复...

[1/3] 修复孤立节点引用: CharacterCreateNode
   类型: orphaned_node
   策略: 孤立节点引用修复
   置信度: 95%
   [DRY RUN] 将应用修复

[2/3] 修复 useEffect 依赖缺失
   类型: missing_dependency
   策略: useEffect 依赖缺失修复
   置信度: 80%
   [DRY RUN] 将应用修复

[3/3] 修复源节点未写入
   类型: source_not_writing
   策略: 源节点未写入修复
   置信度: 60%
   [DRY RUN] 将应用修复

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 修复报告 (DRY RUN)
总计: 3
✅ 已修复: 3
❌ 失败: 0
⏭️  跳过: 0
```

### 应用修复

```bash
# 方法1: 修复前备份（推荐）
npm run fix:backup

# 方法2: 直接修复
npm run fix:all

# 方法3: 修复特定类型
node scripts/auto-fix.js --fix=orphaned_node
```

### 查看指标趋势

```bash
npm run metrics:trend
```

**输出示例**:
```
📈 验证指标趋势报告
======================================================================

📊 总体统计:
   总运行次数: 42
   数据收集时间: 2026-01-01 - 2026-01-09

📋 按类型统计:

   validate:registry:
     运行次数: 10
     错误数: 0
     警告数: 0
     平均错误/次: 0.00
     平均警告/次: 0.00
     最后运行: 2026-01-09 15:30:00

   validate:nodes:
     运行次数: 12
     错误数: 0
     警告数: 28
     平均错误/次: 0.00
     平均警告/次: 2.33
     最后运行: 2026-01-09 15:30:05

   validate:data-flow:
     运行次数: 20
     错误数: 0
     警告数: 156
     平均错误/次: 0.00
     平均警告/次: 7.80
     最后运行: 2026-01-09 15:30:10

📅 最近 7 天统计:
   2026-01-03: 运行 6 次, 错误 0, 警告 48
   2026-01-04: 运行 5 次, 错误 0, 警告 36
   2026-01-05: 运行 4 次, 错误 0, 警告 28
   2026-01-06: 运行 8 次, 错误 0, 警告 52
   2026-01-07: 运行 3 次, 错误 0, 警告 18
   2026-01-08: 运行 7 次, 错误 0, 警告 42
   2026-01-09: 运行 9 次, 错误 0, 警告 24

📈 趋势分析:
   趋势: ✅ 改善中
   改善次数: 15
   恶化次数: 3
   稳定次数: 20

📜 最近 10 次运行:
───────────────────────────────────────────────────────────────────────────────────
   1. [validate:data-flow] 2026-01-09 15:30:10
      总数: 16, 错误: 0, 警告: 12
   2. [validate:nodes] 2026-01-09 15:30:05
      总数: 16, 错误: 0, 警告: 2
   ...
```

---

## 最佳实践

### 1. 开发流程

```bash
# 1. 修改代码
vim src/client/src/nodes/process/MyNode.jsx

# 2. 运行验证
npm run validate:all

# 3. 如有问题，扫描可修复项
npm run fix:scan

# 4. 干运行测试
npm run fix:dry-run

# 5. 应用修复（先备份）
npm run fix:backup

# 6. 再次验证
npm run validate:all

# 7. 提交代码（pre-commit hook 会自动验证）
git add .
git commit -m "feat: xxx"
```

### 2. 安全建议

- ✅ **修复前始终备份**: 使用 `npm run fix:backup`
- ✅ **高风险修复先测试**: 使用 `npm run fix:dry-run`
- ✅ **修复后立即验证**: 运行 `npm run validate:all`
- ❌ **不要在 CI/CD 中自动修复**: 只运行验证，不自动修复

### 3. 指标分析

**趋势改善**:
```
✅ 改善中 → 错误/警告数量持续下降
→ 继续当前策略
```

**趋势恶化**:
```
⚠️ 需要关注 → 错误/警告数量上升
→ 需要分析原因，调整策略
```

**趋势稳定**:
```
➡️ 稳定 → 错误/警告数量持平
→ 可以尝试优化流程
```

### 4. 修复策略选择

| 置信度 | 风险等级 | 建议 |
|--------|----------|------|
| 90-100% | low | 可直接修复 |
| 70-89% | medium | 干运行测试后修复 |
| 50-69% | high | 人工检查后修复 |
| <50% | 任意 | 不推荐自动修复 |

---

## 故障排查

### 问题1: 修复失败

**症状**:
```
❌ 修复失败: Fixer not found
```

**原因**: 修复器文件不存在或路径错误

**解决方案**:
1. 检查 `scripts/fix-strategies.json` 中的 fixer 路径
2. 确认 `scripts/fixers/` 目录下存在对应的修复器
3. 检查修复器是否正确导出 `fix` 函数

```bash
# 检查修复器文件
ls scripts/fixers/

# 检查修复器导出
node -e "const f = require('./scripts/fixers/orphaned-node-fixer.js'); console.log(typeof f.fix)"
```

### 问题2: 修复后验证仍失败

**症状**: 修复完成后，`npm run validate:all` 仍然报错

**原因**: 修复策略不完整

**解决方案**:
1. 运行 `npm run fix:scan` 检查剩余问题
2. 手动修复复杂问题
3. 向团队反馈，改进修复策略

### 问题3: 指标趋势异常

**症状**: 趋势报告显示数据不一致

**原因**: 指标文件损坏或数据未同步

**解决方案**:
```bash
# 清空指标并重新收集
npm run metrics:clear

# 重新运行验证
npm run validate:all

# 查看新趋势
npm run metrics:trend
```

### 问题4: Git pre-commit hook 失败

**症状**: 提交时验证失败

**原因**: 代码存在验证错误

**解决方案**:
```bash
# 1. 查看验证错误
npm run validate:all

# 2. 修复错误（手动或自动）
npm run fix:backup

# 3. 再次提交
git commit -m "feat: xxx"
```

---

## 常见问题

### Q1: 如何添加新的修复策略？

**步骤**:
1. 创建修复器文件 `scripts/fixers/my-fixer.js`
2. 在 `scripts/fix-strategies.json` 中添加策略配置
3. 运行 `npm run fix:scan` 测试

**示例**:
```javascript
// scripts/fixers/my-fixer.js
function fix(issue) {
  return {
    success: true,
    changes: 1
  };
}

module.exports = { fix };
```

```json
// scripts/fix-strategies.json
{
  "strategies": {
    "my_error_type": {
      "name": "我的错误修复",
      "fixer": "my-fixer.js",
      "autoFixable": true,
      "confidence": 80,
      "risk": "low"
    }
  }
}
```

### Q2: 如何禁用某个修复策略？

**方法1**: 修改 `fix-strategies.json`
```json
{
  "my_error_type": {
    "autoFixable": false  // ← 设置为 false
  }
}
```

**方法2**: 删除修复器文件
```bash
rm scripts/fixers/my-fixer.js
```

### Q3: 如何导出指标数据？

```bash
# 导出为 JSON
npm run metrics:export > metrics-backup.json

# 或直接访问文件
cat .claude/metrics/validation-metrics.json
```

### Q4: 如何清理过期数据？

```bash
# 清理 30 天前的数据
npm run metrics:cleanup

# 或完全清空
npm run metrics:clear
```

### Q5: 如何在 CI/CD 中使用？

**推荐配置**:
```yaml
# .github/workflows/validate.yml
name: Validate
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm install
      - name: Run validations
        run: npm run validate:all
      # ⚠️ 不推荐在 CI/CD 中自动修复
      # - run: npm run fix:all
```

---

## 附录

### A. 验证脚本完整列表

| 脚本 | 功能 | Phase |
|------|------|-------|
| `validate-registry.js` | 节点注册表验证 | 1 |
| `validate-nodes.js` | 节点语法验证 | 1 |
| `validate-docs.js` | 文档引用验证 | 1 |
| `detect-data-contracts.js` | 数据契约检测 | 2 |
| `validate-data-flow.js` | 数据流完整性验证 | 2 |
| `auto-fix.js` | 自动修复工具 | 3 |
| `metrics-collector.js` | 指标收集器 | 3 |
| `metrics-storage.js` | 指标存储 | 3 |

### B. NPM 命令完整列表

```json
{
  "scripts": {
    "validate:registry": "node scripts/validate-registry.js",
    "validate:nodes": "node scripts/validate-nodes.js",
    "validate:docs": "node scripts/validate-docs.js",
    "validate:data-flow": "node scripts/validate-data-flow.js",
    "detect:contracts": "node scripts/detect-data-contracts.js",
    "analyze:impact": "node scripts/analyze-node-impact.js",
    "validate:all": "npm run validate:registry && npm run validate:nodes && npm run validate:docs",
    "validate:phase2": "npm run detect:contracts && npm run validate:data-flow",
    "fix:scan": "node scripts/auto-fix.js --scan",
    "fix:all": "node scripts/auto-fix.js --fix",
    "fix:error": "node scripts/auto-fix.js --fix",
    "fix:dry-run": "node scripts/auto-fix.js --fix --dry-run",
    "fix:backup": "node scripts/auto-fix.js --fix --backup",
    "metrics:trend": "node scripts/metrics/metrics-collector.js --trend",
    "metrics:clear": "node scripts/metrics/metrics-collector.js --clear",
    "metrics:cleanup": "node scripts/metrics/metrics-collector.js --cleanup",
    "metrics:export": "node scripts/metrics/metrics-collector.js --export"
  }
}
```

### C. 相关文档

- [错误模式参考](../.claude/rules/error-patterns.md) - 所有已知的错误模式
- [开发规范](../.claude/rules/quick-reference.md) - 开发流程和规范
- [技术栈约束](../.claude/rules/base.md) - 技术栈和 API 规范
- [代码规范](../.claude/rules/code.md) - 代码示例和最佳实践

---

**文档版本**: v1.0.0
**最后更新**: 2026-01-09
**维护者**: WinJin AIGC 开发团队
