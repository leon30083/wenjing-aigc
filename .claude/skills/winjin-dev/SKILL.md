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

## 已知错误模式（持续更新）

### 错误1: 双平台任务ID不兼容
```javascript
// 贞贞返回 task_id，聚鑫返回 id
const taskId = result.data.id || result.data.task_id;
```

### 错误2: 角色创建返回 404
- **原因**: 传递了 model 参数
- **解决**: 删除 model 参数，使用 from_task 优先

### 错误3: TaskResultNode 无法获取视频 URL
- **原因**: API 路径缺少 /api/ 前缀
- **解决**: 使用完整路径 `/api/task/{taskId}`
- **修复日期**: 2025-12-30

### 错误4: React Flow 无限循环
- **原因**: useEffect 依赖数组包含 nodes
- **解决**: 移除 nodes，使用函数式更新

### 错误5: 角色引用格式错误
- **原因**: 使用 `@{username}` 带花括号
- **解决**: 使用 `@username` 不带花括号

### 错误6: 轮询间隔太短
- **原因**: 5秒间隔导致 429 Rate Limit
- **解决**: 使用 30 秒间隔

### 错误7: 角色插入替换全部内容
- **原因**: 点击角色时替换整个提示词
- **解决**: 在光标位置插入，不影响其他内容

### 错误8: 故事板未管理焦点状态
- **原因**: 点击角色卡片后丢失焦点
- **解决**: 记录最后焦点的场景输入框

### 错误9: 显示平台标签
- **原因**: 误导用户（sora2 角色跨平台通用）
- **解决**: 不显示平台标签

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

### 错误15: 使用 ID 而非 username 更新角色
- **原因**: API 使用 username 参数，存储用 ID 查找
- **解决**: 添加 updateByUsername 方法

### 错误16: React Flow 节点间数据传递错误 ⭐ 2026-01-01 更新
- **原因**:
  1. App.jsx 的 useEffect 只监听 edges 变化，不监听 nodes（核心问题）
  2. useEffect 依赖数组包含 nodes 导致无限循环
  3. data 对象不包含节点 id
- **解决**:
  1. 源节点直接更新目标节点（绕过 App.jsx）⭐ 核心方案
  2. 移除 nodes 依赖，使用函数式更新
  3. 使用 useNodeId() 获取节点 ID
  4. 使用事件系统传递异步数据（taskId）

### 错误17: API 端点路径缺少前缀 ⭐ 2025-12-30
- **原因**: 前端调用 API 时路径不完整，缺少 `/api/` 前缀
- **影响**: TaskResultNode.jsx 中的轮询和手动刷新函数
- **解决**: 所有 API 调用必须包含完整路径 `/api/{endpoint}`
- **验证**: API 请求成功返回 200 OK（不再是 404）

### 错误18: localStorage 数据未验证 ⭐ 2025-12-30
- **原因**: localStorage 数据可能损坏或格式不正确
- **解决**: 使用 try-catch 捕获错误，验证数据格式，返回安全的默认值

### 错误19: 导入工作流未验证 JSON 格式 ⭐ 2025-12-30
- **原因**: 导入的 JSON 文件可能缺少必需字段
- **解决**: 验证 name, nodes, edges 字段存在，并验证数据类型

### 错误20: 视频生成时长参数类型错误 ⭐ 2025-12-30
- **原因**: 时长参数应为数字类型，传递字符串导致 API 调用失败
- **解决**: duration 使用数字类型 (5, 10, 15, 25)

### 错误21: Sora2 不支持 1:1 比例 ⭐ 2025-12-30
- **原因**: Sora2 API 不接受 1:1 比例参数
- **解决**: 只提供 "16:9" 和 "9:16" 两个选项

### 错误22: React Flow Handle 与标签布局冲突 ⭐ 2025-12-31
- **现象**: 连接点（Handle）和标签文字重叠，导致文字显示不完整或被遮挡
- **根本原因**: React Flow 的 Handle 组件会自动定位到节点边缘（`position: absolute, left: 0` 或 `right: 0`），不参与父容器的 CSS 布局（flex/grid）
- **错误尝试**:
  - ❌ 将 Handle 和标签放在同一个 flex 容器中
  - ❌ 使用 `paddingLeft` 或 `minWidth` 调整
  - ❌ 标签放在节点外部（`left: '-35px'`）
- **正确做法**: 完全分离 Handle 和标签
  ```javascript
  {/* Handle - 独立声明，使用 React Flow 自动定位 */}
  <Handle
    type="target"
    position={Position.Left}
    id="api-config"
    style={{ background: '#3b82f6', width: 10, height: 10, top: '10%' }}
  />

  {/* 标签 - 独立定位，使用 position: absolute */}
  <div style={{ position: 'absolute', left: '18px', top: '10%', transform: 'translateY(-50%)', zIndex: 10 }}>
    <span style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 'bold', whiteSpace: 'nowrap' }}>API</span>
  </div>
  ```
- **关键点**:
  - Handle 组件使用 `top` 样式控制垂直位置
  - 标签使用 `position: absolute` + `left/right` + `top` 精确定位
  - 节点容器增加 `paddingLeft` 和 `paddingRight`（如 85px）为标签预留空间
  - 标签使用 `zIndex: 10` 确保在节点内容之上

### 错误23: 图生视频提示词未描述参考图内容 ⭐ 2025-12-31
- **现象**: 使用参考图片生成的视频与图片内容没有任何关系
- **根本原因**: 提示词只描述角色活动，未描述参考图片的场景内容
- **错误示例**:
  ```javascript
  // ❌ 错误：提示词未描述参考图
  const prompt = '@装载机 在干活';
  const images = ['https://volcano-scene.jpg'];
  // 问题：生成的视频与火山场景无关

  // ❌ 错误：硬编码角色而非使用角色引用
  const prompt = '火山场景中，一辆黄色装载机在搬运岩石';
  // 问题：没有使用角色引用功能，@装载机 应该直接调用
  ```
