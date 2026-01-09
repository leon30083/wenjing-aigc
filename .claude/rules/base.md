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
- **模型**: `sora-2-all` ⭐ 唯一支持 (2026-01-02 更新)
- **创建视频**: `POST /v1/video/create`
- **查询任务**: `GET /v1/video/query?id={taskId}` ⚠️ 查询参数
- **创建角色**: `POST /sora/v1/characters`
- **故事板**: `POST /v1/videos` ⭐ 故事板专用端点 (multipart/form-data)

### 贞贞平台 (ai.t8star.cn)
- **Base URL**: `https://ai.t8star.cn`
- **模型**: `sora-2`, `sora-2-pro` ⭐ 两个可选 (2026-01-02 更新)
- **创建视频**: `POST /v2/videos/generations`
- **查询任务**: `GET /v2/videos/generations/{taskId}` ⚠️ 路径参数
- **创建角色**: `POST /sora/v1/characters`
- **故事板**: `POST /v2/videos/generations` ⭐ 使用常规视频端点 + 特殊提示词格式 (application/json)

### 重要差异
- **模型名称**: 聚鑫使用 `sora-2-all`，贞贞使用 `sora-2` 或 `sora-2-pro` ⭐ (2026-01-02 更新)
- **查询端点**: 聚鑫用查询参数 `?id=`，贞贞用路径参数 `/{taskId}`
- **响应格式**: 聚鑫返回 `{id}`, 贞贞返回 `{task_id}` ⚠️ **需要兼容处理**
- **数据格式**: 聚鑫返回 OpenAI 格式，贞贞返回统一格式
- **故事板端点**: ⭐ 重要差异 (2026-01-02 更新)
  - **聚鑫平台**: 专用端点 `POST /v1/videos` (multipart/form-data)
  - **贞贞平台**: 常规端点 `POST /v2/videos/generations` (application/json) + 特殊提示词格式

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

### 角色引用原则 ⭐ 2026-01-06 重要更新

**核心原则**: 使用角色引用时，Sora2会使用角色的真实外观，**不需要描述角色长相**。

**❌ 错误做法**:
```javascript
// 错误：描述角色外观
const prompt = `
卡通风格的绘本动画。

角色设计：
所有角色均采用拟人化设计，拥有大而闪亮的眼睛、友好的微笑表情和可爱的姿态，充满童趣和亲和力。

场景：
一片阳光明媚、沙滩柔软、海水湛蓝的卡通海边。
`;
// 问题：角色引用丢失，AI不知道使用哪个角色
```

**✅ 正确做法**:
```javascript
// 正确：保留角色引用，不描述外观
const prompt = `
卡通风格的绘本动画。

场景：一片阳光明媚、沙滩柔软、海水湛蓝的卡通海边。环境高度简化，背景有几朵棉花。

核心动作：@ebfb9a758.sunnykitte 在海边玩耍，充满好奇和喜悦地探索。

细节与氛围：
- 阳光温柔地洒在海浪和沙滩上
- 整体氛围温暖、友好，充满着纯真的好奇与发现
`;
// ✅ 保留角色引用，不描述长相（Sora2会使用角色真实外观）
```

**关键规则**:
1. **必须保留角色引用**: 优化后的提示词必须包含 `@ebfb9a758.sunnykitte` 格式的引用
2. **不描述外观**: 不需要描述"大眼睛、微笑表情、可爱姿态"等（Sora2会使用角色真实外观）
3. **只描述活动**: 重点描述角色在场景中的动作、互动、位置、情绪
4. **使用真实ID**: `@ebfb9a758.sunnykitte`（真实ID），而非 `@测试小猫`（别名）

**节点差异**:
| 节点类型 | 输入框显示 | API使用 | 说明 |
|---------|----------|---------|------|
| **优化节点** | 真实ID<br/>`@ebfb9a758.sunnykitte` | 真实ID | 发送给AI，必须使用真实ID |
| **视频生成节点** | 别名<br/>`@测试小猫` | 真实ID | 用户友好，API使用真实ID |
| **角色库节点** | 别名+ID<br/>`测试小猫 (@ebfb9a758.sunnykitte)` | 真实ID | 点击插入真实ID |

