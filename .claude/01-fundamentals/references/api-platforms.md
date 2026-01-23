---

paths: *

---

# Sora2 API 平台规范

> **版本**: v2.0.0
> **更新日期**: 2026-01-18
> **来源**: 从 `rules/base.md` 拆分提取

---

## Sora2 API 支持平台

### 聚鑫平台 (api.jxincm.cn)

| 配置项 | 值 |
|--------|-----|
| **Base URL** | `https://api.jxincm.cn` |
| **模型** | `sora-2-all` ⭐ 唯一支持 |
| **创建视频** | `POST /v1/video/create` |
| **查询任务** | `GET /v1/video/query?id={taskId}` ⚠️ 查询参数 |
| **创建角色** | `POST /sora/v1/characters` |
| **故事板** | `POST /v1/videos` ⭐ 专用端点 (multipart/form-data) |

### 贞贞平台 (ai.t8star.cn)

| 配置项 | 值 |
|--------|-----|
| **Base URL** | `https://ai.t8star.cn` |
| **模型** | `sora-2`, `sora-2-pro` ⭐ 两个可选 |
| **创建视频** | `POST /v2/videos/generations` |
| **查询任务** | `GET /v2/videos/generations/{taskId}` ⚠️ 路径参数 |
| **创建角色** | `POST /sora/v1/characters` |
| **故事板** | `POST /v2/videos/generations` ⭐ 常规端点 + 特殊格式 |

---

## 重要平台差异

### 1. 模型名称
- **聚鑫**: 使用 `sora-2-all`
- **贞贞**: 使用 `sora-2` 或 `sora-2-pro`

### 2. 查询端点 ⚠️ 关键差异
- **聚鑫**: 查询参数 `?id={taskId}`
- **贞贞**: 路径参数 `/{taskId}`

**实现示例**:
```javascript
if (platform === 'juxin') {
  return await axios.get(`/v1/video/query?id=${taskId}`);
} else {
  return await axios.get(`/v2/videos/generations/${taskId}`);
}
```

### 3. 任务 ID 字段名 ⚠️ 兼容处理
- **聚鑫**: 返回 `{id}`
- **贞贞**: 返回 `{task_id}`

**兼容代码**:
```javascript
const taskId = response.data?.id || response.data?.task_id;
```

### 4. 故事板端点 ⚠️ 重要
- **聚鑫**: 专用端点 `POST /v1/videos` (multipart/form-data)
- **贞贞**: 常规端点 `POST /v2/videos/generations` (application/json)

---

## API 规范

### 统一响应格式

```javascript
// 成功
{ success: true, data: {...} }

// 失败
{ success: false, error: "错误信息" }
```

### 统一状态码（贞贞/统一格式）

- `NOT_START` - 未开始
- `IN_PROGRESS` - 处理中
- `SUCCESS` - 完成
- `FAILURE` - 失败

---

## 角色引用语法 ⭐

### 基本格式

所有平台统一使用：
```
@username 提示词内容
```

**示例**:
```
@6f2dbf2b3.zenwhisper 在工地上干活
```

**注意**: 格式为 `@username`（**不带花括号**），角色引用和提示词之间用空格隔开

### 角色引用原则 ⭐ 2026-01-06 更新

**核心原则**: 使用角色引用时，Sora2会使用角色的真实外观，**不需要描述角色长相**。

**❌ 错误做法**:
```javascript
const prompt = `
卡通风格的绘本动画。

角色设计：
所有角色均采用拟人化设计，拥有大而闪亮的眼睛、友好的微笑表情和可爱的姿态，充满童趣和亲和力。

场景：一片阳光明媚、沙滩柔软、海水湛蓝的卡通海边。
`;
// 问题：角色引用丢失
```

**✅ 正确做法**:
```javascript
const prompt = `
卡通风格的绘本动画。

场景：一片阳光明媚、沙滩柔软、海水湛蓝的卡通海边。环境高度简化，背景有几朵棉花。

核心动作：@ebfb9a758.sunnykitte 在海边玩耍，充满好奇和喜悦地探索。

细节与氛围：
- 阳光温柔地洒在海浪和沙滩上
- 整体氛围温暖、友好，充满着纯真的好奇与发现
`;
// ✅ 保留角色引用，不描述长相
```

### 关键规则

1. **必须保留角色引用**: 优化后的提示词必须包含 `@ebfb9a758.sunnykitte` 格式的引用
2. **不描述外观**: 不需要描述"大眼睛、微笑表情、可爱姿态"等
3. **只描述活动**: 重点描述角色在场景中的动作、互动、位置、情绪
4. **使用真实ID**: `@ebfb9a758.sunnykitte`（真实ID），而非 `@测试小猫`（别名）

### 节点差异

| 节点类型 | 输入框显示 | API使用 | 说明 |
|---------|----------|---------|------|
| **优化节点** | 真实ID<br/>`@ebfb9a758.sunnykitte` | 真实ID | 发送给AI，必须使用真实ID |
| **视频生成节点** | 别名<br/>`@测试小猫` | 真实ID | 用户友好，API使用真实ID |
| **角色库节点** | 别名+ID<br/>`测试小猫 (@ebfb9a758.sunnykitte)` | 真实ID | 点击插入真实ID |

---

## 角色创建规范 ⭐

- **端点**: `POST /sora/v1/characters`
- **参数**: `url` (视频链接) 或 `from_task` (任务ID) **二选一**
- **必填**: `timestamps` (格式: "1,3"，范围差值必须是 1-3 秒)
- **⚠️ 禁止**: **不要传递 `model` 参数**，否则会导致 404 错误
- **✅ 推荐**: 优先使用 `from_task` 参数（从已完成的视频任务创建）

**模型名称注意事项**:
- 聚鑫平台: 使用 `sora-2-all` 模型（自动）
- 贞贞平台: 使用 `sora-2` 或 `sora-2-pro` 模型（自动）
- 创建角色时不传 `model` 参数，由后端自动选择

---

## 轮询策略

### 后台自动轮询服务

- **轮询间隔**: **30 秒**（sora2 生成需 3-5 分钟）
- **检查范围**: 所有 `queued` 和 `processing` 状态的任务
- **自动更新**: 任务完成后自动更新历史记录状态

### 手动查询功能

- 为用户提供"查询状态"按钮
- 可主动查询而无需等待轮询

---

## 禁止模式

- ❌ 不使用 `child_process` 调用 API（会导致进程僵死）
- ❌ 不使用 `request`（已废弃的库）
- ❌ 不在代码中硬编码 API Key（使用 `.env` + `dotenv`）
- ❌ 不使用错误的查询端点（聚鑫必须用 `/v1/video/query?id=xxx`）
- ❌ 不使用过短的轮询间隔（推荐 30 秒）
- ❌ 不假设任务ID字段名称（必须兼容 `id` 和 `task_id`）

---

## 详细文档导航

**更多 API 详情**，请查看原 `rules/base.md` 文件（未拆分版本）：

- 角色管理 API（收藏、搜索、删除、更新别名）
- 参考图片功能（文生视频 vs 图生视频）
- 故事板模式（单任务多镜头）
- 备份管理 API（导出/导入）
- 提示词优化 API
- 前端架构 - 工作流管理
- 自动化测试流程

**环境变量配置**: 详见 [tech-stack.md](./tech-stack.md#环境变量)

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
