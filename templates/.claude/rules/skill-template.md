---
name: [project-name]-dev
description: [Project Name] 开发规范和最佳实践。在开发 [Project Name] 时使用，包含技术栈集成、API 调用规范、文档更新流程。每次功能开发或 Bug 修复后必须更新文档。
---

# [Project Name] 开发技能

## 项目概述

[Project Name] 是一个基于 [技术栈] 的 [项目类型] 项目。

**技术栈**:
- 后端: [后端框架] + Node.js
- 前端: [前端框架]
- 构建: [构建工具]
- 其他: [其他技术]

---

## 🔄 Skill 更新机制（重要）

此 skill 需要随着项目开发持续更新。**每次开发新功能或修复 Bug 后**，都必须更新此 skill 和相关文档。

### 更新流程

1. **开发完成后**，识别需要更新的内容
2. **更新 SKILL.md** - 添加新的错误模式、API 变更等
3. **更新 references/*.md** - 扩展详细文档
4. **提交到 Git** - 将 skill 变更纳入版本控制

### 快速更新指南

```
新增功能或修复 Bug 后：
├── 1. 在 SKILL.md 中添加新的错误模式或规范
├── 2. 在 references/ 中添加详细说明（可选）
├── 3. 运行 git add/commit 提交变更
└── 4. 告诉团队成员 skill 已更新
```

### 必须更新的文档

| 文档 | 何时更新 | 更新内容 |
|------|----------|----------|
| `.claude/skills/[project]-dev/SKILL.md` | 每次开发 | 新增错误模式、API 规范 |
| `.claude/rules/base.md` | API 变更 | 技术规范、端点定义 |
| `.claude/rules/code.md` | 代码变更 | 错误模式、最佳实践 |
| `docs/HANDOVER.md` | 每次开发 | 版本号、功能列表 |

详细更新流程参见 [references/UPDATE.md](references/UPDATE.md)

---

## 核心开发规范

### 1. [技术领域1] 规范

**规则描述**:
- 要点1
- 要点2
- 要点3

**示例**:
```javascript
// ✅ 正确示例
[正确代码]

// ❌ 错误示例
[错误代码]
```

### 2. [技术领域2] 规范

[类似结构...]

### 3. [技术领域3] 规范

[类似结构...]

---

## 已知错误模式（持续更新）

### 错误1: [错误名称]
- **原因**: [错误原因说明]
- **解决**: [解决方法]

### 错误2: [错误名称]
- **原因**: [错误原因说明]
- **解决**: [解决方法]

---

## 项目结构

```
[project-name]/
├── src/
│   ├── server/              # 后端代码
│   ├── client/              # 前端代码
│   └── shared/              # 共享代码
├── .claude/
│   ├── rules/              # 开发规则
│   └── skills/             # Claude Code skills
│       └── [project]-dev/  # 本 skill
└── docs/                   # 项目文档
```

## 常用命令

```bash
# 启动开发服务器
npm run dev

# 运行测试
npm test

# Git 操作
git add .
git commit -m "type: description"
```

## 参考文档

- [references/UPDATE.md](references/UPDATE.md) - Skill 和文档更新流程
- [references/troubleshooting.md](references/troubleshooting.md) - 故障排查指南
- `.claude/rules/base.md` - 基础技术栈规则
- `.claude/rules/code.md` - 代码规范和错误模式
- `docs/HANDOVER.md` - 完整交接文档

## 开发提示

1. ✅ **提示1**: [具体建议]
2. ✅ **提示2**: [具体建议]
3. ✅ **提示3**: [具体建议]

---

**Skill 版本**: v1.0
**最后更新**: YYYY-MM-DD
**维护者**: [Your Name]
