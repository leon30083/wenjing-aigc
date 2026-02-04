# 自动化编程规则

> **版本**: v1.0.0
> **创建日期**: 2026-02-04
> **目的**: 定义 AI 和开发者如何协作完成编程任务

---

## 概述

本文档定义 WinJin 项目的自动化编程规范，明确 AI 和用户的职责边界，确保高效的协作开发流程。

**核心原则**: **用户手动管理服务器，AI 负责代码开发和自动化测试** ⭐ 重要

---

## 1. 触发规则（何时自动触发）

### 1.1 批量任务提交 ⭐ 高优先级

**触发条件**: 用户提交批量视频生成任务

**自动执行**:
```javascript
// 检测到批量任务提交
if (action === 'batch_submit' || nodeType === 'BatchVideoGenerateNode') {
  // ✅ 立即启动自动监控
  autoMonitor.batchTask(batchId, {
    pollInterval: 10000,        // 10 秒轮询
    maxDuration: 300000,        // 5 分钟超时
    onProgress: (status) => {
      console.log(`[自动监控] 进度: ${status.completed}/${status.total}`);
    },
    onComplete: (result) => {
      // ✅ 自动生成测试报告
      generateTestReport({
        type: 'batch-video-generation',
        batchId: batchId,
        result: result,
        timestamp: new Date().toISOString()
      });
    },
    onError: (error) => {
      // ✅ 自动错误分析
      analyzeError(error, {
        suggestFix: true,
        runRelatedTests: true
      });
    }
  });
}
```

**监控内容**:
- 批量任务状态（每 10 秒）
- 各子任务进度
- HTTP 错误检测
- 视频生成完成状态

**输出**:
- 控制台实时进度日志
- 完成后自动生成测试报告
- 错误时自动分析和修复建议

---

### 1.2 代码修改后

**触发条件**: 检测到代码文件修改

**自动执行**:
```javascript
// 文件变化监控
watch('src/client/src/nodes/**/*.jsx', (filePath) => {
  if (filePath.includes('NarratorNode.jsx')) {
    // ✅ 自动运行节点测试
    runTest('node-infinite-loop', {
      detect: ['useEffect', 'useCallback'],
      checkDependencies: true,
      verifyStability: true
    });
  }

  if (filePath.includes('BatchVideoGenerateNode.jsx')) {
    // ✅ 自动验证 API 参数
    runTest('api-params-validation', {
      platforms: ['juxin', 'zhenzhen'],
      verifyParameters: true
    });
  }
});
```

---

### 1.3 错误检测

**触发条件**: 控制台出现错误

**自动执行**:
```javascript
// 全局错误监听
window.addEventListener('error', (event) => {
  autoDiagnose(event.error, {
    categorize: true,           // 自动分类错误
    searchKnowledgeBase: true,   // 搜索错误模式库
    suggestFix: true,            // 建议修复方案
    runTests: 'related'          // 运行相关测试
  });
});

// React 错误监听
window.addEventListener('unhandledrejection', (event) => {
  // Promise rejection
  autoDiagnose(event.reason, {
    type: 'promise',
    checkAsyncCode: true
  });
});
```

---

### 1.4 用户指令识别

**触发条件**: 用户消息包含特定关键词

**自动执行**:
```javascript
// 关键词 → 自动化操作
const TRIGGER_WORDS = {
  '监控|观察|跟踪': 'startAutoMonitoring',
  '测试|验证|检查': 'runAutomatedTest',
  '提交|生成|创建': 'monitorAndReport',
  '错误|问题|失败': 'analyzeError',
  '跳|闪烁|抖动': 'detectRenderLoop'
};

function detectUserIntent(message) {
  for (const [pattern, action] of Object.entries(TRIGGER_WORDS)) {
    if (new RegExp(pattern).test(message)) {
      console.log(`[自动触发] 检测到意图: ${action}`);
      return action;
    }
  }
}
```

---

### 1.5 工作流加载

**触发条件**: 工作流加载完成

**自动执行**:
```javascript
// 工作流加载后自动验证
workflow.on('loaded', (workflow) => {
  // ✅ 自动验证工作流
  validateWorkflow(workflow, {
    checkNodes: true,
    checkEdges: true,
    checkDataFlow: true,
    reportIssues: true
  });
});
```

