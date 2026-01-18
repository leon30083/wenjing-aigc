# TaskResultNode 任务结果节点

> **节点类型**: 输出节点
> **文件路径**: `src/client/src/nodes/output/TaskResultNode.jsx`
> **版本**: v1.0.0
> **更新日期**: 2026-01-18

---

## 功能概述

**TaskResultNode** 是视频生成工作流的输出节点，负责显示任务执行结果。

**主要功能**:
- 接收并显示任务ID
- 自动轮询任务状态（30秒间隔）
- 显示视频预览和下载链接
- 支持手动刷新状态
- 支持复制任务ID和视频链接
- 区分已完成任务和新任务（避免重复轮询）

---

## 输入/输出 Handles

### 输入 Handle (target)

| Handle ID | 数据类型 | 说明 | 连接来源 |
|-----------|---------|------|---------|
| `task-input` | string | 任务ID | VideoGenerateNode.video-output ⭐ |
| | | | StoryboardNode.video-output |
| | | | CharacterCreateNode.character-output |

### 输出 Handles (source)

无（输出节点没有输出Handle）

---

## 节点配置

### 节点样式

```javascript
{
  backgroundColor: '#e0f2fe',  // 浅蓝背景
  borderColor: '#0ea5e9',       // 蓝色边框
  borderWidth: '2px',
  borderRadius: '8px',
  padding: '10px 15px',
  minWidth: 300,
  minHeight: 280
}
```

### 可配置参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `data.label` | string | `'任务结果'` | 节点显示名称 |
| `data.taskId` | string | `null` | 任务ID |
| `data.taskStatus` | string | `'idle'` | 任务状态 |
| `data.videoUrl` | string | `null` | 视频URL |
| `data.platform` | string | `'juxin'` | 平台：`juxin` 或 `zhenzhen` |
| `data.progress` | number | `0` | 任务进度（0-100） |
| `data.error` | string | `null` | 错误信息 |

---

## 数据传递

### 1. 接收任务ID（事件机制）⭐

```javascript
// VideoGenerateNode 创建任务后派发事件
window.dispatchEvent(new CustomEvent('video-task-created', {
  detail: {
    sourceNodeId: 'videoGenerateNodeId',
    taskId: 'task-123',
    platform: 'juxin'
  }
}));

// TaskResultNode 监听事件
useEffect(() => {
  const handleVideoCreated = (event) => {
    const { sourceNodeId, taskId: newTaskId, platform: newPlatform } = event.detail;
    const connectedSourceId = connectedSourceIdRef.current;

    // 验证源节点匹配
    if (connectedSourceId === sourceNodeId && newTaskId) {
      setTaskId(newTaskId);
      setPlatform(newPlatform);
      setTaskStatus('IN_PROGRESS');
      setPolling(true); // ⭐ 开始轮询
    }
  };

  window.addEventListener('video-task-created', handleVideoCreated);
  return () => window.removeEventListener('video-task-created', handleVideoCreated);
}, []);
```

### 2. 任务状态轮询

```javascript
useEffect(() => {
  if (!taskId) return;

  // ⭐ 跳过已完成的历史任务
  if (isCompletedFromHistoryRef.current) {
    return;
  }

  // 停止条件
  if ((taskStatus === 'SUCCESS' && videoUrl) || taskStatus === 'FAILURE') {
    return;
  }

  // 每30秒查询一次
  const pollInterval = setInterval(async () => {
    const response = await fetch(`${API_BASE}/api/task/${taskId}?platform=${platform}`);
    const result = await response.json();

    if (result.success && result.data) {
      const { status, data: taskData, progress: taskProgress } = result.data;
      setTaskStatus(status);

      // 更新进度
      if (typeof taskProgress === 'number') {
        setProgress(taskProgress);
      }

      // 成功完成
      if (status === 'SUCCESS' && taskData?.output) {
        let finalVideoUrl = taskData.output;
        if (finalVideoUrl.startsWith('/downloads/')) {
          finalVideoUrl = `${API_BASE}${finalVideoUrl}`;
        }
        setVideoUrl(finalVideoUrl);
        setProgress(100);
        setPolling(false);
        clearInterval(pollInterval);
      }
      // 失败
      else if (status === 'FAILURE') {
        setError(taskData?.fail_reason || '生成失败');
        setPolling(false);
        clearInterval(pollInterval);
      }
    }
  }, 30000);

  setPolling(true);

  return () => {
    clearInterval(pollInterval);
    setPolling(false);
  };
}, [taskId, taskStatus, platform]);
```

### 3. 工作流恢复状态同步 ⭐

```javascript
// 从 data 恢复状态（工作流加载时）
useEffect(() => {
  // ⭐ 优先检查是否是已完成的任务
  const isCompletedTask = data.taskStatus === 'SUCCESS' && data.videoUrl;

  if (data._isCompletedFromHistory || isCompletedTask) {
    console.log('[TaskResultNode] Restoring state from history/completed task');
    isCompletedFromHistoryRef.current = true;

    // 一次性恢复所有状态
    if (data.taskStatus) setTaskStatus(data.taskStatus);
    if (data.videoUrl) setVideoUrl(data.videoUrl);
    if (data.error) setError(data.error);
    if (data.taskStatus === 'SUCCESS' && (!data.progress || data.progress === 0)) {
      setProgress(100); // 已完成任务默认 100%
    } else if (data.progress !== undefined) {
      setProgress(data.progress);
    }
    setPolling(false); // ⭐ 不开始轮询
    return;
  }

  // 新任务路径
  if (data.taskId && data.taskId !== taskIdRef.current && taskIdRef.current === null) {
    setTaskId(data.taskId);
    if (data.taskStatus === 'SUCCESS' && data.videoUrl) {
      isCompletedFromHistoryRef.current = true;
      setPolling(false);
    }
  }
}, []);
```

