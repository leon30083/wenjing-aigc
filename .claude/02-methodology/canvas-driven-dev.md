---

path: *

---

# Canvas 白板驱动开发

> **版本**: v1.0.0
> **更新日期**: 2026-01-18
> **来源**: Vibe-Coding-CN Canvas 理念 + WinJin React Flow 实践

---

## 核心理念

**Canvas 白板 = 单一事实来源**

```
代码 ⇄ Canvas 白板 ⇄ AI ⇄ 人类
```

---

## 什么是 Canvas 白板驱动？

### 定义

Canvas 白板驱动是一种开发方法论，将可视化工作流编辑器作为：
1. **架构设计工具** - 可视化系统架构
2. **开发验证工具** - 快速验证设计
3. **沟通协作工具** - 便于团队讨论
4. **执行引擎** - 自动执行工作流

### 核心原则

**单一事实来源**: React Flow 画布是工作流的唯一表示

- ✅ 不分离设计和实现
- ✅ 不需要手动同步代码和设计
- ✅ 可视化 = 可执行

---

## React Flow 作为白板

### 架构可视化

**传统方式**: 架构图 + 代码分离
```
架构图 (draw.io) → 代码 (VS Code) → 部署
     ↓ 手动同步
  容易不一致
```

**Canvas 白板方式**: 架构图即代码
```
React Flow 画布 → 导出 JSON → 执行工作流
     ↓ 自动同步
  始终一致
```

---

## WinJin 中的 Canvas 白板

### 工作流可视化

```
┌─────────────────────────────────────────────────────────────────┐
│                         React Flow 画布                         │
│                  (可视化工作流编辑器)                            │
└─────────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  输入节点     │    │  处理节点     │    │  输出节点     │
│              │    │              │    │              │
│ TextNode     │───→│ Prompt       │───→│ TaskResult   │
│ CharacterLib │    │ Optimizer    │    │              │
│ RefImage     │    │ VideoGen     │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
```

### 节点 = 组件

**输入节点** = 数据源组件
- `TextNode`: 文本输入源
- `CharacterLibraryNode`: 角色库数据源
- `ReferenceImageNode`: 图片文件源
- `APISettingsNode`: API 配置源

**处理节点** = 业务逻辑组件
- `PromptOptimizerNode`: AI 优化提示词
- `VideoGenerateNode`: 调用 Sora2 API
- `CharacterCreateNode`: 创建角色
- `StoryboardNode`: 批量生成故事板

**输出节点** = 结果展示组件
- `TaskResultNode`: 任务结果展示
- `CharacterResultNode`: 角色结果展示

---

## 白板驱动开发流程

### 阶段 1: 设计（在 Canvas 上）

```
1. 添加节点
   ├─ 拖拽节点到画布
   ├─ 配置节点参数
   └─ 布局节点位置

2. 连接节点
   ├─ 创建数据流
   ├─ 验证连接合法性
   └─ 优化数据流

3. 配置参数
   ├─ 设置 API 端点
   ├─ 选择模型
   └─ 调整选项
```

**优势**:
- ✅ 直观展示数据流
- ✅ 快速验证设计
- ✅ 易于调试
- ✅ 便于沟通

---

### 阶段 2: 验证（在 Canvas 上）

```
1. 连接验证
   ├─ 检查类型匹配
   ├─ 验证端口连接
   └─ 防止循环依赖

2. 数据流测试
   ├─ 模拟数据传递
   ├─ 验证转换逻辑
   └─ 检查错误处理

3. 执行测试
   ├─ 单节点执行
   ├─ 工作流执行
   └─ 结果验证
```

---

### 阶段 3: 保存（导出 JSON）

```javascript
// 导出工作流为 JSON
const workflow = {
  nodes: [
    {
      id: '1',
      type: 'textNode',
      position: { x: 100, y: 100 },
      data: { label: '文本输入', value: '' }
    },
    {
      id: '2',
      type: 'promptOptimizerNode',
      position: { x: 400, y: 100 },
      data: { label: '提示词优化', style: 'picture-book' }
    }
  ],
  edges: [
    {
      id: 'e1-2',
      source: '1',
      target: '2',
      sourceHandle: 'text-output',
      targetHandle: 'prompt-input'
    }
  ]
};

// 持久化到 localStorage
localStorage.setItem('workflow', JSON.stringify(workflow));
```