---

## 2. 测试规则（如何进行自动化测试）

### 2.1 MCP 工具优先 ⭐ 核心原则

**优先使用 MCP Chrome DevTools**:
- 自动化：点击、输入、截图、检查
- 人工协作：连线、拖拽
- 减少用户干预，提高开发效率

**测试前检查清单**:
- [ ] 后端服务器运行在 9000 端口
- [ ] 前端开发服务器运行在 5173 端口
- [ ] 浏览器访问 http://localhost:5173/
- [ ] 无 `nul` 文件干扰 (Windows)

---

### 2.2 标准测试流程

```
开发完成后
├─ 1. 访问 http://localhost:5173/
├─ 2. 获取页面快照（take_snapshot）
├─ 3. 执行自动化操作
│   ├─ fill() - 填写表单
│   ├─ click() - 点击按钮
│   ├─ evaluate_script() - 检查状态
│   └─ wait_for() - 等待结果
├─ 4. 验证结果
│   ├─ take_screenshot() - 截图保存
│   ├─ list_console_messages() - 检查错误
│   └─ list_network_requests() - 检查 API
└─ 5. 用户协作（如需要）
    ├─ 请求用户协助连线/拖拽
    └─ 继续自动化测试
```

---

### 2.3 测试检查清单

**功能测试**（自动化）:
- [ ] 页面加载成功（无 console 错误）
- [ ] 节点显示正常（截图验证）
- [ ] 表单输入响应（fill + click）
- [ ] API 请求正确（list_network_requests）
- [ ] 数据更新及时（evaluate_script 检查状态）

**用户协作测试**:
- [ ] 节点连线功能（用户协助）
- [ ] 节点拖拽功能（用户协助）
- [ ] 节点删除功能（用户协助）

---

## 3. 质量规则（代码质量标准）

### 3.1 提交前检查

**AI 职责**:
- 代码格式化检查
- 类型检查
- 文档更新验证
- 错误模式匹配

**检查清单**:
- [ ] 代码符合 code.md 规范
- [ ] 无控制台错误或警告
- [ ] API 参数验证通过
- [ ] 相关文档已更新

---

### 3.2 错误模式管理

**新增错误时**:
- 添加到对应的 error-patterns 文件
- 添加类型标签（1-2个）
- 更新快速索引表
- 高频错误添加到 SKILL.md

**错误类型标签**:
- `API` - API 调用、端点、参数
- `React Flow` - 节点、连线、数据传递
- `Character` - 角色引用、显示
- `Form` - 表单字段、输入验证
- `Storage` - localStorage、持久化
- `UI` - 渲染、显示问题
- `Other` - 其他类型

---

## 4. 协作规则（AI 与用户分工）

### 4.1 AI 职责 ✅

**代码开发**:
- 编写符合规范的代码
- 自动化测试验证
- 文档更新
- 错误分析和修复建议

**自动化测试**:
- 使用 MCP 工具在浏览器中测试
- 检查控制台错误
- 验证 API 请求
- 截图保存测试结果

**质量保证**:
- 代码格式化
- 类型检查
- 错误模式匹配
- 最佳实践建议

---

### 4.2 用户职责 ✅

**服务器管理** ⭐ 重要:
- 手动启动/停止服务器
- 使用脚本（start-dev.bat / stop-dev.bat）
- 端口清理（如需要）
- 配置管理

**手动测试**:
- 节点连线（React Flow 拖拽）
- 节点拖拽（位置调整）
- 复杂交互操作
- UI 效果验证

**代码审查**:
- 审查 AI 生成的代码
- 批准计划变更
- 反馈问题和建议
- 最终测试验证

---

### 4.3 禁止操作 🚨

**AI 绝对禁止**:
```bash
# ❌ 危险：会杀掉所有 Node.js 进程，包括 Claude Code 自身！
taskkill /F /IM node.exe          # Windows
killall node                       # Linux/Mac
pkill -9 node                      # Linux/Mac
```

**真实案例** (2026-01-23):
```
用户请求: "停止当前服务"
AI 执行: taskkill /F /IM node.exe
结果: Claude Code 立即崩溃，用户需要重新进入
```

