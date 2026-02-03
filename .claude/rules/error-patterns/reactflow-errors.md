# React Flow 相关错误模式

> **说明**: React Flow 节点、连线、数据传递相关的错误模式

---

## 错误16: React Flow 节点间数据传递错误 `React Flow` `前端` ⭐⭐⭐

**问题**:
1. App.jsx 的 useEffect 只监听 edges 变化，不监听 nodes（核心问题）
2. useEffect 依赖数组包含 nodes 导致无限循环
3. data 对象不包含节点 id

```javascript
// ❌ 错误：依赖 App.jsx 中转
useEffect(() => {
  setNodes((nds) =>
    nds.map((node) => {
      const sourceNode = nds.find(n => n.id === edge.source);
      return node.id === edge.target
        ? { ...node, data: { ...node.data, connectedData: sourceNode.data.xxx } }
        : node;
    })
  );
}, [edges]); // ⚠️ 只监听 edges，节点内部状态变化不传递

// ✅ 正确：源节点直接更新目标节点
useEffect(() => {
  if (nodeId) {
    const edges = getEdges();
    const outgoingEdges = edges.filter(e => e.source === nodeId);

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

**解决方案**:
1. 源节点直接更新目标节点（绕过 App.jsx）⭐ 核心方案
2. 移除 nodes 依赖，使用函数式更新
3. 使用 useNodeId() 获取节点 ID
4. 使用事件系统传递异步数据（taskId）

---

## 错误22: React Flow Handle 与标签布局冲突 `React Flow` `布局` ⭐⭐

**现象**: 连接点（Handle）和标签文字重叠，导致文字显示不完整或被遮挡
**根本原因**: React Flow 的 Handle 组件会自动定位到节点边缘（`position: absolute, left: 0` 或 `right: 0`），不参与父容器的 CSS 布局（flex/grid）

```javascript
// ❌ 错误：把 Handle 和标签放在同一个容器中
<div style={{ position: 'absolute', left: '10px', display: 'flex', gap: '4px' }}>
  <span>API</span>
  <Handle type="target" position={Position.Left} id="api-config" />
</div>

// ✅ 正确：Handle 和标签完全分离，各自独立定位
<Handle
  type="target"
  position={Position.Left}
  id="api-config"
  style={{ background: '#3b82f6', width: 10, height: 10, top: '10%' }}
/>
<div style={{ position: 'absolute', left: '18px', top: '10%', transform: 'translateY(-50%)', zIndex: 10 }}>
  <span style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 'bold', whiteSpace: 'nowrap' }}>API</span>
</div>
```

**关键点**:
- Handle 组件使用 `top` 样式控制垂直位置
- 标签使用 `position: absolute` + `left/right` + `top` 精确定位
- 节点容器增加 `paddingLeft` 和 `paddingRight`（如 85px）为标签预留空间
- 标签使用 `zIndex: 10` 确保在节点内容之上

**修复日期**: 2025-12-31

---

## 错误26: 节点连接验证缺失导致事件错误响应 `React Flow` `验证` ⭐⭐

**现象**: 未连接或连接到错误类型节点的结果节点仍然响应事件
**根本原因**:
1. App.jsx 在设置 `connectedSourceId` 时没有验证源节点类型
2. 事件监听器只检查 `connectedSourceId === sourceNodeId`，不检查节点类型
3. 事件广播机制：`window.dispatchEvent` 是全局广播，所有监听器都会收到事件

```javascript
// ❌ App.jsx - 错误：未验证源节点类型
const videoEdge = incomingEdges.find((e) => e.targetHandle === 'task-input');
if (videoEdge) {
  const sourceNode = nds.find((n) => n.id === videoEdge.source);
  if (sourceNode?.data?.taskId) {
    newData.taskId = sourceNode.data.taskId;
  }
  // ❌ 没有验证 sourceNode.type，任何节点都能设置 connectedSourceId
  newData.connectedSourceId = videoEdge.source;
}