---

### 阶段 4: 执行（拓扑排序）

```javascript
// 拓扑排序执行工作流
const executeWorkflow = async (nodes, edges) => {
  // 1. 构建依赖图
  const graph = buildDependencyGraph(nodes, edges);

  // 2. 拓扑排序
  const order = topologicalSort(graph);

  // 3. 依次执行
  const results = {};
  for (const nodeId of order) {
    const node = nodes.find(n => n.id === nodeId);
    const result = await executeNode(node, results);
    results[nodeId] = result;
  }

  return results;
};
```

---

## Canvas 白板的优势

### 1. 直观性

**传统代码**:
```javascript
// 难以理解数据流
const result = await optimizePrompt(prompt);
const video = await createVideo(result.data);
```

**Canvas 白板**:
```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│ TextNode │────→│ Optimizer    │────→│ VideoGen │
└──────────┘     └──────────────┘     └──────────┘
```

---

### 2. 快速迭代

**传统流程**:
1. 修改代码
2. 重新编译
3. 手动测试
4. 调试错误

**Canvas 流程**:
1. 拖拽节点
2. 连接节点
3. 自动执行
4. 查看结果

**时间对比**: 传统流程 (30分钟) vs Canvas 流程 (5分钟)

---

### 3. 易于调试

**问题定位**:
- 传统代码: 需要阅读代码、设置断点
- Canvas 白板: 直接看到哪个节点出错

**错误追踪**:
- 传统代码: 需要理解调用栈
- Canvas 白板: 可视化调用链

---

### 4. 团队协作

**沟通效率**:
- 传统代码: 需要解释代码逻辑
- Canvas 白板: 一图胜千言

**知识传递**:
- 传统代码: 需要写文档
- Canvas 白板: 工作流即文档

---

## 实践模式

### 模式 1: 原型验证

**场景**: 需要快速验证新功能

**步骤**:
1. 在 Canvas 上设计工作流
2. 连接节点
3. 执行验证
4. 调整设计

**时间**: 10分钟 vs 传统方式 2小时

---

### 模式 2: 故障排查

**场景**: 生产环境出现问题

**步骤**:
1. 复现工作流
2. 在 Canvas 上调试
3. 定位问题节点
4. 修复验证

**时间**: 30分钟 vs 传统方式 2小时

---

### 模式 3: 知识分享

**场景**: 向新成员讲解系统

**步骤**:
1. 打开 Canvas 白板
2. 逐个节点讲解
3. 展示数据流
4. 演示执行过程

**效果**: 新成员 30分钟理解系统 vs 传统方式 2天

---

## 最佳实践

### 1. 节点设计原则

**单一职责**: 每个节点只做一件事
```
✅ 好的设计
TextNode → PromptOptimizer → VideoGen → TaskResult

❌ 不好的设计
TextAndOptimizeAndVideoNode (一个节点做所有事)
```

**清晰命名**: 节点名称要清楚表达功能
```
✅ 好的命名
"提示词优化节点"

❌ 不好的命名
"处理节点"
```

**合理布局**: 节点位置要符合数据流
```
输入节点 (左) → 处理节点 (中) → 输出节点 (右)
```

---

### 2. 连接设计原则

**类型匹配**: 只连接兼容的端口
```
✅ 好的连接
TextNode.text-output → PromptOptimizer.prompt-input

❌ 不好的连接
VideoGen.task-output → PromptOptimizer.prompt-input
```

**避免循环**: 不创建循环依赖
```
✅ 好的流程
A → B → C

❌ 不好的流程
A → B → C → A (循环)
```

**最小依赖**: 减少不必要的连接
```
✅ 好的设计
TextNode → PromptOptimizer → VideoGen

❌ 不好的设计
所有节点都连接到所有节点
```

---

### 3. 参数配置原则

**默认值**: 提供合理的默认值
```javascript
const data = {
  platform: 'juxin',        // ✅ 默认平台
  model: 'sora-2-all',      // ✅ 默认模型
  style: 'picture-book'     // ✅ 默认风格
};
```