- **正确模式**: 参考图片 = 场景背景，角色引用 = 场景中的演员
  ```javascript
  // ✅ 正确：提示词同时描述参考场景和角色活动
  // 参考图片：卡通火山场景（火山口有熔岩流动，底部冒白烟，蓝天白云背景）
  const prompt = '卡通风格的火山场景，火山口有熔岩流动，底部冒白烟，蓝天白云背景。@装载机 在火山附近作业，正在搬运岩石，卡通插画风格';
  const images = ['https://volcano-scene.jpg'];
  ```
- **提示词结构建议**:
  1. **场景描述**（来自参考图片）: 主体、外观、环境、氛围
  2. **角色引用**: `@username` 调用角色
  3. **活动描述**: 角色在场景中的具体动作
- **关键点**:
  - 参考图片提供场景基础（如火山、街道、海滩）
  - 提示词必须描述参考图片的内容（火山有熔岩、蓝天白云）
  - 角色引用描述角色在场景中的活动（@装载机 在火山附近搬运岩石）
  - 使用 `@username` 格式调用角色，不要硬编码角色名称

### 错误24: 历史记录卡片不显示视频结果 ⭐ 2025-12-31
- **现象**: 历史记录面板的卡片只显示占位符，不显示视频和工作流参数
- **根本原因**: HistoryCard 组件只检查 `thumbnail` 字段，未检查 `result.output`（视频 URL）
- **错误示例**:
  ```javascript
  // ❌ 错误：只检查 thumbnail
  {thumbnail ? (
    <img src={thumbnail} alt="视频缩略图" />
  ) : (
    <div>🖼️</div>  // 总是显示占位符
  )}
  ```
- **正确做法**: 优先级检查 thumbnail → result.output → 占位符
  ```javascript
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
- **工作流参数显示**: 添加模型、时长、比例、水印等参数面板
  ```javascript
  // ✅ 显示工作流参数
  {(model || options) && (
    <div style={{ backgroundColor: '#f8fafc', padding: '6px 8px' }}>
      {model && <div><strong>模型:</strong> {model}</div>}
      {options?.duration && <div><strong>时长:</strong> {options.duration}秒</div>}
      {options?.aspect_ratio && <div><strong>比例:</strong> {options.aspect_ratio}</div>}
      {options?.watermark !== undefined && <div><strong>水印:</strong> {options.watermark ? '开启' : '关闭'}</div>}
      {result?.output && (
        <div>
          <strong>视频:</strong>
          <a href={result.output} target="_blank" onClick={(e) => e.stopPropagation()}>
            {result.output.length > 40 ? result.output.substring(0, 40) + '...' : result.output}
          </a>
        </div>
      )}
    </div>
  )}
  ```
- **关键点**:
  - 视频悬停播放，移开时暂停并重置
  - 视频链接点击不触发卡片点击（stopPropagation）
  - 参数面板使用浅色背景区分
  - 链接过长时自动截断并显示省略号

### 错误25: 本地视频 URL 缺少完整前缀导致无法播放 ⭐ 2026-01-01 新增
- **现象**: 视频下载后，点击视频无法播放，显示"无法播放媒体"
- **根本原因**:
  1. 后端返回本地视频路径为 `/downloads/xxx.mp4`（相对路径）
  2. 前端直接使用相对路径作为 `<video>` 的 `src` 属性
  3. 浏览器解析为当前页面 URL + 相对路径（如 `http://localhost:5173/downloads/...`）
  4. 但视频文件在 9000 端口服务器，导致 404 无法播放
- **错误示例**:
  ```javascript
  // ❌ 错误：直接使用相对路径
  const response = await fetch(`${API_BASE}/api/task/${taskId}`);
  const result = await response.json();
  const videoUrl = result.data.data.output; // "/downloads/xxx.mp4"
  <video src={videoUrl} /> // 浏览器解析为 http://localhost:5173/downloads/xxx.mp4 (404)
  ```
- **正确做法**: 检查路径前缀，如果是本地路径，拼接完整 API_BASE
  ```javascript
  // ✅ 正确：拼接完整 URL
  const response = await fetch(`${API_BASE}/api/task/${taskId}`);
  const result = await response.json();
  let finalVideoUrl = result.data.data.output;

  // ⭐ 关键：为本地路径拼接完整前缀
  if (finalVideoUrl.startsWith('/downloads/')) {
    finalVideoUrl = `${API_BASE}${finalVideoUrl}`;
  }
  // 结果: "http://localhost:9000/downloads/xxx.mp4"

  <video src={finalVideoUrl} /> // 正确加载视频
  ```
- **关键规则**:
  1. **相对路径识别**: 以 `/downloads/` 开头的路径是本地视频
  2. **URL 拼接**: 本地路径必须拼接 `API_BASE` 前缀
  3. **远程路径**: 以 `http://` 或 `https://` 开头的路径直接使用
  4. **缓存破坏**: 手动刷新时添加 `&_t=时间戳` 参数绕过浏览器缓存
- **轮询间隔注意事项**: 必须使用 30 秒间隔，避免 429 Rate Limit 错误（见错误6）
- **修复日期**: 2026-01-01

### 错误26: 节点连接验证缺失导致事件错误响应 ⭐ 2026-01-01 新增
- **现象**: 未连接或连接到错误类型节点的结果节点仍然响应事件
  - **具体场景**: 画布上有两个TaskResultNode，一个连接到VideoGenerateNode，另一个未连接任何节点，但未连接的节点在任务提交时也显示执行了任务
  - **影响范围**: 所有结果节点（TaskResultNode, CharacterResultNode等）
- **根本原因**:
  1. **App.jsx**: 在设置 `connectedSourceId` 时没有验证源节点类型，任何类型的节点连接到输入端口都会设置 `connectedSourceId`
  2. **事件监听器**: 只检查 `connectedSourceId === sourceNodeId`，不检查节点类型
  3. **事件广播机制**: `window.dispatchEvent` 是全局广播，所有监听器都会收到事件
