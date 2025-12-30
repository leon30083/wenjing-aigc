---

paths: *

---

# 技术栈约束

## 运行时环境

- **Node.js**: 16.x 或更高
- **npm**: 8.x 或更高
- **操作系统**: Windows 10/11（主要目标平台）

## 核心框架版本

| 框架/库 | 版本要求 | 说明 |
|---------|----------|------|
| Electron | ^28.0.0 | 桌面应用框架 |
| Express | ^4.18.2 | HTTP 服务器 |
| axios | ^1.6.5 | HTTP 客户端 |
| dotenv | ^17.2.3 | 环境变量管理 |
| form-data | ^4.0.0 | 多表单数据 |
| **React** | ^19.0.0 | **前端 UI 框架（工作流编辑器）** ⭐ 新增 |
| **React Flow** | ^11.0.0 | **节点编辑器库（可视化工作流）** ⭐ 新增 |
| **Vite** | ^5.0.0 | **前端构建工具** ⭐ 新增 |
| **Tailwind CSS** | ^3.4.0 | **CSS 框架（可选）** ⭐ 新增 |

### 前端架构说明 ⭐ 新增

**当前架构**（v1.x）：
```
原生 HTML + JavaScript
└── src/renderer/public/index.html
```

**工作流编辑器架构**（v2.0 - 开发中）：
```
React + React Flow
└── src/client/
    ├── src/nodes/         # 自定义节点
    ├── src/components/   # UI 组件
    └── src/hooks/        # 业务逻辑
```

**注意事项**：
- Express 后端保持不变，继续服务现有 API
- React 前端通过 HTTP 调用 Express API
- 两种架构并存，逐步迁移


## Sora2 API 支持平台

### 聚鑫平台 (api.jxincm.cn)
- **Base URL**: `https://api.jxincm.cn`
- **创建视频**: `POST /v1/video/create`
- **查询任务**: `GET /v1/video/query?id={taskId}` ⚠️ 查询参数
- **创建角色**: `POST /sora/v1/characters`
- **故事板**: `POST /v1/video/storyboard`

### 贞贞平台 (ai.t8star.cn)
- **Base URL**: `https://ai.t8star.cn`
- **创建视频**: `POST /v1/video/create`
- **查询任务**: `GET /v2/videos/generations/{taskId}` ⚠️ 路径参数
- **创建角色**: `POST /sora/v1/characters`
- **故事板**: `POST /v1/video/storyboard`

### 重要差异
- **查询端点**: 聚鑫用查询参数 `?id=`，贞贞用路径参数 `/{taskId}`
- **响应格式**: 聚鑫返回 `{id}`, 贞贞返回 `{task_id}` ⚠️ **需要兼容处理**
- **数据格式**: 聚鑫返回 OpenAI 格式，贞贞返回统一格式

## API 规范

### 统一响应格式
```javascript
// 成功
{ success: true, data: {...} }

// 失败
{ success: false, error: "错误信息" }
```

### 统一状态码 (贞贞/统一格式)
- `NOT_START` - 未开始
- `IN_PROGRESS` - 处理中
- `SUCCESS` - 完成
- `FAILURE` - 失败

### 角色引用语法 ⭐
所有平台统一使用：
```
@username 提示词内容
```

示例：
```
@6f2dbf2b3.zenwhisper 在工地上干活
```

**注意**: 格式为 `@username`（**不带花括号**），角色引用和提示词之间用空格隔开

### 角色创建规范 ⭐
- **端点**: `POST /sora/v1/characters`
- **参数**: `url` (视频链接) 或 `from_task` (任务ID) **二选一**
- **必填**: `timestamps` (格式: "1,3"，范围差值必须是 1-3 秒)
- **⚠️ 禁止**: **不要传递 `model` 参数**，否则会导致 404 错误
- **✅ 推荐**: 优先使用 `from_task` 参数（从已完成的视频任务创建）

### 角色管理 API ⭐ 新增

**设置角色收藏状态**:
- **端点**: `PUT /api/character/:username/favorite`
- **参数**: `username` - 角色用户名（路径参数），`favorite` - 布尔值（请求体）
- **响应**: `{ success: true, data: { ...character, favorite: boolean } }`
- **注意**: 使用 `username` 而非 `id` 作为路径参数