**验证**: 验证参数有效性
```javascript
const createVideo = async (prompt, options) => {
  if (!prompt || prompt.trim().length === 0) {
    return { success: false, error: '提示词不能为空' };
  }

  if (!options.platform || !['juxin', 'zhenzhen'].includes(options.platform)) {
    return { success: false, error: '无效的平台' };
  }

  // 执行...
};
```

---

## 高级技巧

### 1. 工作流模板

**创建常用工作流模板**:
```javascript
const templates = {
  simpleVideo: {
    name: '简单视频生成',
    nodes: [
      { type: 'textNode', position: { x: 100, y: 100 } },
      { type: 'videoGenerateNode', position: { x: 400, y: 100 } },
      { type: 'taskResultNode', position: { x: 700, y: 100 } }
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'text-output', targetHandle: 'prompt-input' },
      { source: '2', target: '3', sourceHandle: 'task-output', targetHandle: 'task-input' }
    ]
  },

  characterVideo: {
    name: '角色视频生成',
    nodes: [
      { type: 'textNode', position: { x: 100, y: 50 } },
      { type: 'characterLibraryNode', position: { x: 100, y: 200 } },
      { type: 'videoGenerateNode', position: { x: 400, y: 125 } },
      { type: 'taskResultNode', position: { x: 700, y: 125 } }
    ],
    edges: [
      { source: '1', target: '3', sourceHandle: 'text-output', targetHandle: 'prompt-input' },
      { source: '2', target: '3', sourceHandle: 'character-output', targetHandle: 'character-input' },
      { source: '3', target: '4', sourceHandle: 'task-output', targetHandle: 'task-input' }
    ]
  }
};
```

---

### 2. 自动布局

**使用自动布局算法**:
```javascript
import { dagre } from 'dagre';

const autoLayout = (nodes, edges) => {
  // 创建 Dagre 图
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 100, ranksep: 100 });

  // 添加节点
  nodes.forEach(node => {
    g.setNode(node.id, { width: 200, height: 100 });
  });

  // 添加边
  edges.forEach(edge => {
    g.setEdge(edge.source, edge.target);
  });

  // 计算布局
  dagre.layout(g);

  // 应用布局
  return nodes.map(node => ({
    ...node,
    position: g.node(node.id)
  }));
};
```

---

### 3. 版本控制

**保存工作流历史**:
```javascript
const saveWorkflowVersion = (workflow) => {
  const history = JSON.parse(localStorage.getItem('workflowHistory') || '[]');

  history.push({
    version: history.length + 1,
    timestamp: Date.now(),
    workflow: workflow
  });

  localStorage.setItem('workflowHistory', JSON.stringify(history));
};

const restoreWorkflowVersion = (version) => {
  const history = JSON.parse(localStorage.getItem('workflowHistory') || '[]');
  const versionData = history.find(v => v.version === version);

  if (versionData) {
    return versionData.workflow;
  }

  return null;
};
```

---

## 与其他工具对比

| 工具 | 可视化 | 可执行 | 易用性 | 协作性 |
|------|-------|-------|-------|-------|
| **React Flow** | ✅ | ✅ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| draw.io | ✅ | ❌ | ⭐⭐⭐ | ⭐⭐⭐ |
| Mermaid | ✅ | ❌ | ⭐⭐ | ⭐⭐ |
| Node-RED | ✅ | ✅ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

**React Flow 优势**:
- ✅ 原生 React 集成
- ✅ 高度可定制
- ✅ 丰富的生态系统
- ✅ 活跃的社区支持

---

## 总结

**Canvas 白板 = 效率提升**

- ✅ 设计时间: 2小时 → 10分钟
- ✅ 调试时间: 2小时 → 30分钟
- ✅ 学习曲线: 2天 → 30分钟

**核心理念**:
> **"所见即所得，所想即可执行"**

---

## 参考文档

**相关文档**:
- [节点架构](../03-node-development/node-architecture.md) - 节点架构模式
- [Handle 连接](../03-node-development/handle-connections.md) - 连接规范
- [开发流程](./development-flow.md) - Plan → Code → Update

**外部资源**:
- [React Flow 官方文档](https://reactflow.dev/)
- [React Flow 示例](https://reactflow.dev/examples)

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
