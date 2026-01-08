# WinJin 完整自动化开发规则体系

> **版本**: v1.0.0
> **创建日期**: 2026-01-08
> **目标**: 建立覆盖全生命周期的自动化开发系统

---

## 体系架构

```
┌─────────────────────────────────────────────────────────────┐
│            WinJin Auto-Development System                   │
│                  完整自动化开发规则体系                      │
└─────────────────────────────────────────────────────────────┘

                         开发生命周期
                            ↓
    ┌───────────────────────────────────────────────┐
    │           1. 项目记忆层 (Memory)               │
    │  - CLAUDE.md (项目DNA)                         │
    │  - 技术栈规范                                   │
    │  - 代码规范                                     │
    │  - API规范                                      │
    │  - 最佳实践                                     │
    └───────────────────────────────────────────────┘
                            ↓
    ┌───────────────────────────────────────────────┐
    │         2. 权限管理层 (Permissions)             │
    │  - Sandbox 命令白名单                          │
    │  - 生命周期 Hooks                               │
    │  - 自动批准配置                                 │
    │  - 状态栏增强                                   │
    └───────────────────────────────────────────────┘
                            ↓
    ┌───────────────────────────────────────────────┐
    │          3. 规则层 (Rules)                     │
    │  - 基础规则 (base.md)                          │
    │  - 代码规范 (code.md)                           │
    │  - 模块规则 (prompt-optimizer.md)               │
    │  - 错误模式 (error-patterns.md)                 │
    │  - 文档规范 (docs.md)                           │
    └───────────────────────────────────────────────┘
                            ↓
    ┌───────────────────────────────────────────────┐
    │         4. 技能层 (Skills)                      │
    │  - prompt-tester (提示词测试)                   │
    │  - workflow-tester (工作流测试)                 │
    │  - auto-reporter (自动化报告)                   │
    │  - code-reviewer (代码审查)                     │
    └───────────────────────────────────────────────┘
                            ↓
    ┌───────────────────────────────────────────────┐
    │        5. 测试自动化层 (Testing)                │
    │  - 单元测试自动化                               │
    │  - 集成测试自动化                               │
    │  - E2E测试自动化                                │
    │  - 性能测试自动化                               │
    └───────────────────────────────────────────────┘
                            ↓
    ┌───────────────────────────────────────────────┐
    │       6. 自动迭代层 (Auto-Iteration)            │
    │  - 错误监控                                     │
    │  - 模式识别                                     │
    │  - 规则生成                                     │
    │  - 效果追踪                                     │
    └───────────────────────────────────────────────┘
                            ↓
                  持续改进反馈循环
```

---

## 核心设计原则

### 1. 全面覆盖
覆盖开发生命周期的所有环节：
- ✅ 需求分析
- ✅ 设计规划
- ✅ 代码开发
- ✅ 代码审查
- ✅ 测试验证
- ✅ 文档更新
- ✅ 部署上线
- ✅ 监控迭代

### 2. 自动化优先
**能自动化的绝不人工**：
- ✅ 自动代码格式化
- ✅ 自动错误检测
- ✅ 自动测试运行
- ✅ 自动文档更新
- ✅ 自动规则生成

### 3. 渐进增强
从基础到高级：
- **Level 1**: 基础配置（CLAUDE.md + settings.json）
- **Level 2**: 规则系统（rules/）
- **Level 3**: 技能系统（skills/）
- **Level 4**: 自动测试（testing/）
- **Level 5**: 自动迭代（auto-learner/）

### 4. 可扩展性
- 模块化设计
- 插件式架构
- 配置驱动
- 易于维护

---

## 文件结构