**获取收藏的角色列表**:
- **端点**: `GET /api/character/favorites`
- **响应**: `{ success: true, data: [...] }`
- **筛选**: 只返回 `favorite: true` 的角色

**角色搜索和筛选** ⭐ 新增:
- **搜索**: 前端实时搜索，按 `username` 或 `alias` 匹配（不区分大小写）
- **筛选类型**:
  - `all` - 显示全部角色
  - `favorites` - 只显示收藏的角色
  - `recent` - 显示最近使用的角色（localStorage，最多 20 个）
- **防抖延迟**: 300ms（搜索输入）

**删除角色** ⭐ 新增:
- **端点**: `DELETE /api/character/:characterId`
- **参数**: `characterId` - 角色 ID（路径参数）
- **响应**: `{ success: true, data: { deleted: true } }`
- **⚠️ 注意**: 前端应实现确认对话框，防止误操作

**批量删除角色** ⭐ 新增:
- **端点**: `DELETE /api/character/:characterId` (多次调用)
- **实现**: 前端使用 `Promise.all()` 并发调用删除 API
- **参数**: `characterIds` - 角色 ID 数组
- **响应**: 所有删除请求都成功视为成功
- **⚠️ 注意**: 前端应显示确认对话框，提示删除数量

**更新角色别名** ⭐ 新增:
- **端点**: `PUT /api/character/:characterId/alias`
- **参数**: `characterId` - 角色 ID（路径参数），`alias` - 别名字符串（请求体）
- **响应**: `{ success: true, data: { ...character, alias: string } }`
- **验证**: `alias` 为必填参数，自动 trim 空格

### 参考图片功能 ⭐ 新增

**文生视频 vs 图生视频**:
- **文生视频**: 不提供 `images` 参数，纯文本提示词生成
- **图生视频**: 提供 `images` 数组参数（1张或多张），基于参考图片生成

**简单模式**:
- 支持动态添加/删除多张参考图片
- 自动检测：有图片 = 图生视频，无图片 = 文生视频
- 参数：`images: ['url1', 'url2', ...]`

**故事板模式** ⚠️ 重要纠正:
- **故事板本质**: 单个视频任务（不是多个视频），通过特殊格式描述多个时间段
- **提示词格式**: 每个镜头拼接为 `Shot N:\nduration: Xsec\nScene: Y\n\n`
- **API 调用**: 调用一次 API，返回单个 taskId
- **参数结构**: `shots: [{ duration, scene, image }, ...]`
- **图片收集**: 后端收集所有镜头的图片并合并到 `images` 数组
- **❌ 错误做法**: 循环调用 N 次 API（每个镜头一次）
- **✅ 正确做法**: 拼接故事板格式，调用一次 API

**角色与图片混合使用**:
- 参考图片作为场景基础
- 角色客串在场景中活动：`@username 在参考图片场景中活动`
- 提示词需要描述角色在场景中的具体活动

### 历史记录管理 API ⭐ 新增

**删除单条记录**:
- **端点**: `DELETE /api/history/:taskId`
- **参数**: `taskId` - 任务 ID（路径参数）
- **响应**: `{ success: true, data: { deleted: true } }`

**清空所有记录**:
- **端点**: `DELETE /api/history/all`
- **响应**: `{ success: true, data: { message: 'All records cleared' } }`
- **⚠️ 注意**: 前端应实现二次确认机制，防止误操作

### 备份管理 API ⭐ 新增

**导出备份数据**:
- **端点**: `GET /api/backup/export`
- **响应**: `{ success: true, data: { characters: [...], history: [...], version: "1.0" } }`
- **格式**: JSON 格式，包含角色库和历史记录

**导入备份数据**:
- **端点**: `POST /api/backup/import`
- **请求体**: `{ characters: [...], history: [...], version: "1.0" }`
- **响应**: `{ success: true, data: { imported: { characters: N, history: M } } }`
- **⚠️ 注意**: 导入时跳过已存在的记录（不覆盖）

**获取备份信息**:
- **端点**: `GET /api/backup/info`
- **响应**: `{ success: true, data: { characterCount: N, historyCount: M, version: "1.0" } }`

## 前端架构 - 工作流管理 ⭐ 新增

### 工作流持久化方案

**存储位置**: `localStorage`