**为什么优化节点不能使用别名显示**:
- AI需要识别角色引用（`@ebfb9a758.sunnykitte`）
- 别名（`@测试小猫`）无法被AI识别为角色引用
- AI会把别名当作普通文本，导致角色引用丢失

### 角色创建规范 ⭐
- **端点**: `POST /sora/v1/characters`
- **参数**: `url` (视频链接) 或 `from_task` (任务ID) **二选一**
- **必填**: `timestamps` (格式: "1,3"，范围差值必须是 1-3 秒)
- **⚠️ 禁止**: **不要传递 `model` 参数**，否则会导致 404 错误
- **✅ 推荐**: 优先使用 `from_task` 参数（从已完成的视频任务创建）
- **⚠️ 模型名称注意事项** (2026-01-02):
  - 聚鑫平台: 使用 `sora-2-all` 模型（自动）
  - 贞贞平台: 使用 `sora-2` 或 `sora-2-pro` 模型（自动）
  - 创建角色时不传 `model` 参数，由后端自动选择

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

**故事板前端实现规范** ⭐ 更新 (2025-12-30):
- **角色引用**: 支持从 CharacterLibraryNode 获取候选角色，点击插入到焦点场景
- **焦点管理**: 使用 `useRef` 记录最后焦点的场景输入框（`lastFocusedSceneIndex`）
- **场景输入**: 每个镜头的场景输入框绑定 `ref`，`onFocus` 时记录索引
- **光标插入**: 点击角色卡片时，在场景输入框的光标位置插入 `@alias`
- **双显示功能**: 场景输入框显示别名，内部存储和API使用真实ID ⭐
- **状态简化**: 移除 `progress` 状态，只保留 `idle/generating/success/error`
- **比例限制**: Sora2 不支持 1:1 比例，只提供 16:9 和 9:16
- **时长类型**: duration 为数字类型（10, 15, 25），不是字符串
- **默认时长**: 故事板镜头默认时长为 15 秒（不是 5 秒） ⭐ 更新 (2026-01-02)

**角色与图片混合使用**:
- 参考图片作为场景基础
- 角色客串在场景中活动：`@username 在参考图片场景中活动`
- 提示词需要描述角色在场景中的具体活动

**参考图片节点协作规范** ⭐ 更新 (2025-12-30):
- **ReferenceImageNode 功能**:
  - **选择模式**: 多选图片，绿色边框 + ✓ 标识
  - **预览模式**: 点击图片卡片查看大图（模态框）
  - **模式切换**: "选择模式" / "预览模式" 按钮
- **数据传递**:
  - `selectedImages` Set → `connectedImages` 数组
  - 通过 `useReactFlow.setNodes()` 主动传递数据
- **VideoGenerateNode 协作**:
  - 复选框控制：`[ ] 使用参考图` - 选中才添加到 API
  - 显示已连接的参考图预览（缩略图网格）
  - 空状态提示：`💡 提示：连接参考图节点并选择图片`
- **StoryboardNode 协作**:
  - **全局图片控制**: 复选框 `[] 启用全局参考图` - 选中才添加到 API
  - **镜头图片选择**: 每个镜头独立选择（📷 按钮打开选择器）
  - **图片合并逻辑**:
    - 如果启用全局：`allImages = [...globalImages, ...shotImages]`
    - 如果禁用全局：`allImages = [...shotImages]`（只用镜头图片）
  - **时长手动设置**: 每个镜头独立设置时长（1-25秒） ⭐ 更新 (2025-12-30)
    - 移除自动均分功能，改为用户手动输入
    - 每个镜头显示输入框：`⏱️ [5] 秒`
    - 实时计算总时长并显示：`⏱️ 总时长: 15 秒`
    - 超过 25 秒警告提示
  - **⚠️ API 注意**: 故事板模式不发送单独的 `duration` 参数，总时长由各镜头时长之和决定

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

