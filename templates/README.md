# Claude Code 项目开发模板

一套经过实战验证的高效开发方式，基于 Claude Code + 规则驱动 + 文档同步。

## ✨ 核心特性

- 🤖 **Claude Code 规则驱动** - 所有技术规范写入规则文件，AI 自动执行
- 📚 **文档自动同步** - 功能完成自动提醒更新文档，保持一致性
- 🔄 **持续迭代优化** - 问题解决自动归档到错误模式库，持续改进
- 📦 **开箱即用** - 提供完整模板，5分钟即可启动新项目

## 🚀 快速开始

### 方式1: 手动复制（推荐用于理解）

```bash
# 1. 复制模板到新项目
cp -r templates/.claude your-project/
cp -r templates/docs your-project/

# 2. 自定义配置
cd your-project
# 编辑 .claude/rules/base.md 填写技术栈
# 编辑 docs/HANDOVER.md 填写项目信息

# 3. 验证配置
# 启动 Claude Code，提问："请列出项目的技术栈"
```

### 方式2: 使用初始化脚本（快速）

```bash
# 即将推出...
npm init @your-template/project-name
```

## 📁 模板结构

```
templates/
├── .claude/
│   ├── settings.json           # Claude Code 配置
│   └── rules/
│       ├── base-template.md    # 技术栈约束模板
│       ├── code-template.md    # 代码规范模板
│       ├── skill-template.md   # Skill 模板 ⭐ 新增
│       ├── docs.md             # 文档更新规范（通用）
│       └── init.md             # 初始化指南
├── docs/
│   ├── HANDOVER-TEMPLATE.md    # 开发交接文档模板
│   └── BEST_PRACTICES-TEMPLATE.md  # 最佳实践模板
└── README.md                   # 本文件
```

## 🎯 工作流程

### 标准开发流程

```
┌─────────────────┐
│  1. 需求讨论     │
└────────┬────────┘
         ↓
┌─────────────────┐
│  2. Claude Code │ ← 遵循 SKILL.md 中的规则
│     编写代码     │
└────────┬────────┘
         ↓
┌─────────────────┐
│  3. 测试验证     │
└────────┬────────┘
         ↓
┌─────────────────┐
│  4. ⭐ 更新SKILL │ ← 优先更新 SKILL.md
└────────┬────────┘
         ↓
┌─────────────────┐
│  5. ⭐ 更新文档  │ ← 更新其他文档
└────────┬────────┘
         ↓
┌─────────────────┐
│  6. Git 提交     │
└─────────────────┘
```

### 问题解决流程

```
┌─────────────────┐
│  1. 遇到问题     │
└────────┬────────┘
         ↓
┌─────────────────┐
│  2. 查询规则库   │ ← SKILL.md 中的错误模式
└────────┬────────┘
         ↓
┌─────────────────┐
│  3. 解决问题     │
└────────┬────────┘
         ↓
┌─────────────────┐
│  4. ⭐ 更新SKILL │ ← 新增错误模式（优先）
└────────┬────────┘
         ↓
┌─────────────────┐
│  5. ⭐ 更新文档  │ ← 更新其他文档
└────────┬────────┘
         ↓
┌─────────────────┐
│  6. Git 提交     │
└─────────────────┘
```

### ⭐ Skill 优先更新原则

**为什么 Skill 优先？**
- ✅ Claude Code AI 直接使用 SKILL.md
- ✅ 包含项目特定的错误模式和规范
- ✅ 影响后续开发质量
- ✅ 避免重复犯错

**文档更新顺序**:
```
1. SKILL.md                    # Claude Code 核心文档 ⭐ 第一优先
2. base.md                     # 技术规范（如需要）
3. code.md                     # 代码实现
4. docs/BEST_PRACTICES.md      # 开发经验（如需要）
5. docs/HANDOVER.md            # 交接文档
```

## 📖 核心理念

### 1. Claude Code Skill 驱动 ⭐ 核心

