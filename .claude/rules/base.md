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

### 参考图片功能 ⭐ 新增

**文生视频 vs 图生视频**:
- **文生视频**: 不提供 `images` 参数，纯文本提示词生成
- **图生视频**: 提供 `images` 数组参数（1张或多张），基于参考图片生成

**简单模式**:
- 支持动态添加/删除多张参考图片
- 自动检测：有图片 = 图生视频，无图片 = 文生视频
- 参数：`images: ['url1', 'url2', ...]`

**故事板模式**:
- 每个分镜头可以独立配置参考图片
- 参数结构：`shots: [{ duration, scene, image }, ...]`
- 后端自动收集所有镜头的图片并合并到 `images` 数组

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
