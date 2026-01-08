# React Flow 开发规则

> **适用模块**: 流式画布 (src/client)
> **最后更新**: 2026-01-08
> **版本**: v1.0.0

---

## 核心原则

### 1. 节点设计原则

**单一职责**
- 每个节点只负责一个功能
- 输入节点：数据输入（文本、图片、角色）
- 处理节点：业务逻辑（视频生成、提示词优化）
- 输出节点：结果展示（任务结果、角色结果）

**数据流向**
```
输入节点 → 处理节点 → 输出节点
  ↓         ↓         ↓
Handle   Handle   Handle
```

### 2. Handle 命名规范

**输入 Handle (targetHandle)**
```
{节点类型}-{数据类型}-input

示例：
- prompt-input      # 提示词输入
- character-input   # 角色输入
- images-input      # 图片输入
- video-input       # 视频输入
- task-input        # 任务输入
```

**输出 Handle (sourceHandle)**
```
{节点类型}-{数据类型}-output

示例：
- text-output       # 文本输出
- character-output  # 角色输出
- images-output     # 图片输出
- video-output      # 视频输出
```

### 3. 节点数据结构

**必需字段**
```javascript
{
  id: 'unique-id',
  type: 'nodeType',
  position: { x: 0, y: 0 },
  data: {
    label: '节点显示名称',
    // ... 其他自定义数据
  }
}
```

**节点类型标识**
```javascript
const nodeTypes = {
  // 输入节点
  textNode: TextNode,
  referenceImageNode: ReferenceImageNode,
  characterLibraryNode: CharacterLibraryNode,
  apiSettingsNode: APISettingsNode,

  // 处理节点
  videoGenerateNode: VideoGenerateNode,
  characterCreateNode: CharacterCreateNode,
  storyboardNode: StoryboardNode,
  promptOptimizerNode: PromptOptimizerNode,

  // 输出节点
  taskResultNode: TaskResultNode,
  characterResultNode: CharacterResultNode
};
```

---

## 节点开发规范

### 1. 节点组件结构

```javascript
import { Handle, Position, useNodeId } from 'reactflow';
import React, { useState, useEffect } from 'react';

function MyCustomNode({ data }) {
  const nodeId = useNodeId();

  // 接收外部连接的数据
  const connectedData = data.connectedData || null;

  // 节点内部状态
  const [localState, setLocalState] = useState(data.value || '');

  // 更新节点数据
  const updateNodeData = (newData) => {
    // 通过 data.onUpdate 或直接修改节点
    if (data.onUpdate) {
      data.onUpdate(nodeId, newData);
    }
  };

  return (
    <div style={nodeStyle}>
      {/* 输入 Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="data-input"
        style={handleStyle}
      />

      {/* 节点内容 */}
      <div className="node-header">{data.label}</div>
      <div className="node-body">
        {/* 节点UI */}
      </div>

      {/* 输出 Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="data-output"
        style={handleStyle}
      />
    </div>
  );
}

export default MyCustomNode;
```

### 2. 节点样式规范

**基础样式**
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

**节点类型颜色**
```javascript
const nodeColors = {
  input: '#3b82f6',      // 蓝色
  process: '#8b5cf6',    // 紫色
  output: '#10b981',      // 绿色
  optimizer: '#f59e0b'    // 橙色
};
```

### 3. 数据传递规范

**从上游节点接收数据**
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

**传递数据到下游节点**
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

## 连接验证规范

### 1. 类型安全连接

**验证源节点类型**
```javascript
// 在 onConnect 回调中验证
const onConnect = useCallback((params) => {
  const { source, target, sourceHandle, targetHandle } = params;

  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);

  // 验证：只有特定类型的节点可以连接
  const validSourceTypes = ['textNode', 'characterLibraryNode'];
  const validTargetTypes = ['videoGenerateNode', 'promptOptimizerNode'];

  if (!validSourceTypes.includes(sourceNode.type)) {
    alert(`❌ ${sourceNode.type} 不能连接到 ${targetNode.type}`);
    return;
  }

  if (!validTargetTypes.includes(targetNode.type)) {
    alert(`❌ ${sourceNode.type} 不能连接到 ${targetNode.type}`);
    return;
  }

  setEdges((eds) => addEdge(params, eds));
}, [nodes, setEdges]);
```

### 2. Handle 类型匹配

**文本数据**
```javascript
// 文本节点 → 视频生成节点（prompt-input）
// 文本节点 → 提示词优化节点（prompt-input）
```

**角色数据**
```javascript
// 角色库节点 → 视频生成节点（character-input）
// 角色库节点 → 故事板节点（character-input）
```

**图片数据**
```javascript
// 参考图片节点 → 视频生成节点（images-input）
// 参考图片节点 → 故事板节点（images-input）
```

**任务数据**
```javascript
// 视频生成节点 → 任务结果节点（task-input）
// 故事板节点 → 任务结果节点（task-input）
// 角色创建节点 → 角色结果节点（character-input）
```

---

## 节点状态管理

### 1. 节点状态类型

```javascript
const nodeStates = {
  idle: '空闲',
  loading: '加载中',
  running: '运行中',
  success: '成功',
  error: '错误'
};
```

### 2. 状态显示

```javascript
// 在节点中显示状态
const statusIndicator = {
  idle: '⚪',
  loading: '🔄',
  running: '⚡',
  success: '✅',
  error: '❌'
};

return (
  <div style={nodeStyle}>
    <div className="status">
      {statusIndicator[status]} {statusText}
    </div>
    {/* ... 节点内容 */}
  </div>
);
```

