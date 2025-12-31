---

# Claude Code 项目初始化指南

本指南帮助你快速建立标准化的开发环境。

## 📋 核心理念

这套开发方式的核心是：**持续迭代 + 文档同步 + 规则驱动**

### 三大支柱

1. **Claude Code 规则驱动开发**
   - 所有技术规范写入 `.claude/rules/`
   - Claude Code 自动加载并执行规则
   - 减少沟通成本，提高一致性

2. **文档与代码同步更新**
   - 每次功能完成 → 立即更新文档
   - 文档更新有明确规范
   - 自动提醒，避免遗漏

3. **经验积累与复用**
   - 问题解决 → 错误模式库
   - 最佳实践 → 代码示例
   - 交接文档 → 知识传承

## 🚀 快速开始

### Step 1: 复制模板文件

将以下文件复制到你的新项目：

```
your-project/
├── .claude/
│   ├── settings.json           # Claude Code 配置
│   └── rules/
│       ├── base.md             # 技术栈约束
│       ├── code.md             # 代码规范
│       └── docs.md             # 文档更新规范
├── docs/
│   ├── HANDOVER.md             # 开发交接文档
│   └── BEST_PRACTICES.md       # 最佳实践文档
└── README.md                   # 项目说明
```

### Step 2: 自定义配置

**修改 `.claude/settings.json`**:
```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  }
}
```

**自定义 `.claude/rules/base.md`**:
```markdown
## 运行时环境
- **Node.js**: 18.x 或更高
- **npm**: 9.x 或更高

## 核心框架版本
| 框架/库 | 版本要求 | 说明 |
|---------|----------|------|
| Express | ^4.18.2 | HTTP 服务器 |
| axios | ^1.6.5 | HTTP 客户端 |
```

### Step 3: 初始化文档

**创建 `docs/HANDOVER.md`**:
```markdown
# 项目开发交接书

**文档版本**: v1.0
**更新日期**: YYYY-MM-DD
**项目**: Your Project Name

## 1. 项目概述
[项目描述]

## 2. 环境要求
[环境配置]

## 3. 快速开始
[安装和运行步骤]
```

**创建 `docs/BEST_PRACTICES.md`**:
```markdown
# 开发最佳实践

**更新日期**: YYYY-MM-DD

**更新记录**:
- YYYY-MM-DD: 项目初始化

## 1. 核心结论
[关键技术要点]
```

### Step 4: 验证配置

启动 Claude Code 并验证：
```
1. 打开项目目录
2. 启动 Claude Code
3. 提问："请列出项目的技术栈"
4. 应该返回 base.md 中定义的内容
```

## 📚 必须维护的文档

### 1. .claude/skills/[project]-dev/SKILL.md ⭐ 优先
**内容**: 项目特定开发规范、错误模式、开发提示
**更新时机**:
- ✅ **每次开发完成后必须更新**
- ✅ 新增错误模式
- ✅ API 规范变更
**注意**: 这是 Claude Code AI 的核心文档，直接影响后续开发质量

### 2. .claude/rules/base.md
**内容**: 技术栈约束、API规范、平台差异
**更新时机**:
- ✅ 新增技术栈
- ✅ API 端点变更
- ✅ 发现平台差异

### 3. .claude/rules/code.md
**内容**: 代码规范、错误模式、最佳实践
**更新时机**:
- ✅ 发现新的错误模式
- ✅ 总结最佳实践
- ✅ API 实现示例

### 4. .claude/rules/docs.md
**内容**: 文档更新规范（通用模板，无需修改）
**使用方式**: 按照规范更新文档

### 5. docs/HANDOVER.md
**内容**: 项目交接文档
**更新时机**:
- ✅ 每个功能完成
- ✅ 版本号递增

### 6. docs/BEST_PRACTICES.md
**内容**: 开发经验总结
**更新时机**:
- ✅ 解决重要问题
- ✅ 发现最佳实践
- ✅ 测试验证完成

## 🔄 工作流程

### 功能开发流程

```
1. 需求讨论
   ↓
2. Claude Code 编写代码（遵循规则）
   ↓
3. 测试验证
   ↓
4. ⭐ 更新 SKILL.md（优先）
   ↓
5. ⭐ 更新其他文档
   ↓
6. Git 提交
```

### 问题解决流程

```
1. 遇到问题
   ↓
2. Claude Code 排查（使用错误模式库）
   ↓
3. 解决问题
   ↓
4. ⭐ 更新 SKILL.md（新增错误模式）
   ↓
5. ⭐ 更新 references/troubleshooting.md
   ↓
6. ⭐ 更新其他文档
   ↓
7. Git 提交
```

### Skill 更新优先级

**为什么 SKILL.md 优先？**
- ✅ Claude Code AI 直接使用 SKILL.md
- ✅ 包含项目特定的错误模式和规范
- ✅ 影响后续开发质量
- ✅ 避免重复犯错

**更新顺序**:
```
1. SKILL.md                    # Claude Code 核心文档 ⭐ 第一优先
2. base.md                     # 技术规范
3. code.md                     # 代码实现
4. docs/BEST_PRACTICES.md      # 开发经验
5. docs/HANDOVER.md            # 交接文档
```

## 💡 最佳实践

### DO ✅

1. **规则优先**
   - 遇到技术问题先查规则
   - 不在规则中的内容补充到规则
   - 保持规则与代码同步

2. **文档驱动**
   - 功能完成立即更新文档
   - **优先更新 SKILL.md** ⭐
   - 文档要写清楚"为什么"
   - 代码示例要可直接运行

3. **持续迭代**
   - 每个迭代都是改进机会
   - 不完美也要先记录
   - 定期回顾和优化

4. **Skill 同步** ⭐ 新增
   - 每次开发后更新 SKILL.md
   - 错误编号与 code.md 保持一致
   - 同时更新 references/troubleshooting.md

### DON'T ❌

1. **不要拖延文档更新**
   - 代码和文档同时提交
   - 不要"以后再补"
   - **尤其不要忘记更新 SKILL.md** ⭐

2. **不要忽视规则**
   - 遵循已建立的规范
   - 规则不合适就讨论修改

3. **不要重复造轮**
   - 先查文档再开发
   - 复用已有的错误模式

4. **不要让文档过时** ⭐ 新增
   - SKILL.md 必须与 code.md 同步
   - 错误编号必须一致
   - 每次开发后立即更新

## 🎯 模板定制建议

根据项目类型定制：

### API 服务项目
```bash
必填规则:
- SKILL.md: API 端点、错误模式、最佳实践 ⭐ 优先
- base.md: API端点、数据格式、错误码
- code.md: 错误处理、参数校验、响应格式
```

### 前端项目
```bash
必填规则:
- SKILL.md: 组件规范、状态管理、路由问题 ⭐ 优先
- base.md: 组件库、状态管理、路由
- code.md: 组件规范、样式管理、性能优化
```

### 全栈项目
```bash
必填规则:
- SKILL.md: 前后端联调、数据流、常见错误 ⭐ 优先
- base.md: 前后端技术栈、通信协议
- code.md: 前后端联调、数据流、错误处理
```

## 📞 获取帮助

- **查看规则**: `cat .claude/rules/*.md`
- **检查文档状态**: 在 Claude Code 中问"文档状态"
- **更新文档**: 在 Claude Code 中说"更新文档"

---

**模板版本**: v1.0
**最后更新**: 2025-12-29
**维护者**: Your Name