- **错误示例**:
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
  ```
- **正确做法**: 在 App.jsx 的连接处理逻辑中，设置 connectedSourceId 之前验证源节点类型
  ```javascript
  // ✅ App.jsx - 正确：验证源节点类型
  const videoEdge = incomingEdges.find((e) => e.targetHandle === 'task-input');
  if (videoEdge) {
    const sourceNode = nds.find((n) => n.id === videoEdge.source);

    // ✅ 验证源节点类型
    const validVideoSourceTypes = [
      'videoGenerateNode',   // 视频生成节点
      'storyboardNode',      // 故事板节点
      'characterCreateNode'  // 角色创建节点
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
- **关键点**:
  - **task-input**: 只接受 `videoGenerateNode`, `storyboardNode`, `characterCreateNode`
  - **character-input**: 只接受 `characterLibraryNode`
  - **prompt-input**: 只接受 `textNode`
  - **images-input**: 只接受 `referenceImageNode`
  - **事件系统**: 所有节点都会收到事件广播，但只有 `connectedSourceId` 匹配且源节点类型有效的节点才会响应
- **验证结果**: ✅ 未连接的节点不响应事件，只有正确连接的节点显示任务
- **修复文件**:
  - `src/client/src/App.jsx` - Lines 218-299（所有输入端口添加源节点类型验证）
  - `src/client/src/nodes/output/TaskResultNode.jsx` - Lines 105-117（事件处理器添加源节点类型验证）
- **修复日期**: 2026-01-01

### 错误34: 工作流快照时机问题 ⭐ 2026-01-01 新增
- **现象**: 加载历史记录的工作流时，TaskResultNode 显示的视频不正确
- **根本原因**:
  1. VideoGenerateNode 调用 getNodes() 捕获快照时，TaskResultNode 的 useEffect 还没执行
  2. useState 是异步的，useEffect 在渲染后执行，getNodes() 可能返回旧数据
- **场景**: 连续生成视频时，第二次生成的快照包含第一次的视频结果
- **解决方案**:
  1. **短期修复**: 加载历史记录时，从历史记录的实际数据覆盖 TaskResultNode
  2. **长期修复**: TaskResultNode 在轮询收到结果时，立即同步 node.data（不依赖 useEffect）
- **示例代码**:
  ```javascript
  // App.jsx - 加载历史记录时覆盖
  const cleanedNodes = savedNodes.map(node => {
    if (node.type === 'taskResultNode') {
      return {
        ...node,
        data: {
          ...node.data,
          taskId: record.taskId,
          taskStatus: record.result?.status || 'idle',
          videoUrl: record.result?.data?.output || null,
        }
      };
    }
    return { ...node, data: { ...node.data, onSizeChange: undefined } };
  });
  ```

### 错误35: 轮询请求缺少 platform 参数导致查询失败 ⭐ 2026-01-01 新增
- **现象**: 任务在后台显示成功，但前端TaskResultNode一直显示"查询中..."，无法获取结果
- **具体场景**: 用贞贞平台提交的任务，后台返回304 Not Modified，前端无法获取任务状态
- **根本原因**:
  1. **事件系统缺少 platform 参数**: VideoGenerateNode 派发事件时只传递 `sourceNodeId` 和 `taskId`，没有传递 `platform`
  2. **轮询请求硬编码平台**: TaskResultNode 轮询时硬编码 `platform=juxin`，导致贞贞平台任务查询错误的端点
  3. **缺少缓存破坏参数**: 请求没有添加时间戳参数，浏览器返回304 Not Modified
- **错误示例**:
  ```javascript
  // ❌ VideoGenerateNode - 派发事件时缺少 platform
  window.dispatchEvent(new CustomEvent('video-task-created', {
    detail: { sourceNodeId: nodeId, taskId: id }  // ❌ 缺少 platform
  }));

  // ❌ TaskResultNode - 硬编码平台参数
  const response = await fetch(`${API_BASE}/api/task/${taskId}?platform=juxin`);
  // 问题：贞贞平台任务会查询错误的端点
  ```
- **正确做法**:
  ```javascript
  // ✅ VideoGenerateNode - 传递 platform 参数
  window.dispatchEvent(new CustomEvent('video-task-created', {
    detail: { sourceNodeId: nodeId, taskId: id, platform: apiConfig.platform }
  }));

  // ✅ TaskResultNode - 从状态中获取 platform 并添加缓存破坏
  const cacheBuster = Date.now();
  const response = await fetch(`${API_BASE}/api/task/${taskId}?platform=${platform}&_t=${cacheBuster}`);
  ```
- **关键点**:
  - **事件传递**: VideoGenerateNode 必须传递 platform 参数（juxin 或 zhenzhen）
  - **状态管理**: TaskResultNode 使用 useState 存储 platform，从事件中接收
  - **缓存破坏**: 添加 `&_t=${Date.now()}` 参数避免浏览器304缓存
  - **依赖数组**: useEffect 依赖数组包含 platform，确保平台切换时重新开始轮询
- **验证结果**:
  - ✅ 贞贞平台任务使用 `platform=zhenzhen` 查询成功
  - ✅ 聚鑫平台任务使用 `platform=juxin` 查询成功
  - ✅ 浏览器不再返回304 Not Modified
- **修复文件**:
  - `src/client/src/nodes/process/VideoGenerateNode.jsx` - Lines 280-283（传递 platform）
  - `src/client/src/nodes/output/TaskResultNode.jsx` - Lines 21, 102, 145, 182, 226, 275（接收和使用 platform）
- **修复日期**: 2026-01-01

### 错误36: 已完成任务显示进度 0% 而非 100% ⭐ 2026-01-01 新增
- **现象**: TaskResultNode 显示 "✓ 完成 0%" 而非 "✓ 完成 100%"
- **根本原因**:
  1. **getStatusText 函数硬编码**: 成功状态返回 "✓ 完成"，忽略了 progressValue 参数
  2. **轮询函数未设置进度**: API 返回 SUCCESS 时，只更新 taskStatus 和 videoUrl，未设置 progress 为 100
  3. **恢复逻辑顺序错误**: 检查 `_isCompletedFromHistory` 在检查 `taskStatus === 'SUCCESS'` 之前，导致已完成任务不执行恢复逻辑
- **错误示例**:
  ```javascript
  // ❌ 错误：getStatusText 忽略 progressValue 参数
  const getStatusText = (status, progressValue) => {
    switch (status) {
      case 'SUCCESS': return '✓ 完成';  // ❌ 硬编码，忽略 progressValue
      case 'IN_PROGRESS': return `⏳ 处理中 ${progressValue}%`;
    }
  };

  // ❌ 错误：轮询函数未设置 progress 为 100
  if (status === 'SUCCESS' && taskData?.output) {
    setVideoUrl(finalVideoUrl);
    setPolling(false);
    // ❌ 缺少 setProgress(100);
  }

  // ❌ 错误：恢复逻辑检查 _isCompletedFromHistory 在前
  if (data._isCompletedFromHistory) {
    // 恢复逻辑
  }
  if (!isCompletedFromHistoryRef.current) {
    return; // ❌ 已完成但未标记为历史的任务被跳过
  }
  ```
- **正确做法**:
  ```javascript
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

  // ✅ 正确：优先检查任务是否完成（无论来源）
  const isCompletedTask = data.taskStatus === 'SUCCESS' && data.videoUrl;
  if (data._isCompletedFromHistory || isCompletedTask) {
    // 恢复所有状态，包括 progress 为 100%
    if (data.taskStatus === 'SUCCESS' && (!data.progress || data.progress === 0)) {
      setProgress(100);  // ✅ 已完成任务默认 100%
    }
  }
  ```
- **关键点**:
  1. **getStatusText 必须包含进度**: 成功状态显示 "✓ 完成 100%" 而非 "✓ 完成"
  2. **轮询时设置进度**: API 返回 SUCCESS 时，自动设置 progress 为 100
  3. **手动刷新设置进度**: 刷新已完成任务时，如果 progress 为 0，设置为 100
  4. **恢复逻辑检查任务状态**: 优先检查 `taskStatus === 'SUCCESS' && videoUrl` 而非 `_isCompletedFromHistory`
  5. **默认值逻辑**: 如果 progress 为 undefined 或 0，且任务已完成，默认为 100
- **验证结果**: ✅ 已完成任务正确显示 "✓ 完成 100%"
- **修复文件**:
  - `src/client/src/nodes/output/TaskResultNode.jsx` - Lines 364, 228, 326-329, 50, 72-77
- **修复日期**: 2026-01-01

### 错误37: TaskResultNode 任务ID竞态条件 ⭐ 新增 (2026-01-01)
- **现象**: 提交新任务后，TaskResultNode 仍然显示旧的 taskId，新任务被旧任务覆盖
- **根本原因**:
  - useEffect 1 依赖 `[data.taskId]`，当事件监听器更新 node.data.taskId 时会重新运行
  - 事件监听器设置 `isCompletedFromHistoryRef.current = false`
  - useEffect 1 运行时看到 ref 为 false，跳过恢复逻辑，然后从旧的 data 中恢复 taskId
  - **竞态条件**: 事件监听器设置新 taskId → node.data 变化 → useEffect 1 重新运行 → 从旧的闭包数据中恢复旧 taskId
- **错误尝试**:
  - ❌ 在 useEffect 中添加 `taskId !== data.taskId` 检查（仍然会因为 node.data 变化而重新运行）
  - ❌ 在事件监听器中延迟设置（治标不治本，仍有可能触发）
  - ❌ 使用 `useEffect` 的 cleanup 函数（cleanup 在下一次 effect 之前运行，无法阻止当前 effect）
- **正确做法**:
  ```javascript
  // ✅ 正确：useEffect 1 使用空依赖数组，只在挂载时运行一次
  useEffect(() => {
    const isCompletedTask = data.taskStatus === 'SUCCESS' && data.videoUrl;

    if (data._isCompletedFromHistory || isCompletedTask) {
      isCompletedFromHistoryRef.current = true;
      // 恢复所有状态，除了 taskId（由事件监听器管理）
      if (data.taskStatus) setTaskStatus(data.taskStatus);
      if (data.videoUrl) setVideoUrl(data.videoUrl);
      if (data.taskStatus === 'SUCCESS' && (!data.progress || data.progress === 0)) {
        setProgress(100);
      }
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
      // ⭐ 关键：先设置 ref 为 true，防止 useEffect 1 恢复旧数据
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
      setProgress(0);
      setVideoUrl(undefined);
      setPolling(true);

      // ⭐ 重置 ref，允许后续更新
      isCompletedFromHistoryRef.current = false;
    }
  };
  ```
- **关键点**:
  1. **空依赖数组**: useEffect 1 使用 `[]` 而非 `[data.taskId]`，只在挂载时运行一次
  2. **taskIdRef 初始检查**: 只在 `taskIdRef.current === null` 时设置初始 taskId，防止重复设置
  3. **事件监听器先设置 ref**: 更新 node.data 之前设置 `isCompletedFromHistoryRef.current = true`
  4. **事件监听器后重置 ref**: 所有状态更新完成后重置 ref 为 false
  5. **taskId 管理权移交**: taskId 完全由事件监听器管理，useEffect 不再恢复 taskId
- **验证结果**: ✅ 新任务正确显示，不再被旧任务覆盖
- **修复文件**:
  - `src/client/src/nodes/output/TaskResultNode.jsx` - Lines 47-110 (useEffect 1), Lines 132-169 (事件监听器)
- **修复日期**: 2026-01-01

### 错误38: TaskResultNode platform 字段缺失导致 API 查询失败 ⭐ 新增 (2026-01-01)
- **现象**: 旧任务查询 API 返回 400 错误，无法获取视频信息
- **根本原因**:
  - localStorage 保存的旧任务没有 `platform` 字段
  - TaskResultNode 初始化使用默认值 `'juxin'`
  - 贞贞平台的任务用聚鑫端点查询导致 400 错误
  - VideoGenerateNode 显示"贞贞"但 TaskResultNode 查询用 `platform=juxin`
- **错误尝试**:
  - ❌ 手动修改 localStorage（不现实，用户无法操作）
  - ❌ 删除旧任务重新创建（丢失已完成任务的记录）
  - ❌ 在 useEffect 中只恢复 data.platform（如果 data.platform 本身就是 undefined，无法恢复）
- **正确做法**:
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
- **关键点**:
  1. **自动检测 platform**: 从连接的 VideoGenerateNode 读取 apiConfig.platform
  2. **条件触发**: 只在 platform 为 undefined 或 'juxin' 时执行
  3. **同步更新**: 同时更新内部状态和 node.data
  4. **向后兼容**: 自动修复旧数据，无需手动干预
  5. **持久化修复**: 更新的 node.data 会自动保存到 localStorage
- **验证结果**: ✅ 旧任务正确查询 API，成功获取视频信息
- **修复文件**:
  - `src/client/src/nodes/output/TaskResultNode.jsx` - Lines 118-140 (useEffect 1.5)
- **修复日期**: 2026-01-01

### 错误39: 聚鑫平台模型名称错误 ⭐ 新增 (2026-01-02)
- **现象**: API 调用返回 400/422 错误，错误信息 "model not supported" 或 "Invalid model"
- **根本原因**:
  - 聚鑫平台使用 `sora-2-all` 模型名称（而非 `sora-2`）
  - 贞贞平台使用 `sora-2` 和 `sora-2-pro` 模型名称
  - 代码未根据平台选择正确的默认模型
- **错误尝试**:
  - ❌ 在聚鑫平台使用 `sora-2` 模型（API 拒绝）
  - ❌ 在贞贞平台使用 `sora-2-all` 模型（API 拒绝）
  - ❌ 硬编码 `model: 'sora-2'` 作为默认值（不适用聚鑫）
- **正确做法**:
  ```javascript
  // ❌ 错误：聚鑫平台使用 sora-2
  const response = await fetch(`${API_BASE}/api/video/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      platform: 'juxin',
      model: 'sora-2',  // ❌ 聚鑫不支持此模型
      prompt: '一只可爱的小猫',
      duration: 10,
      aspect_ratio: '16:9',
      watermark: false,
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
      duration: 10,
      aspect_ratio: '16:9',
      watermark: false,
    }),
  });

  // ✅ 正确：后端自动选择（推荐）
  // src/server/sora2-client.js
  class Sora2Client {
    async createVideo(options) {
      const { prompt, model, orientation, size, watermark, private: isPrivate = true, images = [] } = options;

      // 根据平台设置默认模型 ⭐ 关键逻辑
      const finalModel = model || (this.platformType === 'JUXIN' ? 'sora-2-all' : 'sora-2');

      // 验证模型名称
      const validModels = ['sora-2-all', 'sora-2', 'sora-2-pro'];
      if (!validModels.includes(finalModel)) {
        throw new Error(`Invalid model: ${finalModel}. Must be one of ${validModels.join(', ')}`);
      }

      // 发送 API 请求
      const body = {
        model: finalModel,
        prompt,
        images,
        watermark,
        private: isPrivate,
      };

      return await this.client.post('/v1/video/create', body);
    }
  }
  ```
- **关键点**:
  1. **聚鑫平台模型**: 必须使用 `sora-2-all`（唯一支持的模型）
  2. **贞贞平台模型**: 使用 `sora-2` 或 `sora-2-pro`
  3. **后端自动选择**: `model || (this.platformType === 'JUXIN' ? 'sora-2-all' : 'sora-2')`
  4. **前端默认值**: APISettingsNode 默认模型应为 `sora-2-all`（聚鑫平台）
  5. **用户手动选择**: 根据平台限制可选模型范围
- **验证结果**: ✅ 聚鑫平台 API 成功返回任务ID，视频生成正常
- **修复文件**:
  - `src/server/sora2-client.js` - Lines 132-144, 228, 323（添加平台自动切换）
  - `src/client/src/nodes/input/APISettingsNode.jsx` - Lines 9-15, 95-100（更新默认值和自动切换）
  - `src/client/src/nodes/process/VideoGenerateNode.jsx` - Lines 36-41（更新默认值）
  - `src/client/src/nodes/process/StoryboardNode.jsx` - Lines 16-21（更新默认值）
  - `src/renderer/public/index.html` - Lines 666-669, 746-750（添加模型选项）
- **修复日期**: 2026-01-02

### 错误40: App.jsx 把 selectedImages 数组当作 Set 处理 ⭐ 新增 (2026-01-02)
- **现象**: 点击连接线时，取消选中的图片又重新出现在目标节点
- **根本原因**:
  - ReferenceImageNode 保存 `selectedImages` 到 `node.data` 时是**数组** (`Array.from(selectedImages)`)
  - App.jsx 中间件读取后使用 `.size` 和 `.has()` 方法，这些是 Set 的方法
  - 导致逻辑判断失败，传递了错误的图片数据
- **错误尝试**:
  - ❌ 修改 VideoGenerateNode 的清除逻辑（治标不治本）
  - ❌ 修改 ReferenceImageNode 的广播逻辑（方向错误）
  - ❌ 在 App.jsx 中使用 Set 方法处理数组
- **正确做法**:
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
- **关键点**:
  1. **数据类型**: `selectedImages` 保存为**数组**，不是 Set
  2. **已过滤**: ReferenceImageNode 已经过滤选中的图片，App.jsx 直接使用
  3. **向后兼容**: 检查 `Array.isArray()` 而非 `.length`，避免 undefined 错误
  4. **数据流**: ReferenceImageNode (Set) → 过滤 → Array → node.data → App.jsx → 目标节点
- **验证结果**: ✅ 取消选中图片后，目标节点正确清除显示；点击连接线不会重新显示
- **修复文件**:
  - `src/client/src/nodes/input/ReferenceImageNode.jsx` - Lines 12-17, 29-39, 47, 59（工作流恢复支持）
  - `src/client/src/App.jsx` - Lines 269-280（修复数组处理逻辑）
- **修复日期**: 2026-01-02

### 错误41: 贞贞故事板端点配置错误 ⭐ 新增 (2026-01-02)
- **现象**: 贞贞故事板节点API调用返回 "Invalid URL (POST /v1/video/storyboard)" 错误
- **根本原因**:
  - 贞贞平台**没有专用故事板端点**，使用常规视频生成端点 `/v2/videos/generations`
  - 故事板功能通过特殊的提示词格式实现（非独立API端点）
  - 聚鑫平台有专用故事板端点 `/v1/videos`（使用 multipart/form-data）
- **API文档说明**:
  - **聚鑫平台**: `POST /v1/videos` - 专用故事板端点，使用 multipart/form-data
  - **贞贞平台**: `POST /v2/videos/generations` - 常规视频端点，提示词格式启用故事板模式
- **错误示例**:
  ```javascript
  // ❌ 错误：贞贞平台配置了不存在的故事板端点
  ZHENZHEN: {
    name: '贞贞',
    baseURL: 'https://ai.t8star.cn',
    videoEndpoint: '/v2/videos/generations',
    storyboardEndpoint: '/v1/video/storyboard',  // ❌ 此端点不存在
  }

  // API调用返回错误
  // POST /v1/video/storyboard → 404 Invalid URL
  ```
- **正确做法**:
  ```javascript
  // ✅ 正确：贞贞平台使用常规视频端点
  ZHENZHEN: {
    name: '贞贞',
    baseURL: 'https://ai.t8star.cn',
    videoEndpoint: '/v2/videos/generations',
    storyboardEndpoint: '/v2/videos/generations',  // ✅ 与视频端点相同
    // 贞贞使用 aspect_ratio + hd
    useAspectRatio: true,
  }

  // 前端通过特殊提示词格式启用故事板
  const prompt = `Shot 1:
duration: 5sec
Scene: 老鹰展翅高飞

Shot 2:
duration: 5sec
Scene: 老鹰在空中盘旋

Shot 3:
duration: 5sec
Scene: 老鹰降落在山顶`;
  ```
- **关键差异对比**:
  | 特性 | 聚鑫平台 | 贞贞平台 |
  |------|---------|---------|
  | 故事板端点 | `/v1/videos` (专用) | `/v2/videos/generations` (常规) |
  | Content-Type | `multipart/form-data` | `application/json` |
  | 提示词格式 | 拼接为字符串数组 | 直接传递多行文本 |
  | 时长参数 | `seconds: "15"` | `duration: "15"` |
- **验证结果**: ✅ 贞贞故事板节点成功提交任务，返回 task_id: `video_fa9c0fbb-b7af-4bb2-b372-9072e4579205`
- **修复文件**:
  - `src/server/sora2-client.js` - Lines 21-28（贞贞端点配置）
- **修复日期**: 2026-01-02

### 错误42: CSS border 语法错误 - 颜色值多余引号 ⭐ 新增 (2026-01-02)
- **现象**: React组件渲染报错，样式未生效
- **根本原因**: CSS border 属性中颜色值有多余的引号，导致JavaScript对象语法错误
- **错误示例**:
  ```javascript
  // ❌ 错误：颜色值周围有多余引号
  <div style={{
    border: '1px solid '#fcd34d',  // ❌ 语法错误
  }} />

  // 解析为: border: '1px solid ' #fcd34d
  // 导致: Unexpected token
  ```
- **正确做法**:
  ```javascript
  // ✅ 正确：颜色值不加引号
  <div style={{
    border: '1px solid #fcd34d',  // ✅ 正确语法
  }} />

  // 或使用模板字符串（如果需要动态颜色）
  <div style={{
    border: `1px solid ${color}`,  // ✅ 动态颜色
  }} />
  ```
- **关键点**:
  1. **border语法**: `border: '宽度 样式 颜色'` - 所有值在一个字符串中
  2. **颜色值格式**: 十六进制颜色（如 `#fcd34d`）不加引号
  3. **字符串拼接**: 使用模板字符串 `${}` 进行动态拼接
  4. **常见错误位置**: React内联样式、动态边框、条件样式