// ✅ App.jsx - 正确：验证源节点类型
const videoEdge = incomingEdges.find((e) => e.targetHandle === 'task-input');
if (videoEdge) {
  const sourceNode = nds.find((n) => n.id === videoEdge.source);

  // ✅ 验证源节点类型
  const validVideoSourceTypes = [
    'videoGenerateNode',
    'storyboardNode',
    'juxinStoryboardNode',
    'zhenzhenStoryboardNode',
    'characterCreateNode'
  ];

  if (sourceNode && validVideoSourceTypes.includes(sourceNode.type)) {
    // 源节点类型有效，允许设置 connectedSourceId
    if (sourceNode?.data?.taskId) {
      newData.taskId = sourceNode.data.taskId;
    }
    newData.connectedSourceId = videoEdge.source;
  } else {
    // ❌ 源节点类型无效，清除 connectedSourceId
    newData.connectedSourceId = undefined;
  }
}
```

**输入端口节点类型映射**:
| 输入端口 | 有效源节点类型 | 用途 |
|---------|---------------|------|
| `prompt-input` | `textNode` | 文本提示词输入 |
| `character-input` | `characterLibraryNode` | 角色库连接 |
| `images-input` | `referenceImageNode` | 参考图片连接 |
| `api-config` | `apiSettingsNode` | API 配置连接 |
| `task-input` | `videoGenerateNode`, `storyboardNode`, `characterCreateNode` | 任务结果接收 |

**修复日期**: 2026-01-01

---

## 错误34: 工作流快照时机问题 `React Flow` `状态` ⭐

**现象**: 加载历史记录的工作流时，TaskResultNode 显示的视频不正确
**根本原因**:
1. VideoGenerateNode 调用 getNodes() 捕获快照时，TaskResultNode 的 useEffect 还没执行
2. useState 是异步的，useEffect 在渲染后执行，getNodes() 可能返回旧数据

**场景**: 连续生成视频时，第二次生成的快照包含第一次的视频结果

**解决方案**:
1. **短期修复**: 加载历史记录时，从历史记录的实际数据覆盖 TaskResultNode
2. **长期修复**: TaskResultNode 在轮询收到结果时，立即同步 node.data（不依赖 useEffect）

---

## 错误37: TaskResultNode 任务ID竞态条件 `React Flow` `状态管理` ⭐

**现象**: 提交新任务后，TaskResultNode 仍然显示旧的 taskId，新任务被旧任务覆盖
**根本原因**:
- useEffect 依赖 `[data.taskId]`，当事件监听器更新 node.data.taskId 时会重新运行
- 事件监听器设置 `isCompletedFromHistoryRef.current = false`
- useEffect 运行时看到 ref 为 false，跳过恢复逻辑，然后从旧的 data 中恢复 taskId

```javascript
// ✅ 正确：useEffect 使用空依赖数组，只在挂载时运行一次
useEffect(() => {
  const isCompletedTask = data.taskStatus === 'SUCCESS' && data.videoUrl;

  if (data._isCompletedFromHistory || isCompletedTask) {
    isCompletedFromHistoryRef.current = true;
    // 恢复所有状态，除了 taskId（由事件监听器管理）
    if (data.taskStatus) setTaskStatus(data.taskStatus);
    if (data.videoUrl) setVideoUrl(data.videoUrl);
    setPolling(false);
    return;
  }

  // ⭐ 关键：只在 taskIdRef 为 null 时才设置初始 taskId
  if (data.taskId && data.taskId !== taskIdRef.current && taskIdRef.current === null) {
    setTaskId(data.taskId);
    taskIdRef.current = data.taskId;
    setPlatform(data.platform || 'juxin');
    setTaskStatus(data.taskStatus || 'NOT_START');
    setPolling(data.taskStatus === 'IN_PROGRESS');
  }
}, []); // ⭐ 空依赖数组，防止重新运行

