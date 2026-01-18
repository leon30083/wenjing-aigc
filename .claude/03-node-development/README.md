# 节点开发层 - React Flow

> **版本**: v1.0.0
> **更新日期**: 2026-01-18

---

## 概述

节点开发层包含 React Flow 节点的开发规范、架构模式、Handle 连接规范和节点模板。这些文档指导开发者如何创建高质量的可视化节点。

---

## 文档导航

### 1. [节点架构](./node-architecture.md)

**主要内容**:
- 胶水编程在 WinJin 的体现
- 节点类型分类
- Sora2 API 标准
- 双平台兼容性

**适合读者**: 节点开发者
**阅读时间**: 15 分钟

---

### 2. [Handle 连接](./handle-connections.md)

**主要内容**:
- Handle 命名规范
- 连接验证规范
- 类型安全连接
- 数据传递规范

**适合读者**: 节点开发者
**阅读时间**: 10 分钟

---

### 3. [节点模板](./node-templates.md)

**主要内容**:
- 完整代码模板
- TextNode 模板
- CharacterLibraryNode 模板
- VideoGenerateNode 模板
- PromptOptimizerNode 模板
- TaskResultNode 模板

**适合读者**: 节点开发者
**阅读时间**: 20 分钟

---

## 快速开始

### 创建新节点

**方式 1: 使用技能命令**
```bash
/skills reactflow-dev --type=input|process|output --name=MyNode
```

**方式 2: 使用模板**
```bash
# 1. 复制模板
cp .claude/templates/node-template.jsx src/client/src/nodes/[type]/MyNode.jsx

# 2. 修改节点名称
# 替换 [NodeName] 为实际节点名
# 替换 [节点颜色] 为实际颜色
# 替换 [handle-id] 为实际 Handle ID

# 3. 注册节点
# 在 src/client/src/App.jsx 中添加:
import MyNode from './nodes/[type]/MyNode';

const nodeTypes = {
  myNode: MyNode,
  // ...
};
```

### 节点开发优先级 ⭐⭐⭐

| 优先级 | 规则 | 说明 |
|--------|------|------|
| **1** | 使用 `useNodeId()` | 不要依赖 `data.id`（undefined） |
| **2** | useEffect 依赖 | 避免依赖 `data` 对象（会导致无限循环） |
| **3** | 节点间数据传递 | 源节点直接更新目标节点（不要依赖 App.jsx） |
| **4** | 事件系统 | 用于异步数据传递（taskId 等） |
| **5** | getEdges 解构 | `useReactFlow()` 必须包含 `getEdges` |
| **6** | 交互元素 | 添加 `className="nodrag"` |

---

## 核心规范

### 1. 使用 useNodeId() Hook ⭐⭐⭐

```javascript
// ❌ 错误：data.id 是 undefined
function VideoGenerateNode({ data }) {
  const dispatchEvent = () => {
    window.dispatchEvent(new CustomEvent('video-task-created', {
      detail: { sourceNodeId: data.id } // ❌ undefined
    }));
  };
}

// ✅ 正确：使用 useNodeId()
import { useNodeId } from 'reactflow';

function VideoGenerateNode({ data }) {
  const nodeId = useNodeId(); // ✅ 获取节点 ID
  const dispatchEvent = () => {
    window.dispatchEvent(new CustomEvent('video-task-created', {
      detail: { sourceNodeId: nodeId }
    }));
  };
}
```

**相关错误**: 错误4, 错误37

---

### 2. useEffect 依赖数组 ⭐⭐⭐

```javascript
// ❌ 错误：data 在依赖中会导致无限循环
useEffect(() => {
  if (data.onSizeChange) {
    data.onSizeChange(nodeId, width, height);
  }
}, [data]); // ❌ data 对象每次渲染都是新引用

// ✅ 正确：使用 useRef 存储回调
const onSizeChangeRef = useRef(data.onSizeChange);
useEffect(() => {
  onSizeChangeRef.current = data.onSizeChange;
}, [data.onSizeChange]);

useEffect(() => {
  if (onSizeChangeRef.current) {
    onSizeChangeRef.current(nodeId, width, height);
  }
}, [nodeSize.width, nodeSize.height, nodeId]);
```