- **错误位置**:
  - `src/client/src/nodes/process/ZhenzhenStoryboardNode.jsx:349` - `border: '1px solid '#fcd34d'`
  - `src/client/src/nodes/process/ZhenzhenStoryboardNode.jsx:541` - `border: '1px solid '#6ee7b7'`
  - `src/client/src/nodes/process/JuxinStoryboardNode.jsx:523` - `border: '1px solid '#6ee7b7'`
- **修复方式**: 移除颜色值周围的单引号，保持完整的border字符串
- **修复日期**: 2026-01-02

### 错误43: JavaScript TDZ错误 - const变量声明前使用 ⭐ 新增 (2026-01-02)
- **现象**: React组件报错 "Cannot access 'updateShot' before initialization"
- **根本原因**:
  - JavaScript的 `const` 声明存在 Temporal Dead Zone (TDZ)
  - 在声明之前访问变量会导致 ReferenceError
  - Hook 调用时使用了还未声明的 `updateShot` 函数
- **错误示例**:
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
  ```
- **正确做法**:
  ```javascript
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
      updateShot  // ✅ 正确：updateShot 已声明
    );
  }
  ```
- **关键点**:
  1. **TDZ规则**: `const` 和 `let` 声明在代码执行前存在"暂时性死区"
  2. **声明顺序**: 函数必须在 Hook 调用之前声明
  3. **函数提升**: 只有 `function` 声明会提升，`const` 箭头函数不会
  4. **解决方案**: 将函数定义移到 Hook 调用之前
- **错误位置**:
  - `src/client/src/nodes/process/ZhenzhenStoryboardNode.jsx:90` - Hook调用在updateShot声明前
  - `src/client/src/nodes/process/JuxinStoryboardNode.jsx:89` - Hook调用在updateShot声明前
- **修复方式**: 重新排列代码，将 updateShot 函数定义移到 useSceneCharacterInsertion Hook 之前
- **修复日期**: 2026-01-02

### 错误44: React对象渲染错误 - 直接渲染对象导致崩溃 ⭐ 新增 (2026-01-02)
- **现象**: 页面崩溃，错误 "Objects are not valid as a React child (found: object with keys {message, type, param, code})"
- **根本原因**:
  - React 组件直接渲染了 JavaScript 对象（而非字符串或JSX）
  - 错误对象包含多个属性（message, type, param, code），React无法直接渲染
  - 常见于API错误响应、异常处理场景
- **错误示例**:
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

  // API 返回的错误对象
  {
    message: 'Invalid API endpoint',
    type: 'invalid_request_error',
    param: 'endpoint',
    code: 'invalid_url'
  }
  ```