---

## 任务状态

### 状态定义

| 状态 | 显示文本 | 颜色 | 说明 |
|------|---------|------|------|
| `NOT_START` | `⏸️ 未开始` | `#64748b` | 任务未开始 |
| `IN_PROGRESS` | `⏳ 处理中 {progress}%` | `#2563eb` | 正在处理 |
| `SUCCESS` | `✓ 完成 {progress}%` | `#059669` | 生成成功 |
| `FAILURE` | `✗ 失败` | `#dc2626` | 生成失败 |
| `idle` | `⏸️ 等待中` | `#9ca3af` | 等待任务 |

### 状态转换流程

```
idle → IN_PROGRESS → SUCCESS → [显示视频]
  ↓       ↓           ↓
      FAILURE    [显示错误]
```

---

## 使用示例

### 示例 1: 基础视频生成结果

```
工作流:
TextNode → VideoGenerateNode → TaskResultNode
```

**操作步骤**:
1. 配置并连接所有节点
2. VideoGenerateNode 点击"生成视频"
3. TaskResultNode 自动接收任务ID
4. 显示"⏳ 处理中 0%"
5. 每30秒自动查询状态
6. 完成后显示视频预览和下载按钮

### 示例 2: 角色视频生成结果

```
工作流:
CharacterLibraryNode ─┐
TextNode ──────────────┤
                       ↓
                VideoGenerateNode → TaskResultNode
```

**验证点**:
- ✅ 任务ID正确传递
- ✅ 平台信息正确（juxin/zhenzhen）
- ✅ 视频URL正确显示
- ✅ 支持下载和复制链接

### 示例 3: 工作流恢复

```
场景: 关闭并重新打开应用，工作流自动恢复
```

**恢复逻辑**:
1. 从 localStorage 加载工作流
2. TaskResultNode 读取 `data.taskStatus`
3. 如果是 `SUCCESS` 且有 `videoUrl`：
   - 设置 `isCompletedFromHistoryRef.current = true`
   - 恢复所有状态
   - **不开始轮询**（避免浪费API调用）
4. 如果是新任务或未完成：
   - 正常开始轮询

---

## 常见问题

### Q1: 任务完成后没有显示视频？

**A**: 检查以下几点：
1. 任务状态是否为 `SUCCESS`
2. `videoUrl` 是否存在
3. 查看控制台日志是否有错误
4. 手动点击"刷新状态"按钮

### Q2: 轮询一直不停止？

**A**: 检查停止条件：
```javascript
// 停止条件
if ((taskStatus === 'SUCCESS' && videoUrl) || taskStatus === 'FAILURE') {
  return; // 停止轮询
}
```

如果 `videoUrl` 为空，轮询不会停止。查看 API 响应格式是否正确。

### Q3: 工作流恢复后重复轮询？

**A**: 这是已修复的问题。修复逻辑：
```javascript
// ⭐ 优先检查是否是已完成的任务
const isCompletedTask = data.taskStatus === 'SUCCESS' && data.videoUrl;

if (data._isCompletedFromHistory || isCompletedTask) {
  isCompletedFromHistoryRef.current = true;
  setPolling(false); // ⭐ 不开始轮询
  return;
}
```

### Q4: 平台信息不正确？

**A**: 从连接的 VideoGenerateNode 读取 platform：
```javascript
useEffect(() => {
  const sourceNode = allNodes.find(n => n.id === sourceId);
  if (sourceNode?.type === 'videoGenerateNode' && sourceNode.data?.apiConfig?.platform) {
    setPlatform(sourceNode.data.apiConfig.platform);
  }
}, [data.connectedSourceId]);
```

### Q5: 视频URL是相对路径？

**A**: 自动拼接完整URL：
```javascript
let finalVideoUrl = taskData.output;
if (finalVideoUrl.startsWith('/downloads/')) {
  finalVideoUrl = `${API_BASE}${finalVideoUrl}`; // http://localhost:9000/downloads/...
}
setVideoUrl(finalVideoUrl);
```

### Q6: 如何复制任务ID或视频链接？

**A**:
1. 点击"📋 复制"按钮（任务ID）
2. 点击"🔗 复制链接"按钮（视频URL）
3. 按钮会显示"✓ 已复制"反馈（2秒后恢复）

### Q7: 手动刷新按钮有什么用？

**A**: 两种用途：
1. **主动查询**: 不等待30秒轮询，立即查询状态
2. **重试**: 轮询失败后手动重试

---

## 相关文档

### 上层文档
- [节点开发层总览](../README.md)
- [输出节点概述](../README.md#输出节点-output-nodes)
- [Handle 连接规范](../handle-connections.md)

### 并行文档
- [错误模式层](../../../04-error-patterns/)
- [React Flow 规则](../../../rules/reactflow.md)
- [API 规范](../../../rules/base.md#api-规范)

### 外部参考
- [React Flow 官方文档 - Custom Nodes](https://reactflow.dev/docs/api/nodes/custom-node/)

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