**相关错误**: 错误4, 错误29, 错误37

**相关约束**: #35

---

### 3. 节点间数据传递 ⭐⭐⭐

**✅ 正确模式**: 源节点直接更新目标节点

```javascript
// CharacterLibraryNode.jsx
useEffect(() => {
  if (nodeId) {
    const edges = getEdges();
    const outgoingEdges = edges.filter(e => e.source === nodeId);
    const characterObjects = characters.filter(c => selectedCharacters.has(c.id));

    // ⭐ 一次 setNodes() 调用同时更新自己和目标节点
    setNodes((nds) =>
      nds.map((node) => {
        // 更新自己
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, selectedCharacters: Array.from(selectedCharacters) } };
        }
        // ⭐ 直接更新目标节点（绕过 App.jsx）
        const isConnected = outgoingEdges.some(e => e.target === node.id);
        if (isConnected) {
          return { ...node, data: { ...node.data, connectedCharacters: characterObjects } };
        }
        return node;
      })
    );
  }
}, [selectedCharacters, nodeId, setNodes, characters, getEdges]);
```

**相关错误**: 错误16, 错误52

**相关约束**: #35

---

### 4. 交互元素添加 className="nodrag"

```javascript
// ✅ 正确：所有交互元素添加 className="nodrag"
<textarea className="nodrag" />
<select className="nodrag">...</select>
<input className="nodrag" type="checkbox" />
<button className="nodrag">生成</button>
```

**相关错误**: 错误30

---

## 节点类型

### 输入节点 (Input)

| 节点 | 用途 | 输出 Handle |
|------|------|------------|
| `TextNode` | 文本输入 | `text-output` |
| `ReferenceImageNode` | 参考图片 | `images-output` |
| `CharacterLibraryNode` | 角色选择 | `character-output` |
| `APISettingsNode` | API 配置 | `config-output` |

### 处理节点 (Process)

| 节点 | 用途 | 输入 Handle | 输出 Handle |
|------|------|------------|------------|
| `VideoGenerateNode` | 视频生成 | `prompt-input`, `character-input`, `images-input` | `video-output` |
| `CharacterCreateNode` | 角色创建 | `video-input` | `character-output` |
| `StoryboardNode` | 故事板 | `prompt-input`, `character-input` | `task-output` |
| `PromptOptimizerNode` | 提示词优化 | `prompt-input` | `optimized-prompt-output` |

### 输出节点 (Output)

| 节点 | 用途 | 输入 Handle |
|------|------|------------|
| `TaskResultNode` | 任务结果 | `task-input` |
| `CharacterResultNode` | 角色结果 | `character-input` |

---

## Handle 命名规范

### 输入 Handle (targetHandle)

```
{节点类型}-{数据类型}-input

示例：
- prompt-input      # 提示词输入
- character-input   # 角色输入
- images-input      # 图片输入
- video-input       # 视频输入
- task-input        # 任务输入
```

### 输出 Handle (sourceHandle)

```
{节点类型}-{数据类型}-output

示例：
- text-output       # 文本输出
- character-output  # 角色输出
- images-output     # 图片输出
- video-output      # 视频输出
```

---

## 数据传递规范

### 从上游节点接收数据

```javascript
// 在 App.jsx 的 useEffect 中检查连接
useEffect(() => {
  setNodes((nds) =>
    nds.map((node) => {
      if (node.id === 'myNode') {
        const incomingEdges = edges.filter((e) => e.target === node.id);
        const newData = { ...node.data };

        // 检查特定的输入 Handle
        const dataEdge = incomingEdges.find(
          (e) => e.targetHandle === 'data-input'
        );

        if (dataEdge) {
          const sourceNode = nds.find((n) => n.id === dataEdge.source);
          newData.connectedData = sourceNode?.data?.value;
        }

        return { ...node, data: newData };
      }
      return node;
    })
  );
}, [edges, setNodes]);
```