- **正确做法**:
  ```javascript
  // ✅ 正确：渲染 error.message 或 JSON.stringify
  function VideoNode() {
    const [error, setError] = useState(null);

    // 方案1：渲染 error.message
    const renderError = (error) => {
      if (typeof error === 'string') return error;
      if (error?.message) return error.message;
      return JSON.stringify(error);
    };

    return (
      <div>
        {error && (
          <div className="error">
            {typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}
          </div>
        )}
        {/* ✅ 安全渲染错误信息 */}
      </div>
    );
  }

  // 方案2：使用 try-catch 捕获并转换
  try {
    // API调用
  } catch (err) {
    // 将错误对象转换为字符串
    const errorMessage = err?.message || err?.toString() || 'Unknown error';
    setError(errorMessage);
  }
  ```
- **关键点**:
  1. **React子元素规则**: 只能渲染 string, number, JSX, null, undefined, boolean, array
  2. **对象不能渲染**: 普通对象（plain object）会报错
  3. **错误对象处理**: 使用 `error.message` 或 `JSON.stringify(error)`
  4. **类型检查**: `typeof error === 'string'` 判断是否可直接渲染
- **错误位置**:
  - `src/client/src/nodes/process/ZhenzhenStoryboardNode.jsx:772` - `{error}`
  - `src/client/src/nodes/process/JuxinStoryboardNode.jsx:754` - `{error}`
