# 自动化层

> **版本**: v1.0.0
> **更新日期**: 2026-01-18

---

## 概述

自动化层是 WinJin 项目的智能增强系统，通过 MCP (Model Context Protocol) 集成多个自动化工具，实现测试自动化、文档查询、知识管理和持续学习。

---

## 目录结构

```
05-automation/
├── README.md                      # 本文件 - 导航文档
├── mcp-integration.md             # MCP 集成指南
├── auto-testing.md                # 自动化测试系统
├── continuous-learning.md         # 持续学习机制
└── automation-architecture.md      # 自动化架构文档
```

---

## 快速链接

### 核心文档

| 文档 | 用途 | 优先级 |
|------|------|--------|
| [MCP 集成指南](./mcp-integration.md) | 了解如何使用 MCP 工具 | ⭐⭐⭐ |
| [自动化测试](./auto-testing.md) | 测试架构和执行 | ⭐⭐⭐ |
| [持续学习](./continuous-learning.md) | 错误分析和改进 | ⭐⭐ |
| [自动化架构](./automation-architecture.md) | 系统架构和设计 | ⭐⭐ |

---

## 已集成的 MCP 服务器

### 1. Chrome DevTools

**用途**: 浏览器自动化测试

**主要功能**:
- 页面导航和交互
- 截图和快照
- 控制台和网络请求检查
- 表单填充和点击操作

**快速开始**:
```javascript
// 打开页面
await mcp__chrome_devtools__navigate_page({
  type: 'url',
  url: 'http://localhost:5173'
});

// 获取快照
const snapshot = await mcp__chrome_devtools__take_snapshot();

// 截图
await mcp__chrome_devtools__take_screenshot({
  filePath: 'test-results/screenshot.png'
});
```

