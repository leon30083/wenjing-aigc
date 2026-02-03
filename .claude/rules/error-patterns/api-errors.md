# API 相关错误模式

> **说明**: API 调用、端点、参数相关的错误模式

---

## 错误1: 双平台任务ID不兼容 `API` `兼容性` ⭐⭐⭐

```javascript
// 贞贞返回 task_id，聚鑫返回 id
const taskId = result.data.id || result.data.task_id;
```

**问题**: 不同平台返回不同的任务ID字段名
**解决方案**: 兼容双平台的任务ID格式

---

## 错误6: 轮询间隔太短（429错误） `API` `轮询` ⭐⭐⭐

```javascript
// ❌ 错误：5秒间隔导致 429 Rate Limit
setInterval(() => checkStatus(taskId), 5000);

// ✅ 正确：30秒间隔
const POLL_INTERVAL = 30000;
```

**问题**: 轮询间隔太短导致 API 返回 429 Rate Limit 错误
**解决方案**: 使用 30 秒间隔

---

## 错误17: API 端点路径缺少前缀 `API` `前端` ⭐⭐⭐

```javascript
// ❌ 错误：API 路径缺少 /api/ 前缀
const response = await fetch(`${API_BASE}/task/${taskId}`);
// 返回 404 Not Found

// ✅ 正确：使用完整的 API 路径
const response = await fetch(`${API_BASE}/api/task/${taskId}`);
// 返回 200 OK
```

**问题**: 前端调用 API 时路径不完整，缺少 `/api/` 前缀
**解决方案**: 所有 API 调用必须包含完整路径 `/api/{endpoint}`
**影响范围**: TaskResultNode.jsx 中的轮询和手动刷新函数
**修复日期**: 2025-12-30

---

## 错误35: 轮询请求缺少 platform 参数导致查询失败 `API` `轮询` ⭐

**现象**: 任务在后台显示成功，但前端 TaskResultNode 一直显示"查询中..."
**根本原因**:
1. **事件系统缺少 platform 参数**: VideoGenerateNode 派发事件时只传递 `sourceNodeId` 和 `taskId`，没有传递 `platform`
2. **轮询请求硬编码平台**: TaskResultNode 轮询时硬编码 `platform=juxin`，导致贞贞平台任务查询错误的端点
3. **缺少缓存破坏参数**: 请求没有添加时间戳参数，浏览器返回 304 Not Modified

```javascript
// ❌ VideoGenerateNode - 派发事件时缺少 platform
window.dispatchEvent(new CustomEvent('video-task-created', {
  detail: { sourceNodeId: nodeId, taskId: id }  // ❌ 缺少 platform
}));

// ❌ TaskResultNode - 硬编码平台参数
const response = await fetch(`${API_BASE}/api/task/${taskId}?platform=juxin`);

// ✅ VideoGenerateNode - 传递 platform 参数
window.dispatchEvent(new CustomEvent('video-task-created', {
  detail: { sourceNodeId: nodeId, taskId: id, platform: apiConfig.platform }
}));

// ✅ TaskResultNode - 从状态中获取 platform 并添加缓存破坏
const cacheBuster = Date.now();
const response = await fetch(`${API_BASE}/api/task/${taskId}?platform=${platform}&_t=${cacheBuster}`);
```

**关键点**:
- **事件传递**: VideoGenerateNode 必须传递 platform 参数（juxin 或 zhenzhen）
- **状态管理**: TaskResultNode 使用 useState 存储 platform，从事件中接收
- **缓存破坏**: 添加 `&_t=${Date.now()}` 参数避免浏览器 304 缓存
- **依赖数组**: useEffect 依赖数组包含 platform，确保平台切换时重新开始轮询

**修复日期**: 2026-01-01

---

## 错误38: platform 字段缺失导致 API 查询失败 `API` `兼容性` ⭐

**现象**: 旧任务查询 API 返回 400 错误，无法获取视频信息
**根本原因**:
- localStorage 保存的旧任务没有 `platform` 字段
- TaskResultNode 初始化使用默认值 `'juxin'`
- 贞贞平台的任务用聚鑫端点查询导致 400 错误

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

**关键点**:
1. **自动检测 platform**: 从连接的 VideoGenerateNode 读取 apiConfig.platform
2. **条件触发**: 只在 platform 为 undefined 或 'juxin' 时执行
3. **同步更新**: 同时更新内部状态和 node.data
4. **向后兼容**: 自动修复旧数据，无需手动干预

**修复日期**: 2026-01-01

---

## 错误39: 聚鑫平台模型名称错误 `API` `模型` ⭐⭐

**现象**: API 调用返回 400/422 错误，错误信息 "model not supported" 或 "Invalid model"
**根本原因**:
- 聚鑫平台使用 `sora-2-all` 模型名称（而非 `sora-2`）
- 贞贞平台使用 `sora-2` 和 `sora-2-pro` 模型名称
- 代码未根据平台选择正确的默认模型