### 提示词优化API ⭐ 新增 (2026-01-05)

**端点**: `POST /api/openai/optimize`

**请求格式**:
```javascript
{
  base_url: "https://api.deepseek.com",
  api_key: "sk-xxx",
  model: "deepseek-chat",
  prompt: "简单描述",
  style: "picture-book",  // picture-book | documentary | animation | cinematic
  context: {
    target_duration: 10,
    characters: [{ username, alias, profilePictureUrl }]
  }
}
```

**响应格式**:
```javascript
{
  success: true,
  data: {
    optimized_prompt: "优化后的详细提示词",
    meta: {
      model_used: "deepseek-chat",
      style: "picture-book",
      tokens_used: 778
    }
  }
}
```

**功能说明**:
- 使用 OpenAI API (DeepSeek) 将简单描述优化成详细的 Sora2 提示词
- ⚠️ **当前状态**: 仅 `picture-book` 风格有完整的系统提示词实现，其他风格使用通用提示词
- 支持角色上下文（从 CharacterLibraryNode 获取）
- 保留 `@username` 格式（变量引用，不展开描述）

**风格支持** (2026-01-05):
- `picture-book`: ✅ 完整支持（三层扩展模型、拟人化角色、鲜艳色彩）
- `documentary`: ⚠️ 基础支持（使用通用提示词）
- `animation`: ⚠️ 基础支持（使用通用提示词）
- `cinematic`: ⚠️ 基础支持（使用通用提示词）

**后端实现** (src/server/services/openaiClient.js):

系统提示词构建（仅 picture-book 有详细实现）:
```javascript
_buildSystemPrompt(style, context) {
  if (style === 'picture-book') {
    return `你是专业的动画绘本提示词专家。

任务：将简单的绘本旁白优化成 Sora 2 视频生成提示词。

三层扩展模型：
1. Layer 1 (核心层 30%)：保持旁白的核心动作，不偏离故事主线
2. Layer 2 (丰富层 40%)：添加视觉细节、环境、氛围
3. Layer 3 (动态层 30%)：留出 AI 自然发挥空间，不要写死每个瞬间

绘本风格要求：
- ✅ 拟人化角色设计（大眼睛、表情、友好姿态）
- ✅ 鲜艳明亮的色彩（非写实、柔和）
- ✅ 简化的环境（适合儿童理解）
- ✅ 温暖友好的氛围
- ✅ 旁白感（暗示有配音、互动性）

输出格式：
卡通风格的绘本动画。

角色设计：[拟人化描述]
场景：[简化环境 + 色彩]
核心动作：[旁白中的关键动作]
细节与氛围：[3-5 个视觉细节]
Cinematography: [镜头类型]
Animation style: [运动风格描述]
视频时长：${context.target_duration || 10}秒`;
  }

  // 其他风格使用通用提示词
  return `你是视频提示词优化专家，请将简单描述优化成详细的 Sora 2 提示词。`;
}
```

用户提示词构建（包含角色引用保留）:
```javascript
_buildUserPrompt(prompt, style, context) {
  let characterContext = '';
  let characterMapping = '';

  // 添加角色上下文
  if (context.characters && context.characters.length > 0) {
    const characterList = context.characters.map(c => {
      const alias = c.alias || c.username;
      return `  - @${c.username} (${alias})`;
    }).join('\n');

    characterMapping = `\n\n可用角色列表（必须使用 @username 格式引用）：\n${characterList}`;

    characterContext = `\n\n重要：当提示词需要描述角色时，必须使用 @username 格式引用角色，不要直接描述角色的外貌特征。`;
  }

  return `请将以下绘本旁白优化成 Sora 2 视频生成提示词：${characterMapping}

旁白原文：${prompt}${characterContext}

