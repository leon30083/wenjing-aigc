---
name: winjin-dev
description: WinJin AIGC 项目开发规范和最佳实践。在开发 WinJin AIGC 项目时使用，包含 Sora2 API 集成、React Flow 节点开发、文档更新流程。每次功能开发或 Bug 修复后必须更新文档。
---

# WinJin AIGC 项目开发技能

## 项目概述

WinJin AIGC 是一个基于 Electron + Express 的 AI 视频生成工具，支持 Sora2 视频生成、角色创建、可视化节点工作流编辑器。

**技术栈**:
- 后端: Express.js + Node.js
- 前端: React 19 + React Flow 11.x
- 构建: Vite 7.x
- 桌面: Electron 28.x
- 双平台: 聚鑫 + 贞贞

---

## 🔄 Skill 更新机制（重要）

此 skill 需要随着项目开发持续更新。**每次开发新功能或修复 Bug 后**，都必须更新此 skill 和相关文档。

### 更新流程

1. **开发完成后**，识别需要更新的内容
2. **更新 SKILL.md** - 添加新的错误模式、API 变更等
3. **更新 references/*.md** - 扩展详细文档
4. **提交到 Git** - 将 skill 变更纳入版本控制

### 快速更新指南

```
新增功能或修复 Bug 后：
├── 1. 在 SKILL.md 中添加新的错误模式或规范
├── 2. 在 references/ 中添加详细说明（可选）
├── 3. 运行 git add/commit 提交变更
└── 4. 告诉团队成员 skill 已更新
```

### 必须更新的文档

| 文档 | 何时更新 | 更新内容 |
|------|----------|----------|
| `.claude/skills/winjin-dev/SKILL.md` | 每次开发 | 新增错误模式、API 规范 |
| `.claude/rules/base.md` | API 变更 | 技术规范、端点定义 |
| `.claude/rules/code.md` | 代码变更 | 错误模式、最佳实践 |
| `用户输入文件夹/开发对话/开发交接书.md` | 每次开发 | 版本号、功能列表 |

详细更新流程参见 [references/UPDATE.md](references/UPDATE.md)

---

## 核心开发规范

### 1. API 端点路径 ⚠️ 重要

**错误示例**:
```javascript
// ❌ 缺少 /api/ 前缀
const response = await fetch(`${API_BASE}/task/${taskId}`);
// 返回 404 Not Found
```

**正确示例**:
```javascript
// ✅ 完整的 API 路径
const response = await fetch(`${API_BASE}/api/task/${taskId}`);
// 返回 200 OK
```

**规则**: 所有前端 API 调用必须使用完整路径 `/api/{endpoint}`

### 2. Sora2 API 注意事项 ⭐ 重要 (2026-01-02 更新)

#### 模型名称差异 ⭐ 重要
- **聚鑫平台**: 只支持 `sora-2-all` 一个模型
- **贞贞平台**: 支持 `sora-2` 和 `sora-2-pro` 两个模型
- **自动选择**: 后端根据平台自动选择默认模型
  ```javascript
  // 后端自动选择逻辑
  const finalModel = model || (this.platformType === 'JUXIN' ? 'sora-2-all' : 'sora-2');
  ```
- **手动覆盖**: 前端可以手动指定模型名称（需确保平台支持）

#### 角色创建
```javascript
// ❌ 错误：传递 model 参数会导致 404
await axios.post('/sora/v1/characters', {
  model: 'sora-2',  // ❌ 删除此行
  url: videoUrl,
  timestamps: '1,3'
});

// ✅ 正确：不传递 model 参数
await axios.post('/sora/v1/characters', {
  url: videoUrl,
  timestamps: '1,3'
});

// ✅ 推荐：使用 from_task 参数
await axios.post('/sora/v1/characters', {
  from_task: taskId,
  timestamps: '1,3'
});
```

#### 角色引用格式
```javascript
// 所有平台统一使用 @username 格式（不带花括号）
const prompt = '@6f2dbf2b3.zenwhisper 在工地上干活';
// ❌ 不要使用 @{username}
```

#### 轮询间隔
```javascript
// ✅ 正确：30秒间隔
const POLL_INTERVAL = 30000;

// ❌ 错误：5秒间隔会导致 429 错误
const POLL_INTERVAL = 5000;
```

### 3. React Flow 节点开发

#### 使用 useNodeId() Hook
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

#### useEffect 依赖数组
```javascript
// ❌ 错误：nodes 在依赖中会导致无限循环
useEffect(() => {
  setNodes((nds) => nds.map((node) => ({ ...node, data: newData })));
}, [edges, nodes, setNodes]);

// ✅ 正确：只依赖 edges 和 setNodes
useEffect(() => {
  setNodes((nds) => nds.map((node) => ({ ...node, data: newData })));
}, [edges, setNodes]);
```

#### 节点间数据传递 ⭐ 2026-01-01 更新

**❌ 错误模式**: 依赖 App.jsx 中转
```javascript
// App.jsx (edges 变化时触发)
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
```

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

**事件系统**: 用于跨节点通信（taskId 等异步数据）
```javascript
// 发送节点
window.dispatchEvent(new CustomEvent('video-task-created', {
  detail: { sourceNodeId: nodeId, taskId: id }
}));

// 接收节点
useEffect(() => {
  const handleVideoCreated = (event) => {
    const { sourceNodeId, taskId } = event.detail;
    if (data.connectedSourceId === sourceNodeId) {
      setTaskId(taskId);
    }
  };
  window.addEventListener('video-task-created', handleVideoCreated);
  return () => window.removeEventListener('video-task-created', handleVideoCreated);
}, [data.connectedSourceId]);
```

#### UI设计模式：避免触发模式 ⭐ 2026-01-13 重要

**原则**: 非必要不要使用触发模式（点击按钮才显示输入框）

**❌ 错误模式：触发模式（反人性）**
```javascript
// ❌ 用户需要点击"编辑"按钮才能看到输入框
<div>
  <button onClick={() => setEditing(true)}>✏️ 编辑</button>
  {isEditing && (
    <textarea value={text} onChange={(e) => setText(e.target.value)} />
    <button onClick={save}>✓ 保存</button>
    <button onClick={cancel}>✕ 取消</button>
  )}
</div>
```

**问题**:
- 额外的点击操作
- 需要保存/取消按钮
- 用户体验差（"反人性"）

**✅ 正确模式：直接编辑（参考VideoGenerateNode）**
```javascript
// ✅ 直接显示输入框，用户可以立即编辑
<textarea
  value={text}
  onChange={(e) => setText(e.target.value)}
  placeholder="输入提示词..."
/>

{/* 实时预览最终结果 */}
{text && (
  <div>
    📤 最终提示词: {text}
  </div>
)}
```

**优点**:
- 无需额外点击
- 实时保存（onChange自动更新）
- 用户体验流畅
- UI简洁直观

**应用场景**:
- **VideoGenerateNode**: 提示词输入框始终显示
- **BatchVideoGenerateNode**: 每个句子的textarea始终显示
- **PromptOptimizerNode**: 优化结果直接显示，无需点击查看

**例外情况**（需要触发模式）:
- 确认对话框（删除操作）
- 模态框（复杂配置）
- 折叠面板（节省空间）

### 4. 代码风格

- **缩进**: 2 空格
- **引号**: 单引号 `'`
- **分号**: 必须使用
- **命名**: camelCase / PascalCase / kebab-case