- **修复方式**:
  ```javascript
  // 修复前
  {error}

  // 修复后
  {typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}
  ```
- **验证结果**: ✅ 页面不再崩溃，错误信息正确显示
- **修复日期**: 2026-01-02

### 错误45: TaskResultNode 不识别新故事板节点类型 ⭐ 新增 (2026-01-02)
- **现象**: 贞贞故事板节点成功提交任务并显示"✓ 已提交"，但TaskResultNode仍显示"连接视频生成节点以查看结果"
- **根本原因**:
  - TaskResultNode的`validSourceTypes`列表只包含`'storyboardNode'`
  - 新建的节点类型是`'juxinStoryboardNode'`和`'zhenzhenStoryboardNode'`
  - 事件虽然被接收，但类型验证失败，taskId没有被设置
- **错误示例**:
  ```javascript
  // ❌ 错误：validSourceTypes 缺少新节点类型
  const validSourceTypes = ['videoGenerateNode', 'storyboardNode', 'characterCreateNode'];

  // 事件处理
  const handleVideoTaskCreated = (event) => {
    const { sourceNodeId, newTaskId, newPlatform } = event.detail;
    const sourceNode = allNodes.find(n => n.id === sourceNodeId);

    // ❌ zhenzhenStoryboardNode 类型不在列表中，验证失败
    if (connectedSourceId === sourceNodeId &&
        sourceNode &&
        validSourceTypes.includes(sourceNode.type) &&  // ❌ 返回 false
        newTaskId &&
        newTaskId !== taskIdRef.current) {
      setTaskId(newTaskId);  // 不会执行
    }
  };
  ```
