# 自动化架构

> **版本**: v1.0.0
> **更新日期**: 2026-01-18
> **核心理念**: 6 层自动化系统

---

## 目录

- [系统架构](#系统架构)
- [各层详解](#各层详解)
- [数据流](#数据流)
- [集成方案](#集成方案)
- [扩展性](#扩展性)

---

## 系统架构

### 6 层自动化系统

```
┌─────────────────────────────────────────────────────────────┐
│                    用户交互层                                │
│  (命令行、Web UI、VS Code Extension)                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   技能层 (Skills)                            │
│  /commit, /review-pr, /plan, reactflow-dev, prompt-tester   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   规则层 (Rules)                             │
│  基础规则、代码规范、错误模式、模块规则                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  生命周期层 (Hooks)                          │
│  Pre-commit, Pre-push, Post-commit, On-change              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  工具层 (MCP Tools)                          │
│  Chrome DevTools, Context7, Web Search, Memory             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   数据层 (Data)                              │
│  代码库、错误模式、知识图谱、测试结果                        │
└─────────────────────────────────────────────────────────────┘
```

### 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         Claude Code                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   技能层      │  │   规则层      │  │  生命周期层   │          │
│  │  (Skills)    │  │  (Rules)     │  │  (Hooks)     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│          │                  │                  │                │
│          └──────────────────┴──────────────────┘                │
│                            │                                   │
│                   ┌─────────────────┐                          │
│                   │   工具层 (MCP)  │                          │
│                   │  ┌───────────┐  │                          │
│                   │  │ Chrome    │  │                          │
│                   │  │ DevTools  │  │                          │
│                   │  └───────────┘  │                          │
│                   │  ┌───────────┐  │                          │
│                   │  │ Context7  │  │                          │
│                   │  └───────────┘  │                          │
│                   │  ┌───────────┐  │                          │
│                   │  │Web Search │  │                          │
│                   │  └───────────┘  │                          │
│                   │  ┌───────────┐  │                          │
│                   │  │  Memory   │  │                          │
│                   │  └───────────┘  │                          │
│                   └─────────────────┘                          │
│                            │                                   │
│                   ┌─────────────────┐                          │
│                   │    数据层       │                          │
│                   │  ┌───────────┐  │                          │
│                   │  │  代码库    │  │                          │
│                   │  └───────────┘  │                          │
│                   │  ┌───────────┐  │                          │
│                   │  │ 错误模式  │  │                          │
│                   │  └───────────┘  │                          │
│                   │  ┌───────────┐  │                          │
│                   │  │ 知识图谱  │  │                          │
│                   │  └───────────┘  │                          │
│                   │  ┌───────────┐  │                          │
│                   │  │ 测试结果  │  │                          │
│                   │  └───────────┘  │                          │
│                   └─────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │    WinJin        │
                   │    Project      │
                   └─────────────────┘
```

---

## 各层详解

### 第 1 层：用户交互层

**职责**: 提供多种交互方式

**组件**:
- 命令行接口 (CLI)
- Web UI
- VS Code Extension
- API 接口

**示例**:
```bash
# CLI 命令
npm run validate:all
npm run fix:scan
npm run metrics:trend

# 技能命令
/commit
/plan
/skills reactflow-dev

# API 调用
curl http://localhost:9000/api/validate
```

### 第 2 层：技能层

**职责**: 提供预定义的开发技能

**技能列表**:

| 技能 | 用途 | 触发方式 |
|------|------|----------|
| `commit` | 创建 Git commit | `/commit` |
| `review-pr` | 审查 Pull Request | `/review-pr` |
| `plan` | 进入计划模式 | `/plan` 或 `Shift+Tab×2` |
| `reactflow-dev` | 创建 React Flow 节点 | `/skills reactflow-dev` |
| `prompt-tester` | 测试提示词优化 | `/skills prompt-tester` |
| `auto-reporter` | 生成改进报告 | `/skills auto-reporter` |
| `code-reviewer` | 代码审查 | `/skills code-reviewer` |

**技能定义示例**:

```yaml
# .claude/skills/reactflow-dev/SKILL.md
name: reactflow-dev
description: 创建 React Flow 节点

parameters:
  type:
    description: 节点类型 (input/process/output)
    required: true
    options:
      - input
      - process
      - output
  name:
    description: 节点名称
    required: true

actions:
  - create_node_from_template
  - register_node_in_app
  - add_documentation
```

### 第 3 层：规则层

**职责**: 强制执行开发规范

**规则分类**:

| 规则文件 | 用途 | 规则数量 |
|---------|------|----------|
| `base.md` | 技术栈约束 | - |
| `code.md` | 代码规范 | - |
| `error-patterns.md` | 错误模式 | 55个 |
| `reactflow.md` | React Flow 规则 | - |
| `prompt-optimizer.md` | 提示词优化规则 | - |

**规则执行**:

```javascript
// 规则检查器
class RuleChecker {
  check(code, rules) {
    const violations = [];

    for (const rule of rules) {
      if (rule.pattern && rule.pattern.test(code)) {
        violations.push({
          rule: rule.id,
          message: rule.message,
          severity: rule.severity,
          suggestion: rule.suggestion
        });
      }
    }

    return violations;
  }

  async enforce(violations) {
    for (const violation of violations) {
      if (violation.severity === 'error') {
        // 阻止提交
        throw new Error(violation.message);
      } else if (violation.severity === 'warning') {
        // 警告，允许继续
        console.warn(violation.message);
      }
    }
  }
}
```

### 第 4 层：生命周期层

**职责**: 在特定时间点自动执行任务

**Hooks**:

| Hook | 触发时机 | 用途 |
|------|----------|------|
| `pre-commit` | Git commit 前 | 代码检查、测试 |
| `pre-push` | Git push 前 | 完整测试、文档检查 |
| `post-commit` | Git commit 后 | 记录统计、更新知识图谱 |
| `on-change` | 文件修改时 | 自动格式化、更新文档 |

**Hook 实现**:

```javascript
// .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# 运行规则检查
npm run validate:rules

# 运行测试
npm run test:unit

# 检查文档
npm run docs:check

# 如果失败，阻止提交
if [ $? -ne 0 ]; then
  echo "❌ Pre-commit 检查失败"
  exit 1
fi
```

```javascript
// .husky/post-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# 记录提交统计
npm run metrics:record

# 更新知识图谱
npm run learner:update

# 显示改进提示
npm run learner:suggest
```

### 第 5 层：工具层

**职责**: 提供具体的自动化工具

**MCP 服务器集成**:

| MCP 服务器 | 用途 | 主要工具 |
|-----------|------|----------|
| Chrome DevTools | 浏览器自动化 | navigate, click, fill, screenshot |
| Context7 | 文档查询 | query-docs, resolve-library-id |
| Web Search | 网页搜索 | webSearchPrime, webReader |
| Memory | 知识管理 | create_entities, search_nodes |
| Sequential Thinking | 复杂分析 | sequentialthinking |

**工具调用示例**:

```javascript
// 组合使用多个 MCP 工具
async function debugIssue(issue) {
  // 1. 搜索解决方案
  const searchResults = await mcp__web_search_prime__webSearchPrime({
    search_query: issue.description
  });

  // 2. 查询最新文档
  const docs = await mcp__context7__query_docs({
    libraryId: '/facebook/react',
    query: issue.relatedAPI
  });

  // 3. 测试修复
  await mcp__chrome_devtools__navigate_page({
    type: 'url',
    url: 'http://localhost:5173'
  });

  // 4. 记录知识
  await mcp__memory__create_entities({
    entities: [{
      name: `问题: ${issue.title}`,
      entityType: 'Issue',
      observations: [
        `描述: ${issue.description}`,
        `解决方案: ${issue.solution}`,
        `相关文档: ${docs.url}`
      ]
    }]
  });
}
```

### 第 6 层：数据层

**职责**: 存储和管理所有数据

**数据源**:

| 数据类型 | 存储位置 | 格式 |
|---------|----------|------|
| 代码库 | Git 仓库 | 源代码 |
| 错误模式 | `.claude/04-error-patterns/` | Markdown |
| 知识图谱 | Memory MCP | Graph |
| 测试结果 | `test-results/` | JSON, PNG |
| 文档 | `.claude/` | Markdown |

**数据访问**:

```javascript
class DataLayer {
  // 访问错误模式
  getErrorPatterns() {
    return loadMarkdownFiles('.claude/04-error-patterns/');
  }

  // 访问知识图谱
  async getKnowledgeGraph() {
    return await mcp__memory__read_graph();
  }

  // 访问测试结果
  getTestResults() {
    return loadJsonFiles('test-results/');
  }

  // 搜索文档
  searchDocuments(query) {
    return grep(query, '.claude/');
  }
}
```

---

## 数据流

### 开发流程数据流

```
用户输入
  ↓
技能层解析
  ↓
规则层验证
  ↓
工具层执行
  ├─ MCP Chrome DevTools (测试)
  ├─ MCP Context7 (查询文档)
  ├─ MCP Web Search (搜索方案)
  └─ MCP Memory (记录知识)
  ↓
数据层存储
  ├─ 代码库 (Git)
  ├─ 错误模式 (Markdown)
  ├─ 知识图谱 (Memory)
  └─ 测试结果 (JSON)
  ↓
生命周期层触发
  ├─ Pre-commit (检查)
  ├─ Post-commit (记录)
  └─ On-change (更新)
  ↓
反馈给用户
```

### 错误处理数据流

```
错误发生
  ↓
错误捕获
  ↓
错误分类
  ├─ 已知错误 → 应用规则
  └─ 新错误 → 分析模式
  ↓
解决方案生成
  ↓
知识图谱更新
  ├─ 创建错误实体
  ├─ 创建约束实体
  └─ 建立关系
  ↓
规则生成
  ↓
测试用例生成
  ↓
文档更新
  ↓
反馈给用户
```

---

## 集成方案

### 与 Git 集成

```javascript
// Git Hooks 集成
const hooks = {
  'pre-commit': async () => {
    // 1. 规则检查
    const violations = await checkRules();
    if (violations.length > 0) {
      console.error('❌ 发现规则违规:', violations);
      return false;  // 阻止提交
    }

    // 2. 运行测试
    const testResults = await runTests();
    if (testResults.failed > 0) {
      console.error('❌ 测试失败:', testResults.failed);
      return false;  // 阻止提交
    }

    // 3. 文档检查
    const docIssues = await checkDocs();
    if (docIssues.length > 0) {
      console.warn('⚠️ 文档问题:', docIssues);
      // 不阻止提交，但给出警告
    }

    return true;  // 允许提交
  },

  'post-commit': async (commit) => {
    // 1. 记录统计
    await recordMetrics(commit);

    // 2. 更新知识图谱
    await updateKnowledgeGraph(commit);

    // 3. 生成报告
    if (shouldGenerateReport()) {
      await generateReport();
    }
  }
};
```

### 与 CI/CD 集成

```yaml
# .github/workflows/automation.yml
name: 自动化系统

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: 检出代码
        uses: actions/checkout@v3

      - name: 运行规则检查
        run: npm run validate:rules

      - name: 运行测试
        run: npm run test:all

      - name: 生成覆盖率报告
        run: npm run test:coverage

      - name: 更新知识图谱
        run: npm run learner:update

      - name: 生成改进报告
        run: npm run learner:report
```

### 与 IDE 集成

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.watcherExclude": {
    "**/.git/objects/**": true,
    "**/.git/subtree-cache/**": true,
    "**/node_modules/*/**": true
  }
}
```

---

## 扩展性

### 添加新技能

```yaml
# .claude/skills/new-skill/SKILL.md
name: new-skill
description: 新技能描述

parameters:
  param1:
    description: 参数1
    required: true

actions:
  - action1
  - action2

triggers:
  - command: /new-skill
  - event: on-save
```

### 添加新规则

```javascript
// .claude/rules/new-rule.md
# 新规则

**规则编号**: #XX
**严重程度**: ⭐⭐
**描述**: 规则描述

**错误示例**:
```javascript
// ❌ 错误
```

**正确示例**:
```javascript
// ✅ 正确
```

**预防措施**:
- 预防1
- 预防2
```

### 添加新 MCP 工具

```javascript
// 集成新的 MCP 服务器
async function useNewMCPTool() {
  const result = await mcp__new_server__tool({
    param1: 'value1'
  });
  return result;
}
```

---

## 参考文档

- [MCP 集成](./mcp-integration.md)
- [自动化测试](./auto-testing.md)
- [持续学习](./continuous-learning.md)
- [测试自动化](../02-methodology/testing-automation.md)

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
**版本**: v1.0.0