```javascript
// ❌ 错误：聚鑫平台使用 sora-2
const response = await fetch(`${API_BASE}/api/video/create`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    platform: 'juxin',
    model: 'sora-2',  // ❌ 聚鑫不支持此模型
    prompt: '一只可爱的小猫',
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
  }),
});

// ✅ 正确：后端自动选择（推荐）
// src/server/sora2-client.js
class Sora2Client {
  async createVideo(options) {
    const { model } = options;

    // 根据平台设置默认模型 ⭐ 关键逻辑
    const finalModel = model || (this.platformType === 'JUXIN' ? 'sora-2-all' : 'sora-2');

    // 验证模型名称
    const validModels = ['sora-2-all', 'sora-2', 'sora-2-pro'];
    if (!validModels.includes(finalModel)) {
      throw new Error(`Invalid model: ${finalModel}`);
    }

    return await this.client.post('/v1/video/create', { model: finalModel, ... });
  }
}
```

**关键点**:
1. **聚鑫平台模型**: 必须使用 `sora-2-all`（唯一支持的模型）
2. **贞贞平台模型**: 使用 `sora-2` 或 `sora-2-pro`
3. **后端自动选择**: `model || (this.platformType === 'JUXIN' ? 'sora-2-all' : 'sora-2')`
4. **前端默认值**: APISettingsNode 默认模型应为 `sora-2-all`（聚鑫平台）

**修复日期**: 2026-01-02

---

## 错误41: 贞贞故事板端点配置错误 `API` `故事板` ⭐

**现象**: 贞贞故事板节点 API 调用返回 "Invalid URL (POST /v1/video/storyboard)" 错误
**根本原因**:
- 贞贞平台**没有专用故事板端点**，使用常规视频生成端点 `/v2/videos/generations`
- 故事板功能通过特殊的提示词格式实现（非独立 API 端点）
- 聚鑫平台有专用故事板端点 `/v1/videos`（使用 multipart/form-data）

```javascript
// ❌ 错误：贞贞平台配置了不存在的故事板端点
ZHENZHEN: {
  name: '贞贞',
  baseURL: 'https://ai.t8star.cn',
  videoEndpoint: '/v2/videos/generations',
  storyboardEndpoint: '/v1/video/storyboard',  // ❌ 此端点不存在
}

// ✅ 正确：贞贞平台使用常规视频端点
ZHENZHEN: {
  name: '贞贞',
  baseURL: 'https://ai.t8star.cn',
  videoEndpoint: '/v2/videos/generations',
  storyboardEndpoint: '/v2/videos/generations',  // ✅ 与视频端点相同
  useAspectRatio: true,
}

// 前端通过特殊提示词格式启用故事板
const prompt = `Shot 1:
duration: 5sec
Scene: 老鹰展翅高飞

Shot 2:
duration: 5sec
Scene: 老鹰在空中盘旋`;
```

**关键差异对比**:
| 特性 | 聚鑫平台 | 贞贞平台 |
|------|---------|---------|
| 故事板端点 | `/v1/videos` (专用) | `/v2/videos/generations` (常规) |
| Content-Type | `multipart/form-data` | `application/json` |
| 提示词格式 | 拼接为字符串数组 | 直接传递多行文本 |

**修复日期**: 2026-01-02

---

## 错误46: 后台轮询服务优化（添加24小时时间限制） `API` `轮询` ⭐

**现象**: 服务器启动后一直轮询旧任务（超过24小时），浪费 API 配额和服务器资源
**根本原因**:
- 后台轮询服务启动时检查所有 `queued` 和 `processing` 状态的任务
- 没有时间限制，旧任务无限轮询

```javascript
// ✅ 正确：添加 MAX_POLLING_AGE 常量和时间检查
const MAX_POLLING_AGE = 24 * 60 * 60 * 1000; // 24小时

async function checkAndUpdateTask(taskId, platform, createdAt) {
  // ⭐ 时间检查：超过24小时的任务标记为 stale
  if (createdAt) {
    const age = Date.now() - new Date(createdAt).getTime();
    if (age > MAX_POLLING_AGE) {
      historyStorage.updateRecord(taskId, { status: 'stale' });
      console.log(`[轮询] 任务超时（${Math.floor(age / (60 * 60 * 1000))}小时前），标记为 stale: ${taskId}`);
      return;
    }
  }
  // 继续正常轮询逻辑...
}

function startPollingService() {
  // ⭐ 启动时清理旧任务（超过24小时的标记为 stale）
  const staleThreshold = Date.now() - MAX_POLLING_AGE;
  const allRecords = historyStorage.getAllRecords();

  let staleCount = 0;
  allRecords.forEach(record => {
    if ((record.status === 'queued' || record.status === 'processing') &&
        record.createdAt &&
        new Date(record.createdAt).getTime() < staleThreshold) {
      historyStorage.updateRecord(record.taskId, { status: 'stale' });
      staleCount++;
    }
  });

  if (staleCount > 0) {
    console.log(`[轮询] 已标记 ${staleCount} 个旧任务为 stale（超过24小时）`);
  }

  setInterval(async () => {
    const allPendingTasks = [...queuedTasks, ...processingTasks];

    for (const record of allPendingTasks) {
      // ⭐ 传入 createdAt 参数进行时间检查
      await checkAndUpdateTask(record.taskId, record.platform, record.createdAt);
    }
  }, POLL_INTERVAL);
}
```