- **正确做法**:
  ```javascript
  // ✅ 正确：添加新节点类型到 validSourceTypes
  const validSourceTypes = [
    'videoGenerateNode',
    'storyboardNode',
    'juxinStoryboardNode',      // ✅ 新增
    'zhenzhenStoryboardNode',   // ✅ 新增
    'characterCreateNode'
  ];

  // 现在事件处理可以正确识别新节点类型
  if (connectedSourceId === sourceNodeId &&
      sourceNode &&
      validSourceTypes.includes(sourceNode.type) &&  // ✅ 返回 true
      newTaskId &&
      newTaskId !== taskIdRef.current) {
    setTaskId(newTaskId);  // ✅ 成功设置 taskId
    setPlatform(newPlatform || 'juxin');
    setTaskStatus('idle');
    setPolling(true);
  }
  ```
- **关键点**:
  1. **节点类型注册**: 每次新建自定义节点类型时，必须更新TaskResultNode的validSourceTypes
  2. **类型验证**: TaskResultNode通过类型验证过滤无效的事件源
  3. **控制台日志**: `[TaskResultNode] Match! Setting taskId: xxx platform: zhenzhen` 表示成功
  4. **失败症状**: TaskResultNode显示"连接视频生成节点以查看结果"
- **验证结果**: ✅ TaskResultNode正确显示任务ID并开始轮询状态
- **修复文件**:
  - `src/client/src/nodes/output/TaskResultNode.jsx` - Line 156（添加节点类型到validSourceTypes）
- **修复日期**: 2026-01-02

---

## 项目简化说明 ⭐ 2026-01-01

**历史记录功能已移除**：
- ❌ 移除了复杂的历史记录功能（工作流快照加载）
- ❌ 移除了所有历史记录相关的已知错误（错误33/34/35）
- ✅ 保留了角色库功能（CharacterLibraryNode）
- ✅ 保留了工作流手动保存功能（WorkflowStorage）
- 🎯 目标：降低代码复杂度，减少维护成本

