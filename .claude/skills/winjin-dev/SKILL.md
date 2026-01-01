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

### 2. Sora2 API 注意事项

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

---

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

1. ✅ **API 调用前检查路径**: 确保包含 `/api/` 前缀
2. ✅ **角色创建优先使用 from_task**: 比 URL 更可靠
3. ✅ **React Flow 节点使用 useNodeId()**: data 对象不包含 id
4. ✅ **React Flow Handle 标签布局**: Handle 和标签必须完全分离，独立定位
5. ✅ **轮询间隔至少 30 秒**: 避免 429 错误
6. ✅ **双平台兼容**: 同时支持聚鑫和贞贞的响应格式
7. ✅ **每次开发后更新文档**: 遵循更新流程和检查清单
8. ✅ **localStorage 数据必须验证**: 使用 try-catch 和默认值
9. ✅ **导入文件验证格式**: 检查必需字段和数据类型
10. ✅ **视频时长使用数字类型**: duration: 10 (非 "10")
11. ✅ **Sora2 不支持 1:1 比例**: 只提供 16:9 和 9:16
12. ✅ **图生视频提示词必须描述参考图**: 参考图片提供场景，提示词必须描述场景内容和角色活动
13. ✅ **表单字段必须有 id/name 属性**: 满足浏览器可访问性要求
14. ✅ **历史记录卡片显示视频**: 优先级检查 thumbnail → result.output → 占位符
15. ✅ **源节点直接更新目标节点**: 绕过 App.jsx，使用 getEdges() 找到连接的节点，一次 setNodes() 更新多个节点 ⭐ 2026-01-01
16. ✅ **关键时刻手动同步 node.data**: 在 getNodes() 捕获快照前，手动调用 setNodes() 确保数据同步 ⭐ 2026-01-01
17. ✅ **防抖 localStorage 保存**: 500ms 防抖，减少 90% 的写入次数，提升响应速度 ⭐ 2026-01-01
18. ✅ **getNodes() 的时机陷阱**: getNodes() 是同步的，useState 是异步的，useEffect 在渲染后执行 ⭐ 2026-01-01