**关键点**:
1. **时间限制**: 只轮询最近 24 小时内的任务
2. **Stale 状态**: 超过时间的任务标记为 `stale`，不再轮询
3. **启动清理**: 服务器启动时自动清理旧任务
4. **前端/后台职责分离**: 前端轮询更新节点 UI，后台轮询更新历史记录持久化存储

**修复日期**: 2026-01-04

---

## 错误49: 优化节点输出格式结构化（包含标题和项目符号） `API` `输出格式` ⭐⭐⭐ 2026-01-06 新增

**现象**:
- 优化结果包含大量标题（角色设计：、场景：、动画风格：等）
- 包含项目符号列表（- 或 •）
- 输出不是流畅的自然段落

**根本原因**:
- 系统提示词的输出格式模板使用了结构化格式
- AI 模型按字面意思遵循模板，生成了带标题和项目符号的内容
- 模板示例：`角色设计：[拟人化描述]\n\n场景：[简化环境 + 色彩]`

**错误示例**:
```javascript
// ❌ 错误：系统提示词包含结构化模板
输出格式：
卡通风格的绘本动画。

角色设计：[拟人化描述]

场景：[简化环境 + 色彩]

核心动作：[旁白中的关键动作]

细节与氛围：
- [3-5 个视觉细节]
- [光影、色彩描述]

Cinematography:
- [镜头类型]
- [视角高度]

Animation style:
- [运动风格描述]

视频时长：${context.target_duration || 10}秒`;
```

**正确示例**:
```javascript
// ✅ 正确：明确禁止使用标题和项目符号
输出格式：
⚠️ 重要：输出必须是单一段落，绝对禁止使用任何标题、分段、项目符号或列表形式。

请直接输出一段连贯的提示词描述，例如：
"卡通绘本风格的视频。一只拟人化的卡通猫咪在阳光明媚的花园里欢快地追逐蝴蝶，跳跃着探索每一处角落。画面色彩明亮饱和，充满童趣，动作夸张且富有弹性，背景细节丰富，光影效果梦幻，适合10秒的视频时长。"

❌ 禁止的格式：
- 不要使用"角色设计："、"场景："、"动画风格："等标题
- 不要使用项目符号（- 或 •）
- 不要使用分段或换行
- 不要使用列表格式

✅ 正确的格式：
- 单一段落
- 流畅的自然语言
- 包含所有必要信息（风格、角色、场景、氛围、动画、时长）`;
```

**关键点**:
1. **明确禁止**: 使用"⚠️ 重要"和"绝对禁止"等强烈语言
2. **提供示例**: 给出正确的单一段落示例
3. **列出禁止项**: 明确说明哪些格式是禁止的
4. **强调自然流畅**: 要求输出是流畅的自然语言
5. **对所有风格生效**: 修改所有5个风格（picture-book, cinematic, documentary, animation, custom）

**后端修复位置**:
- `src/server/services/openaiClient.js` - Lines 215-230 (picture-book)
- `src/server/services/openaiClient.js` - Lines 245-260 (cinematic)
- `src/server/services/openaiClient.js` - Lines 275-290 (documentary)
- `src/server/services/openaiClient.js` - Lines 282-297 (animation)
- `src/server/services/openaiClient.js` - Lines 331-345 (custom)

**验证结果**:
```bash
# 测试API请求
curl -X POST http://localhost:9000/api/openai/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "base_url": "http://170.106.152.118:2999",
    "api_key": "sk-PdoHKdR3XKgiLzYRk3mxfgiYpJbC24JTLmwP0hv07nOE4QaE",
    "model": "gemini-2.5-pro-maxthinking",
    "prompt": "@5562be00d.sunbeamkit 在花园里玩",
    "style": "animation",
    "context": {
      "target_duration": 15,
      "characters": [{
        "username": "5562be00d.sunbeamkit",
        "alias": "阳光小猫",
        "profilePictureUrl": "https://example.com/cat.jpg"
      }]
    }
  }'

# 返回结果（单一段落，无标题）
{
  "success": true,
  "data": {
    "optimized_prompt": "动画风格的视频，@5562be00d.sunbeamkit 在一个充满生机的花园里欢快地探索，其动作流畅夸张且富有弹性，每一步都充满好奇和活力。花园中盛开着各种色彩饱和、明艳动人的花朵，蝴蝶在空中翩翩起舞，阳光透过茂密的树叶洒下斑驳的光影，营造出梦幻而充满活力的动画氛围。整体画面色彩明快饱和，角色与环境的互动充满节奏感，镜头灵活地跟随 @5562be00d.sunbeamkit 的视角，捕捉其丰富的表情变化和对周围世界的好奇，适合15秒的视频时长。"
  }
}
```

**相关错误**:
- 错误48 - 优化节点错误使用双显示功能导致角色引用丢失

**修复日期**: 2026-01-06