```
.claude/
├── CLAUDE.md                            # ⭐ 项目DNA（根目录）
├── settings.json                        # 权限+Hooks配置
├── settings.local.json                  # 本地覆盖
│
├── rules/                               # 规则层
│   ├── base.md                          # 技术栈约束
│   ├── code.md                          # 代码规范
│   ├── docs.md                          # 文档规范
│   ├── error-patterns.md                # 错误模式参考
│   ├── quick-reference.md               # 快速参考
│   └── prompt-optimizer.md              # ⭐ 提示词优化规则
│
├── skills/                              # 技能层
│   ├── winjin-dev/                      # 开发技能
│   │   └── SKILL.md
│   ├── prompt-tester/                   # ⭐ 提示词测试
│   │   ├── SKILL.md
│   │   ├── instructions.md
│   │   └── test-script.sh
│   ├── workflow-tester/                 # ⭐ 工作流测试
│   ├── auto-reporter/                   # ⭐ 自动报告
│   └── code-reviewer/                   # ⭐ 代码审查
│
├── scripts/                             # 自动化脚本
│   ├── test-prompt.js                   # 提示词测试脚本
│   ├── generate-report.js               # 报告生成脚本
│   └── auto-iterate.js                  # 自动迭代脚本
│
└── auto-learner/                        # 自动迭代层
    ├── error-monitor.js                 # 错误监控
    ├── pattern-recognizer.js            # 模式识别
    ├── rule-generator.js                # 规则生成
    ├── metrics-tracker.js               # 效果追踪
    ├── config.json                      # 配置
    └── data/                            # 数据存储
        ├── errors.json
        ├── patterns.json
        └── metrics.json
```

---

## 开发生命周期自动化

### 阶段1：开发前 (Pre-Development)

**自动化检查清单**：
```bash
# 查看系统状态
/context          # 项目记忆
/sandbox          # 权限边界
/hooks            # 生命周期配置
/skills           # 可用技能

# 查看项目规范
/reference tech-stack     # 技术栈
/reference coding-standards # 代码规范
/reference api-guide       # API规范
```

**自动验证**：
- ✅ 环境变量配置正确
- ✅ 依赖包版本兼容
- ✅ Git 分支正确
- ✅ 无未提交的更改（可选）

---

### 阶段2：规划 (Planning)

**自动化辅助**：
```bash
/plan             # 进入计划模式
/analyze <feature> # 分析功能需求
/estimate         # 评估工作量
```

**自动生成**：
- ✅ 功能规格草案
- ✅ 技术方案建议
- ✅ 风险评估列表
- ✅ 测试计划大纲

---

### 阶段3：开发 (Development)

**实时自动化**：
```javascript
// 代码编写时的实时辅助
1. 自动格式化          (Prettier/ESLint)
2. 自动类型检查        (TypeScript)
3. 自动错误检测        (ESLint)
4. 自动规则应用        (.claude/rules/)
5. 自动最佳实践提示    (SKILL.md)
```

**保存时触发**：
```json
{
  "hooks": {
    "PreSave": "npm run format && npm run lint",
    "PostSave": "! git status --short"
  }
}
```

---

### 阶段4：测试 (Testing)

**自动化测试流程**：
```bash
# 1. 单元测试
npm run test:unit

# 2. 集成测试
npm run test:integration

# 3. E2E测试 (使用MCP工具)
/skills workflow-tester

# 4. 提示词测试
/skills prompt-tester --versions=v1.0,v1.1
```

**自动生成测试报告**：
```bash
npm run generate:report
# 生成 test-results/report.html
```

---

### 阶段5：代码审查 (Code Review)

**自动化审查**：
```bash
/skills code-reviewer

# 自动检查：
✓ 代码规范遵循
✓ 错误模式避免
✓ 安全漏洞检查
✓ 性能问题检测
✓ 最佳实践应用
```

**自动生成审查报告**：
```markdown
## Code Review Report

### ✅ 通过项
- 代码风格符合规范
- 错误处理完善
- 类型定义完整

### ⚠️ 警告项
- 建议使用 const 而非 let
- 可以提取为独立函数

### ❌ 问题项
- 发现错误模式 #17 (API端点缺少前缀)
```

---

### 阶段6：文档更新 (Documentation)

**自动触发文档更新**：
```bash
# 功能完成后自动提示
"✅ 功能已完成！

📋 建议更新以下文档：
1. .claude/skills/winjin-dev/SKILL.md
2. .claude/rules/base.md
3. .claude/rules/code.md
4. 用户输入文件夹/开发经验/Sora2_Character_Best_Practices.md
5. 用户输入文件夹/开发对话/开发交接书.md

是否现在更新？(yes/no)"
```

**自动同步**：
- ✅ 错误模式同步到 error-patterns.md
- ✅ API规范同步到 base.md
- ✅ 代码示例同步到 code.md
- ✅ 版本号同步到所有文档

---

### 阶段7：部署 (Deployment)

**部署前自动检查**：
```bash
/skills pre-deploy-check

# 检查项：
✓ 所有测试通过
✓ 无console错误
✓ 无ESLint警告
✓ 文档已更新
✓ 版本号已更新
✓ Git commit 清晰
```

