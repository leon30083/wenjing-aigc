# MCP 集成指南

> **版本**: v1.0.0
> **更新日期**: 2026-01-18
> **核心理念**: 自动化优先，人工验证辅助

---

## 目录

- [MCP 简介](#mcp-简介)
- [已集成的 MCP 服务器](#已集成的-mcp-服务器)
- [Chrome DevTools 集成](#chrome-devtools-集成)
- [Context7 集成](#context7-集成)
- [Web Search 集成](#web-search-集成)
- [Memory 集成](#memory-集成)
- [最佳实践](#最佳实践)

---

## MCP 简介

**MCP (Model Context Protocol)** 是一个开放协议，允许 AI 应用连接到外部数据源和工具。

### WinJin 中的 MCP

WinJin 项目集成了多个 MCP 服务器，实现自动化测试、文档查询、知识管理等功能。

```
┌─────────────────────────────────────────────────────────┐
│                    Claude Code                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Chrome       │  │ Context7     │  │ Web Search   │ │
│  │ DevTools     │  │              │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│          │                  │                  │       │
│          └──────────────────┴──────────────────┘       │
│                            │                           │
│                    ┌───────────────┐                   │
│                    │   Memory      │                   │
│                    │   Knowledge   │                   │
│                    │   Graph       │                   │
│                    └───────────────┘                   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
                   ┌──────────────┐
                   │  WinJin      │
                   │  Project     │
                   └──────────────┘
```

---

## 已集成的 MCP 服务器

### 1. Chrome DevTools

**用途**: 自动化浏览器测试

**工具列表**:
- `navigate_page` - 页面导航
- `take_snapshot` - 获取页面快照
- `take_screenshot` - 截图
- `click` - 点击元素
- `fill` - 填充表单
- `wait_for` - 等待条件
- `list_console_messages` - 控制台消息
- `list_network_requests` - 网络请求

**文档**: [MCP Chrome DevTools 集成](#chrome-devtools-集成)

### 2. Context7

**用途**: 获取最新的库文档和代码示例

**工具列表**:
- `resolve-library-id` - 解析库 ID
- `query-docs` - 查询文档

**文档**: [Context7 集成](#context7-集成)

### 3. Web Search

**用途**: 搜索最新信息

**工具列表**:
- `webSearchPrime` - 网页搜索
- `webReader` - 网页内容提取

**文档**: [Web Search 集成](#web-search-集成)

### 4. Memory (Knowledge Graph)

**用途**: 知识图谱管理

**工具列表**:
- `create_entities` - 创建实体
- `create_relations` - 创建关系
- `search_nodes` - 搜索节点
- `read_graph` - 读取图谱

**文档**: [Memory 集成](#memory-集成)

### 5. Sequential Thinking

**用途**: 复杂问题分析

**工具列表**:
- `sequentialthinking` - 顺序思考

### 6. Image Analysis

**用途**: 图像分析

**工具列表**:
- `analyze_image` - 通用图像分析
- `ui_to_artifact` - UI 转代码
- `diagnose_error_screenshot` - 错误截图诊断

### 7. Video Analysis

**用途**: 视频内容分析

**工具列表**:
- `analyze_video` - 视频分析

---

## Chrome DevTools 集成

### 启动测试环境

```bash
# 终端 1：启动后端服务器
npm run server

# 终端 2：启动流式画布
cd src/client
npm run dev
```

### 基础操作

#### 1. 打开页面

```javascript
await mcp__chrome_devtools__navigate_page({
  type: 'url',
  url: 'http://localhost:5173'
});
```

#### 2. 获取页面快照

```javascript
const snapshot = await mcp__chrome_devtools__take_snapshot({
  verbose: false
});

// 分析快照
const textArea = snapshot.elements.find(e =>
  e.type === 'textbox'
);
```

#### 3. 交互操作

```javascript
// 填充输入框
await mcp__chrome_devtools__fill({
  uid: textArea.uid,
  value: '测试文本'
});

// 点击按钮
await mcp__chrome_devtools__click({
  uid: button.uid
});
```

#### 4. 截图验证

```javascript
await mcp__chrome_devtools__take_screenshot({
  format: 'png',
  fullPage: true,
  filePath: 'test-results/screenshot.png'
});
```

#### 5. 等待条件

```javascript
await mcp__chrome_devtools__wait_for({
  text: '生成成功',
  timeout: 120000
});
```

#### 6. 检查控制台

```javascript
const messages = await mcp__chrome_devtools__list_console_messages({
  types: ['error', 'warn']
});

if (messages.length > 0) {
  console.error('发现控制台错误:', messages);
}
```

#### 7. 检查网络请求

```javascript
const requests = await mcp__chrome_devtools__list_network_requests({
  resourceTypes: ['fetch', 'xhr']
});

const apiRequests = requests.filter(r =>
  r.url.includes('/api/')
);
```

### 高级操作

#### 1. 执行 JavaScript

```javascript
const result = await mcp__chrome_devtools__evaluate_script({
  function: `() => {
    const nodes = window.getNodes();
    return nodes.filter(n => n.type === 'textNode').length;
  }`
});
```

#### 2. 监听网络请求

```javascript
// 查看特定请求详情
const request = await mcp__chrome_devtools__get_network_request({
  reqid: requestId
});

console.log('请求状态:', request.status);
console.log('响应数据:', request.response);
```

#### 3. 处理对话框

```javascript
await mcp__chrome_devtools__handle_dialog({
  action: 'accept',
  promptText: '输入文本'  // 可选
});
```

#### 4. 模拟网络条件

```javascript
await mcp__chrome_devtools__emulate({
  networkConditions: 'Slow 3G'
});
```

---

## Context7 集成

### 用途

获取编程库的最新文档和代码示例，避免凭记忆编写过时的代码。

### 基础操作

#### 1. 解析库 ID

```javascript
const result = await mcp__context7__resolve-library_id({
  libraryName: 'react',
  query: 'How to use useEffect hook'
});

// 返回: { libraryId: '/facebook/react', ... }
```

#### 2. 查询文档

```javascript
const docs = await mcp__context7__query-docs({
  libraryId: '/facebook/react',
  query: 'useEffect dependency array best practices'
});

// 返回最新的文档和示例
```

### 使用场景

#### 场景 1: 查询 React Flow API

```javascript
// 1. 解析库 ID
const libResult = await mcp__context7__resolve-library_id({
  libraryName: 'reactflow',
  query: 'useNodeId hook'
});

// 2. 查询文档
const docs = await mcp__context7__query_docs({
  libraryId: libResult.libraryId,
  query: 'How to get current node ID in custom node'
});

// 3. 应用到代码
// 根据文档更新节点代码
```

#### 场景 2: 查询 Express 最佳实践

```javascript
const docs = await mcp__context7__query_docs({
  libraryId: '/expressjs/express',
  query: 'async error handling middleware'
});

// 应用错误处理模式
```

### 最佳实践

```javascript
// ✅ 正确：查询最新文档
const docs = await mcp__context7__query_docs({
  libraryId: '/facebook/react',
  query: 'useEffect cleanup function'
});

// 根据最新文档编写代码
useEffect(() => {
  const subscription = getData();
  return () => subscription.unsubscribe();  // 清理
}, [dependency]);

// ❌ 错误：凭记忆编写
useEffect(() => {
  // 可能过时或不正确
}, []);
```

---

## Web Search 集成

### 用途

搜索最新的技术信息、错误解决方案、最佳实践。

### 基础操作

#### 1. 网页搜索

```javascript
const results = await mcp__web_search_prime__webSearchPrime({
  search_query: 'React Flow useNodeId undefined',
  location: 'cn',  // 中国区域
  content_size: 'high'  // 详细内容
});
```

#### 2. 网页内容提取

```javascript
const content = await mcp__web_reader__webReader({
  url: 'https://reactflow.dev/learn/guides/use-nodes',
  return_format: 'markdown',
  retain_images: false
});
```

### 使用场景

#### 场景 1: 搜索错误解决方案

```javascript
// 搜索错误信息
const results = await mcp__web_search_prime__webSearchPrime({
  search_query: 'React Flow data.id undefined solution',
  location: 'cn'
});

// 分析结果
results.forEach(result => {
  console.log(result.title);
  console.log(result.url);
  console.log(result.summary);
});
```

#### 场景 2: 查找最新文档

```javascript
// 搜索 React Flow 最新文档
const results = await mcp__web_search_prime__webSearchPrime({
  search_query: 'React Flow 11 documentation 2025',
  search_recency_filter: 'oneYear'
});

// 提取文档内容
const docContent = await mcp__web_reader__webReader({
  url: results[0].url,
  return_format: 'markdown'
});
```

#### 场景 3: 调研技术方案

```javascript
// 搜索最佳实践
const results = await mcp__web_search_prime__webSearchPrime({
  search_query: 'React Flow state management best practices',
  content_size: 'high'
});

// 整合多个来源的信息
const solutions = results.map(r => ({
  source: r.websiteName,
  url: r.url,
  summary: r.summary
}));
```

### 最佳实践

```javascript
// ✅ 正确：先搜索，再编码
const results = await mcp__web_search_prime__webSearchPrime({
  search_query: 'Sora2 API polling interval best practices'
});

// 根据搜索结果确定轮询间隔
const POLL_INTERVAL = results.some(r =>
  r.summary.includes('30 seconds')
) ? 30000 : 5000;

// ❌ 错误：凭直觉设定
const POLL_INTERVAL = 5000;  // 可能导致 429 错误
```

---

## Memory 集成

### 用途

构建项目知识图谱，记录实体关系，支持智能检索。

### 基础操作

#### 1. 创建实体

```javascript
await mcp__memory__create_entities({
  entities: [{
    name: 'VideoGenerateNode',
    entityType: 'NodeType',
    observations: [
      '视频生成节点，支持双平台',
      '使用 POST /api/video/create',
      '需要配置 API Key'
    ]
  }]
});
```

#### 2. 创建关系

```javascript
await mcp__memory__create_relations({
  relations: [{
    from: 'TextNode',
    to: 'VideoGenerateNode',
    relationType: 'connects_to'
  }]
});
```

#### 3. 搜索节点

```javascript
const results = await mcp__memory__search_nodes({
  query: 'video generation'
});
```

#### 4. 读取图谱

```javascript
const graph = await mcp__memory__read_graph();
```

### 使用场景

#### 场景 1: 记录节点关系

```javascript
// 创建节点实体
await mcp__memory__create_entities({
  entities: [
    {
      name: 'TextNode',
      entityType: 'InputNode',
      observations: ['文本输入节点', '输出 Handle: text-output']
    },
    {
      name: 'PromptOptimizerNode',
      entityType: 'ProcessNode',
      observations: ['提示词优化节点', '使用 OpenAI API']
    }
  ]
});

// 创建连接关系
await mcp__memory__create_relations({
  relations: [{
    from: 'TextNode',
    to: 'PromptOptimizerNode',
    relationType: 'provides_input_to'
  }]
});
```

#### 场景 2: 记录错误模式

```javascript
// 创建错误实体
await mcp__memory__create_entities({
  entities: [{
    name: '错误1: 双平台任务ID不兼容',
    entityType: 'ErrorPattern',
    observations: [
      '聚鑫返回 {id}',
      '贞贞返回 {task_id}',
      '解决方案: const taskId = result.data.id || result.data.task_id'
    ]
  }]
});

// 关联到约束
await mcp__memory__create_relations({
  relations: [{
    from: '错误1: 双平台任务ID不兼容',
    to: '约束31: 禁止假设任务ID字段名',
    relationType: 'prevented_by'
  }]
});
```

#### 场景 3: 智能检索

```javascript
// 搜索相关问题
const results = await mcp__memory__search_nodes({
  query: 'task id compatibility'
});

// 返回相关实体
// - 错误1: 双平台任务ID不兼容
// - 约束31: 禁止假设任务ID字段名
// - VideoGenerateNode (视频生成节点)
```

### 最佳实践

```javascript
// ✅ 正确：持续更新知识图谱
// 发现新错误时
await mcp__memory__create_entities({
  entities: [{
    name: '错误56: 新发现的错误',
    entityType: 'ErrorPattern',
    observations: ['详细描述', '解决方案']
  }]
});

// 建立关联
await mcp__memory__create_relations({
  relations: [{
    from: '错误56: 新发现的错误',
    to: '相关约束',
    relationType: 'prevented_by'
  }]
});

// ❌ 错误：不记录知识
// 发现错误后直接修复，没有记录
// 导致下次重复犯错
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

### 2. 组合使用

```javascript
// ✅ 正确：组合多个 MCP 工具

// 1. 搜索错误解决方案
const searchResults = await mcp__web_search_prime__webSearchPrime({
  search_query: 'React Flow node data undefined'
});

// 2. 查询最新文档
const docs = await mcp__context7__query_docs({
  libraryId: '/xyflow/xyflow',
  query: 'useNodeId hook'
});

// 3. 记录知识
await mcp__memory__create_entities({
  entities: [{
    name: 'useNodeId',
    entityType: 'ReactHook',
    observations: [
      '获取当前节点 ID',
      '必须在节点组件内使用',
      '不要使用 data.id（undefined）'
    ]
  }]
});

// 4. 应用到代码
// 根据搜索结果、文档、知识更新代码
```

### 3. 验证结果

```javascript
// ✅ 正确：使用截图验证
await mcp__chrome_devtools__take_screenshot({
  filePath: 'test-results/before-fix.png'
});

// 修复代码

await mcp__chrome_devtools__take_screenshot({
  filePath: 'test-results/after-fix.png'
});

// 对比验证
```

### 4. 错误处理

```javascript
// ✅ 正确：完整的错误处理
try {
  await mcp__chrome_devtools__wait_for({
    text: '生成成功',
    timeout: 120000
  });
} catch (error) {
  console.error('等待超时:', error);

  // 收集诊断信息
  const messages = await mcp__chrome_devtools__list_console_messages({
    types: ['error']
  });

  const requests = await mcp__chrome_devtools__list_network_requests();

  // 截图记录
  await mcp__chrome_devtools__take_screenshot({
    filePath: 'test-results/error.png'
  });

  throw new Error(`测试失败: ${error.message}`);
}
```

---

## 参考文档

- [MCP 协议规范](https://modelcontextprotocol.io/)
- [测试自动化](../02-methodology/testing-automation.md)
- [持续学习](./continuous-learning.md)
- [自动化架构](./automation-architecture.md)

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
**版本**: v1.0.0