// ✅ 正确：事件监听器在更新 node.data 之前设置 ref
const handleVideoTaskCreated = (event) => {
  const { sourceNodeId, taskId: newTaskId, platform: newPlatform } = event.detail;

  if (connectedSourceId === sourceNodeId && newTaskId && newTaskId !== taskIdRef.current) {
    // ⭐ 关键：先设置 ref 为 true，防止 useEffect 恢复旧数据
    isCompletedFromHistoryRef.current = true;

    // 更新 node.data
    setNodes((nds) => nds.map((node) =>
      node.id === nodeId ? {
        ...node,
        data: { ...node.data, taskId: newTaskId, platform: newPlatform || 'juxin', taskStatus: 'IN_PROGRESS', _isCompletedFromHistory: false }
      } : node
    ));

    // 更新状态
    setTaskId(newTaskId);
    taskIdRef.current = newTaskId;
    setPlatform(newPlatform || 'juxin');
    setTaskStatus('IN_PROGRESS');

    // ⭐ 重置 ref，允许后续更新
    isCompletedFromHistoryRef.current = false;
  }
};
```

**关键点**:
1. **空依赖数组**: useEffect 使用 `[]` 而非 `[data.taskId]`
2. **taskIdRef 初始检查**: 只在 `taskIdRef.current === null` 时设置初始 taskId
3. **事件监听器先设置 ref**: 更新 node.data 之前设置 ref
4. **taskId 管理权移交**: taskId 完全由事件监听器管理

**修复日期**: 2026-01-01

---

## 错误45: TaskResultNode 不识别新节点类型 `React Flow` `验证` ⭐

**现象**: 贞贞故事板节点成功提交任务并显示"✓ 已提交"，但 TaskResultNode 仍显示"连接视频生成节点以查看结果"
**根本原因**:
- TaskResultNode 的 `validSourceTypes` 列表只包含 `'storyboardNode'`
- 新建的节点类型是 `'juxinStoryboardNode'` 和 `'zhenzhenStoryboardNode'`
- 事件虽然被接收，但类型验证失败，taskId 没有被设置

```javascript
// ❌ 错误：validSourceTypes 缺少新节点类型
const validSourceTypes = ['videoGenerateNode', 'storyboardNode', 'characterCreateNode'];