**存储结构**:
```javascript
// 键名: winjin-workflows
{
  "工作流名称": {
    name: "工作流名称",
    description: "工作流描述",
    nodes: [...],      // React Flow 节点数组
    edges: [...],      // React Flow 连线数组
    createdAt: "2025-12-30T12:00:00.000Z",
    updatedAt: "2025-12-30T12:30:00.000Z"
  }
}

// 键名: winjin-current-workflow
// 值: 当前工作流名称
```

**核心功能**:
- **保存**: 覆盖当前工作流或另存为新名称
- **加载**: 加载已保存的工作流（节点、连线）
- **删除**: 删除指定工作流（带确认）
- **导出**: 下载为 JSON 文件
- **导入**: 从 JSON 文件导入（自动重命名避免冲突）

**技术细节**:
- **自动递增 ID**: 加载工作流后，`nextNodeId` 根据现有节点最大 ID 自动递增
- **当前工作流显示**: 工具栏显示蓝色标签 "📁 工作流名称"
- **数据验证**: 导入时验证 JSON 格式（必须包含 name, nodes, edges）
- **冲突处理**: 导入时如果名称冲突，自动添加 "(1), (2)" 后缀

### 视频生成节点参数 ⭐ 更新

**时长参数**:
- **有效值**: 5, 10, 15, 25（秒）
- **类型**: `number`（非字符串）
- **API 对应**: Sora2 API 的 `duration` 参数

**比例参数**:
- **有效值**: "16:9", "9:16"
- **⚠️ 注意**: Sora2 **不支持** 1:1 比例

**完整请求示例**:
```javascript
{
  platform: 'juxin',
  model: 'sora-2',           // 注意: API 传递小写
  prompt: '一只可爱的猫咪',
  duration: 10,              // 数字类型
  aspect_ratio: '16:9',      // 横屏/竖屏
  watermark: false,
  images: ['url1', 'url2']  // 可选: 参考图片
}
```

### 角色引用策略 ⭐ 更新

**设计理念**：完全复刻网页版的角色调用方式，灵活自由

**工作流程**:
```
CharacterLibraryNode (多选初筛)
  ↓ selectedCharacters 数组
  ↓ 通过节点连接传递
VideoGenerateNode (接收候选角色列表)
  ↓ 显示候选角色卡片
  ↓ 用户点击角色卡片
  ↓ 在光标位置插入 @username
```

**CharacterLibraryNode - 初筛功能**:
- **多选模式切换**: 提供"传送到视频节点"和"角色编辑"两种模式
- **传送到视频节点模式**:
  - 点击角色卡片进行多选（绿色边框 + ✓ 标识）
  - 再次点击取消选择
  - 通过节点连接传递选中的角色数组
- **角色编辑模式**:
  - 单个角色删除：hover 显示删除按钮（✕）
  - 双击编辑角色别名
  - 批量选择和删除操作
  - 更准确的模式描述（原名"批量删除"）
- **搜索和筛选**: 支持按用户名/别名搜索，支持筛选（全部/收藏/最近）

**VideoGenerateNode - 手动插入功能**:
- **候选角色显示**:
  - 显示从 CharacterLibraryNode 接收的候选角色列表
  - 每个角色显示：头像 + 别名/用户名
  - hover 高亮效果
- **点击插入**:
  - 点击角色卡片，在光标位置插入 `@alias`
  - 自动移动光标到插入内容之后
  - 可多次插入，插入到不同位置
- **提示词编辑**:
  - 用户完全自由编辑提示词
  - 可以手动输入/修改/删除 `@username` 引用
  - 不做任何自动组装
- **空状态提示**:
  - 未连接角色库节点时：显示提示信息
  - 连接但未选择角色时：显示提示信息

**双显示功能** ⭐ 新增:
- **设计理念**: 用户看到友好的别名，API接收准确的真实ID
- **用户体验**:
  - 输入框显示：`@阳光小猫 和@测试小猫 在海边玩`（易读）
  - 内部存储：`@5562be00d.sunbeamkit 和@ebfb9a758.sunnykitte 在海边玩`（准确）
- **映射机制**:
  - 创建 `usernameToAlias` 映射表（React.useMemo 优化性能）
  - `realToDisplay()`: 将真实ID转换为别名（显示用）
  - `displayToReal()`: 将别名转换为真实ID（API用）
- **正则表达式修复** ⚠️ 关键:
  - 问题：`\b` 单词边界不支持中文（只匹配 `[a-zA-Z0-9_]`）
  - 解决：使用 `(?=\s|$|@)` 正向肯定预查
  - 匹配：空白字符、字符串结尾、或下一个 `@` 符号