**详细文档**: [MCP 集成指南 - Chrome DevTools](./mcp-integration.md#chrome-devtools-集成)

---

### 2. Context7

**用途**: 获取最新的库文档和代码示例

**主要功能**:
- 解析库 ID
- 查询最新文档
- 获取代码示例

**快速开始**:
```javascript
// 解析库 ID
const result = await mcp__context7__resolve_library_id({
  libraryName: 'reactflow',
  query: 'useNodeId hook'
});

// 查询文档
const docs = await mcp__context7__query_docs({
  libraryId: '/xyflow/xyflow',
  query: 'How to use useNodeId in custom nodes'
});
```

**详细文档**: [MCP 集成指南 - Context7](./mcp-integration.md#context7-集成)

---

### 3. Web Search

**用途**: 搜索最新技术信息和解决方案

**主要功能**:
- 网页搜索
- 网页内容提取
- 技术调研

**快速开始**:
```javascript
// 搜索错误解决方案
const results = await mcp__web_search_prime__webSearchPrime({
  search_query: 'React Flow useNodeId undefined solution',
  location: 'cn'
});

// 提取网页内容
const content = await mcp__web_reader__webReader({
  url: 'https://example.com/docs',
  return_format: 'markdown'
});
```

**详细文档**: [MCP 集成指南 - Web Search](./mcp-integration.md#web-search-集成)

---

### 4. Memory (Knowledge Graph)

**用途**: 构建和管理项目知识图谱

**主要功能**:
- 创建实体和关系
- 搜索节点
- 读取完整图谱

**快速开始**:
```javascript
// 创建实体
await mcp__memory__create_entities({
  entities: [{
    name: 'VideoGenerateNode',
    entityType: 'NodeType',
    observations: [
      '视频生成节点',
      '支持双平台'
    ]
  }]
});

// 创建关系
await mcp__memory__create_relations({
  relations: [{
    from: 'TextNode',
    to: 'VideoGenerateNode',
    relationType: 'connects_to'
  }]
});

// 搜索
const results = await mcp__memory__search_nodes({
  query: 'video generation'
});
```

**详细文档**: [MCP 集成指南 - Memory](./mcp-integration.md#memory-集成)

---

## 自动化测试

### 测试层级

```
┌─────────────────────────────────────┐
│  E2E 测试 (MCP Chrome DevTools)    │
├─────────────────────────────────────┤
│  集成测试 (React Testing Library)   │
├─────────────────────────────────────┤
│  单元测试 (Jest)                    │
└─────────────────────────────────────┘
```

### 快速命令

```bash
# 运行所有测试
npm run test:all

# 运行 E2E 测试
npm run test:e2e

# 生成覆盖率报告
npm run test:coverage
```

**详细文档**: [自动化测试系统](./auto-testing.md)

---

## 持续学习

### 学习机制

```
错误监控 → 模式识别 → 规则生成 → 效果追踪
```

### 快速命令

```bash
# 分析错误并生成规则
npm run learner:analyze

# 生成改进报告
npm run learner:report

# 查看质量趋势
npm run metrics:trend
```

**详细文档**: [持续学习系统](./continuous-learning.md)

---

## 系统架构

### 6 层自动化系统

```
┌─────────────────────────────────┐
│      用户交互层                  │
│  CLI, Web UI, VS Code           │
├─────────────────────────────────┤
│       技能层 (Skills)           │
│  /commit, /plan, reactflow-dev  │
├─────────────────────────────────┤
│       规则层 (Rules)            │
│  基础规则、代码规范、错误模式     │
├─────────────────────────────────┤
│    生命周期层 (Hooks)           │
│  Pre-commit, Post-commit        │
├─────────────────────────────────┤
│      工具层 (MCP Tools)         │
│  Chrome, Context7, Web, Memory  │
├─────────────────────────────────┤
│       数据层 (Data)             │
│  代码库、错误模式、知识图谱       │
└─────────────────────────────────┘
```

**详细文档**: [自动化架构](./automation-architecture.md)

---

## 使用场景

### 场景 1: 开发新功能

```bash
# 1. 进入计划模式
/plan

# 2. 查询相关文档
# MCP Context7 自动查询最新文档

# 3. 编写代码
# 根据文档编写代码

# 4. 自动测试
# MCP Chrome DevTools 自动测试

# 5. 提交代码
# Pre-commit hook 自动验证
```

### 场景 2: 调试错误

```bash
# 1. 搜索解决方案
# MCP Web Search 搜索错误信息

# 2. 查询文档
# MCP Context7 查询相关 API 文档

# 3. 测试修复
# MCP Chrome DevTools 自动测试

# 4. 记录知识
# MCP Memory 记录错误和解决方案
```

### 场景 3: 代码审查

```bash
# 1. 运行规则检查
npm run validate:rules

# 2. 运行测试
npm run test:all

# 3. 生成报告
npm run learner:report

# 4. 更新知识图谱
npm run learner:update
```

---

## 最佳实践

### 1. 自动化优先

```javascript
// ✅ 正确：使用 MCP 自动测试
async function testVideoGenerate() {
  await mcp__chrome_devtools__navigate_page({
    type: 'url',
    url: 'http://localhost:5173'
  });

  const snapshot = await mcp__chrome_devtools__take_snapshot();
  // ... 自动化测试流程
}

// ❌ 错误：手动测试
// 每次都问用户"能否测试"
```

### 2. 组合使用工具

```javascript
// ✅ 正确：组合多个 MCP 工具
// 1. 搜索解决方案
const searchResults = await mcp__web_search_prime__webSearchPrime({
  search_query: 'React Flow node data undefined'
});

// 2. 查询文档
const docs = await mcp__context7__query_docs({
  libraryId: '/xyflow/xyflow',
  query: 'useNodeId hook'
});

// 3. 记录知识
await mcp__memory__create_entities({
  entities: [{
    name: 'useNodeId',
    entityType: 'ReactHook',
    observations: ['获取当前节点 ID', '不要使用 data.id']
  }]
});
```

### 3. 及时记录知识

```javascript
// ✅ 正确：发现错误立即记录
catch (error) {
  await mcp__memory__create_entities({
    entities: [{
      name: `错误: ${error.message}`,
      entityType: 'Error',
      observations: [
        `描述: ${error.message}`,
        `解决方案: ${solution}`,
        `相关文件: ${fileName}`
      ]
    }]
  });
}
```

---

## 相关文档

### 内部文档

- [测试自动化](../02-methodology/testing-automation.md)
- [文档标准](../02-methodology/documentation-standards.md)
- [错误模式](../04-error-patterns/errors-by-type.md)
- [技能文档](../skills/winjin-dev/SKILL.md)

### 外部文档

- [MCP 协议规范](https://modelcontextprotocol.io/)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [React Flow 文档](https://reactflow.dev/)

---

## 更新日志

| 日期 | 版本 | 变更说明 |
|------|------|---------|
| 2026-01-18 | v1.0.0 | 初始版本 - 创建自动化层文档 |

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
**版本**: v1.0.0
