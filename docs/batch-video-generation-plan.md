# 批量视频生成功能方案

> **创建日期**: 2026-01-13
> **目标**: 实现批量生成视频功能 - 并发优化旁白、队列式提交任务、多节点轮询

---

## 📋 任务背景

### 用户需求

当前已完成的功能：
1. ✅ 角色匹配 - NarratorNode 智能匹配角色
2. ✅ 旁白优化 - NarratorProcessorNode 生成视频提示词
3. ✅ 单视频生成 - VideoGenerateNode 生成单个视频

**新需求**：
- 批量处理 9 句旁白，生成 9 个视频
- 并发优化提示词（提升性能）
- 队列式提交任务（按顺序逐个提交）
- 单个 BatchResultNode 显示进度

### 用户的具体要求

1. **优化方式**: 并发优化（推荐） - 使用 Promise.all 同时优化所有句子
2. **提交方式**: 队列式处理
   - 按顺序提交 9 个视频任务
   - 等待第一个返回 taskId 后提交第二个
   - 第二个返回 taskId 后提交第三个
   - 以此类推，直到所有任务都提交完成
3. **进度显示**: 单个 BatchResultNode - 显示所有任务进度
4. **结果处理**: 使用列表展示所有任务

---

## 🎯 实现方案

### 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    批量视频生成流程                           │
└─────────────────────────────────────────────────────────────┘

阶段1: 并发优化 (NarratorProcessorNode)
┌──────────────────────────────────────────────────────────────┐
│ 9个句子                                                       │
│   ↓                                                          │
│ Promise.all([optimize1, optimize2, ..., optimize9])          │
│   ↓                                                          │
│ 优化结果数组 [{original, optimized, status}, ...]            │
└──────────────────────────────────────────────────────────────┘

阶段2: 队列式提交 (VideoGenerateNode - 批量模式)
┌──────────────────────────────────────────────────────────────┐
│ 使用 BatchQueue API                                          │
│ ├─ POST /api/batch/create   (创建批量任务)                   │
│ ├─ POST /api/batch/:batchId/submit  (提交所有任务)            │
│ └─ 后端队列式提交                                            │
└──────────────────────────────────────────────────────────────┘

阶段3: 批量轮询 (BatchResultNode)
┌──────────────────────────────────────────────────────────────┐
│ BatchResultNode: 轮询批量任务状态                             │
│ ├─ GET /api/batch/:batchId/poll  (一次性获取所有任务状态)      │
│ ├─ 单个轮询请求（避免 API 限流）                             │
│ └─ 显示所有任务进度                                          │
└──────────────────────────────────────────────────────────────┘
```

---

## 📝 详细实现步骤

### 步骤1: 优化并发化改造

**文件**: `src/client/src/nodes/process/NarratorProcessorNode.jsx`

**修改位置**: Line 386-534 (`optimizeAllSentences` 函数)

**当前实现** (串行):
```javascript
// ❌ 当前: 串行优化
for (let i = 0; i < tempSentences.length; i++) {
  const optimized = await optimizeSentence(tempSentences[i]);
  results.push(optimized);
}
```

**目标实现** (并发):
```javascript
// ✅ 目标: 并发优化
let completedCount = 0;
const totalSentences = tempSentences.length;

const optimizationPromises = tempSentences.map(async (sentence, index) => {
  try {
    // 标记为优化中
    tempSentences[index] = { ...tempSentences[index], status: 'optimizing' };
    setSentences([...tempSentences]);

    // 优化句子
    const optimized = await optimizeSentence(tempSentences[index]);
    completedCount++;
    setProgress(Math.round((completedCount / totalSentences) * 100));
    return { index, optimized };
  } catch (error) {
    completedCount++;
    setProgress(Math.round((completedCount / totalSentences) * 100));
    return { index, optimized: { ...sentence, status: 'error', error: error.message } };
  }
});

const optimizationResults = await Promise.all(optimizationPromises);
optimizationResults.sort((a, b) => a.index - b.index);
const results = optimizationResults.map(r => r.optimized);
```

---

### 步骤2: 使用后端 BatchQueue API 批量提交

**文件**: `src/client/src/nodes/process/VideoGenerateNode.jsx`

**关键变更**: 使用后端的 `/api/batch/*` 端点，而不是循环调用单个任务 API

```javascript
/**
 * 批量生成视频（使用 BatchQueue API）
 * @param {Array} sentences - 优化后的句子数组
 */