**原因**：
- 用户几乎不使用历史记录功能
- 工作流快照机制导致大量数据同步问题
- 代码复杂度过高（约 2,308 行相关代码）

## 项目结构

```
winjin/
├── src/
│   ├── server/              # Express 后端
│   ├── client/              # React Flow 工作流编辑器
│   └── renderer/            # Electron 前端
├── .claude/
│   ├── rules/              # 开发规则
│   └── skills/             # Claude Code skills
│       └── winjin-dev/     # 本 skill
└── 用户输入文件夹/
    └── 开发对话/
        └── 开发交接书.md
```

## 常用命令

```bash
# 启动服务器
npm run server

# 启动工作流编辑器
cd src/client && npm run dev

# Git 操作
git add .
git commit -m "type: description"
git push origin feature/workflow-management
```

## 参考文档

- [references/UPDATE.md](references/UPDATE.md) - Skill 和文档更新流程
- [references/troubleshooting.md](references/troubleshooting.md) - 故障排查指南
- `.claude/rules/base.md` - 基础技术栈规则
- `.claude/rules/code.md` - 代码规范和错误模式
- `用户输入文件夹/开发对话/开发交接书.md` - 完整交接文档

## 开发提示

1. ⚠️ **聚贞贞平台故事板端点**: 贞贞使用常规视频端点 `/v2/videos/generations` + 特殊提示词格式，而非专用端点 ⭐ 2026-01-02
2. ⚠️ **聚鑫平台模型名称**: 必须使用 `sora-2-all`，不能使用 `sora-2` ⭐ 2026-01-02
3. ⚠️ **贞贞平台模型名称**: 使用 `sora-2` 或 `sora-2-pro` ⭐ 2026-01-02
4. ⚠️ **平台自动切换**: 后端 Sora2Client 已实现自动选择，前端默认值需同步 ⭐ 2026-01-02
5. ⚠️ **node.data 数据类型**: selectedImages/selectedCharacters 保存为**数组**而非 Set ⭐ 2026-01-02
6. ⚠️ **CSS border语法**: 颜色值不加引号，如 `'1px solid #fcd34d'` ⭐ 2026-01-02
7. ⚠️ **JavaScript TDZ**: const变量必须在声明前定义，注意函数和Hook的调用顺序 ⭐ 2026-01-02
8. ⚠️ **React对象渲染**: 不能直接渲染对象，使用 `error?.message || JSON.stringify(error)` ⭐ 2026-01-02
9. ✅ **角色创建不传 model**: 所有平台统一，创建角色时不传 model 参数
10. ✅ **API 调用前检查路径**: 确保包含 `/api/` 前缀
11. ✅ **角色创建优先使用 from_task**: 比 URL 更可靠
12. ✅ **React Flow 节点使用 useNodeId()**: data 对象不包含 id
13. ✅ **React Flow Handle 标签布局**: Handle 和标签必须完全分离，独立定位
14. ✅ **轮询间隔至少 30 秒**: 避免 429 错误
15. ✅ **双平台兼容**: 同时支持聚鑫和贞贞的响应格式
16. ✅ **每次开发后更新文档**: 遵循更新流程和检查清单
17. ✅ **localStorage 数据必须验证**: 使用 try-catch 和默认值
18. ✅ **导入文件验证格式**: 检查必需字段和数据类型
19. ✅ **视频时长使用数字类型**: duration: 10 (非 "10")
20. ✅ **Sora2 不支持 1:1 比例**: 只提供 16:9 和 9:16
21. ✅ **图生视频提示词必须描述参考图**: 参考图片提供场景，提示词必须描述场景内容和角色活动
22. ✅ **表单字段必须有 id/name 属性**: 满足浏览器可访问性要求
23. ✅ **源节点直接更新目标节点**: 绕过 App.jsx，使用 getEdges() 找到连接的节点，一次 setNodes() 更新多个节点 ⭐ 2026-01-01
24. ✅ **关键时刻手动同步 node.data**: 在 getNodes() 捕获快照前，手动调用 setNodes() 确保数据同步 ⭐ 2026-01-01
25. ✅ **防抖 localStorage 保存**: 500ms 防抖，减少 90% 的写入次数，提升响应速度 ⭐ 2026-01-01
26. ✅ **自动化测试是基础标准范式**: 使用 MCP 工具在浏览器中自动测试，不要总是问用户，只在做连线/拖拽时请求用户协作 ⭐ 2026-01-01
27. ✅ **专注于核心功能**: 避免过度复杂化，保持代码简洁可维护 ⭐ 2026-01-01
28. ✅ **任务进度百分比显示**: 从 API 响应提取 progress 字段（0-100），在状态文本中显示 "⏳ 处理中 45%" ⭐ 2026-01-01
29. ✅ **已完成任务进度默认 100%**: 任务完成时（SUCCESS + videoUrl）自动设置 progress 为 100%，即使 API 未返回 progress 字段 ⭐ 2026-01-01
30. ✅ **useEffect 空依赖数组防止竞态条件**: 当 useEffect 和事件监听器都管理同一状态时，useEffect 应使用空依赖数组只在挂载时运行，避免事件更新触发 useEffect 恢复旧数据 ⭐ 2026-01-01
31. ✅ **自动检测修复缺失字段**: 从连接的源节点读取配置信息，自动修复 localStorage 中旧任务缺失的字段（如 platform），确保向后兼容 ⭐ 2026-01-01
32. ⚠️ **Windows 后端重启**: 修改后端代码后必须 Ctrl+C 停止服务器，重新运行 `npm run server`（Node.js 模块缓存导致修改不生效）⭐ 2026-01-02
33. ⚠️ **Windows 端口占用**: 如遇 EADDRINUSE 错误，删除 nul 文件（`del nul`）或运行 `taskkill /F /IM node.exe` 强制结束进程 ⭐ 2026-01-02