**原则**: 把项目特定的开发规范和错误模式写入 Skill 文件，让 Claude Code 自动执行。

**好处**:
- ✅ 减少沟通成本
- ✅ 避免重复错误
- ✅ 保持代码一致性
- ✅ 新人快速上手
- ✅ **AI 开发质量直接提升**

**实践**:
```
.claude/skills/[project]-dev/
├── SKILL.md                       # 项目特定规范、错误模式 ⭐ 核心
└── references/
    ├── UPDATE.md                  # Skill 更新流程
    └── troubleshooting.md         # 故障排查指南

.claude/rules/
├── base.md                        # 技术栈、API规范、平台差异
├── code.md                        # 代码示例、错误模式、最佳实践
└── docs.md                        # 文档更新规范
```

### 2. 文档自动同步

**原则**: 代码和文档同时更新，避免"以后再补"。

**机制**:
```
功能完成 → Claude Code 提醒 → 更新文档 → Git 提交
```

**好处**:
- ✅ 文档永远最新
- ✅ 知识不会丢失
- ✅ 交接平滑

### 3. 持续迭代优化

**原则**: 每个问题都是改进机会，记录下来避免重复。

**机制**:
```
发现问题 → 解决问题 → 更新规则/文档 → 持续改进
```

**好处**:
- ✅ 错误不重复犯
- ✅ 经验可复用
- ✅ 团队共成长

## 🛠️ 自定义指南

### 步骤1: 复制模板

```bash
# 复制到新项目
cp -r templates/.claude your-project/
cp -r templates/docs your-project/
```

### 步骤2: 创建 Skill ⭐ 新增

**复制 Skill 模板**:
```bash
# 创建 skill 目录
mkdir -p your-project/.claude/skills/[project]-dev/references

# 复制 skill 模板
cp templates/.claude/rules/skill-template.md your-project/.claude/skills/[project]-dev/SKILL.md

# 自定义 SKILL.md
# - 修改 name 和 description（YAML frontmatter）
# - 填写项目概述
# - 添加核心开发规范
# - 初始化错误模式章节
```

**Skill 最小配置**:
```markdown
---
name: [project-name]-dev
description: [简短描述]
---

# [Project Name] 开发技能

## 项目概述
[项目描述]

## 核心开发规范
### 1. [技术领域1] 规范
...

## 已知错误模式
### 错误1: [错误名称]
...
```

### 步骤3: 修改 base.md

**填写技术栈**:
```markdown
## 核心框架版本
| 框架/库 | 版本要求 | 说明 |
|---------|----------|------|
| Express | ^4.18.2 | HTTP 服务器 |
| React | ^18.0.0 | 前端框架 |
```

**添加 API 端点**:
```markdown
## API 规范
### 用户管理
POST /api/users - 创建用户
GET  /api/users/:id - 获取用户
```

**配置环境变量**:
```markdown
## 环境变量
PORT=3000
DATABASE_URL=postgresql://...
```

### 步骤4: 修改 code.md

**添加错误模式**:
```markdown
### 错误1: 未验证输入
// ❌ 错误代码
// ✅ 正确代码
```

**添加代码示例**:
```markdown
## API 实现
### 创建用户
[完整代码示例]
```

### 步骤5: 初始化文档

```bash
# 复制模板
cp docs/HANDOVER-TEMPLATE.md docs/HANDOVER.md
cp docs/BEST_PRACTICES-TEMPLATE.md docs/BEST_PRACTICES.md

# 填写项目信息
# 编辑 docs/HANDOVER.md
# 编辑 docs/BEST_PRACTICES.md
```

### 步骤6: 验证配置

启动 Claude Code 并验证：
```
1. cd your-project
2. claude-code .
3. 提问："请列出项目的核心开发规范"
4. 应该返回 SKILL.md 中的内容
```

## 📋 检查清单

### 项目初始化检查清单