// ✅ 正确：添加新节点类型到 validSourceTypes
const validSourceTypes = [
  'videoGenerateNode',
  'storyboardNode',
  'juxinStoryboardNode',      // ✅ 新增
  'zhenzhenStoryboardNode',   // ✅ 新增
  'characterCreateNode'
];
```

**关键点**:
1. **节点类型注册**: 每次新建自定义节点类型时，必须更新 TaskResultNode 的 validSourceTypes
2. **类型验证**: TaskResultNode 通过类型验证过滤无效的事件源
3. **控制台日志**: `[TaskResultNode] Match! Setting taskId: xxx platform: zhenzhen` 表示成功

**修复日期**: 2026-01-02

---

## 错误51: 任务结果节点轮询 interval 竞态条件 `React Flow` `竞态条件` ⭐⭐⭐ 2026-01-07 新增

**现象**:
- 生成新视频后，TaskResultNode 显示旧任务的视频结果
- 用户描述："在任务执行过程中，任务结果节点都有显示任务进度，在85%进度时停止了，然后我手动查询，得到了错误的ID和结果"
- API 后台显示新任务ID，TaskResultNode 显示旧任务ID

**根本原因**:
当 VideoGenerateNode 派发新任务事件时，TaskResultNode 的事件监听器更新 `setTaskId(newTaskId)`，但旧的轮询 interval 没有被清理，继续使用旧的 taskId 查询 API，导致新任务状态被旧任务结果覆盖

**问题流程**:
```
1. VideoGenerateNode 派发事件 { taskId: 'video_new' }
2. TaskResultNode 接收事件，开始轮询新任务，显示进度到 85%
3. ❌ 旧的轮询 interval 仍在运行（使用 video_old）
4. ❌ 旧 interval 查询 API 返回完成结果
5. ❌ 调用 setTaskStatus('SUCCESS'), setVideoUrl(...) 等
6. ❌ 覆盖了新任务状态
```

**错误示例**:
```javascript
// ❌ 错误：先更新 taskId，后清理轮询
useEffect(() => {
  const handleVideoCreated = (event) => {
    const { taskId: newTaskId } = event.detail;

    // ❌ 先更新 taskId（触发新的轮询 useEffect）
    setTaskId(newTaskId);

    // ❌ 后清理轮询（旧的 interval 可能已经执行）
    setPolling(false);
    setTaskStatus('idle');
    setVideoUrl(null);

    // 更新 node.data...
  };
}, []);
```

**正确示例**:
```javascript
// ✅ 正确：先清理轮询状态，防止旧 interval 覆盖
useEffect(() => {
  const handleVideoCreated = (event) => {
    const { taskId: newTaskId, platform: newPlatform } = event.detail;

    // ⭐ 关键修复：先清理轮询状态
    setPolling(false);
    setTaskStatus('idle');
    setVideoUrl(null);
    setError(null);
    setProgress(0);

    // ⭐ 设置 ref，阻止历史记录恢复
    isCompletedFromHistoryRef.current = true;

    // ⭐ 立即同步到 node.data
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                taskId: newTaskId,
                platform: newPlatform || 'juxin',
                taskStatus: 'IN_PROGRESS', // ⭐ 新任务应该是 IN_PROGRESS
                videoUrl: null,
                error: null,
                progress: 0,
                _isCompletedFromHistory: false
              }
            }
          : node
      )
    );

    // ⭐ 最后更新 taskId（触发新的轮询 useEffect）
    setTaskId(newTaskId);
    taskIdRef.current = newTaskId;
    setPlatform(newPlatform || 'juxin');
    setTaskStatus('IN_PROGRESS');
    setPolling(true); // ⭐ 重新启动轮询
    isCompletedFromHistoryRef.current = false;
  };
}, []);
```

**关键点**:
1. **清理顺序**: 先 `setPolling(false)` 停止旧 interval，再 `setTaskId(newTaskId)` 触发新的
2. **状态重置**: 同时重置 `setTaskStatus('idle')`, `setVideoUrl(null)`, `setError(null)`, `setProgress(0)`
3. **taskStatus 正确性**: 新任务应该设置为 `'IN_PROGRESS'` 而非 `'idle'`
4. **ref 管理**: 使用 `isCompletedFromHistoryRef` 阻止历史记录恢复

**修复位置**: `src/client/src/nodes/output/TaskResultNode.jsx` (Lines 185-224)

**相关错误**:
- 错误37: TaskResultNode 任务ID竞态条件（useEffect 依赖问题）- 不同的竞态条件场景
- 错误35: 轮询请求缺少 platform 参数导致查询失败

**修复日期**: 2026-01-07

---

## 错误52: NarratorProcessorNode 推送数据后 VideoGenerateNode 未显示旁白模式 `React Flow` `数据传递` ⭐⭐⭐ 2026-01-07 新增

**现象**:
- NarratorProcessorNode 完成优化后，VideoGenerateNode 未显示"📺 旁白模式: 句子 1/X"
- 提示词输入框未自动填充优化后的提示词
- 点击"⏭️ 加载下一个句子"按钮无反应
- 用户需要手动复制粘贴优化后的提示词

**根本原因**:
NarratorProcessorNode 的 `updateVideoGenerateNode` 函数传递了旧的 `sentences` 状态数组，但 `setSentences` 是异步的，导致传递给 VideoGenerateNode 的 `narratorSentences` 是空数组或旧数据。

**错误示例**:
```javascript
// ❌ 错误：传递旧的 sentences 状态
const optimizeAllSentences = async () => {
  const results = [];

  for (let i = 0; i < sentences.length; i++) {
    const optimized = await optimizeSentence(sentences[i]);
    results.push(optimized);

    // setSentences 是异步的
    setSentences((prev) =>
      prev.map((s, idx) =>
        idx === i ? optimized : s
      )
    );
  }

  // ❌ 此时 sentences 还是旧数组（setSentences 尚未完成）
  updateVideoGenerateNode(results[0].optimized);
};