---

## 工作流执行规范

### 1. 执行顺序

**拓扑排序**
```javascript
// 确保节点按正确顺序执行
const getExecutionOrder = (nodes, edges) => {
  const visited = new Set();
  const order = [];

  const dfs = (nodeId) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    // 先执行依赖的节点
    const dependencies = edges
      .filter((e) => e.target === nodeId)
      .map((e) => e.source);

    dependencies.forEach((depId) => dfs(depId));

    order.push(nodeId);
  };

  nodes.forEach((node) => dfs(node.id));
  return order;
};
```

### 2. 错误处理

**节点执行错误**
```javascript
const executeNode = async (node) => {
  try {
    setStatus('running');
    const result = await node.data.handler();
    setStatus('success');
    return { success: true, data: result };
  } catch (error) {
    setStatus('error');
    setError(error.message);
    return { success: false, error: error.message };
  }
};
```

**工作流停止**
```javascript
// 遇到错误时停止执行
const executeWorkflow = async (nodes, edges) => {
  const order = getExecutionOrder(nodes, edges);

  for (const nodeId of order) {
    const result = await executeNode(nodes.find((n) => n.id === nodeId));

    if (!result.success) {
      console.error(`❌ 节点 ${nodeId} 执行失败:`, result.error);
      // 停止执行
      break;
    }
  }
};
```

---

## 性能优化

### 1. 避免无限循环

**问题：数据更新触发 useEffect，导致无限循环**
```javascript
// ❌ 错误
useEffect(() => {
  setNodes((nds) =>
    nds.map((n) =>
      n.id === nodeId
        ? { ...n, data: { ...n.data, value: newValue } }
        : n
    )
  );
}, [nodes]); // 依赖 nodes，每次都更新
```

**解决：精确比较**
```javascript
// ✅ 正确
useEffect(() => {
  setNodes((nds) =>
    nds.map((n) => {
      if (n.id === nodeId) {
        const oldValue = n.data.value;
        if (oldValue !== newValue) {
          return { ...n, data: { ...n.data, value: newValue } };
        }
      }
      return n;
    })
  );
}, [newValue]); // 只依赖实际变化的值
```

### 2. 使用 useCallback 和 useMemo

```javascript
// 稳定的回调函数
const handleNodeSizeChange = useCallback((nodeId, width, height) => {
  setNodes((nds) =>
    nds.map((n) =>
      n.id === nodeId
        ? {
            ...n,
            data: { ...n.data, width, height },
            style: { ...n.style, width: `${width}px` }
          }
        : n
    )
  );
}, [setNodes]);

// 传递给子组件
<MyNode onSizeChange={handleNodeSizeChange} />
```

---

## 测试规范

### 1. 节点功能测试

**测试清单**
- [ ] 节点正确渲染
- [ ] Handle 正确显示和连接
- [ ] 数据正确接收
- [ ] 数据正确传递
- [ ] 错误正确处理
- [ ] 状态正确更新

### 2. 工作流集成测试

**测试场景**
- [ ] 单节点执行
- [ ] 两节点连接执行
- [ ] 复杂工作流执行
- [ ] 错误处理和停止
- [ ] 工作流保存和加载

---

## 常见错误模式

### 错误 1: Handle ID 不匹配

**问题**
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

**解决**
```javascript
// 使用一致的 Handle ID 命名
sourceHandle: 'output'   // ✅ 与节点定义匹配
targetHandle: 'input'    // ✅ 与节点定义匹配
```

### 错误 2: 数据未传递

**问题**
```javascript
// 节点 A 修改了数据
setNodes((nds) =>
  nds.map((n) =>
    n.id === 'node-a'
      ? { ...n, data: { ...n.data, value: 'new value' } }
      : n
  )
);

// 但节点 B 没有接收到新数据
console.log(nodeB.data.connectedValue); // undefined
```

**解决**
```javascript
// 在 App.jsx 的 useEffect 中检查连接
useEffect(() => {
  setNodes((nds) =>
    nds.map((node) => {
      // 找到连接到当前节点的边
      const incomingEdges = edges.filter((e) => e.target === node.id);

      // 更新节点数据
      const newData = { ...node.data };
      incomingEdges.forEach((edge) => {
        const sourceNode = nds.find((n) => n.id === edge.source);
        if (edge.targetHandle === 'input') {
          newData.connectedValue = sourceNode.data.value;
        }
      });

      return { ...node, data: newData };
    })
  );
}, [edges, setNodes]);
```

### 错误 3: 节点 ID 冲突

**问题**
```javascript
// 添加新节点时使用了已存在的 ID
const newNode = {
  id: '1',  // ❌ 可能已存在
  type: 'textNode',
  // ...
};
```

**解决**
```javascript
// 维护一个全局的 nextNodeId
const [nextNodeId, setNextNodeId] = useState(10);

const addNode = (type, label) => {
  const newNode = {
    id: String(nextNodeId),  // ✅ 使用递增 ID
    type,
    position: { x: 100, y: 100 },
    data: { label }
  };

  setNodes((nds) => [...nds, newNode]);
  setNextNodeId((id) => id + 1);
};
```

---

## 参考文档

- [React Flow 官方文档](https://reactflow.dev/)
- [React Flow 示例](https://reactflow.dev/examples)
- [React Hooks 指南](https://react.dev/reference/react)

---

**最后更新**: 2026-01-08
**维护者**: WinJin AIGC Team
**版本**: v1.0.0