**原因**: 这些命令会杀掉**所有** Node.js 进程，包括 Claude Code 自身。

---

## 5. 自动化测试报告

### 5.1 报告生成规则

**触发时机**:
1. 批量任务完成（成功或失败）
2. 测试执行完成
3. 错误分析完成

**报告模板**:
```markdown
# {测试类型} 测试报告

> **时间**: {timestamp}
> **任务 ID**: {batchId}
> **平台**: {platform}

## 测试概述

- **节点配置**: ✅ 通过
- **API 调用**: ✅ 成功
- **任务提交**: ✅ 成功
- **结果验证**: ⏳ 等待中

## 详细进度

| 时间 | 事件 | 状态 |
|------|------|------|
| 14:30:25 | 提交批量任务 | ✅ |
| 14:30:26 | 任务 1 已提交 | ✅ |
| 14:30:27 | 任务 2 已提交 | ✅ |
| 14:30:28 | 任务 3 已提交 | ✅ |

## 错误日志

{如果有错误}

## 测试结论

{总结和建议}
```

---

## 6. 最佳实践

### 6.1 主动测试

```
✅ 推荐：开发完成后主动启动测试
AI: "✅ 功能开发完成，正在启动自动化测试..."
    take_snapshot() → 执行操作 → 验证结果 → 生成报告

❌ 避免：等待用户要求测试
AI: "功能已完成，是否需要测试？"
    User: "是的，请测试"
    AI: [才开始测试]
```

---

### 6.2 错误诊断流程

```
检测到错误
    ↓
1. 记录错误信息（console_messages）
    ↓
2. 截图保存现场（take_screenshot）
    ↓
3. 分析根本原因
    ↓
4. 搜索错误模式库（error-patterns）
    ↓
5. 提供修复方案
    ↓
6. 实施修复
    ↓
7. 重新测试直到通过
```

---

### 6.3 文档同步

**每次开发完成后**:
1. 更新 error-patterns（新增错误）
2. 更新 SKILL.md（开发提示）
3. 更新 code.md（代码示例）
4. 更新 开发交接书.md（版本记录）

**同步时机**:
- ✅ 新功能实现完成
- ✅ 功能测试通过
- ✅ 代码已提交到 Git
- ✅ 发现并修复重大 Bug

---

## 7. 相关文档

### 上层文档
- [快速参考](./quick-reference.md) - 开发流程和测试规范
- [测试规范](./testing.md) - 测试工作流文件规范
- [服务器管理](./server-management.md) - 服务器手动管理规范

### 并行文档
- [错误模式参考](./error-patterns/) - 所有已知的错误模式
- [开发规范](../skills/winjin-dev/SKILL.md) - WinJin 开发技能

