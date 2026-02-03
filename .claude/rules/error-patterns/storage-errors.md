# 存储/持久化相关错误模式

> **说明**: localStorage、工作流持久化、配置丢失相关的错误模式

---

## 错误18: localStorage 数据未验证 `Storage` `数据验证` ⭐

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

## 错误19: 导入工作流未验证 JSON 格式 `Storage` `数据验证` ⭐

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

## 错误33: 工作流快照持久化时机问题 `Storage` `状态同步` ⭐

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

## 错误20: 视频生成时长参数类型错误 `API` `参数类型` ⭐

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

## 错误50: OpenAI 配置持久化丢失 `Storage` `持久化` ⭐⭐ 2026-01-07 新增

**现象**: 服务重启后，OpenAI 配置节点连接丢失，PromptOptimizerNode 显示"⚠️ 未连接配置节点"

**根本原因**:
OpenAIConfigNode 初始化时使用了错误的优先级顺序，localStorage 全局配置覆盖了 node.data 工作流配置

```javascript
// ❌ 错误：localStorage 优先级高于 node.data
const [config, setConfig] = useState(() => {
  // 1. ❌ 优先 localStorage（全局配置）
  try {
    const local = localStorage.getItem('winjin-openai-config');
    if (local) {
      return JSON.parse(local);  // 覆盖了 node.data.openaiConfig
    }
  } catch (error) {
    console.error('[OpenAIConfigNode] 读取 localStorage 失败:', error);
  }

  // 2. 降级到 node.data
  const saved = data.savedConfig || {};
  return {
    base_url: saved.base_url || 'http://170.106.152.118:2999',
    api_key: saved.api_key || 'sk-PdoHKdR3XKgiLzYRk3mxfgiYpJbC24JTLmwP0hv07nOE4QaE',
    model: saved.model || 'gemini-2.5-pro-maxthinking',
  };
});

// ✅ 正确：node.data 优先级高于 localStorage
const [config, setConfig] = useState(() => {
  // 1. ✅ 优先 node.data.openaiConfig（工作流专属配置）
  if (data.openaiConfig) {
    console.log('[OpenAIConfigNode] 使用 node.data 配置:', data.openaiConfig);
    return data.openaiConfig;
  }

  // 2. ⚠️ 降级到 localStorage（全局配置，仅作为备份）
  try {
    const local = localStorage.getItem('winjin-openai-config');
    if (local) {
      const parsed = JSON.parse(local);
      console.log('[OpenAIConfigNode] 降级到 localStorage 配置:', parsed);
      return parsed;
    }
  } catch (error) {
    console.error('[OpenAIConfigNode] 读取 localStorage 失败:', error);
  }

  // 3. ⚠️ 最后降级到空配置（不使用硬编码测试数据）
  console.log('[OpenAIConfigNode] 使用默认空配置');
  return {
    base_url: '',
    api_key: '',
    model: '',
  };
});
```

**关键点**:
1. **优先级调整**: node.data.openaiConfig → localStorage → 空配置
2. **移除硬编码测试数据**: 返回空配置而非硬编码值
3. **添加调试日志**: 记录配置来源（node.data / localStorage / 默认）
4. **延迟同步**: 添加 100ms 延迟确保 App.jsx 完成工作流加载后再同步

**修复位置**: `src/client/src/nodes/input/OpenAIConfigNode.jsx` (Lines 13-40, 124-137)

**相关错误**: 错误33 - 工作流快照持久化时机问题

**修复日期**: 2026-01-07

---

## 错误53: NarratorProcessorNode 优化结果刷新后丢失 `Storage` `持久化` `工作流` ⭐⭐⭐ 2026-01-08 新增

**现象**:
- NarratorProcessorNode 完成优化后（9/9 100%），刷新页面优化结果丢失
- 优化进度回到 0/9 (0%)，优化结果为空
- 用户每次刷新都需要重新优化，严重影响开发效率

**根本原因**:
1. **工作流未自动保存**: React Flow 的 `node.data` 不会自动保存到 localStorage
2. **需要显式保存**: 用户必须手动点击"💾 保存工作流"按钮
3. **UI 状态未恢复**: 虽然优化数据被同步到 `node.data`，但 `progress`、`currentPrompt` 等运行时状态未恢复

**错误示例**:
```javascript
// ❌ 错误：只同步 sentences，不保存工作流
useEffect(() => {
  setNodes((nds) =>
    nds.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            data: {
              ...node.data,
              sentences,  // ❌ 只同步到内存中的 node.data
            }
          }
        : node
    )
  );
}, [sentences]);
// ❌ 刷新后，localStorage 中的工作流没有包含优化结果
```

**正确示例**:
```javascript
// ✅ 正确：优化完成后派发事件，自动保存工作流
const optimizeAllSentences = async () => {
  // ... 优化逻辑 ...

  setSentences(tempSentences);

  // ⭐ 派发事件通知 App.jsx 自动保存工作流
  window.dispatchEvent(new CustomEvent('narrator-optimization-complete', {
    detail: { nodeId, sentencesCount: results.length }
  }));
};

// ✅ App.jsx 监听事件并自动保存
useEffect(() => {
  const handleOptimizationComplete = (event) => {
    const { nodeId, sentencesCount } = event.detail;
    const result = WorkflowStorage.saveWorkflow(workflowName, nodes, edges);
    if (result.success) {
      console.log(`✅ 工作流已自动保存`);
    }
  };

  window.addEventListener('narrator-optimization-complete', handleOptimizationComplete);
  return () => {
    window.removeEventListener('narrator-optimization-complete', handleOptimizationComplete);
  };
}, [nodes, edges, currentWorkflowName]);

// ✅ 刷新后恢复 UI 状态
useEffect(() => {
  const hasOptimizedData = sentences.some(s => s.optimized);
  if (hasOptimizedData) {
    // ⭐ 恢复 UI 状态（进度、当前句子）
    const optimizedCount = sentences.filter(s => s.optimized).length;
    const totalCount = sentences.length;
    const restoredProgress = Math.round((optimizedCount / totalCount) * 100);
    setProgress(restoredProgress);

    // 恢复当前索引和提示词
    const savedIndex = data.currentIndex || 0;
    setCurrentIndex(savedIndex);
    if (sentences[savedIndex]?.optimized) {
      setCurrentPrompt(sentences[savedIndex].optimized);
    }
  }
}, [nodeId]);
```

**关键点**:
1. **自动保存机制**: 优化完成后派发事件，App.jsx 自动保存工作流到 localStorage
2. **事件系统**: 使用 `window.dispatchEvent` 派发自定义事件
3. **UI 状态恢复**: 刷新后根据优化数据恢复 `progress`、`currentIndex`、`currentPrompt`
4. **向后兼容**: 检测 `sentences.some(s => s.optimized)` 判断是否有优化数据
5. **防抖依赖**: useEffect 依赖数组避免频繁保存

**修复文件**:
- `src/client/src/nodes/process/NarratorProcessorNode.jsx` (Lines 320-324, 67-78)
- `src/client/src/App.jsx` (Lines 522-570)

**验证结果**:
- ✅ 优化完成后自动保存工作流
- ✅ 刷新后优化结果完全保留（进度、当前句子、优化结果）
- ✅ 无需手动保存，提升开发效率
- ✅ **2026-01-08 验证通过**: 浏览器刷新后显示 "优化进度: 8/9 (89%)"，优化结果完全保留

**相关错误**:
- 错误33 - 工作流快照持久化时机问题
- 错误50 - OpenAI 配置持久化丢失

**修复日期**: 2026-01-08