const updateVideoGenerateNode = (prompt) => {
  // ❌ 传递的是旧的 sentences
  narratorSentences: sentences  // 空数组或旧数据
};
```

**正确示例**:
```javascript
// ✅ 正确：传递优化后的 results 数组
const optimizeAllSentences = async () => {
  const results = [];

  for (let i = 0; i < sentences.length; i++) {
    const optimized = await optimizeSentence(sentences[i]);
    results.push(optimized);

    setSentences((prev) =>
      prev.map((s, idx) =>
        idx === i ? optimized : s
      )
    );
  }

  // ✅ 传递 results（优化后的句子数组）
  updateVideoGenerateNode(results[0].optimized, results);
};

const updateVideoGenerateNode = (prompt, optimizedSentences, index = 0) => {
  setNodes((nds) =>
    nds.map((node) =>
      node.id === targetNode.id
        ? {
            ...node,
            data: {
              ...node.data,
              manualPrompt: prompt,
              narratorMode: true,
              narratorIndex: index,
              narratorTotal: optimizedSentences.length,
              narratorSentences: optimizedSentences  // ✅ 优化后的数组
            }
          }
        : node
    )
  );
};
```

**关键点**:
1. **状态异步**: `setSentences` 是异步的，不能在下一个语句立即使用 `sentences`
2. **传递结果**: 应该传递 `results`（优化后的数组）而不是 `sentences`（旧状态）
3. **索引同步**: 同时传递当前索引 `index`，确保 VideoGenerateNode 显示正确的句子位置
4. **所有调用点**: `goToPrevious`, `goToNext`, `reoptimizeCurrent` 都需要传递正确的数组

**修复位置**: `src/client/src/nodes/process/NarratorProcessorNode.jsx` (Lines 285-375)

**相关错误**:
- 错误16: React Flow 节点间数据传递错误 - 通用的数据传递问题

**修复日期**: 2026-01-08

---

## 错误56: API 配置节点平台选择刷新后丢失 `React Flow` `状态` `持久化` ⭐⭐⭐ 2026-01-13 新增

**现象**:
- 用户在 APISettingsNode 选择"贞贞"平台
- 刷新页面后，APISettingsNode 正确显示"贞贞"
- 但 batchVideoGenerateNode 显示"聚鑫 | SORA-2-ALL"（错误平台）
- API 请求发送到错误平台

**根本原因**:
1. **localStorage 保存旧配置**: 工作流保存的 `apiConfig` 是旧的 `juxin` 配置
2. **初始化顺序问题**: APISettingsNode 从旧数据初始化状态（juxin）
3. **useState 异步特性**: `setConfig(zhenzhen)` 是异步的，useEffect 闭包中的 `config` 仍是旧值
4. **同步先于恢复运行**: 同步 useEffect 在恢复完成前就运行，推送旧配置到下游节点

**错误流程**:
```
页面加载
↓
APISettingsNode 初始化: useState(() => {
  return data.apiConfig || { platform: 'juxin' }  // ❌ 旧数据
})
↓
早期恢复 useEffect 运行: setConfig(zhenzhen)
↓
同步 useEffect 运行（但 config 仍是旧值 juxin）
↓
推送旧配置到 batchVideoGenerateNode ❌
↓
setConfig() 完成，但已经太晚
```

**可能的解决方案**:
1. **方案 A**: 使用函数式更新 + refs
   - 将配置存储在 ref 中
   - 恢复时直接更新 ref
   - 同步时从 ref 读取最新值

2. **方案 B**: 延迟同步 useEffect
   - 使用 setTimeout 延迟同步
   - 确保恢复完成后再同步

3. **方案 C**: 修改初始化逻辑
   - 初始化时先检查下游节点
   - 如果下游有新配置，直接使用
   - 否则才使用 data.apiConfig

**相关文件**:
- `src/client/src/nodes/input/APISettingsNode.jsx` - API 设置节点
- `src/client/src/nodes/process/BatchVideoGenerateNode.jsx` - 批量视频生成节点 (节点类型: batchVideoGenerateNode)

**相关错误**:
- 错误16 - React Flow 节点间数据传递错误
- 错误54 - VideoGenerateNode 从 getNodes() 读取快照数据导致状态不同步
- 错误33 - 工作流快照持久化时机问题

**修复日期**: 2026-01-13 (问题记录，待修复)

---

## 错误54: VideoGenerateNode loadCurrentSentence 从 getNodes() 读取快照数据导致状态不同步 `React Flow` `状态管理` ⭐⭐⭐ 2026-01-08 新增

**现象**:
- NarratorProcessorNode 点击"上一句"从句子8回到句子7，保存 currentIndex: 6
- VideoGenerateNode 反向同步生效（narratorIndex 更新为 6）
- 但点击"📥 加载当前旁白"后加载的是句子8（错误）
- 控制台显示 `loadCurrentSentence` 读取到的 `currentIndex: 8`

**根本原因**:
`loadCurrentSentence` 函数使用 `getNodes()` 从 NarratorProcessorNode 读取 `currentIndex`，但 React Flow 的 `getNodes()` 返回的是**快照数据**，可能包含延迟或过时的值。

**数据流分析**:
```
NarratorProcessorNode.goToPrevious()
  ↓ setNodes() 更新 currentIndex: 6
  ↓ saveWorkflow() 保存到 localStorage ✅
  ↓ updateVideoGenerateNode() 更新 VideoGenerateNode.node.data.narratorIndex: 6 ✅
  ↓ VideoGenerateNode 反向同步 useEffect 触发 ✅
  ↓   narratorIndex 内部状态更新为 6 ✅
  ↓ 用户点击 "📥 加载当前旁白"
  ↓ loadCurrentSentence() 调用 getNodes() ❌
  ↓   返回快照数据（ currentIndex: 8 旧值） ❌
  ↓   加载句子8而不是句子7 ❌