要求：
1. 保持核心动作不变
2. 添加丰富的视觉细节
3. 使用绘本/卡通风格
4. 包含摄影指导和动画风格描述
5. 适合${context.target_duration || 10}秒视频时长
6. 如果提供了角色上下文，必须使用 @username 格式引用角色，不要直接描述角色

请直接输出优化后的提示词，不要解释。`;
}
```

**⚠️ 注意**:
- 用户提示词中硬编码了"绘本/卡通风格"，选择其他风格时不会改变系统行为
- 如需支持其他风格，需要扩展 `_buildSystemPrompt` 和 `_buildUserPrompt` 方法

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

**API 配置节点拆分** ⭐ 新增 (2025-12-30):
- **设计目标**: 将通用 API 配置提取到独立节点，避免重复配置
- **APISettingsNode**: 输入节点（蓝色系），包含以下配置：
  - `platform`: 聚鑫 / 贞贞
  - `model`:
    - 聚鑫: `sora-2-all` ⭐ 唯一选项 (2026-01-02 更新)
    - 贞贞: `sora-2` / `sora-2-pro`
  - `aspect`: 16:9 / 9:16
  - `watermark`: true / false
- **数据传递**:
  - APISettingsNode 通过 `useEffect` + `useReactFlow.setNodes()` 主动推送配置
  - 输出端口: `api-config`
  - 下游节点通过 `data.apiConfig` 接收配置
- **节点特有配置**:
  - VideoGenerateNode 保留 `duration` 配置（10, 15, 25秒） ⭐ 更新 (2026-01-02)
  - StoryboardNode 每个镜头独立设置时长
- **向后兼容**:
  - 未连接 APISettingsNode 时使用默认配置
  - 默认配置: `{ platform: 'juxin', model: 'sora-2-all', aspect: '16:9', watermark: false }` ⭐ (2026-01-02 更新)

**时长参数**:
- **有效值**: 10, 15, 25（秒） ⭐ 更新 (2026-01-02)
- **类型**: `number`（非字符串）
- **API 对应**: Sora2 API 的 `duration` 参数

**比例参数**:
- **有效值**: "16:9", "9:16"
- **⚠️ 注意**: Sora2 **不支持** 1:1 比例

**完整请求示例**:
```javascript
{
  platform: 'juxin',
  model: 'sora-2-all',       // 注意: 聚鑫平台使用 sora-2-all ⭐ (2026-01-02 更新)
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

### 平台专用故事板节点 ⭐ 新增 (2026-01-02)

**设计目标**:
- 分离聚鑫和贞贞平台的故事板功能，避免平台差异混淆
- 每个节点内置API配置，无需连接APISettingsNode
- 保留角色和参考图协作功能

**节点类型**:
1. **JuxinStoryboardNode** (聚鑫故事板)
2. **ZhenzhenStoryboardNode** (贞贞故事板)

**核心功能**:
- **内置API配置**: 可折叠的API配置区（平台固定为对应平台）
- **镜头管理**: 添加/删除/编辑镜头，每个镜头独立设置时长（1-25秒）
- **总时长显示**: 自动计算所有镜头总时长，超过25秒警告
- **角色协作**: 支持从CharacterLibraryNode接收候选角色
- **参考图协作**: 支持全局参考图 + 镜头独立图片
- **双显示功能**: 场景输入框显示别名，API使用真实ID

**聚鑫 vs 贞贞 差异**:

| 特性 | 聚鑫故事板 | 贞贞故事板 |
|------|-----------|-----------|
| **平台标识** | `juxin` | `zhenzhen` |
| **API端点** | `/v1/videos` (专用) | `/v2/videos/generations` (常规) |
| **Content-Type** | `multipart/form-data` | `application/json` |
| **提示词格式** | 拼接为字符串数组 | 直接传递多行文本 |
| **时长参数** | `seconds: "15"` | `duration: "15"` |
| **画面方向** | `orientation: 'landscape'/'portrait'` | `aspect_ratio: '16:9'/'9:16'` |
| **高清选项** | 无 | `hd: true/false` |
| **模型选择** | `sora-2-all` (固定) | `sora-2` / `sora-2-pro` (可选) |

**API调用示例**:

聚鑫故事板:
```javascript
// POST /v1/videos (multipart/form-data)
const formData = new FormData();
formData.append('model', 'sora-2-all');
formData.append('orientation', 'landscape');
formData.append('size', 'large');
formData.append('watermark', 'false');