- **实现示例**:
  ```javascript
  // 创建映射
  const usernameToAlias = React.useMemo(() => {
    const map = {};
    connectedCharacters.forEach(char => {
      map[char.username] = char.alias || char.username;
    });
    return map;
  }, [connectedCharacters]);

  // 真实ID → 显示别名
  const realToDisplay = (text) => {
    let result = text;
    Object.entries(usernameToAlias).forEach(([username, alias]) => {
      const regex = new RegExp(`@${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      result = result.replace(regex, `@${alias}`);
    });
    return result;
  };

  // 显示别名 → 真实ID（按最长匹配优先，支持中文）
  const displayToReal = (text) => {
    let result = text;
    const sortedAliases = Object.entries(usernameToAlias)
      .sort((a, b) => b[1].length - a[1].length); // 长别名优先
    sortedAliases.forEach(([username, alias]) => {
      // ⚠️ 关键：使用 (?=\s|$|@) 而不是 \b
      const regex = new RegExp(`@${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|@)`, 'g');
      result = result.replace(regex, `@${username}`);
    });
    return result;
  };

  // Textarea 显示别名
  <textarea
    value={realToDisplay(manualPrompt)}
    onChange={(e) => setManualPrompt(displayToReal(e.target.value))}
  />

  // 预览显示真实ID
  <div>📤 最终提示词 (API): {manualPrompt}</div>
  <div>💡 输入框显示别名，API使用真实ID</div>
  ```

**角色引用格式**:
- **显示格式**（用户输入框显示）：`@alias`（用户友好的别名）
- **API格式**（内部存储和API调用）：`@username`（真实用户名ID）
- **示例**：
  - 显示：`@阳光小猫 和@测试小猫 在海边玩`
  - API：`@5562be00d.sunbeamkit 和@ebfb9a758.sunnykitte 在海边玩`
- 位置：用户完全控制插入位置，系统不做任何自动插入

**数据传递格式**:
```javascript
// CharacterLibraryNode 传递
data.connectedCharacters = [
  {
    id: "ch_xxx",
    username: "de3602969.sunnykitty",
    alias: "阳光小猫",
    profilePictureUrl: "https://...",
    permalink: "https://...",
  },
  // ... 更多角色
]