**自动生成部署清单**：
```markdown
## Deployment Checklist

### 测试
- [x] 单元测试通过
- [x] 集成测试通过
- [x] E2E测试通过

### 代码质量
- [x] ESLint无错误
- [x] 无已知错误模式
- [x] 性能指标正常

### 文档
- [x] SKILL.md已更新
- [x] error-patterns.md已更新
- [x] 开发交接书.md已更新
```

---

### 阶段8：监控迭代 (Monitoring & Iteration)

**自动错误监控**：
```javascript
// 后台运行
auto-learner/error-monitor.js start

// 自动捕获：
✓ Console错误
✓ API失败
✓ 用户反馈
```

**自动模式识别**：
```javascript
// 每日运行
auto-learner/pattern-recognizer.js analyze

// 自动识别：
✓ 新错误模式
✓ 错误频率趋势
✓ 关联错误组
```

**自动规则生成**：
```javascript
// 每周运行
auto-learner/rule-generator.js generate

// 自动生成：
✓ 新错误模式文档
✓ 新防护规则
✓ 测试用例
```

---

## 配置示例

### 完整的 settings.json

```json
{
  "sandbox": {
    "allowedCommands": [
      "npm*",
      "git status",
      "git diff",
      "git log",
      "node scripts/*.js"
    ],
    "allowedPaths": [
      "src/**",
      "tests/**",
      ".claude/**",
      "scripts/**"
    ],
    "allowMcpServers": ["mcp__chrome-devtools__*"]
  },

  "hooks": {
    "PreToolUse": {
      "command": "node .claude/scripts/pre-tool-check.js",
      "description": "工具使用前检查"
    },
    "PostToolUse": {
      "command": "! git status --short",
      "description": "工具使用后显示Git状态"
    },
    "OnError": {
      "command": "node .claude/auto-learner/error-monitor.js capture",
      "description": "错误自动捕获"
    },
    "PermissionRequest": {
      "autoApprove": [
        "npm run test:*",
        "npm run lint",
        "node scripts/*.js"
      ]
    }
  },

  "statusline": {
    "enabled": true,
    "components": [
      "git-branch",
      "git-status",
      "model",
      "token-usage",
      "context-percentage",
      "errors-count"
    ]
  },

  "autoLearning": {
    "enabled": true,
    "errorMonitoring": true,
    "patternRecognition": true,
    "ruleGeneration": true,
    "requireApproval": true
  }
}
```

---

## 使用指南

### 快速开始

**1. 基础配置（5分钟）**
```bash
# 验证配置
/context
/sandbox
/hooks
/skills
```

**2. 开发一个功能**
```bash
# 进入计划模式
/plan

# 开发功能
# (系统自动应用规则、提供提示)

# 完成后测试
/skills workflow-tester

# 更新文档
/update-docs
```

**3. 查看改进效果**
```bash
# 生成自动化报告
/skills auto-reporter

# 查看错误趋势
/learner trends
```

---

## 成功指标

### 效率指标
- 🎯 开发时间减少 **> 20%**
- 🎯 测试覆盖率 **> 80%**
- 🎯 错误减少率 **> 30%**
- 🎯 文档完整性 **100%**

### 质量指标
- 🎯 代码规范遵循率 **100%**
- 🎯 自动测试通过率 **> 95%**
- 🎯 部署成功率 **100%**

---

## 实施计划

### Phase 1: 基础配置（1小时）
- [x] 架构设计
- [ ] 更新 CLAUDE.md
- [ ] 配置 settings.json
- [ ] 创建 prompt-optimizer.md

### Phase 2: 技能系统（2小时）
- [ ] 创建 prompt-tester
- [ ] 创建 workflow-tester
- [ ] 创建 auto-reporter
- [ ] 创建 code-reviewer

### Phase 3: 测试自动化（2小时）
- [ ] 创建测试脚本
- [ ] 配置自动化测试
- [ ] 生成测试报告

### Phase 4: 自动迭代（3小时）
- [ ] 实现错误监控
- [ ] 实现模式识别
- [ ] 实现规则生成
- [ ] 实现效果追踪

---

## 注意事项

1. **渐进式实施**: 不要一次性实施所有功能
2. **持续优化**: 根据使用反馈持续改进
3. **人工审核**: 自动生成的内容需要人工审核
4. **性能优先**: 自动化不应影响开发性能
5. **隐私保护**: 不记录敏感信息

---

**下一步**: 开始实施 Phase 1 - 基础配置