// 提示词格式: 拼接镜头数组
const prompt = shots.map((shot, index) =>
  `Shot ${index + 1}:\nduration: ${shot.duration}sec\nScene: ${shot.scene}\n`
).join('\n');

formData.append('prompt', prompt);
```

贞贞故事板:
```javascript
// POST /v2/videos/generations (application/json)
const body = {
  model: 'sora-2',  // 或 'sora-2-pro'
  prompt: shots.map((shot, index) =>
    `Shot ${index + 1}:\nduration: ${shot.duration}sec\nScene: ${shot.scene}`
  ).join('\n\n'),
  duration: totalDuration.toString(),  // 总时长
  aspect_ratio: '16:9',
  hd: false,
  watermark: false,
};
```

**提示词格式规范**:
```
Shot 1:
duration: 5sec
Scene: 老鹰展翅高飞

Shot 2:
duration: 5sec
Scene: 老鹰在空中盘旋

Shot 3:
duration: 5sec
Scene: 老鹰降落在山顶
```

**关键点**:
1. **平台隔离**: 两个节点完全分离，避免平台差异混淆
2. **API配置内置**: 每个节点内部包含API配置，默认折叠
3. **镜头时长独立**: 每个镜头独立设置时长，不再自动均分
4. **总时长验证**: 自动计算总时长，超过25秒显示警告
5. **角色引用支持**: 支持从CharacterLibraryNode选择角色
6. **参考图支持**: 支持全局参考图 + 镜头独立图片
7. **双显示功能**: 输入框显示易读别名，API使用真实ID

**使用场景**:
- **简单视频生成**: 使用 VideoGenerateNode（支持平台切换）
- **聚鑫故事板**: 使用 JuxinStoryboardNode（专用优化）
- **贞贞故事板**: 使用 ZhenzhenStoryboardNode（专用优化）

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

**节点间数据传递架构** ⭐ 2026-01-01 新增:
- **核心原则**: 源节点直接更新目标节点，避免依赖父组件中转
- **数据流**:
  ```
  源节点 (Source Node)
  ├─ useState 管理 UI 状态
  ├─ useEffect 监听状态变化
  ├─ setNodes() 同步到 node.data
  └─ setNodes() 直接更新目标节点.data

  目标节点 (Target Node)
  ├─ useEffect 接收 data.xxx 变化
  ├─ 更新内部 useState
  └─ 渲染 UI
  ```
- **关键实现**:
  - 使用 `getEdges()` 找到连接的节点
  - 一次 `setNodes()` 调用更新多个节点
  - 精确的依赖数组避免无限循环
- **❌ 错误模式**: App.jsx 中转（只监听 edges，节点内部状态变化不传递）
- **✅ 正确模式**: 源节点直接更新（绕过 App.jsx 的数据传递陷阱）

### 节点连接验证机制 ⭐ 新增 (2026-01-03)

**设计目标**:
- 防止错误的节点连接导致数据混乱
- 确保只有特定类型的源节点才能连接到特定输入端口
- 提供清晰的错误反馈（数据清除而非报错）

**验证位置**: `src/client/src/App.jsx` (useEffect 监听 edges 变化)

**输入端口到源节点类型的映射**:

| 目标端口 | 允许的源节点类型 | 用途 |
|---------|----------------|------|
| `prompt-input` | `textNode`, `promptOptimizerNode`, `narratorProcessorNode` | 文本提示词输入和优化 ⭐ 更新 (2026-01-09) |
| `character-input` | `characterLibraryNode` | 角色库数据传递 |
| `images-input` | `referenceImageNode` | 参考图片传递 |
| `task-input` | `videoGenerateNode`, `storyboardNode`, `juxinStoryboardNode`, `zhenzhenStoryboardNode`, `characterCreateNode` | 任务结果监听 |

**验证机制** (App.jsx useEffect):
```javascript
useEffect(() => {
  setNodes((nds) =>
    nds.map((node) => {
      // 获取所有输入到当前节点的连线
      const incomingEdges = edges.filter((e) => e.target === node.id);

      const newData = { ...node.data };

      // 验证 character-input 连接
      const characterEdge = incomingEdges.find((e) => e.targetHandle === 'character-input');
      if (characterEdge) {
        const sourceNode = nds.find((n) => n.id === characterEdge.source);

        // ✅ 定义允许的源节点类型
        const validCharacterSourceTypes = ['characterLibraryNode'];

        if (sourceNode && validCharacterSourceTypes.includes(sourceNode.type)) {
          // 源节点类型有效，传递数据
          newData.connectedCharacters = sourceNode.data.connectedCharacters;
        } else {
          // ❌ 源节点类型无效，清除数据（静默失败）
          newData.connectedCharacters = undefined;
        }
      }

      // 验证 images-input 连接
      const imagesEdge = incomingEdges.find((e) => e.targetHandle === 'images-input');
      if (imagesEdge) {
        const sourceNode = nds.find((n) => n.id === imagesEdge.source);

        // ✅ 只有 referenceImageNode 可以连接
        if (sourceNode?.type === 'referenceImageNode') {
          newData.connectedImages = sourceNode.data.selectedImages;
        } else {
          // ❌ 源节点类型无效，清除数据
          newData.connectedImages = undefined;
        }
      }

      // 验证 prompt-input 连接 ⭐ 新增 (2026-01-09)
      const promptEdge = incomingEdges.find((e) => e.targetHandle === 'prompt-input');
      if (promptEdge) {
        const sourceNode = nds.find((n) => n.id === promptEdge.source);

        // ✅ 定义允许的源节点类型
        const validPromptSourceTypes = [
          'textNode',
          'promptOptimizerNode',
          'narratorProcessorNode'  // ⭐ 旁白处理器支持
        ];

        if (sourceNode && validPromptSourceTypes.includes(sourceNode.type)) {
          // 源节点类型有效，传递数据
          if (sourceNode.type === 'textNode') {
            newData.connectedPrompt = sourceNode.data.value || '';
          } else if (sourceNode.type === 'promptOptimizerNode') {
            newData.connectedPrompt = sourceNode.data.optimizedPrompt || '';
          } else if (sourceNode.type === 'narratorProcessorNode') {
            // ⭐ 从 NarratorProcessorNode 接收旁白数据
            newData.manualPrompt = sourceNode.data.currentPrompt || '';
            newData.narratorMode = sourceNode.data.narratorMode || false;
            newData.narratorIndex = sourceNode.data.currentIndex || 0;
            newData.narratorTotal = sourceNode.data.total || 0;
            newData.narratorSentences = sourceNode.data.sentences || [];
          }
        } else {
          // ❌ 源节点类型无效，清除数据（静默失败）
          newData.connectedPrompt = undefined;
        }
      }

      // 验证 task-input 连接
      const videoEdge = incomingEdges.find((e) => e.targetHandle === 'task-input');
      if (videoEdge) {
        const sourceNode = nds.find((n) => n.id === videoEdge.source);

        // ✅ 定义允许的源节点类型
        const validVideoSourceTypes = [
          'videoGenerateNode',
          'storyboardNode',
          'juxinStoryboardNode',
          'zhenzhenStoryboardNode',
          'characterCreateNode'
        ];

        if (sourceNode && validVideoSourceTypes.includes(sourceNode.type)) {
          // 源节点类型有效，传递数据
          newData.taskId = sourceNode.data.taskId;
          newData.connectedSourceId = videoEdge.source;
        } else {
          // ❌ 源节点类型无效，清除数据
          newData.taskId = undefined;
          newData.connectedSourceId = undefined;
        }
      }

      // 只有当 data 真正变化时才返回新对象（避免无限循环）
      const dataChanged = /* 比较关键属性 */;
      return dataChanged ? { ...node, data: newData } : node;
    })
  );
}, [edges, setNodes]);
```

**防止的问题**:
1. **错误26（节点连接验证缺失）**: 防止错误的节点类型连接导致数据混乱
2. **数据污染**: 防止无效连接传递错误数据
3. **状态不一致**: 防止断开连接后数据残留

**关键点**:
1. **类型白名单**: 使用数组定义允许的源节点类型
2. **静默失败**: 无效连接时清除数据，不抛出错误
3. **实时验证**: useEffect 监听 edges 变化，自动验证所有连接
4. **性能优化**: 只在数据真正变化时才更新节点（避免无限循环）

**新增节点时的注意事项**:
- 如果新节点有输入端口，必须在 App.jsx 添加对应的验证逻辑
- 定义允许的源节点类型白名单
- 测试无效连接时数据是否正确清除

### 平台专用故事板节点 ⭐ 新增 (2026-01-03)

**设计目标**:
- 分离聚鑫和贞贞平台的故事板功能，避免平台差异混淆
- 每个节点内置API配置，无需连接APISettingsNode
- 保留角色和参考图协作功能

**节点类型**:
1. **JuxinStoryboardNode** (聚鑫故事板) - `src/client/src/nodes/process/JuxinStoryboardNode.jsx`
2. **ZhenzhenStoryboardNode** (贞贞故事板) - `src/client/src/nodes/process/ZhenzhenStoryboardNode.jsx`

**核心差异**:

| 特性 | 聚鑫故事板 | 贞贞故事板 |
|------|-----------|-----------|
| **平台标识** | `juxin` | `zhenzhen` |
| **API端点** | `/v1/video/create` (普通视频API) | `/v2/videos/generations` (故事板专用API) |
| **Content-Type** | `application/json` | `application/json` |
| **模型选择** | `sora-2-all` (固定) | `sora-2` / `sora-2-pro` (可选) |
| **提示词格式** | 故事板格式拼接 | 故事板格式拼接 |
| **参考图片支持** | 支持 (images数组) | 支持 (images数组) |
| **时长参数** | 单个总时长 (所有镜头之和) | 单个总时长 (所有镜头之和) |

**⚠️ 重要区别**:
- **聚鑫平台**: 没有专门的故事板API端点，使用普通视频API + 特殊格式的提示词实现故事板功能
- **贞贞平台**: 有专门的故事板API端点，支持更复杂的故事板配置

**API调用示例**:

聚鑫故事板 (使用普通视频API):
```javascript
// POST /v1/video/create
const response = await sora2Client.createVideo({
  model: 'sora-2-all',
  prompt: shots.map((shot, index) =>
    `Shot ${index + 1}:\nduration: ${shot.duration}sec\nScene: ${shot.scene}\n`
  ).join('\n'),
  orientation: 'landscape',  // 或 'portrait'
  size: 'small',             // 或 'large'
  duration: totalDuration,   // 所有镜头时长之和
  watermark: false,
  images: allImages,         // 参考图片数组
});
```

贞贞故事板 (使用故事板专用API):
```javascript
// POST /v2/videos/generations
const response = await sora2Client.createStoryboardVideo({
  model: 'sora-2',  // 或 'sora-2-pro'
  prompt: shots.map((shot, index) =>
    `Shot ${index + 1}:\nduration: ${shot.duration}sec\nScene: ${shot.scene}`
  ).join('\n\n'),
  duration: totalDuration.toString(),
  aspect_ratio: '16:9',  // 或 '9:16'
  hd: false,
  watermark: false,
  images: allImages,
});
```

**提示词格式规范** (两个平台通用):
```
Shot 1:
duration: 5sec
Scene: 老鹰展翅高飞

