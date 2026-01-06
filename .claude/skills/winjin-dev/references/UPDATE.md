# WinJin Dev Skill 更新指南

本文档说明如何随着项目开发持续更新 winjin-dev skill 和相关文档。

## 🔄 更新时机

**每次完成以下工作后**，必须更新相关文档：

1. ✅ 新功能实现完成
2. ✅ 功能测试通过
3. ✅ 代码已提交到 Git
4. ✅ 发现并修复重大 Bug
5. ✅ 发现新的平台差异或兼容性问题
6. ✅ 新增 API 端点或修改 API 参数

## 📋 必须更新的文档清单

| 文档 | 更新内容 | 优先级 |
|------|----------|--------|
| `.claude/rules/error-patterns.md` | 新增错误模式、按类型分类 | ⭐ 必须 ⭐ 新增 |
| `.claude/skills/winjin-dev/SKILL.md` | API 规范、开发提示 | ⭐ 必须 |
| `.claude/rules/base.md` | 技术规范、API 端点、平台差异 | ⭐ 必须 |
| `.claude/rules/code.md` | 代码示例、最佳实践 | ⭐ 必须 |
| `reference/用户输入文件夹/开发经验/Sora2_Character_Best_Practices.md` | 功能说明、测试案例 | 推荐 |
| `用户输入文件夹/开发对话/开发交接书.md` | 版本号、已完成功能 | ⭐ 必须 |

## 🚀 快速更新流程

### Step 1: 识别更新类型

```
功能类型判断：
├─ 新功能开发 → 更新所有 5 个文档
├─ Bug 修复 → 更新 SKILL.md + code.md + 开发交接书.md
├─ API 变更 → 更新 SKILL.md + base.md + code.md + 开发交接书.md
└─ 最佳实践 → 更新 SKILL.md + code.md + Sora2_*.md
```

### Step 2: 按顺序更新文档

1. **error-patterns.md** - 添加新的错误模式（按类型分类）⭐ 新增
2. **SKILL.md** - 更新开发提示（如需要）
3. **base.md** - 更新技术规范（如果涉及 API 变更）
4. **code.md** - 更新代码示例和最佳实践
5. **Sora2_Character_Best_Practices.md** - 更新最佳实践（推荐）
6. **开发交接书.md** - 更新版本号和功能列表

### Step 3: 提交到 Git

```bash
# 添加所有变更
git add .claude/skills/winjin-dev/
git add .claude/rules/
git add 用户输入文件夹/开发对话/开发交接书.md

# 提交（使用清晰的提交信息）
git commit -m "docs: update winjin-dev skill and documentation

- Added Error XX: [错误名称] to error-patterns.md
- Updated SKILL.md with new API patterns
- Updated code.md with code examples
- Updated 开发交接书.md to v2.x"

# 推送到远程
git push origin feature/workflow-management
```

### Step 4: 检查清单

提交前验证：

- [ ] error-patterns.md 已添加新的错误模式（带类型标签）⭐ 新增
- [ ] SKILL.md 已更新开发提示（如需要）
- [ ] base.md 已更新技术规范（如果需要）
- [ ] code.md 已更新代码示例
- [ ] 开发交接书.md 版本号已更新
- [ ] 开发交接书.md 已添加到"已完成功能"或"重大 Bug 修复"
- [ ] 所有文档的日期是最新的
- [ ] Git 提交信息清晰描述了变更内容

## 📝 模板示例

### error-patterns.md 新增错误模式模板 ⭐ 更新

在 error-patterns.md 的对应类型章节下添加（参考 docs.md 中的打标规范）：

```markdown
### 错误[N]: [错误名称] `[类型1]` `[类型2]` ⭐⭐⭐

**现象**:
- [用户看到的症状1]
- [用户看到的症状2]

**根本原因**:
[详细说明根本原因]

**错误示例**:
```javascript
// ❌ 错误代码
[错误代码示例]
```

**正确示例**:
```javascript
// ✅ 正确代码
[正确代码示例]
```

**关键点**:
1. [关键点1]
2. [关键点2]
3. [关键点3]

**相关错误**: 错误[X] - [相关错误名称]
```

**⚠️ 重要**:
- 必须添加类型标签（1-2个）：`API`, `React Flow`, `Character`, `Form`, `Storage`, `UI`, `Other`
- 必须添加到正确的类型章节下（API 相关、React Flow 相关等）
- 必须更新快速索引表（错误数量 +1，关键词更新）
- 参考 `.claude/rules/docs.md` 中的"新增错误模式时的打标规范"章节

### base.md 新增 API 端点模板

```markdown
### [功能名称] ⭐ 新增

**功能描述**：
- 要点1
- 要点2
- 要点3

**技术细节**：
- 参数格式
- API 端点
- 注意事项
```

### code.md 新增代码示例模板 ⭐ 更新

在 code.md 的相应章节下添加：

```markdown
### [功能/规范名称]

**功能描述**:
- 要点1
- 要点2
- 要点3

**技术细节**:
- 参数格式
- API 端点
- 注意事项
```

### 开发交接书.md 更新模板

**新功能**:
```markdown
#### [N]. [功能名称] (YYYY-MM-DD) ⭐ 新增
- **功能点1**: 描述
- **功能点2**: 描述
- **功能点3**: 描述
```

**Bug 修复**:
```markdown
#### [N]. [Bug名称] (YYYY-MM-DD) ⭐ 重大修复
- **问题**: [问题描述]
- **原因**: [根本原因]
- **修复**: [修复方案]
- **影响**: [影响范围]
- **验证**: [验证结果]
```

## 🔄 版本管理规则

### 交接书版本号规则

- **小版本更新**（v1.4 → v1.5）: 新增功能
- **大版本更新**（v1.4 → v2.0）: 重大架构变更

### 更新记录格式

```markdown
**更新记录**:
- YYYY-MM-DD: [功能描述] ⭐ 新增
- YYYY-MM-DD: [Bug 修复] ⭐ 重大修复
```

## 💡 最佳实践

### 1. 及时更新

- 开发完成后立即更新文档，不要拖延
- 保持技能和代码同步

### 2. 保持一致

- 4 个文档要保持内容一致，不能相互矛盾
- 错误编号要统一（SKILL.md 和 code.md）

### 3. 详细记录

- 记录不仅包括"做什么"，还包括"为什么"
- 提供代码示例和错误对比

### 4. 版本控制

- 每次更新都要提交到 Git，方便回溯
- 使用清晰的提交信息

## 🛠️ 自动化建议

未来可以考虑添加脚本自动化部分流程：

```bash
# update-docs.sh（示例）
#!/bin/bash
# 检查需要更新的文档
echo "检查需要更新的文档..."

# 提示更新清单
echo "请更新以下文档："
echo "1. SKILL.md - 添加新错误模式"
echo "2. code.md - 更新错误模式"
echo "3. 开发交接书.md - 更新版本号"

# 添加到 Git
git add .claude/skills/winjin-dev/
git add .claude/rules/
git add 用户输入文件夹/开发对话/开发交接书.md

echo "✅ 文件已添加到 Git，请检查后提交"
```

## 📚 相关资源

- [SKILL.md](../SKILL.md) - 主技能文件（开发规范）
- `.claude/rules/error-patterns.md` - 错误模式参考（按类型分类）⭐ 新增
- `.claude/rules/base.md` - 基础技术栈规则
- `.claude/rules/code.md` - 代码规范和最佳实践
- `.claude/rules/docs.md` - 文档更新规范

---

**最后更新**: 2026-01-06
**维护者**: WinJin AIGC 开发团队