```

**正确示例**:
```javascript
// ✅ 正确：loadCurrentSentence 优先使用内部状态
const loadCurrentSentence = () => {
  // ⭐ 关键修复：优先使用内部状态，避免 getNodes() 快照延迟问题
  // 内部状态通过反向同步 useEffect 保持与 NarratorProcessorNode 同步
  if (narratorMode && narratorSentences.length > 0) {
    const currentSentence = narratorSentences[narratorIndex];

    if (currentSentence?.optimized) {
      setManualPrompt(currentSentence.optimized);
      return;  // ✅ 使用内部状态，直接返回
    }
  }

  // ⚠️ 降级：如果内部状态不可用，从 NarratorProcessorNode 读取
  const edges = getEdges();
  const narratorEdge = edges.find(
    (e) => e.target === nodeId && e.sourceHandle === 'sentence-output'
  );

  if (narratorEdge) {
    const narratorNode = getNodes().find(n => n.id === narratorEdge.source);

    if (narratorNode?.type === 'narratorProcessorNode') {
      const currentIndex = narratorNode.data?.currentIndex || 0;
      const sentences = narratorNode.data?.sentences || [];
      const currentSentence = sentences[currentIndex];

      if (currentSentence?.optimized) {
        setNarratorMode(true);
        setNarratorIndex(currentIndex);
        setNarratorTotal(sentences.length);
        setNarratorSentences(sentences);
        setManualPrompt(currentSentence.optimized);
      }
    }
  }
};
```

**关键点**:
1. **优先使用内部状态**: `narratorMode`、`narratorIndex`、`narratorSentences` 是反向同步 useEffect 维护的最新状态
2. **避免 getNodes() 快照延迟**: React Flow 的 `getNodes()` 返回快照数据，可能在 setNodes() 之后仍包含旧值
3. **双向同步机制**: 内部状态 ←反向同步→ node.data ←正向同步→ 内部状态
4. **降级策略**: 如果内部状态不可用，才从源节点读取（作为降级方案）
5. **数据一致性**: 使用内部状态确保读取到的 currentIndex 和 sentences 始终一致

**修复文件**:
- `src/client/src/nodes/process/VideoGenerateNode.jsx` (Lines 169-183: 反向同步 useEffect)
- `src/client/src/nodes/process/VideoGenerateNode.jsx` (Lines 371-429: loadCurrentSentence 优化)

**验证结果**:
- ✅ NarratorProcessorNode 点击"上一句"到句子6，VideoGenerateNode 自动同步到句子6
- ✅ 点击"📥 加载当前旁白"正确加载句子6（而非句子7或8）
- ✅ 输入框显示正确的优化提示词："动画风格的视频。在阳光明媚、充满活力的城市建设工地上，@783316a1d.diggyloade 正以夸张且富有弹性的流畅动作..."
- ✅ 控制台日志显示 `[VideoGenerateNode] 📊 使用内部状态`（证明使用了内部状态而非 getNodes()）
- ✅ **2026-01-08 验证通过**: 完整的导航和加载测试通过

**相关错误**:
- 错误16 - React Flow 节点间数据传递错误
- 错误37 - TaskResultNode 任务ID竞态条件
- 错误52 - NarratorProcessorNode 推送数据后 VideoGenerateNode 未显示旁白模式
- 错误53 - NarratorProcessorNode 优化结果刷新后丢失

**修复日期**: 2026-01-08

---

## 错误57: 文本模型平台选择无法切换 `React Flow` `状态管理` ⭐⭐⭐ 2026-01-23 新增

**现象**:
- 添加新的文本平台（如"聚鑫2"）后，平台下拉框中可以显示该选项
- 但选择后值无法切换，始终显示旧的平台值（如"DeepSeek"）
- 模型下拉框也显示不对应的模型列表

**根本原因**:
1. **TextModelConfigPanel 获取错误的配置对象**: 组件使用 `config: textConfig` 而非 `textConfig`，导致获取的是视频模型配置而非文本模型配置
2. **config.json 中模型不匹配**: `userDefaults.textGeneration.model` 使用了错误平台的模型（如 `gemini-2.5-flash` 是 Gemini 平台的模型，但 textGeneration.platform 是 `juxin2`）
3. **API 加载失败时的降级处理不当**: `loadConfig()` 加载失败时没有正确使用 localStorage 备份

```javascript
// ❌ 错误：TextModelConfigPanel 获取视频配置
const TextModelConfigPanel = ({ onClose }) => {
  const {
    textModels,
    config: textConfig,  // ❌ 获取到的是 video config，不是 text config
    updateTextConfig
  } = useAPIConfig();
  // ...
};

// ✅ 正确：直接获取 textConfig
const TextModelConfigPanel = ({ onClose }) => {
  const {
    textModels,
    textConfig,  // ✅ 获取 text config
    updateTextConfig
  } = useAPIConfig();
  // ...
};
```

**关键点**:
1. **Context 解构正确性**: 确保从 `useAPIConfig()` 解构出正确的状态变量名
2. **模型-平台匹配**: `userDefaults.textGeneration.model` 必须是 `userDefaults.textGeneration.platform` 平台下的有效模型
3. **localStorage 降级处理**: API 加载失败时，正确使用 localStorage 备份初始化 textConfig
4. **useState 初始化**: 使用回调函数从 localStorage 初始化，确保刷新后状态保持

**修复文件**:
- `src/client/src/components/TextModelConfigPanel.jsx` - 修复 config 解构
- `src/data/config.json` - 修复模型名称匹配
- `src/client/src/contexts/APIConfigContext.jsx` - 添加 localStorage 初始化和降级处理

**修复日期**: 2026-01-23