### 5. API 设计

- 使用 async/await
- 统一响应格式：`{success, data/error}`
- 所有路由必须有错误处理

---

## 错误模式参考 ⭐ 2026-01-06 更新

> **重要**: 所有错误模式已统一管理到 `.claude/rules/error-patterns.md`，按类型分类便于查找。

### 快速链接

| 类型 | 链接 | 错误数量 |
|------|------|----------|
| [API 相关](../../rules/error-patterns.md#api-相关) | [error-patterns.md](../../rules/error-patterns.md#api-相关) | 9个 |
| [React Flow 相关](../../rules/error-patterns.md#react-flow-相关) | [error-patterns.md](../../rules/error-patterns.md#react-flow-相关) | 7个 |
| [角色系统相关](../../rules/error-patterns.md#角色系统相关) | [error-patterns.md](../../rules/error-patterns.md#角色系统相关) | 6个 |
| [表单/输入相关](../../rules/error-patterns.md#表单输入相关) | [error-patterns.md](../../rules/error-patterns.md#表单输入相关) | 2个 |
| [存储/持久化相关](../../rules/error-patterns.md#存储持久化相关) | [error-patterns.md](../../rules/error-patterns.md#存储持久化相关) | 7个 |
| [UI/渲染相关](../../rules/error-patterns.md#ui渲染相关) | [error-patterns.md](../../rules/error-patterns.md#ui渲染相关) | 3个 |
| [其他](../../rules/error-patterns.md#其他) | [error-patterns.md](../../rules/error-patterns.md#其他) | 21个 |

### 高频错误（必读）

1. **错误1**: 双平台任务ID不兼容 ⭐⭐⭐
2. **错误6**: 轮询间隔太短（429错误）⭐⭐⭐
3. **错误16**: React Flow 节点间数据传递错误 ⭐⭐⭐
4. **错误17**: API 端点路径缺少前缀 ⭐⭐⭐
5. **错误37**: TaskResultNode 任务ID竞态条件（useEffect依赖） ⭐⭐
6. **错误48**: 优化节点错误使用双显示功能 ⭐⭐⭐
7. **错误49**: 优化节点输出格式结构化 ⭐⭐⭐ 2026-01-06 新增
8. **错误50**: OpenAI 配置持久化丢失 ⭐⭐ 2026-01-07 新增
9. **错误51**: 任务结果节点轮询 interval 竞态条件 ⭐⭐⭐ 2026-01-07 新增
10. **错误53**: NarratorProcessorNode 优化结果刷新后丢失 ⭐⭐⭐ 2026-01-08 新增
11. **错误54**: VideoGenerateNode loadCurrentSentence 从 getNodes() 读取快照数据导致状态不同步 ⭐⭐⭐ 2026-01-08 新增

**查看完整错误模式**: [`.claude/rules/error-patterns.md`](../../rules/error-patterns.md)

---

## 开发提示（精选）⭐ 2026-01-08 更新

以下是开发过程中最重要的提示，按优先级排序：

### 1. 节点开发优先级 ⭐⭐⭐

1. **使用 useNodeId()**: 不要依赖 `data.id`（undefined）
2. **useEffect 依赖**: 避免依赖 `nodes`（会导致无限循环）
3. **节点间数据传递**: 源节点直接更新目标节点（不要依赖 App.jsx）
4. **事件系统**: 用于异步数据传递（taskId 等）
5. **getEdges 解构**: `useReactFlow()` 必须包含 `getEdges`，否则无法查询连接 ⭐ 2026-01-08 新增
6. **单向数据流**: 避免双向同步导致无限循环（节点持续跳动/闪烁 = 数据流循环）⭐ 2026-01-08 新增

### 2. API 调用优先级 ⭐⭐⭐

1. **API 路径**: 前端必须使用完整路径 `/api/{endpoint}`
2. **双平台兼容**: 聚鑫返回 `id`，贞贞返回 `task_id`
3. **轮询间隔**: 使用 30 秒（避免 429 错误）
4. **角色创建**: 不传 `model` 参数，优先使用 `from_task`

### 3. 角色引用优先级 ⭐⭐⭐

1. **格式**: 使用 `@username`（不带花括号）
2. **空格要求**: `@username ` 后面必须加空格（如 `@username 在...`）
3. **优化节点**: 始终使用真实ID（`@ebfb9a758.sunnykitte`）
4. **视频生成节点**: 双显示（输入框显示别名，API使用真实ID）
5. **不描述外观**: Sora2 会使用角色真实外观，只需描述活动
6. **角色匹配调试**: 当 `matchedReferences: 0` 时，添加详细日志检查 `latestConnectedCharacters` 的实际内容 ⭐ 2026-01-08 新增

### 4. UI/交互优先级 ⭐⭐

1. **避免触发模式**: 非必要不要使用"编辑"按钮触发输入框，直接显示textarea（反人性）⭐ 2026-01-13 新增
2. **删除确认**: 所有删除操作必须有确认机制
3. **焦点管理**: 角色插入需要管理焦点状态
4. **双显示**: 视频生成节点输入框显示别名，内部存储真实ID

### 5. 测试优先级 ⭐⭐⭐

1. **自动化测试**: 使用 MCP 工具在浏览器中自动测试
2. **后端重启**: 修改后端代码后必须重启服务器
3. **测试端口**: 工作流画布使用 5173 端口，不是 9000

### 6. 工作流持久化优先级 ⭐⭐⭐ 2026-01-08 新增

1. **自动保存**: 优化完成后使用事件系统自动保存工作流到 localStorage
2. **事件驱动**: 使用 `window.dispatchEvent` 派发自定义事件（如 `narrator-optimization-complete`）
3. **UI 状态恢复**: 刷新后根据 `node.data` 恢复运行时状态（progress, currentIndex, currentPrompt）
4. **验证方法**: 浏览器刷新后检查关键数据是否保留（如 "优化进度: 8/9 (89%)"）
5. **向后兼容**: 使用 `sentences.some(s => s.optimized)` 检测是否有优化数据

**验证成功案例**: 错误53修复后，浏览器刷新显示 "优化进度: 8/9 (89%)"，证明持久化机制正常工作

### 7. 批量任务管理优先级 ⭐⭐⭐ 2026-01-13 新增

1. **BatchResultNode 自动创建**: 批量任务提交后自动创建 BatchResultNode，不需要手动添加到右键菜单
2. **进度显示**: 后端 BatchQueue API 必须返回 `progress` 字段（0-100%）
3. **节点缩放**: 使用 `useNodeResize` hook 实现节点大小调整（参考 CharacterLibraryNode）
4. **默认高度**: 显示多个任务的节点默认高度至少 500px，避免内容被截断
5. **API 响应格式**: 批量任务 API 返回 `{ success, data: { jobs: [{ jobId, status, taskId, result, error, progress }] } }`

**关键代码**:
```javascript
// 后端: 添加 progress 到 API 响应
jobs: batch.jobs.map((j) => ({
  jobId: j.jobId,
  status: j.status,
  taskId: j.taskId,
  result: j.result,
  error: j.error,
  progress: j.taskData?.progress || 0,  // ⭐ 必须包含
}))

// 前端: 显示进度百分比
const getStatusText = (status, progress = 0) => {
  case 'completed': return `✓ 完成 ${progress}%`;
  case 'submitted': return `⏳ 已提交 ${progress}%`;
  default: return `⏳ 处理中 ${progress}%`;
}
```

---

## 文档更新流程 ⭐ 必读

每次功能开发或 Bug 修复后，**必须**更新文档。

### 更新检查清单

- [ ] `.claude/rules/error-patterns.md` - 新增错误模式（如适用）
- [ ] `.claude/skills/winjin-dev/SKILL.md` - 更新开发提示
- [ ] `.claude/rules/base.md` - 更新技术规范（如适用）
- [ ] `用户输入文件夹/开发对话/开发交接书.md` - 更新版本号

详细规范参见 [`.claude/rules/docs.md`](../../rules/docs.md)

---

## 验证系统 ⭐ Phase 3 新增 (2026-01-09)

WinJin 项目拥有完整的自动化验证系统，包括基础验证、数据流验证和自动修复能力。

### 快速命令

```bash
# 运行所有验证
npm run validate:all

# 扫描可修复问题
npm run fix:scan

# 干运行测试修复
npm run fix:dry-run

# 应用修复（备份模式）
npm run fix:backup

# 查看质量趋势
npm run metrics:trend
```

### 自动运行场景

**Git 提交时自动运行**（通过 pre-commit hook）：
- ✅ 节点注册表验证 (validate:registry)
- ✅ 节点文件语法验证 (validate:nodes)
- ✅ 文档引用完整性验证 (validate:docs)
- ✅ 数据流完整性验证 (validate:data-flow)

### 手动运行场景

**开发后验证**：
```bash
npm run validate:all
```

**扫描可修复问题**：
```bash
npm run fix:scan        # 扫描
npm run fix:dry-run      # 干运行
npm run fix:backup       # 修复前备份
npm run fix:all          # 应用所有修复
```

**查看质量趋势**：
```bash
npm run metrics:trend     # 查看趋势报告
npm run metrics:cleanup   # 清理过期数据
npm run metrics:export    # 导出指标数据
```

### 修复策略

| 策略 | 类型 | 置信度 | 风险 | 可自动修复 |
|------|------|--------|------|-----------|
| 孤立节点引用修复 | orphaned_node | 95% | low | ✅ |
| useEffect 依赖缺失修复 | missing_dependency | 80% | medium | ✅ |
| 源节点未写入修复 | source_not_writing | 60% | high | ✅ |
| 数据流断裂修复 | data_flow_break | 50% | high | ❌ (仅建议) |

### 开发流程集成

```
开发代码
    ↓
npm run validate:all  ← 快速验证
    ↓
npm run fix:scan      ← 如有问题，扫描可修复项
    ↓
npm run fix:dry-run    ← 干运行测试
    ↓
npm run fix:backup     ← 应用修复
    ↓
git commit -m "..."    ← Git hook 自动验证
```

### 相关文档

- **完整使用指南**: [docs/validation-guide.md](../../../docs/validation-guide.md) ⭐ 必读
- **错误模式模板**: [.claude/templates/error-template.md](../../../templates/error-template.md)
- **错误模式参考**: [.claude/rules/error-patterns.md](../../rules/error-patterns.md)

---

## 参考文档

| 文档 | 位置 | 用途 |
|------|------|------|
| **错误模式参考** | `.claude/rules/error-patterns.md` | 所有错误模式（按类型分类）⭐ |
| **快速参考** | `.claude/rules/quick-reference.md` | 开发前必读（启动、测试）⭐ |
| **技术规范** | `.claude/rules/base.md` | 技术栈、API 规范 |
| **代码规范** | `.claude/rules/code.md` | 代码示例、最佳实践 |
| **文档更新规范** | `.claude/rules/docs.md` | 文档更新流程 |
| **开发交接书** | `用户输入文件夹/开发对话/开发交接书.md` | 版本记录、功能列表 |
| **开发经验** | `用户输入文件夹/开发经验/Sora2_Character_Best_Practices.md` | Sora2 最佳实践 |