const generateBatchVideos = async (sentences) => {
  console.log('[VideoGenerateNode] 🎬 开始批量生成:', {
    totalVideos: sentences.length
  });

  setStatus('batch-generating');
  setError(null);

  // 🎯 步骤1: 创建批量任务
  const createBatchResponse = await fetch(`${API_BASE}/api/batch/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      platform: apiConfig.platform,
      jobs: sentences
        .filter(s => s.optimized)
        .map(s => ({
          prompt: s.optimized,
          duration: duration,
          aspect_ratio: apiConfig.aspect,
          watermark: apiConfig.watermark,
          images: useReferenceImages ? connectedImages : [],
        }))
    })
  });

  const createBatchResult = await createBatchResponse.json();

  if (!createBatchResult.success) {
    throw new Error(createBatchResult.error || '创建批量任务失败');
  }

  const { batchId } = createBatchResult.data;
  console.log('[VideoGenerateNode] ✅ 批量任务已创建:', batchId);

  // 🎯 步骤2: 提交所有任务（后端队列式提交）
  const submitBatchResponse = await fetch(`${API_BASE}/api/batch/${batchId}/submit`, {
    method: 'POST'
  });

  const submitBatchResult = await submitBatchResponse.json();

  if (!submitBatchResult.success) {
    throw new Error(submitBatchResult.error || '提交批量任务失败');
  }

  console.log('[VideoGenerateNode] ✅ 批量任务已提交:', {
    totalJobs: submitBatchResult.data.totalJobs,
    submittedJobs: submitBatchResult.data.submittedJobs
  });

  // 🎯 步骤3: 创建单个 BatchResultNode 显示批量进度
  createBatchResultNode(batchId, sentences, submitBatchResult.data);

  setStatus('batch-submitted');
  setBatchId(batchId);
};
```

**关键点**:
1. **使用 BatchQueue API**: `/api/batch/create` → `/api/batch/:batchId/submit`
2. **后端队列式提交**: 后端处理队列式提交，前端只需调用一次 API
3. **批量轮询**: 后端 `/api/batch/:batchId/poll` 一次性查询所有任务状态
4. **避免限流**: 后端统一管理轮询，避免多个前端并发查询

---

### 步骤3: 创建单个 BatchResultNode 显示批量进度

**文件**: `src/client/src/nodes/process/VideoGenerateNode.jsx` + 新建 `src/client/src/nodes/output/BatchResultNode.jsx`

```javascript
/**
 * 创建批量结果节点
 */
const createBatchResultNode = (batchId, sentences, submitData) => {
  const { addNodes, addEdges, getNodes } = useReactFlow();

  const sourceNode = getNodes().find(n => n.id === nodeId);
  const posX = sourceNode.position.x + 400;
  const posY = sourceNode.position.y;

  const newNodeId = `batchresult-${batchId}`;

  const newNode = {
    id: newNodeId,
    type: 'batchResultNode',  // ⭐ 新节点类型
    position: { x: posX, y: posY },
    data: {
      batchId: batchId,
      platform: apiConfig.platform,
      totalJobs: submitData.totalJobs,
      submittedJobs: submitData.submittedJobs,
      jobs: submitData.jobs,  // [{ jobId, taskId }, ...]
      sentences: sentences,
      connectedSourceId: nodeId,
    }
  };

  addNodes(newNode);

  const newEdge = {
    id: `edge-${nodeId}-${newNodeId}`,
    source: nodeId,
    target: newNodeId,
    sourceHandle: 'batch-output',
    targetHandle: 'batch-input',
  };

  addEdges(newEdge);

  console.log('[VideoGenerateNode] ✅ 创建 BatchResultNode:', {
    newNodeId,
    totalJobs: submitData.totalJobs
  });
};
```

**新节点**: BatchResultNode.jsx - 批量结果节点
```javascript
/**
 * 批量结果节点 - 显示所有批量任务的进度
 */
function BatchResultNode({ data }) {
  const { batchId, platform, totalJobs, jobs, sentences } = data;
  const [polling, setPolling] = useState(true);
  const [completedJobs, setCompletedJobs] = useState([]);

  // 轮询批量任务状态
  useEffect(() => {
    if (!polling) return;

    const pollInterval = setInterval(async () => {
      const response = await fetch(`${API_BASE}/api/batch/${batchId}/poll`);
      const result = await response.json();

      if (result.success) {
        const { completedJobs: completed, jobs: allJobs } = result.data;
        setCompletedJobs(completed);

        // 检查是否全部完成
        if (completed.length === totalJobs) {
          setPolling(false);
          console.log('[BatchResultNode] ✅ 所有任务已完成');
        }
      }
    }, 30000); // 30秒轮询一次

    return () => clearInterval(pollInterval);
  }, [batchId, totalJobs, polling]);

  return (
    <div style={{ padding: '10px', width: '320px' }}>
      {/* 标题 */}
      <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
        🎬 批量任务结果 ({platform})
      </div>

      {/* 进度 */}
      <div style={{ fontSize: '12px', marginBottom: '10px' }}>
        进度: {completedJobs.length}/{totalJobs} 完成
      </div>

      {/* 任务列表 */}
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {jobs.map((job, index) => {
          const completed = completedJobs.find(j => j.jobId === job.jobId);
          const sentence = sentences[index];

          return (
            <div key={job.jobId} style={{
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              padding: '8px',
              marginBottom: '8px',
              backgroundColor: completed ? '#f0fdf4' : '#ffffff'
            }}>
              {/* 任务标题 */}
              <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>
                视频 {index + 1}
              </div>

              {/* 句子预览 */}
              {sentence && (
                <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>
                  💡 {sentence.text?.substring(0, 50)}...
                </div>
              )}

              {/* 状态 */}
              <div style={{ fontSize: '10px' }}>
                {completed ? (
                  <span style={{ color: '#16a34a' }}>✓ 完成</span>
                ) : (
                  <span style={{ color: '#ca8a04' }}>⏳ 处理中</span>
                )}
              </div>

              {/* 视频结果 */}
              {completed?.result?.output && (
                <video
                  src={completed.result.output}
                  style={{ width: '100%', marginTop: '4px', borderRadius: '4px' }}
                  muted
                  onMouseEnter={(e) => e.currentTarget.play()}
                  onMouseLeave={(e) => {
                    e.currentTarget.pause();
                    e.currentTarget.currentTime = 0;
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**关键点**:
1. **单个节点**: 只创建一个 BatchResultNode 显示所有任务
2. **批量轮询**: 后端 `/api/batch/:batchId/poll` 一次性返回所有任务状态
3. **避免限流**: 只有一个前端轮询请求，而不是9个
4. **简化管理**: 所有任务状态在一个节点中管理

---

### 步骤4: 事件系统扩展

**文件**: `src/client/src/nodes/process/NarratorProcessorNode.jsx`

**优化完成后派发事件**:
```javascript
// ⭐ 派发批量优化完成事件
window.dispatchEvent(new CustomEvent('narrator-optimization-complete', {
  detail: {
    nodeId,
    sentencesCount: results.length,
    successCount: results.filter(r => r.optimized).length,
    sentences: results  // ⭐ 传递完整句子数组
  }
}));
```

**文件**: `src/client/src/nodes/process/VideoGenerateNode.jsx`

**监听优化完成事件**:
```javascript
useEffect(() => {
  const handleOptimizationComplete = (event) => {
    const { nodeId: sourceNodeId, sentences } = event.detail;

    // 验证事件来源
    const edges = getEdges();
    const narratorEdge = edges.find(
      e => e.source === sourceNodeId && e.target === nodeId
    );

    if (narratorEdge && sentences && sentences.length > 1) {
      // 🎯 检测到批量模式
      console.log('[VideoGenerateNode] 🎬 检测到批量模式:', sentences.length);

      // 自动开始批量生成
      generateBatchVideos(sentences);
    }
  };

  window.addEventListener('narrator-optimization-complete', handleOptimizationComplete);
  return () => {
    window.removeEventListener('narrator-optimization-complete', handleOptimizationComplete);
  };
}, [getEdges, nodeId]);
```

**文件**: `src/client/src/nodes/process/VideoGenerateNode.jsx`

**添加批量输出端口**:
```javascript
<Handle
  type="source"
  position={Position.Right}
  id="batch-output"
  style={{ top: '50%', background: '#8b5cf6' }}
/>
```

---

### 步骤5: 注册新节点类型

**文件**: `src/client/src/App.jsx` 或 `src/client/index.js`

**注册 BatchResultNode**:
```javascript
import BatchResultNode from './nodes/output/BatchResultNode';

const nodeTypes = {
  // ... 其他节点
  batchResultNode: BatchResultNode,
};
```

---

## ⚠️ 潜在问题和解决方案

### 问题1: 后端 BatchQueue API 是否已实现

**场景**: 后端 `/api/batch/*` 端点可能未实现或不完整

**解决方案**: 先检查后端实现
```javascript
// 检查文件: src/server/batch-queue.js
// 检查端点: src/server/index.js 中是否注册 /api/batch/* 路由
```

### 问题2: 并发优化可能导致 API 限流

**场景**: 同时调用 9 次 OpenAI 优化 API 可能被限流

**解决方案**: 分批并发（可选）
```javascript
// 如果遇到限流，可以使用分批并发
const BATCH_SIZE = 3;
for (let i = 0; i < tempSentences.length; i += BATCH_SIZE) {
  const batch = tempSentences.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map(optimizeSentence));
}
```

### 问题3: 工作流保存问题

**场景**: 动态创建的 BatchResultNode 未保存到工作流

**解决方案**: 动态创建节点后，立即保存工作流
```javascript
// 在 addNodes 后调用
const currentWorkflowName = WorkflowStorage.getCurrentWorkflowName();
if (currentWorkflowName) {
  WorkflowStorage.saveWorkflow(currentWorkflowName, getNodes(), getEdges());
}
```

---

## 📊 文件修改清单

| 文件 | 修改内容 | 优先级 |
|------|----------|--------|
| `NarratorProcessorNode.jsx` | 并发优化逻辑改造（Promise.all） | ⭐⭐⭐ |
| `VideoGenerateNode.jsx` | 新增批量生成功能、批量输出端口、监听批量事件 | ⭐⭐⭐ |
| `BatchResultNode.jsx` | 新建批量结果节点 | ⭐⭐⭐ |
| `App.jsx` 或 `index.js` | 注册 BatchResultNode 节点类型 | ⭐⭐ |
| `App.jsx` | 批量节点自动保存 | ⭐⭐ |

---

## ✅ 验证测试场景

### 测试场景1: 基本批量生成

```
1. 连接 NarratorNode → NarratorProcessorNode → VideoGenerateNode
2. 在 NarratorNode 输入9句旁白
3. 点击 "🚀 全部优化"
4. 观察并发优化进度（应该更快完成）
5. 优化完成后，VideoGenerateNode 自动批量生成
6. 验证：创建1个 BatchResultNode
7. 验证：BatchResultNode 显示所有9个任务的进度
8. 验证：只有1个轮询请求（避免API限流）
9. 等待视频生成完成
10. 验证：所有9个视频正确显示
```

### 测试场景2: 部分失败处理

```
1. 模拟第3个句子优化失败
2. 验证：批量生成只包含8个有效任务
3. 验证：BatchResultNode 正确显示进度（8/9）
4. 验证：失败的句子显示错误信息
```

### 测试场景3: 工作流持久化

```
1. 完成批量生成后
2. 刷新页面
3. 验证：BatchResultNode 正确恢复
4. 验证：所有视频结果正确显示
```

### 测试场景4: 性能测试

```
1. 测试并发优化性能（vs 串行）
2. 验证：并发优化时间 < 串行优化时间
3. 验证：内存占用合理
4. 验证：只有1个轮询请求（而非9个）
```

---

## 🎯 总结

这个方案重新设计了批量生成视频功能，解决了 API 限流问题：

✅ **并发优化**: 使用 Promise.all 并发优化旁白（提升性能）
✅ **后端批量 API**: 使用 `/api/batch/create` 和 `/api/batch/:batchId/submit`（后端队列式提交）
✅ **批量轮询**: 后端 `/api/batch/:batchId/poll` 一次性查询所有任务状态
✅ **单节点显示**: 一个 BatchResultNode 显示所有任务进度
✅ **避免限流**: 只有1个前端轮询请求，而非9个独立请求

### 关键优势

1. **性能提升**: 并发优化可大幅缩短优化时间（9句 × 平均30秒 = 4.5分钟 → 并发后约30-60秒）
2. **避免限流**: 后端统一管理批量任务，避免多个前端并发查询
3. **简化管理**: 所有任务状态在一个节点中显示
4. **向后兼容**: 不影响现有的单任务生成流程
5. **角色匹配**: 保持现有角色匹配逻辑不变

### 与原方案的主要区别

| 维度 | 原方案（多 TaskResultNode） | 新方案（BatchResultNode） |
|------|---------------------------|---------------------------|
| **结果节点** | 9个独立的 TaskResultNode | 1个 BatchResultNode |
| **轮询方式** | 9个独立轮询（可能限流） | 1个批量轮询（后端处理） |
| **API使用** | 循环调用单个任务 API | 使用 BatchQueue API |
| **状态管理** | 分散在9个节点 | 集中在1个节点 |

---

**最后更新**: 2026-01-13
**状态**: 批准执行