### 外部参考
- [MCP Chrome DevTools 文档](https://github.com/modelcontextprotocol/servers)
- [React Flow 官方文档](https://reactflow.dev/)

---

## 8. 完整验证机制 ⭐⭐⭐ 核心原则

> **重要**: 这是项目开发的**基础标准范式**，所有开发完成后必须经过自动化测试验证！

### 8.1 强制验证流程

**每次开发完成后，必须执行**:

1. **MCP 自动化测试**
   - 访问 http://localhost:5173/
   - 获取页面快照
   - 执行功能操作
   - 截图验证结果
   - 检查控制台日志
   - 检查 API 请求

2. **生成测试报告**
   - 记录测试时间
   - 记录测试步骤
   - 记录测试结果
   - 附上截图证据

3. **失败处理**
   - 分析问题原因
   - 修复代码
   - 重新测试直到通过

### 8.2 绝对禁止的行为

❌ **禁止**: 开发完成后直接说"功能完成"
❌ **禁止**: 不进行测试就声称成功
❌ **禁止**: 忽略控制台错误
❌ **禁止**: 忽略 API 请求失败

✅ **必须**: 使用 MCP 工具完整验证
✅ **必须**: 生成测试报告
✅ **必须**: 截图保存证据
✅ **必须**: 直到测试通过才结束

### 8.3 测试检查清单

**基础验证**:
- [ ] 页面加载成功（无 console 错误）
- [ ] 节点显示正常（截图验证）
- [ ] 表单输入响应

**配置验证**（新增）⭐:
- [ ] 配置来源正确（Context 优先）
- [ ] 配置修改后立即生效
- [ ] 刷新后配置保持
- [ ] 所有节点使用相同配置（不分散）

**API 验证**（新增）⭐:
- [ ] 端点路径符合官方文档
- [ ] 请求参数符合平台要求
- [ ] 响应格式正确处理
- [ ] 错误响应正确处理

**MCP 测试工具**（新增）⭐:
- [ ] 使用 tests/mcp-test-helpers.js 进行测试
- [ ] 测试报告生成到 tests/reports/
- [ ] 报告包含时间、步骤、结果
- [ ] 报告包含截图证据

---

### 6.4 调试案例：错误56 - useState 异步闭套问题 ⭐ 2026-02-04 新增

> **学习价值**: ⭐⭐⭐ - 这个案例展示了 React 中 useState 异步更新的经典陷阱和解决方案

#### 问题描述

**现象**:
- 用户在平台管理面板添加新模型（如 `gemini-3-pro-preview`）
- 添加成功后立即点击"测试"按钮
- 测试失败，错误信息：`❌ 测试失败: 缺少必要的 API 配置参数`
- 网络请求显示：`{"api_key":"","model":"gemini-3-pro-preview"}`（API Key 为空字符串）

**用户反馈**: "我填写的api key,如果没有，表示我填写的key没有生效，仍然是有问题的"

#### 根本原因分析

**数据流混乱的真相**:
```
添加模型:
  newModel.apiKey = "sk-xxx"  ✅ 用户填写
    ↓
  setNewModel({ name: '', apiKey: '' })  ❌ 添加成功后清空
    ↓
  reloadConfig() 启动（异步）  ⚠️ 尚未完成
    ↓
  点击测试:
  handleTestModel() {
    // ❌ newModel.apiKey 已经是空字符串
    // ❌ currentPlatforms 还没有新模型（reloadConfig 未完成）
    // 结果：api_key = ""
  }
```

**核心技术问题**:
1. **useState 异步更新**: `setNewModel()` 是异步的，在下一个渲染周期才生效
2. **闭包陷阱**: useEffect 或事件处理中的 `newModel` 是旧的闭包值
3. **时序问题**: `reloadConfig()` 需要时间完成，但用户立即点击测试

#### 诊断步骤

**1. 控制台日志定位**
```javascript
// 在 handleTestModel 中添加日志
console.log('[PlatformManagePanel] newModel.apiKey:', newModel.apiKey);
// 输出: "" （空字符串）❌

console.log('[PlatformManagePanel] platforms[platformKey].models[modelId]:', platforms[platformKey].models[modelId]);
// 输出: undefined （模型不存在）❌
```

**2. 网络请求验证**
```bash
# 使用 MCP 工具检查网络请求
mcp__chrome_devtools__list_network_requests()

# 查看请求体
# ❌ 错误: {"api_key":"","model":"gemini-3-pro-preview"}
```

**3. 确认问题类型**
- ❌ 不是后端验证问题（后端正确检查了参数）
- ❌ 不是 API Key 格式问题
- ✅ **前端状态管理问题**（useState 异步闭套）

#### 解决方案：方案 A - useRef 存储配置

**核心思想**: 使用 ref 存储配置，避免 useState 异步更新导致的闭套问题

**实施步骤**:

**步骤 1**: 添加 ref 存储刚保存的 API Key
```javascript
const justSavedModelKeyRef = useRef(null); // { platformKey, modelId, apiKey }
```

**步骤 2**: 在保存成功后设置 ref
```javascript
const handleAddModel = async () => {
  const response = await fetch('/api/config/platforms/...');

  if (result.success) {
    // ⭐ 保存 API Key 到 ref（在清空 newModel 之前）
    const savedApiKey = newModel.apiKey || '';
    justSavedModelKeyRef.current = {
      platformKey: selectedPlatformKey,
      modelId: newModel.name,
      apiKey: savedApiKey
    };

    // 清空表单
    setNewModel({ name: '', type: 'sora', apiKey: '' });

    // 重新加载配置
    await reloadConfig();
  }
};
```

**步骤 3**: 测试时使用优先级系统
```javascript
const handleTestModel = async (platformKey, modelId, baseURL) => {
  let apiKey = '';

  // ⭐ 优先级 1: 检查刚保存的 API Key（ref）
  if (justSavedModelKeyRef.current &&
      justSavedModelKeyRef.current.platformKey === platformKey &&
      justSavedModelKeyRef.current.modelId === modelId) {
    apiKey = justSavedModelKeyRef.current.apiKey || '';
    console.log('[PlatformManagePanel] 使用刚保存的 API Key (ref)');
  }
  // 优先级 2: 检查表单中的值（正在输入）
  else if (newModel.apiKey && newModel.apiKey.trim()) {
    apiKey = newModel.apiKey.trim();
  }
  // 优先级 3: 使用已保存的配置
  else {
    apiKey = platforms[platformKey]?.models?.[modelId]?.apiKey || '';
  }

  // 发送请求
  const response = await fetch('/api/openai/test', {
    method: 'POST',
    body: JSON.stringify({ base_url: baseURL, api_key: apiKey, model: modelId }),
  });
};
```

**步骤 4**: 添加配置恢复和同步逻辑
```javascript
// 恢复：从下游节点恢复配置
useEffect(() => {
  const edges = getEdges();
  const outgoingEdges = edges.filter(e => e.source === nodeId);

  if (outgoingEdges.length > 0) {
    const targetNode = getNodes().find(n => n.id === edge.target);
    if (targetNode?.data?.apiConfig) {
      updateConfig(targetNode.data.apiConfig);
      isRecoveryDoneRef.current = true;
    }
  }
}, [nodeId, getEdges, getNodes, updateConfig]);

// 同步：将配置同步到下游节点
useEffect(() => {
  if (!isRecoveryDoneRef.current) return; // 等待恢复完成

  const edges = getEdges();
  const outgoingEdges = edges.filter(e => e.source === nodeId);

  if (outgoingEdges.length > 0) {
    setNodes((nds) =>
      nds.map((node) => {
        const isConnected = outgoingEdges.some(e => e.target === node.id);
        if (isConnected) {
          return { ...node, data: { ...node.data, apiConfig: config } };
        }
        return node;
      })
    );
  }
}, [config, nodeId, getEdges, getNodes, setNodes]);
```

#### 验证结果

**修复前**:
```
❌ 测试失败: 缺少必要的 API 配置参数
❌ 网络请求: {"api_key":"","model":"gemini-3-pro-preview"}
```

**修复后**:
```
✅ 测试成功: 连接成功
✅ 网络请求: {"api_key":"sk-Q6Dw...","model":"gemini-3-pro-preview"}
✅ 控制台日志: [PlatformManagePanel] 使用刚保存的 API Key (justSavedModelKey)
```

#### 关键经验总结 ⭐

**1. 识别 useState 异步闭套问题的特征**:
   - 状态在设置后立即使用仍为旧值
   - 异步操作（如 API 调用）完成前使用状态
   - 表单清空后需要立即使用旧值

**2. useRef vs useState 选择原则**:
   - **useState**: 用于 UI 渲染（需要触发重渲染）
   - **useRef**: 用于临时存储（不触发重渲染，避免闭套问题）

**3. 优先级系统设计模式**:
   ```javascript
   // ⭐ 通用模式：多层降级策略
   const value =
     firstChoiceSource ||    // 优先级1：刚操作的值（ref）
     secondChoiceSource ||   // 优先级2：表单中的值（state）
     thirdChoiceSource;     // 优先级3：已保存的值（props/storage）
   ```

**4. 调试技巧**:
   - 使用控制台日志追踪数据流
   - 使用网络请求检查实际发送的参数
   - 使用 MCP 工具截图保存现场
   - 优先检查前端状态管理逻辑，而非后端验证

**5. 适用场景**:
   - 任何需要"保存后立即使用"的场景
   - 异步操作完成前需要使用中间值
   - 表单清空但需要保留部分数据
   - 配置恢复和同步逻辑

#### 相关错误模式

- **错误56**: API 配置节点平台选择刷新后丢失 `React Flow` `状态` `持久化`
- 文件: `.claude/rules/error-patterns/reactflow-errors.md`

---

**最后更新**: 2026-02-04
**维护者**: WinJin AIGC Team
**版本**: v1.2.0
