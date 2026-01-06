# WinJin AIGC - 错误模式参考

> **说明**: 本文档按类型分类，包含所有已知的错误模式和解决方案。
> **更新日期**: 2026-01-06 (验证错误48修复)

---

## 快速索引（按类型）

| 类型 | 错误数量 | 关键词 |
|------|----------|--------|
| [API 相关](#api-相关) | 8个 | 双平台、轮询、端点、模型、故事板 |
| [React Flow 相关](#react-flow-相关) | 6个 | 数据传递、Handle、连接、事件 |
| [角色系统相关](#角色系统相关) | 6个 | 引用、显示、焦点、双显示、优化 |
| [表单/输入相关](#表单输入相关) | 2个 | id/name、验证 |
| [存储/持久化相关](#存储持久化相关) | 4个 | localStorage、工作流 |
| [UI/渲染相关](#ui渲染相关) | 3个 | 布局抖动、对象渲染、CSS语法 |
| [其他](#其他) | 20个 | ... |

---

## API 相关

### 错误1: 双平台任务ID不兼容 `API` `兼容性` ⭐⭐⭐

```javascript
// 贞贞返回 task_id，聚鑫返回 id
const taskId = result.data.id || result.data.task_id;
```

**问题**: 不同平台返回不同的任务ID字段名
**解决方案**: 兼容双平台的任务ID格式

---

### 错误6: 轮询间隔太短（429错误） `API` `轮询` ⭐⭐⭐

```javascript
// ❌ 错误：5秒间隔导致 429 Rate Limit
setInterval(() => checkStatus(taskId), 5000);

// ✅ 正确：30秒间隔
const POLL_INTERVAL = 30000;
```

**问题**: 轮询间隔太短导致 API 返回 429 Rate Limit 错误
**解决方案**: 使用 30 秒间隔

---

### 错误17: API 端点路径缺少前缀 `API` `前端` ⭐⭐⭐

```javascript
// ❌ 错误：API 路径缺少 /api/ 前缀
const response = await fetch(`${API_BASE}/task/${taskId}`);
// 返回 404 Not Found

// ✅ 正确：使用完整的 API 路径
const response = await fetch(`${API_BASE}/api/task/${taskId}`);
// 返回 200 OK
```

**问题**: 前端调用 API 时路径不完整，缺少 `/api/` 前缀
**解决方案**: 所有 API 调用必须包含完整路径 `/api/{endpoint}`
**影响范围**: TaskResultNode.jsx 中的轮询和手动刷新函数
**修复日期**: 2025-12-30

---

### 错误35: 轮询请求缺少 platform 参数导致查询失败 `API` `轮询` ⭐

**现象**: 任务在后台显示成功，但前端 TaskResultNode 一直显示"查询中..."
**根本原因**:
1. **事件系统缺少 platform 参数**: VideoGenerateNode 派发事件时只传递 `sourceNodeId` 和 `taskId`，没有传递 `platform`
2. **轮询请求硬编码平台**: TaskResultNode 轮询时硬编码 `platform=juxin`，导致贞贞平台任务查询错误的端点
3. **缺少缓存破坏参数**: 请求没有添加时间戳参数，浏览器返回 304 Not Modified

```javascript
// ❌ VideoGenerateNode - 派发事件时缺少 platform
window.dispatchEvent(new CustomEvent('video-task-created', {
  detail: { sourceNodeId: nodeId, taskId: id }  // ❌ 缺少 platform
}));

// ❌ TaskResultNode - 硬编码平台参数
const response = await fetch(`${API_BASE}/api/task/${taskId}?platform=juxin`);

// ✅ VideoGenerateNode - 传递 platform 参数
window.dispatchEvent(new CustomEvent('video-task-created', {
  detail: { sourceNodeId: nodeId, taskId: id, platform: apiConfig.platform }
}));

// ✅ TaskResultNode - 从状态中获取 platform 并添加缓存破坏
const cacheBuster = Date.now();
const response = await fetch(`${API_BASE}/api/task/${taskId}?platform=${platform}&_t=${cacheBuster}`);
```

**关键点**:
- **事件传递**: VideoGenerateNode 必须传递 platform 参数（juxin 或 zhenzhen）
- **状态管理**: TaskResultNode 使用 useState 存储 platform，从事件中接收
- **缓存破坏**: 添加 `&_t=${Date.now()}` 参数避免浏览器 304 缓存
- **依赖数组**: useEffect 依赖数组包含 platform，确保平台切换时重新开始轮询

**修复日期**: 2026-01-01

---

### 错误38: platform 字段缺失导致 API 查询失败 `API` `兼容性` ⭐

**现象**: 旧任务查询 API 返回 400 错误，无法获取视频信息
**根本原因**:
- localStorage 保存的旧任务没有 `platform` 字段
- TaskResultNode 初始化使用默认值 `'juxin'`
- 贞贞平台的任务用聚鑫端点查询导致 400 错误

```javascript
// ✅ 正确：自动从连接的 VideoGenerateNode 检测 platform
useEffect(() => {
  const sourceId = data.connectedSourceId || connectedSourceIdRef.current;
  if (sourceId && (!platform || platform === 'juxin')) {
    const allNodes = getNodes();
    const sourceNode = allNodes.find(n => n.id === sourceId);

    if (sourceNode && sourceNode.type === 'videoGenerateNode' && sourceNode.data?.apiConfig?.platform) {
      const sourcePlatform = sourceNode.data.apiConfig.platform;

      // 更新内部状态和 node.data
      setPlatform(sourcePlatform);
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, platform: sourcePlatform } }
            : node
        )
      );
    }
  }
}, [data.connectedSourceId]);
```

**关键点**:
1. **自动检测 platform**: 从连接的 VideoGenerateNode 读取 apiConfig.platform
2. **条件触发**: 只在 platform 为 undefined 或 'juxin' 时执行
3. **同步更新**: 同时更新内部状态和 node.data
4. **向后兼容**: 自动修复旧数据，无需手动干预

**修复日期**: 2026-01-01

---

### 错误39: 聚鑫平台模型名称错误 `API` `模型` ⭐⭐

**现象**: API 调用返回 400/422 错误，错误信息 "model not supported" 或 "Invalid model"
**根本原因**:
- 聚鑫平台使用 `sora-2-all` 模型名称（而非 `sora-2`）
- 贞贞平台使用 `sora-2` 和 `sora-2-pro` 模型名称
- 代码未根据平台选择正确的默认模型

```javascript
// ❌ 错误：聚鑫平台使用 sora-2
const response = await fetch(`${API_BASE}/api/video/create`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    platform: 'juxin',
    model: 'sora-2',  // ❌ 聚鑫不支持此模型
    prompt: '一只可爱的小猫',
  }),
});

// ✅ 正确：聚鑫平台使用 sora-2-all
const response = await fetch(`${API_BASE}/api/video/create`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    platform: 'juxin',
    model: 'sora-2-all',  // ✅ 聚鑫正确的模型名称
    prompt: '一只可爱的小猫',
  }),
});

// ✅ 正确：后端自动选择（推荐）
// src/server/sora2-client.js
class Sora2Client {
  async createVideo(options) {
    const { model } = options;

    // 根据平台设置默认模型 ⭐ 关键逻辑
    const finalModel = model || (this.platformType === 'JUXIN' ? 'sora-2-all' : 'sora-2');

    // 验证模型名称
    const validModels = ['sora-2-all', 'sora-2', 'sora-2-pro'];
    if (!validModels.includes(finalModel)) {
      throw new Error(`Invalid model: ${finalModel}`);
    }

    return await this.client.post('/v1/video/create', { model: finalModel, ... });
  }
}
```

**关键点**:
1. **聚鑫平台模型**: 必须使用 `sora-2-all`（唯一支持的模型）
2. **贞贞平台模型**: 使用 `sora-2` 或 `sora-2-pro`
3. **后端自动选择**: `model || (this.platformType === 'JUXIN' ? 'sora-2-all' : 'sora-2')`
4. **前端默认值**: APISettingsNode 默认模型应为 `sora-2-all`（聚鑫平台）

**修复日期**: 2026-01-02

---

### 错误41: 贞贞故事板端点配置错误 `API` `故事板` ⭐

**现象**: 贞贞故事板节点 API 调用返回 "Invalid URL (POST /v1/video/storyboard)" 错误
**根本原因**:
- 贞贞平台**没有专用故事板端点**，使用常规视频生成端点 `/v2/videos/generations`
- 故事板功能通过特殊的提示词格式实现（非独立 API 端点）
- 聚鑫平台有专用故事板端点 `/v1/videos`（使用 multipart/form-data）

```javascript
// ❌ 错误：贞贞平台配置了不存在的故事板端点
ZHENZHEN: {
  name: '贞贞',
  baseURL: 'https://ai.t8star.cn',
  videoEndpoint: '/v2/videos/generations',
  storyboardEndpoint: '/v1/video/storyboard',  // ❌ 此端点不存在
}

// ✅ 正确：贞贞平台使用常规视频端点
ZHENZHEN: {
  name: '贞贞',
  baseURL: 'https://ai.t8star.cn',
  videoEndpoint: '/v2/videos/generations',
  storyboardEndpoint: '/v2/videos/generations',  // ✅ 与视频端点相同
  useAspectRatio: true,
}

// 前端通过特殊提示词格式启用故事板
const prompt = `Shot 1:
duration: 5sec
Scene: 老鹰展翅高飞

Shot 2:
duration: 5sec
Scene: 老鹰在空中盘旋`;
```

**关键差异对比**:
| 特性 | 聚鑫平台 | 贞贞平台 |
|------|---------|---------|
| 故事板端点 | `/v1/videos` (专用) | `/v2/videos/generations` (常规) |
| Content-Type | `multipart/form-data` | `application/json` |
| 提示词格式 | 拼接为字符串数组 | 直接传递多行文本 |

**修复日期**: 2026-01-02

---

### 错误46: 后台轮询服务优化（添加24小时时间限制） `API` `轮询` ⭐

**现象**: 服务器启动后一直轮询旧任务（超过24小时），浪费 API 配额和服务器资源
**根本原因**:
- 后台轮询服务启动时检查所有 `queued` 和 `processing` 状态的任务
- 没有时间限制，旧任务无限轮询

```javascript
// ✅ 正确：添加 MAX_POLLING_AGE 常量和时间检查
const MAX_POLLING_AGE = 24 * 60 * 60 * 1000; // 24小时

async function checkAndUpdateTask(taskId, platform, createdAt) {
  // ⭐ 时间检查：超过24小时的任务标记为 stale
  if (createdAt) {
    const age = Date.now() - new Date(createdAt).getTime();
    if (age > MAX_POLLING_AGE) {
      historyStorage.updateRecord(taskId, { status: 'stale' });
      console.log(`[轮询] 任务超时（${Math.floor(age / (60 * 60 * 1000))}小时前），标记为 stale: ${taskId}`);
      return;
    }
  }
  // 继续正常轮询逻辑...
}

function startPollingService() {
  // ⭐ 启动时清理旧任务（超过24小时的标记为 stale）
  const staleThreshold = Date.now() - MAX_POLLING_AGE;
  const allRecords = historyStorage.getAllRecords();

  let staleCount = 0;
  allRecords.forEach(record => {
    if ((record.status === 'queued' || record.status === 'processing') &&
        record.createdAt &&
        new Date(record.createdAt).getTime() < staleThreshold) {
      historyStorage.updateRecord(record.taskId, { status: 'stale' });
      staleCount++;
    }
  });

  if (staleCount > 0) {
    console.log(`[轮询] 已标记 ${staleCount} 个旧任务为 stale（超过24小时）`);
  }

  setInterval(async () => {
    const allPendingTasks = [...queuedTasks, ...processingTasks];

    for (const record of allPendingTasks) {
      // ⭐ 传入 createdAt 参数进行时间检查
      await checkAndUpdateTask(record.taskId, record.platform, record.createdAt);
    }
  }, POLL_INTERVAL);
}
```

**关键点**:
1. **时间限制**: 只轮询最近 24 小时内的任务
2. **Stale 状态**: 超过时间的任务标记为 `stale`，不再轮询
3. **启动清理**: 服务器启动时自动清理旧任务
4. **前端/后台职责分离**: 前端轮询更新节点 UI，后台轮询更新历史记录持久化存储

**修复日期**: 2026-01-04

---

## React Flow 相关

### 错误16: React Flow 节点间数据传递错误 `React Flow` `前端` ⭐⭐⭐

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

### 错误22: React Flow Handle 与标签布局冲突 `React Flow` `布局` ⭐⭐

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

### 错误26: 节点连接验证缺失导致事件错误响应 `React Flow` `验证` ⭐⭐

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

### 错误34: 工作流快照时机问题 `React Flow` `状态` ⭐

**现象**: 加载历史记录的工作流时，TaskResultNode 显示的视频不正确
**根本原因**:
1. VideoGenerateNode 调用 getNodes() 捕获快照时，TaskResultNode 的 useEffect 还没执行
2. useState 是异步的，useEffect 在渲染后执行，getNodes() 可能返回旧数据

**场景**: 连续生成视频时，第二次生成的快照包含第一次的视频结果

**解决方案**:
1. **短期修复**: 加载历史记录时，从历史记录的实际数据覆盖 TaskResultNode
2. **长期修复**: TaskResultNode 在轮询收到结果时，立即同步 node.data（不依赖 useEffect）

---

### 错误37: TaskResultNode 任务ID竞态条件 `React Flow` `状态管理` ⭐

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

### 错误45: TaskResultNode 不识别新节点类型 `React Flow` `验证` ⭐

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

## 角色系统相关

### 错误7: 角色插入替换全部内容 `Character` `输入` ⭐⭐

```javascript
// ❌ 错误：替换整个提示词内容
function handleCharacterChange() {
  const promptElement = document.getElementById('video-prompt');
  const selectedUsername = selectElement.value;

  // 移除所有角色引用并在开头添加
  const roleRefRegex = /@[a-z0-9_.]+/gi;
  const cleanPrompt = promptElement.value.replace(roleRefRegex, '').trim();
  promptElement.value = `@${selectedUsername} ${cleanPrompt}`;
}

// ✅ 正确：在光标位置插入
function updatePromptWithCharacter(username) {
  const promptElement = document.getElementById('video-prompt');
  const start = promptElement.selectionStart;
  const end = promptElement.selectionEnd;
  const text = promptElement.value;
  const refText = `@${username} `;

  // 在光标位置插入，不影响其他内容
  promptElement.value = text.substring(0, start) + refText + text.substring(end);
  promptElement.setSelectionRange(start + refText.length, start + refText.length);
  promptElement.focus();
}
```

**问题**: 点击角色时替换整个提示词
**解决方案**: 在光标位置插入，不影响其他内容

---

### 错误8: 故事板未管理焦点状态 `Character` `焦点` ⭐

```javascript
// ❌ 错误：点击角色卡片后丢失焦点
function updateStoryboardScene(username) {
  const activeElement = document.activeElement;
  // activeElement 是角色卡片，不是场景输入框
  if (activeElement && activeElement.classList.contains('shot-scene')) {
    activeElement.value = `@${username} ` + activeElement.value;
  }
}

// ✅ 正确：记录最后焦点的场景输入框
let lastFocusedSceneInput = null;

function setupSceneInputListeners() {
  document.querySelectorAll('.shot-scene').forEach(input => {
    input.addEventListener('focus', (e) => {
      lastFocusedSceneInput = e.target;
    });
  });
}

function updateStoryboardScene(username) {
  let targetInput = lastFocusedSceneInput;
  if (!targetInput || !document.body.contains(targetInput)) {
    const activeElement = document.activeElement;
    if (activeElement && activeElement.classList.contains('shot-scene')) {
      targetInput = activeElement;
    }
  }

  if (targetInput && username) {
    const start = targetInput.selectionStart;
    const end = targetInput.selectionEnd;
    const text = targetInput.value;
    const refText = `@${username} `;

    targetInput.value = text.substring(0, start) + refText + text.substring(end);
    targetInput.setSelectionRange(start + refText.length, start + refText.length);
    targetInput.focus();
  }
}
```

**问题**: 点击角色卡片后丢失焦点，无法插入
**解决方案**: 记录最后焦点的场景输入框

---

### 错误9: 显示平台标签（角色跨平台通用） `Character` `UI` ⭐

```javascript
// ❌ 错误：显示平台标签（误导用户）
const displayName = char.alias ? `${char.alias} (${char.username})` : char.username;
option.textContent = `[${char.platform === 'juxin' ? '聚鑫' : '贞贞'}] ${displayName}`;

// ✅ 正确：不显示平台标签（sora2 角色跨平台通用）
const displayName = char.alias || char.username;
card.innerHTML = `
  <img src={avatarUrl} class="character-card-avatar">
  <div class="character-card-name">{displayName}</div>
  ${char.alias ? `<div class="character-card-username">@${char.username}</div>` : ''}
`;
```

**问题**: 显示平台标签误导用户
**解决方案**: sora2 角色跨平台通用，不显示平台标签

---

### 错误15: 使用 ID 而非 username 更新角色 `Character` `API` ⭐

```javascript
// ❌ 错误：API 使用 username 作为参数，但存储用 ID 查找
app.put('/api/character/:username/favorite', (req, res) => {
  const { username } = req.params;
  // 使用 updateCharacter 按 ID 查找会失败
  const updated = characterStorage.updateCharacter(username, { favorite: true });
  // username 不等于 id，返回 null
});

// ✅ 正确：添加 updateByUsername 方法
// character-storage.js
updateByUsername(username, updates) {
  const index = this.characters.findIndex(c => c.username === username);
  if (index === -1) return null;

  Object.assign(this.characters[index], updates);
  this._save();
  return this.characters[index];
}

// index.js
app.put('/api/character/:username/favorite', (req, res) => {
  const { username } = req.params;
  const updated = characterStorage.updateByUsername(username, { favorite: true });
  // ✅ 按 username 查找，正确更新
});
```

**问题**: API 使用 username 参数，存储用 ID 查找，导致更新失败
**解决方案**: 添加 `updateByUsername` 方法

---

### 错误48: 优化节点错误使用双显示功能导致角色引用丢失 `Character` `优化` ⭐⭐⭐ 2026-01-06 新增

**现象**: AI 优化后的提示词丢失了角色引用，替换成通用的"所有角色均采用拟人化设计"
**用户反馈**: "优化结果又回到原点了，丢失了角色信息，使用了外观描述，这是非常错误的"

**根本原因**:
- 优化节点（PromptOptimizerNode）错误地使用了"双显示功能"（realToDisplay/displayToReal）
- 输入框显示别名：`@测试小猫` 而非真实ID `@ebfb9a758.sunnykitte`
- AI 接收到别名，无法识别为角色引用，当作普通文本处理
- 优化结果丢失角色引用，替换成通用外观描述

```javascript
// ❌ 错误：优化节点使用双显示功能
const usernameToAlias = React.useMemo(() => {
  const map = {};
  connectedCharacters.forEach(char => {
    map[char.username] = char.alias || char.username;
  });
  return map;
}, [connectedCharacters]);

const realToDisplay = (text) => {
  // 转换真实ID为别名显示
  let result = text;
  Object.entries(usernameToAlias).forEach(([username, alias]) => {
    const regex = new RegExp(`@${username}(?=\\s|$|@)`, 'g');
    result = result.replace(regex, `@${alias}`);
  });
  return result;
};

<textarea
  value={realToDisplay(simplePrompt)}  // ❌ AI接收到别名
  onChange={(e) => {
    const realText = displayToReal(e.target.value);
    setSimplePrompt(realText);
  }}
/>

// ✅ 正确：优化节点始终使用真实ID
<textarea
  value={simplePrompt}  // ✅ AI接收到真实ID @ebfb9a758.sunnykitte
  onChange={(e) => {
    setSimplePrompt(e.target.value);
  }}
/>

// ✅ 正确：角色卡片显示别名+ID，点击插入真实ID
<div onClick={() => insertCharacterAtCursor(char.username, char.alias)}>
  <span>{char.alias || char.username}</span>
  <span style={{ fontSize: '8px', color: '#6b7280' }}>
    (@{char.username})
  </span>
</div>

// ⭐ 关键：直接插入真实ID
const insertCharacterAtCursor = (username, alias) => {
  const refText = `@${username} `;  // ✅ 插入真实ID，而非别名
};
```

**关键点**:
1. **优化节点输入**: 始终使用真实ID（`@ebfb9a758.sunnykitte`），不使用别名
2. **优化节点输出**: 优化结果也包含真实ID，传递给视频生成节点
3. **视频生成节点**: 使用双显示功能（输入框显示别名，API使用真实ID）
4. **角色卡片**: 显示别名+ID格式（`测试小猫 (@ebfb9a758.sunnykitte)`），点击插入真实ID
5. **AI识别**: 只有真实ID才能被AI识别为角色引用并保留

**角色引用原则** ⭐ 核心原则:
- **Sora2 API**: 使用真实ID调用角色（`@ebfb9a758.sunnykitte`）
- **不需要描述外观**: 角色引用后，AI不需要描述角色长相、眼睛、表情等（Sora2会使用角色真实外观）
- **只描述活动**: 重点描述角色在场景中的动作、互动、位置
- **优化节点**: 始终使用真实ID（发送给AI）
- **视频生成节点**: 使用双显示（用户友好的别名显示，API使用真实ID）

**修复文件**:
- `src/client/src/nodes/process/PromptOptimizerNode.jsx` - Lines 28-48（移除双显示功能，直接使用真实ID）
- `src/client/src/nodes/process/PromptOptimizerNode.jsx` - Lines 310-325（角色卡片显示别名+ID）
- `src/client/src/nodes/process/PromptOptimizerNode.jsx` - Lines 348-350（textarea直接使用simplePrompt）
- `src/server/services/openaiClient.js` - Lines 356-358（后端系统提示词添加空格要求）

**验证结果**: ✅ 2026-01-06 验证通过 - 优化节点使用真实ID，AI成功保留角色引用并添加空格

**修复日期**: 2026-01-06

---

## 表单/输入相关

### 错误31: 表单字段缺少 id/name 属性 `Form` `可访问性` ⭐

```javascript
// ❌ 错误：表单字段缺少 id 和 name 属性
<input
  type="text"
  value={videoUrl}
  onChange={(e) => setVideoUrl(e.target.value)}
  placeholder="视频 URL"
/>

// ✅ 正确：添加 id 和 name 属性
<input
  id="video-url-input"
  name="videoUrl"
  type="text"
  value={videoUrl}
  onChange={(e) => setVideoUrl(e.target.value)}
  placeholder="视频 URL"
/>
```

**问题**: 浏览器控制台显示警告，表单字段无法被正确识别
**解决方案**: 为所有表单字段添加 `id` 和 `name` 属性

**命名规范**:
- `id`: 使用 kebab-case，描述元素用途，如 `video-url-input`
- `name`: 使用 camelCase，对应变量名，如 `videoUrl`

**修复日期**: 2025-12-31

---

### 错误21: 节点变量重复声明 `Form` `编译` ⭐

```javascript
// ❌ 错误：同一作用域内重复声明 characterEdge
useEffect(() => {
  setNodes((nds) =>
    nds.map((node) => {
      const incomingEdges = edges.filter((e) => e.target === node.id);

      // 第一次声明
      const characterEdge = incomingEdges.find((e) => e.targetHandle === 'character-input');
      if (characterEdge) {
        newData.connectedCharacter = sourceNode.data.selectedCharacter;
      }

      // ... 其他代码 ...

      // 第二次声明 ❌ 导致编译错误
      const characterEdge = incomingEdges.find((e) => e.targetHandle === 'character-input');
      if (characterEdge) {
        newData.connectedSourceId = characterEdge.source;
      }

      return { ...node, data: newData };
    })
  );
}, [edges, setNodes]);

// ✅ 正确：合并逻辑，只声明一次
useEffect(() => {
  setNodes((nds) =>
    nds.map((node) => {
      const incomingEdges = edges.filter((e) => e.target === node.id);

      // 只声明一次，处理所有逻辑
      const characterEdge = incomingEdges.find((e) => e.targetHandle === 'character-input');
      if (characterEdge) {
        const sourceNode = nds.find((n) => n.id === characterEdge.source);

        // 视频生成节点: 获取角色
        if (sourceNode?.data?.selectedCharacter) {
          newData.connectedCharacter = sourceNode.data.selectedCharacter;
        }

        // 角色结果节点: 存储连接源 ID
        if (node.type === 'characterResultNode') {
          newData.connectedSourceId = characterEdge.source;
        }
      }

      return { ...node, data: newData };
    })
  );
}, [edges, setNodes]);
```

**问题**: 同一变量在同一作用域内重复声明导致 Babel 编译错误
**解决方案**: 合并相关逻辑，使用条件分支处理不同场景

---

## 存储/持久化相关

### 错误18: localStorage 数据未验证 `Storage` `数据验证` ⭐

```javascript
// ❌ 错误：直接使用 localStorage 数据，未验证格式
const saved = localStorage.getItem('workflow-nodes');
const nodes = JSON.parse(saved);
setNodes(nodes);

// ✅ 正确：使用 try-catch 和默认值
const loadSavedWorkflow = () => {
  try {
    const saved = localStorage.getItem('workflow-nodes');
    if (saved) {
      const nodes = JSON.parse(saved);
      // 验证数据格式
      if (Array.isArray(nodes)) {
        return { nodes, edges: [] };
      }
    }
    return { nodes: [], edges: [] };
  } catch (error) {
    console.error('Failed to load saved workflow:', error);
    return { nodes: [], edges: [] };  // 返回安全的默认值
  }
};
```

**问题**: localStorage 数据可能损坏或格式不正确
**解决方案**: 使用 try-catch 捕获错误，验证数据格式

---

### 错误19: 导入工作流未验证 JSON 格式 `Storage` `数据验证` ⭐

```javascript
// ❌ 错误：未验证 JSON 格式直接使用
const importWorkflow = async (file) => {
  const text = await file.text();
  const workflow = JSON.parse(text);
  saveWorkflow(workflow.name, workflow.nodes, workflow.edges);
};

// ✅ 正确：验证必需字段
const importWorkflow = async (file) => {
  try {
    const text = await file.text();
    const workflow = JSON.parse(text);

    // 验证必需字段
    if (!workflow.name || !workflow.nodes || !workflow.edges) {
      return { success: false, error: 'Invalid workflow file format' };
    }

    // 验证数据类型
    if (!Array.isArray(workflow.nodes) || !Array.isArray(workflow.edges)) {
      return { success: false, error: 'Invalid data format' };
    }

    return saveWorkflow(workflow.name, workflow.nodes, workflow.edges);
  } catch (error) {
    return { success: false, error: 'Failed to parse JSON' };
  }
};
```

**问题**: 导入的 JSON 文件可能格式不正确
**解决方案**: 验证 name, nodes, edges 字段存在，并验证数据类型

---

### 错误33: 工作流快照持久化时机问题 `Storage` `状态同步` ⭐

```javascript
// ❌ 错误：useState 未同步到 node.data，导致工作流快照缺失参数
function VideoGenerateNode({ data }) {
  // useState 只在组件内部，不会自动同步到 node.data
  const [manualPrompt, setManualPrompt] = useState('');  // ❌ 未从 data 初始化

  const handleGenerate = async () => {
    // ⚠️ 问题：getNodes() 返回的 node.data 不包含 useState 的最新值
    const workflowSnapshot = {
      nodes: getNodes(),  // manualPrompt 未同步，快照为空或旧值
      edges: getEdges(),
    };
  };
}

// ✅ 正确：完整的状态同步模式
function VideoGenerateNode({ data }) {
  const nodeId = useNodeId();

  // 1. 从 data 初始化 useState（支持工作流恢复）
  const [manualPrompt, setManualPrompt] = useState(data.manualPrompt || '');

  // 2. useEffect: manualPrompt 变化时同步到 node.data
  useEffect(() => {
    if (manualPrompt !== data.manualPrompt) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, manualPrompt } }
            : node
        )
      );
    }
  }, [manualPrompt, nodeId, setNodes, data.manualPrompt]);

  const handleGenerate = async () => {
    // ⭐ 关键修复：先同步 manualPrompt 到节点 data
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, manualPrompt } }
          : node
      )
    );

    // ⭐ 捕获工作流快照（现在包含最新的 manualPrompt）
    const workflowSnapshot = {
      nodes: getNodes(),
      edges: getEdges(),
    };
  };
}
```

**问题**: useState 只在组件内部，不会自动同步到 React Flow 的 node.data
**解决方案**:
1. 初始化: 从 `data` 属性初始化 useState
2. useEffect 同步: 当 useState 变化时同步到 node.data
3. 手动同步: 在 getNodes() 之前手动调用 setNodes() 确保数据同步

---

### 错误20: 视频生成时长参数类型错误 `API` `参数类型` ⭐

```javascript
// ❌ 错误：时长为字符串类型
const [config, setConfig] = useState({
  duration: '10',  // 字符串会导致 API 调用失败
});

// ✅ 正确：时长为数字类型
const [config, setConfig] = useState({
  duration: 10,  // 数字类型
});
```

**问题**: 时长参数应为数字类型，传递字符串导致 API 调用失败
**解决方案**: duration 使用数字类型 (5, 10, 15, 25)

---

## UI/渲染相关

### 错误47: 图片加载导致布局抖动（CLS） `UI` `性能` ⭐

**现象**: 角色库节点中的角色列表不停抖动，滚动条上下滑动
**根本原因**: 图片加载时没有预留空间，导致布局频繁调整

```javascript
// ❌ 错误：图片没有约束布局
<img
  src={char.profilePictureUrl || '/default-avatar.svg'}
  style={{
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    objectFit: 'cover',
  }}
/>

// ✅ 正确：添加 display 和 flexShrink 防止布局偏移
<img
  src={char.profilePictureUrl || '/default-avatar.svg'}
  style={{
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    objectFit: 'cover',
    marginBottom: '4px',
    // ⭐ 防止图片加载导致的布局抖动
    display: 'block',      // 防止内联布局计算
    flexShrink: 0,         // 防止 flex 收缩
  }}
  onError={(e) => {
    e.target.src = '/default-avatar.svg';
  }}
/>
```

**调试方法**: ⭐ 最重要的发现
1. 打开 Chrome DevTools（F12）
2. 切换到 Performance 选项卡
3. 点击录制按钮（圆点）
4. 刷新页面（Ctrl+Shift+R 强制刷新）
5. 等待 5-10 秒后停止录制
6. 查看 CLS (Cumulative Layout Shift) 分数和偏移次数

**性能对比**:
| 指标 | 修复前 | 修复后 | 改善 |
|------|--------|--------|------|
| CLS 分数 | 0.0176 | 0.0010 | **减少 94%** |
| 布局偏移次数 | 51 次 | 3 次 | **减少 94%** |
| 偏移持续时间 | ~5 秒 | 1.8 秒 | **减少 64%** |

**修复日期**: 2026-01-04

**经验教训**:
- 🔥 **性能录制是调试性能问题的黄金方法** - 比控制台日志更直观
- 🔥 **用户描述的症状可能不准确** - "滚动条滑动"实际是布局偏移
- 🔥 **误诊会浪费大量时间** - 走了很多弯路才找到根本原因
- 🔥 **优先使用浏览器工具** - DevTools Performance 能直接定位问题

---

### 错误44: React 对象渲染错误 - 直接渲染对象导致崩溃 `UI` `渲染` ⭐

**现象**: 页面崩溃，错误 "Objects are not valid as a React child (found: object with keys {message, type, param, code})"
**根本原因**: React 组件直接渲染了 JavaScript 对象

```javascript
// ❌ 错误：直接渲染 error 对象
function VideoNode() {
  const [error, setError] = useState(null);

  return (
    <div>
      {error && <div className="error">{error}</div>}
      {/* ❌ error 是对象，React无法渲染 */}
    </div>
  );
}

// ✅ 正确：渲染 error.message 或 JSON.stringify
function VideoNode() {
  const [error, setError] = useState(null);

  return (
    <div>
      {error && (
        <div className="error">
          {typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}
        </div>
      )}
    </div>
  );
}
```

**关键点**:
1. **React子元素规则**: 只能渲染 string, number, JSX, null, undefined, boolean, array
2. **对象不能渲染**: 普通对象会报错
3. **错误对象处理**: 使用 `error.message` 或 `JSON.stringify(error)`
4. **类型检查**: `typeof error === 'string'` 判断是否可直接渲染

**修复日期**: 2026-01-02

---

### 错误42: CSS border 语法错误 - 颜色值多余引号 `UI` `CSS` ⭐

**现象**: React 组件渲染报错，样式未生效
**根本原因**: CSS border 属性中颜色值有多余的引号

```javascript
// ❌ 错误：颜色值周围有多余引号
<div style={{
  border: '1px solid '#fcd34d',  // ❌ 语法错误
}} />

// ✅ 正确：颜色值不加引号
<div style={{
  border: '1px solid #fcd34d',  // ✅ 正确语法
}} />
```

**关键点**:
1. **border语法**: `border: '宽度 样式 颜色'` - 所有值在一个字符串中
2. **颜色值格式**: 十六进制颜色（如 `#fcd34d`）不加引号
3. **字符串拼接**: 使用模板字符串 `${}` 进行动态拼接

**修复日期**: 2026-01-02

---

## 其他

### 错误2: 角色创建返回 404
- **原因**: 传递了 model 参数
- **解决**: 删除 model 参数，使用 from_task 优先

### 错误3: TaskResultNode 无法获取视频 URL
- **原因**: API 路径缺少 /api/ 前缀
- **解决**: 使用完整路径 `/api/task/{taskId}`

### 错误4: React Flow 无限循环
- **原因**: useEffect 依赖数组包含 nodes
- **解决**: 移除 nodes，使用函数式更新

### 错误5: 角色引用格式错误
- **原因**: 使用 `@{username}` 带花括号
- **解决**: 使用 `@username` 不带花括号

### 错误10: 故事板镜头图片未正确收集
- **原因**: 只收集场景描述，忽略了图片
- **解决**: 同时收集场景描述和参考图片

### 错误11: 后端未收集镜头图片
- **原因**: 只使用全局 images 参数
- **解决**: 收集所有镜头的参考图片并合并

### 错误12: 提示词与图片内容无关
- **原因**: 使用通用提示词
- **解决**: 先分析图片内容，再写相关提示词

### 错误13: 删除操作缺少确认机制
- **原因**: 用户可能误删重要数据
- **解决**: 所有删除操作都必须有确认机制

### 错误14: 删除后未刷新列表
- **原因**: 用户看不到删除效果
- **解决**: 删除后自动刷新列表

### 错误23: 图生视频提示词未描述参考图内容 `API` `提示词` ⭐⭐

**问题**: 使用参考图片生成的视频与图片内容没有任何关系
**根本原因**: 提示词只描述角色活动，未描述参考图片的场景内容

```javascript
// ❌ 错误：提示词未描述参考图
const prompt = '@装载机 在干活';
const images = ['https://volcano-scene.jpg'];
// 问题：生成的视频与火山场景无关

// ✅ 正确：提示词同时描述参考场景和角色活动
// 参考图片：卡通火山场景（火山口有熔岩流动，底部冒白烟，蓝天白云背景）
const prompt = '卡通风格的火山场景，火山口有熔岩流动，底部冒白烟，蓝天白云背景。@装载机 在火山附近作业，正在搬运岩石，卡通插画风格';
const images = ['https://volcano-scene.jpg'];
```

**提示词结构建议**:
1. **场景描述**（来自参考图片）: 主体、外观、环境、氛围
2. **角色引用**: `@username` 调用角色
3. **活动描述**: 角色在场景中的具体动作

**修复日期**: 2025-12-31

---

### 错误24: 历史记录卡片不显示视频结果 `UI` `显示` ⭐

**问题**: 历史记录面板的卡片只显示占位符，不显示视频和工作流参数
**根本原因**: HistoryCard 组件只检查 `thumbnail` 字段，未检查 `result.output`（视频 URL）

```javascript
// ❌ 错误：只检查 thumbnail
{thumbnail ? (
  <img src={thumbnail} alt="视频缩略图" />
) : (
  <div>🖼️</div>  // 总是显示占位符
)}

// ✅ 正确：显示视频或缩略图
{thumbnail ? (
  <img src={thumbnail} alt="视频缩略图" />
) : result?.output ? (
  <video
    src={result.output}
    muted
    onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
    onMouseLeave={(e) => {
      e.currentTarget.pause();
      e.currentTarget.currentTime = 0;
    }}
  />
) : (
  <div>🖼️</div>
)}
```

**修复日期**: 2025-12-31

---

### 错误25: 本地视频 URL 缺少完整前缀导致无法播放 `API` `URL` ⭐

**现象**: 视频下载后，点击视频无法播放，显示"无法播放媒体"
**根本原因**: 后端返回本地视频路径为 `/downloads/xxx.mp4`（相对路径），浏览器解析为当前页面 URL + 相对路径

```javascript
// ❌ 错误：直接使用相对路径
const videoUrl = result.data.data.output; // "/downloads/xxx.mp4"
<video src={videoUrl} /> // 浏览器解析为 http://localhost:5173/downloads/xxx.mp4 (404)

// ✅ 正确：拼接完整 URL
let finalVideoUrl = result.data.data.output;

// ⭐ 关键：为本地路径拼接完整前缀
if (finalVideoUrl.startsWith('/downloads/')) {
  finalVideoUrl = `${API_BASE}${finalVideoUrl}`;
}
// 结果: "http://localhost:9000/downloads/xxx.mp4"

<video src={finalVideoUrl} /> // 正确加载视频
```

**关键规则**:
1. **相对路径识别**: 以 `/downloads/` 开头的路径是本地视频
2. **URL 拼接**: 本地路径必须拼接 `API_BASE` 前缀
3. **远程路径**: 以 `http://` 或 `https://` 开头的路径直接使用
4. **缓存破坏**: 手动刷新时添加 `&_t=时间戳` 参数绕过浏览器缓存

**修复日期**: 2026-01-01

---

### 错误27: 故事板实现错误 `API` `理解` ⭐ 重大纠正

**问题**: 故事板被错误理解为"批量生成多个视频"
**错误理解**:
- ❌ 故事板 = 多个独立视频任务
- ❌ 每个镜头调用一次 API

**正确理解**:
- ✅ 故事板 = **单个视频任务**，通过特殊格式描述多个时间段
- ✅ 调用 **一次 API**，返回 **单个 taskId**

```javascript
// ❌ 错误：循环调用 API（每个 shot 一次）
for (let i = 0; i < validShots.length; i++) {
  const response = await fetch(`${API_BASE}/video/create`, ...);
  // ❌ 每次循环创建一个独立视频
}

// ✅ 正确：拼接故事板格式，调用一次 API
const promptParts = shots.map((shot, index) => {
  return `Shot ${index + 1}:\nduration: ${shot.duration}sec\nScene: ${shot.scene}`;
});
const prompt = promptParts.join('\n\n');  // ✅ 拼接故事板格式

const response = await fetch(`${API_BASE}/api/video/storyboard`, {
  method: 'POST',
  body: JSON.stringify({
    platform: 'juxin',
    shots: validShots,  // ✅ 传递完整的 shots 数组
  }),
});

const taskId = result.data.id || result.data.task_id;  // ✅ 单个 taskId
```

**关键要点**:
1. 故事板是**单个视频任务**，不是多个视频
2. 提示词必须使用特殊格式：`Shot N:\nduration: Xsec\nScene: Y\n\n`
3. 调用 `/api/video/storyboard` 端点
4. 收集所有镜头的参考图片并合并到 `images` 数组
5. 返回单个 taskId，轮询获取最终视频

---

### 错误28: 故事板发送额外 duration 参数导致 400 错误 `API` `参数` ⭐

```javascript
// ❌ 错误：故事板请求中包含单独的 duration 参数
const response = await fetch(`${API_BASE}/api/video/storyboard`, {
  method: 'POST',
  body: JSON.stringify({
    shots: shotsWithDuration,
    duration: String(totalDuration), // ❌ 导致 400 错误
  }),
});

// ✅ 正确：不发送 duration 参数
const response = await fetch(`${API_BASE}/api/video/storyboard`, {
  method: 'POST',
  body: JSON.stringify({
    shots: shotsWithDuration,
    // duration: String(totalDuration), // ⚠️ 已移除
  }),
});
```

**问题**: 故事板模式已在 prompt 中包含每个镜头的时长，发送额外的 `duration` 参数会导致 API 拒绝请求

---

### 错误29: useEffect 无限循环（data 依赖） `React` `状态` ⭐

```javascript
// ❌ 错误：data 在依赖数组中导致无限循环
function VideoGenerateNode({ data }) {
  const [nodeSize, setNodeSize] = useState({ width: 280, height: 400 });

  // data 对象在每次渲染时都是新引用
  useEffect(() => {
    if (data.onSizeChange) {
      data.onSizeChange(nodeId, nodeSize.width, nodeSize.height);
    }
  }, [nodeSize.width, nodeSize.height, data]); // ❌ data 导致无限循环
}

// ✅ 正确：使用 useRef 存储回调，只监听 onSizeChange 变化
function VideoGenerateNode({ data }) {
  const nodeId = useNodeId();
  const onSizeChangeRef = useRef(data.onSizeChange);

  // 更新 ref（仅当 onSizeChange 变化时）
  useEffect(() => {
    onSizeChangeRef.current = data.onSizeChange;
  }, [data.onSizeChange]);

  // 使用 ref.current，移除 data 依赖
  useEffect(() => {
    if (onSizeChangeRef.current) {
      onSizeChangeRef.current(nodeId, nodeSize.width, nodeSize.height);
    }
  }, [nodeSize.width, nodeSize.height, nodeId]); // ✅ 无 data 依赖
}
```

**问题**:
1. `data` 对象在父组件每次渲染时都是新引用
2. useEffect 依赖 `data` → 触发 → 更新节点 → `data` 变化 → 再次触发 → 无限循环

**解决方案**:
1. **节点内部**: 使用 `useRef` 存储 `onSizeChange`
2. **父组件**: 使用 `useCallback` 创建稳定的回调函数
3. **移除依赖**: 从 useEffect 依赖数组移除 `data`

---

### 错误30: 节点内交互元素触发拖动 `React Flow` `交互` ⭐

```javascript
// ❌ 错误：使用 stopPropagation 无法阻止 React Flow 拖动
function VideoGenerateNode({ data }) {
  const handleTextareaMouseDown = (e) => {
    e.stopPropagation();  // ❌ React Flow 使用捕获阶段，此方法无效
  };

  return <textarea onMouseDown={handleTextareaMouseDown} />;
}

// ✅ 正确：使用 React Flow 官方 nodrag 类
function VideoGenerateNode({ data }) {
  return (
    <div>
      {/* 所有交互元素添加 nodrag 类 */}
      <textarea className="nodrag" />
      <select className="nodrag">...</select>
      <input className="nodrag" type="checkbox" />
      <button className="nodrag">生成</button>
    </div>
  );
}
```

**问题**: React Flow 在捕获阶段监听事件，`stopPropagation()` 在冒泡阶段执行，无法阻止拖动

**解决方案**: 使用 `className="nodrag"` 标记所有交互元素

---

### 错误32: App.jsx 把 selectedImages 数组当作 Set 处理 `React Flow` `数据类型` ⭐

```javascript
// ❌ 错误：App.jsx 把数组当作 Set
const selectedImagesSet = sourceNode.data?.selectedImages;
if (selectedImagesSet && selectedImagesSet.size > 0) {
  newData.connectedImages = allImages.filter(img => selectedImagesSet.has(img));
}

// ✅ 正确：selectedImages 是已过滤的数组，直接使用
const selectedImagesArray = sourceNode.data?.selectedImages;
const allImages = sourceNode.data?.images || [];

if (selectedImagesArray && Array.isArray(selectedImagesArray)) {
  // 有 selectedImages 数据：使用它（已过滤）
  newData.connectedImages = selectedImagesArray;
} else {
  // 向后兼容：没有 selectedImages 数据时传递所有图片
  newData.connectedImages = allImages;
}
```

**问题**: ReferenceImageNode 保存 `selectedImages` 到 `node.data` 时是**数组**，App.jsx 使用 Set 的 `.size` 和 `.has()` 方法处理

**解决方案**: 使用 `Array.isArray()` 检查数据类型，直接使用已过滤的数组

**修复日期**: 2026-01-02

---

### 错误36: TaskResultNode 进度百分比未显示 `UI` `显示` ⭐

**现象**: TaskResultNode 显示 "✓ 完成 0%" 而非 "✓ 完成 100%"
**根本原因**:
1. getStatusText 函数硬编码返回 "✓ 完成"，忽略了 progressValue 参数
2. 轮询函数未设置 progress 为 100
3. 恢复逻辑只检查 `_isCompletedFromHistory` 在检查 `taskStatus === 'SUCCESS'` 之前

```javascript
// ❌ 错误：getStatusText 忽略 progressValue 参数
const getStatusText = (status, progressValue) => {
  switch (status) {
    case 'SUCCESS': return '✓ 完成';  // ❌ 硬编码，忽略 progressValue
    case 'IN_PROGRESS': return `⏳ 处理中 ${progressValue}%`;
  }
};

// ✅ 正确：getStatusText 包含进度百分比
const getStatusText = (status, progressValue) => {
  switch (status) {
    case 'SUCCESS': return `✓ 完成 ${progressValue}%`;  // ✅ 显示进度
    case 'IN_PROGRESS': return `⏳ 处理中 ${progressValue}%`;
  }
};

// ✅ 正确：轮询函数设置 progress 为 100
if (status === 'SUCCESS' && taskData?.output) {
  setVideoUrl(finalVideoUrl);
  setProgress(100);  // ✅ 任务完成时设置进度为 100%
  setPolling(false);
}
```

**关键点**:
1. **getStatusText 必须包含进度**: 成功状态显示 "✓ 完成 100%"
2. **轮询时设置进度**: API 返回 SUCCESS 时，自动设置 progress 为 100
3. **手动刷新设置进度**: 刷新已完成任务时，如果 progress 为 0，设置为 100
4. **默认值逻辑**: 如果 progress 为 undefined 或 0，且任务已完成，默认为 100

**修复日期**: 2026-01-01

---

### 错误43: JavaScript TDZ错误 - const变量声明前使用 `JavaScript` `TDZ` ⭐

```javascript
// ❌ 错误：Hook 在 updateShot 声明之前调用
function StoryboardNode({ data }) {
  const [shots, setShots] = useState([]);

  // ❌ useSceneCharacterInsertion 使用 updateShot，但还未声明
  const insertCharacterToScene = useSceneCharacterInsertion(
    realToDisplay,
    displayToReal,
    updateShot  // ❌ ReferenceError: Cannot access before initialization
  );

  // updateShot 在这里声明，但已经太晚了
  const updateShot = (shotId, field, value) => {
    setShots((prevShots) =>
      prevShots.map((shot) =>
        shot.id === shotId ? { ...shot, [field]: value } : shot
      )
    );
  };
}

// ✅ 正确：先声明 updateShot，再调用 Hook
function StoryboardNode({ data }) {
  const [shots, setShots] = useState([]);

  // ✅ 先声明 updateShot
  const updateShot = (shotId, field, value) => {
    setShots((prevShots) =>
      prevShots.map((shot) =>
        shot.id === shotId ? { ...shot, [field]: value } : shot
      )
    );
  };

  // ✅ 后调用 Hook（updateShot 已声明）
  const insertCharacterToScene = useSceneCharacterInsertion(
    realToDisplay,
    displayToReal,
    updateShot  // ✅ 正确
  );
}
```

**关键点**:
1. **TDZ规则**: `const` 和 `let` 声明在代码执行前存在"暂时性死区"
2. **声明顺序**: 函数必须在 Hook 调用之前声明
3. **函数提升**: 只有 `function` 声明会提升，`const` 箭头函数不会
4. **解决方案**: 将函数定义移到 Hook 调用之前

**修复日期**: 2026-01-02

---

## 参考链接

- [SKILL.md](../skills/winjin-dev/SKILL.md) - 开发规范和技能
- [base.md](base.md) - 技术栈约束
- [code.md](code.md) - 代码规范和示例
- [开发交接书.md](../../用户输入文件夹/开发对话/开发交接书.md) - 项目交接文档