// VideoGenerateNode 接收
const [connectedCharacters, setConnectedCharacters] = useState([]);
```

**光标插入实现**（支持双显示）:
```javascript
const insertCharacterAtCursor = (username, alias) => {
  const promptElement = promptInputRef.current;
  if (!promptElement) return;

  // 获取光标位置（在显示文本中的位置）
  const start = promptElement.selectionStart;
  const end = promptElement.selectionEnd;
  const displayText = realToDisplay(manualPrompt);
  const refText = `@${alias} `; // 插入别名到显示位置

  // 在光标位置插入到显示文本
  const newDisplayText = displayText.substring(0, start) + refText + displayText.substring(end);

  // 转换回真实ID并存储
  const newRealText = displayToReal(newDisplayText);
  setManualPrompt(newRealText);

  // 移动光标到插入内容之后
  setTimeout(() => {
    promptElement.setSelectionRange(start + refText.length, start + refText.length);
    promptElement.focus();
  }, 0);
};
```

**关键优势**:
- ✅ 角色库节点做初筛，避免视频生成节点角色过多
- ✅ 用户完全控制角色引用的位置和数量
- ✅ 完全复刻网页版的灵活交互方式
- ✅ 支持任意复杂的多角色场景（`@user1 和 @user2 在一起，@user3 在旁边观看`）
- ✅ 双显示功能：输入框显示易读别名，API使用准确ID（避免混淆）

### 角色结果节点 ⭐ 新增

**功能描述**：
- 显示角色创建任务的详细结果
- 通过事件系统从 CharacterCreateNode 接收角色数据
- 提供复制到剪贴板功能（角色 ID、用户名）

**数据格式**:
```javascript
{
  id: "ch_69536e7ce60481919c4e9a2a3cf4c6d5",
  username: "de3602969.sunnykitty",
  permalink: "https://sora.chatgpt.com/profile/de3602969.sunnykitty",
  profile_picture_url: "https://...",
  alias: "可选别名"  // 如果设置过
}
```

**事件系统**:
- **事件名**: `character-created`
- **事件数据**: `{ sourceNodeId, character }`
- **验证逻辑**: 检查 `data.connectedSourceId === event.detail.sourceNodeId`

**技术细节**:
- **输入端口**: `character-input` (左侧)
- **无输出端口**: 纯展示节点
- **剪贴板 API**: 优先使用 `navigator.clipboard`，降级到 `execCommand`
- **复制反馈**: 点击后显示 "✓ 已复制" 2 秒

### React Flow 节点管理 ⭐ 新增

**右键菜单功能**:
- **节点菜单**: 复制节点、删除节点
- **画布菜单**: 粘贴节点、添加所有节点类型
- **点击外部**: 自动关闭菜单

**节点删除**:
- **上下文删除**: 删除右键点击的特定节点（使用 `deleteNode(node)`）
- **工具栏删除**: 删除所有选中节点（使用 `deleteSelectedNodes()`）
- **快捷键**: Delete 键删除选中节点

**节点创建位置**:
- **右键创建**: 使用 `screenToFlowPosition()` 转换坐标
- **正确用法**: `const position = screenToFlowPosition({ x: clientX, y: clientY })`
- **❌ 错误用法**: 使用 viewport 坐标或 `project()`（已废弃）

**Provider 配置**:
- **必须使用**: `ReactFlowProvider` 包裹应用
- **入口位置**: `main.jsx`
- **Hook 依赖**: `useReactFlow` 必须在 Provider 内部使用

**节点大小可调整** ⭐ 新增:
- **ComfyUI 风格**: 节点右下角显示三角形缩放手柄
- **拖动调整**: 鼠标拖动右下角调整节点大小
- **最小尺寸**: 限制最小宽度和高度（如 260px x 400px）
- **用户选择**: 节点内文本选择不触发节点拖动

**节点内交互控制** ⭐ 新增:
- **`nodrag` 类**: React Flow 官方方案，防止元素触发节点拖动
- **应用位置**:
  - `<textarea className="nodrag">` - 文本输入框
  - `<select className="nodrag">` - 下拉选择框
  - `<input className="nodrag">` - 复选框
  - `<button className="nodrag">` - 按钮
  - 缩放手柄: `<div className="nodrag" onMouseDown={handleResize}>`
- **❌ 错误做法**: 使用 `e.stopPropagation()`（React Flow 使用捕获阶段，stopPropagation 无效）

**无限循环防止** ⭐ 新增:
- **问题**: useEffect 依赖 `data` 对象导致无限渲染
- **原因**: `data` 对象在每次渲染时都是新引用
- **解决方案**:
  1. **节点内部**: 使用 `useRef` 存储回调，只更新 `data.onSizeChange`
  2. **父组件**: 使用 `useCallback` 创建稳定回调函数
- **关键点**: 移除 `data` 从 useEffect 依赖数组

## 轮询策略

### 后台自动轮询服务
- **轮询间隔**: **30 秒**（sora2 生成需 3-5 分钟）
- **检查范围**: 所有 `queued` 和 `processing` 状态的任务
- **自动更新**: 任务完成后自动更新历史记录状态

### 手动查询功能
- 为用户提供"查询状态"按钮
- 可主动查询而无需等待轮询

## 禁止模式

- ❌ 不使用 `child_process` 调用 API（会导致进程僵死）
- ❌ 不使用 `request`（已废弃的库）
- ❌ 不在代码中硬编码 API Key（使用 `.env` + `dotenv`）
- ❌ 不使用错误的查询端点（聚鑫必须用 `/v1/video/query?id=xxx`）
- ❌ 不使用过短的轮询间隔（推荐 30 秒）
- ❌ 不假设任务ID字段名称（必须兼容 `id` 和 `task_id`）

## 环境变量

项目使用 `.env` 文件管理敏感信息：

```bash
# 聚鑫平台 API Key
SORA2_API_KEY=sk-xxxxxxxxxxxx

# 贞贞平台 API Key
ZHENZHEN_API_KEY=sk-xxxxxxxxxxxx

# 服务器端口
PORT=9000
```

## 参考文档

- **开发经验**: `reference/用户输入文件夹/开发经验/Sora2_Character_Best_Practices.md`
- **聚鑫 API**: `reference/用户输入文件夹/聚鑫sora2/`
- **贞贞 API**: `reference/用户输入文件夹/贞贞工坊/`
