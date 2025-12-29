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