### 传递数据到下游节点

```javascript
// 节点执行完成后，更新结果
const handleExecute = async () => {
  const result = await performAction();

  // 更新节点数据（下游节点会自动接收）
  setNodes((nds) =>
    nds.map((n) =>
      n.id === nodeId
        ? { ...n, data: { ...n.data, result } }
        : n
    )
  );
};
```

---

## 节点样式

### 基础样式

```javascript
const nodeStyle = {
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '8px',
  padding: '12px',
  minWidth: '200px',
  minHeight: '100px',
  color: '#f8fafc',
  fontSize: '14px',
};

const handleStyle = {
  width: '10px',
  height: '10px',
  background: '#3b82f6',
  border: '2px solid #60a5fa',
};
```

### 节点类型颜色

```javascript
const nodeColors = {
  input: '#3b82f6',      // 蓝色
  process: '#8b5cf6',    // 紫色
  output: '#10b981',      // 绿色
  optimizer: '#f59e0b'    // 橙色
};
```

---

## 常见错误模式

### 错误 1: Handle ID 不匹配

**问题**:
```javascript
// 源节点的输出 Handle
<Handle type="source" id="output" />

// 目标节点的输入 Handle
<Handle type="target" id="input" />

// 连接时使用了错误的 ID
onConnect={(params) => addEdge({
  ...params,
  sourceHandle: 'text-output',  // ❌ 错误：应该是 'output'
  targetHandle: 'prompt-input'  // ❌ 错误：应该是 'input'
})}
```

**解决**:
```javascript
// 使用一致的 Handle ID 命名
sourceHandle: 'output'   // ✅ 与节点定义匹配
targetHandle: 'input'    // ✅ 与节点定义匹配
```

### 错误 2: 数据未传递

**问题**: 节点 A 修改了数据，但节点 B 没有接收到

**解决**: 在 App.jsx 的 useEffect 中检查连接并更新数据

### 错误 3: 节点 ID 冲突

**问题**: 添加新节点时使用了已存在的 ID

**解决**: 维护全局的 nextNodeId，使用递增 ID

---

## 相关文档

### 上层文档

- [哲学层](../00-philosophy/) - 胶水编程原理
- [基础知识层](../01-fundamentals/) - 语言层要素
- [方法论层](../02-methodology/) - Canvas 白板驱动

### 并行文档

- [错误模式层](../04-error-patterns/) - 错误库和约束映射
- [自动化层](../05-automation/) - MCP 测试工具

### 外部文档

- [React Flow 官方文档](https://reactflow.dev/)
- [React Hooks 指南](https://react.dev/reference/react)

---

## 常见问题

### Q1: 如何获取当前节点 ID？

**A**: 使用 `useNodeId()` Hook：
```javascript
import { useNodeId } from 'reactflow';

function MyNode({ data }) {
  const nodeId = useNodeId();
  // ...
}
```

### Q2: 如何避免 useEffect 无限循环？

**A**: 不要依赖 `data` 对象，使用 `useRef` 存储回调：
```javascript
const onSizeChangeRef = useRef(data.onSizeChange);
useEffect(() => {
  onSizeChangeRef.current = data.onSizeChange;
}, [data.onSizeChange]);
```

### Q3: 如何在节点间传递数据？

**A**: 源节点直接更新目标节点：
```javascript
setNodes((nds) =>
  nds.map((node) => {
    // 更新目标节点
    const isConnected = outgoingEdges.some(e => e.target === node.id);
    if (isConnected) {
      return { ...node, data: { ...node.data, connectedData: newData } };
    }
    return node;
  })
);
```

### Q4: 如何防止交互元素拖动节点？

**A**: 添加 `className="nodrag"`：
```javascript
<textarea className="nodrag" />
<button className="nodrag">点击</button>
```

---

## 更新日志

| 日期 | 版本 | 变更说明 |
|------|------|---------|
| 2026-01-18 | v1.0.0 | 初始版本 - 创建节点开发层文档 |

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
**版本**: v1.0.0