- [ ] 复制 `.claude/` 目录
- [ ] 复制 `docs/` 目录
- [ ] **创建并自定义 SKILL.md** ⭐ 优先
- [ ] 自定义 `base.md`（技术栈）
- [ ] 自定义 `code.md`（代码规范）
- [ ] 初始化 `HANDOVER.md`（项目信息）
- [ ] 初始化 `BEST_PRACTICES.md`（最佳实践）
- [ ] 验证 Claude Code 配置
- [ ] 提交初始版本到 Git

### 功能开发检查清单

- [ ] 需求明确
- [ ] 遵循规则编写代码
- [ ] 测试验证通过
- [ ] ⭐ **更新 SKILL.md**（新增错误模式/规范）⭐ 优先
- [ ] ⭐ 更新 base.md（如有技术变更）
- [ ] ⭐ 更新 code.md（新增错误模式/示例）
- [ ] ⭐ 更新 HANDOVER.md（功能说明）
- [ ] ⭐ 更新 BEST_PRACTICES.md（经验总结）
- [ ] Git 提交并推送

## 🎓 学习资源

### 必读文档

1. **`.claude/rules/init.md`** - 初始化指南
2. **`.claude/rules/skill-template.md`** - Skill 模板 ⭐ 新增
3. **`.claude/rules/docs.md`** - 文档更新规范
4. **当前项目的 SKILL.md** - 查看实战案例

### 实战案例

参考 WinJin AIGC 项目：
- 仓库: https://github.com/leon30083/wenjing-aigc.git
- 查看 `.claude/skills/winjin-dev/SKILL.md` - 完整的 Skill 示例
- 查看 `.claude/skills/winjin-dev/references/troubleshooting.md` - 故障排查示例
- 查看完整的规则文件和文档更新历史

## 🔧 故障排查

### 问题1: Claude Code 不读取 Skill ⭐ 新增

**症状**:
- Claude Code 不知道项目的特定规范
- 重复犯相同的错误
- 开发质量没有提升

**检查**:
1. `.claude/skills/[project]-dev/SKILL.md` 是否存在
2. YAML frontmatter 格式是否正确
3. `name` 和 `description` 是否填写

**解决**:
```bash
# 检查 Skill 文件
cat .claude/skills/[project]-dev/SKILL.md

# 验证 YAML frontmatter
---
name: [project-name]-dev
description: [描述]
---

# 测试 Skill
# 在 Claude Code 中问："请列出项目的核心开发规范"
```

### 问题2: Claude Code 不读取规则

**检查**:
1. `.claude/` 目录是否在项目根目录
2. `settings.json` 格式是否正确
3. 规则文件路径是否正确

**解决**:
```bash
# 检查配置
cat .claude/settings.json

# 验证规则文件
ls -la .claude/rules/

# 重启 Claude Code
```

### 问题3: 规则不生效

**检查**:
1. 规则文件开头是否有 `---` 分隔符
2. `paths:` 配置是否正确
3. 规则语法是否正确

**解决**:
```bash
# 查看规则文件
cat .claude/rules/base.md

# 测试规则
# 在 Claude Code 中问："请检查当前项目的技术栈"
```

## 🚀 下一步

1. **立即尝试**: 用模板创建一个测试项目
2. **深入学习**: 阅读所有规则文件，理解设计理念
3. **实战应用**: 在实际项目中应用这套方法
4. **持续改进**: 根据实践调整和优化模板

## 💡 贡献

欢迎反馈和改进建议！

- 提交 Issue: [GitHub Issues]
- 提交 PR: [Pull Requests]

## 📄 许可证

MIT License - 自由使用和修改

---

**模板版本**: v2.0 ⭐ 新增 Skill 范式
**最后更新**: 2025-12-31
**维护者**: Your Name
**基于实战**: WinJin AIGC 项目经验

**v2.0 更新内容**:
- ✅ 新增 Skill 模板（skill-template.md）
- ✅ 强调 Skill 优先更新原则
- ✅ 更新文档更新流程，Skill 作为第一优先级
- ✅ 添加 Skill 故障排查指南