Shot 2:
duration: 5sec
Scene: 老鹰在空中盘旋

Shot 3:
duration: 5sec
Scene: 老鹰降落在山顶
```

**关键点**:
1. **平台隔离**: 两个节点完全分离，避免平台差异混淆
2. **API配置内置**: 每个节点内部包含API配置，默认折叠
3. **镜头时长独立**: 每个镜头独立设置时长，不再自动均分
4. **总时长验证**: 自动计算总时长，超过25秒显示警告
5. **角色引用支持**: 支持从CharacterLibraryNode选择角色
6. **参考图支持**: 支持全局参考图 + 镜头独立图片
7. **双显示功能**: 输入框显示易读别名，API使用真实ID

**使用场景**:
- **简单视频生成**: 使用 VideoGenerateNode（支持平台切换）
- **聚鑫故事板**: 使用 JuxinStoryboardNode（专用优化）
- **贞贞故事板**: 使用 ZhenzhenStoryboardNode（专用优化）

**后端实现** (src/server/sora2-client.js):
```javascript
// ⚠️ 重要：平台差异处理
// - 聚鑫：使用普通视频API (createVideo) + 特殊格式提示词
// - 贞贞：使用常规视频端点 + 特殊格式提示词
let result;
if (this.platformType === 'JUXIN') {
  // 聚鑫平台：使用普通视频API
  console.log('[Sora2Client] 聚鑫使用普通视频API（非故事板端点）');
  result = await this.createVideo({
    model: finalModel,
    prompt,  // 故事板格式的提示词
    orientation,
    size,
    duration: finalDuration,
    watermark,
    private: isPrivate,
    images: allImages,
  });
} else {
  // 贞贞平台：使用常规视频端点 + 故事板格式提示词
  console.log('[Sora2Client] 贞贞使用常规视频端点（特殊格式）');
  const response = await this.client.post(this.platform.storyboardEndpoint, body, {
    headers: this._getAuthHeaders(),
  });
  result = {
    success: true,
    data: response.data,
  };
}
```

## 轮询策略

### 后台自动轮询服务
- **轮询间隔**: **30 秒**（sora2 生成需 3-5 分钟）
- **检查范围**: 所有 `queued` 和 `processing` 状态的任务
- **自动更新**: 任务完成后自动更新历史记录状态

### 手动查询功能
- 为用户提供"查询状态"按钮
- 可主动查询而无需等待轮询

## 自动化测试流程 🤖 ⭐ 基础标准范式

> **重要**: 这是项目开发的**基础标准范式**，所有开发完成后必须经过自动化测试验证！

### 测试原则

**✅ 自动化优先**:
- 使用配置的 MCP 工具在浏览器中自动测试
- 不要总是问用户"能否测试"
- 每个任务都应该用自动化方式验证
- 减少人工干预，提高开发效率

**❌ 人工协助的边界**:
以下操作需要用户协同完成：
- 连线连接节点（React Flow 拖拽连线）
- 模拟鼠标拖拽（节点位置调整）
- 复杂的拖放操作

**✅ MCP 工具可以完成的操作**:
- 点击按钮、链接、输入框（click）
- 填写表单、输入文本（fill/fill_form）
- 选择下拉选项、勾选复选框
- 截图验证 UI 效果（take_screenshot）
- 读取页面内容（take_snapshot）
- 执行 JavaScript 代码（evaluate_script）
- 监听网络请求（list_network_requests）
- 监听控制台日志（list_console_messages）

### 标准测试流程

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

### 测试检查清单

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

### 测试失败处理

```
测试失败时
├─ 1. 记录错误信息（console_messages）
├─ 2. 截图保存现场（take_screenshot）
├─ 3. 分析根本原因
├─ 4. 修复代码
└─ 5. 重新测试直到通过
```

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
