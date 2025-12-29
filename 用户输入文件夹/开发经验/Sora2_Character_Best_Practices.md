# Sora2 API 开发最佳实践

**更新日期**: 2025-12-29
**项目**: WinJin AIGC
**支持平台**: 聚鑫 (api.jxincm.cn) / 贞贞 (ai.t8star.cn)
**参考文档**: `D:\user\github\winjin\reference\用户输入文件夹/`

**更新记录**:
- 2025-12-29: 新增历史记录管理功能（单条删除、清空全部）⭐
- 2025-12-29: 新增参考图片功能、图生视频模式、角色与图片混合使用 ⭐
- 2025-12-29: 新增双平台响应格式差异处理、角色引用语法、后台轮询服务、角色库增强功能
- 2025-12-29: 新增角色库管理、from_task 创建方式、持久化存储最佳实践

---

## 1. 核心结论 (Critical Findings)

### 1.1 严禁使用 child_process
- **问题**: 使用 `child_process.spawn` 调用 API 会导致进程间通信卡死，前端无法收到响应
- **正确做法**: 使用 `axios` 或 `fetch` 直接调用 API

### 1.2 角色创建禁止传 model 参数
- **端点**: `POST /sora/v1/characters`
- **必填**: `url` (视频链接) 或 `from_task` (任务ID) **二选一** + `timestamps` (时间范围 "1,3")
- **禁止**: **不要传递 `model` 参数**，否则会导致 `channel not found` / `404`

### 1.3 双平台响应格式差异 ⚠️ 重要

**创建视频响应格式差异**:
```javascript
// 聚鑫平台返回
{ "id": "video_xxx", ... }

// 贞贞平台返回
{ "task_id": "video_xxx", ... }
```

**正确处理方式**:
```javascript
// 兼容两种平台的任务ID提取
const taskId = result.data.id || result.data.task_id;
if (taskId) {
  historyStorage.addRecord({ taskId, platform, prompt, model, options });
}
```

### 1.4 查询任务状态端点差异
- **聚鑫平台**: `GET /v1/video/query?id={taskId}` (查询参数)
- **贞贞平台**: `GET /v2/videos/generations/{taskId}` (路径参数)
- **数据格式**: 需要统一转换为标准格式（见下方）

### 1.5 角色引用语法

所有平台（聚鑫、贞贞）都使用相同的角色引用格式：
```
@username 提示词内容
```

示例：
```
@6f2dbf2b3.zenwhisper 在工地上干活
@783316a1d.diggyloade 在工地上干活
```

**注意**:
- 格式为 `@username` （**不带花括号**）
- 角色引用和提示词之间用空格隔开

---

## 2. 完整工作流 (Workflow)

### 2.1 创建视频 (Generate Video)

**聚鑫平台**:
```javascript
const response = await axios.post('https://api.jxincm.cn/v1/video/create', {
  model: 'sora-2',
  prompt: 'A cat sleeping on a windowsill',
  orientation: 'landscape',  // 或 'portrait'
  duration: 10,
  size: 'small',              // 或 'hd'
  watermark: false,
  private: true,
  images: []
}, {
  headers: { 'Authorization': 'Bearer <sk-key>' }
});
```

**贞贞平台**: 使用相同的端点和参数（支持统一格式）

**⚠️ 保存历史记录时注意**:
```javascript
// POST /api/video/create 处理逻辑
app.post('/api/video/create', async (req, res) => {
  const { platform, prompt, model, ...options } = req.body;
  const client = getClient(platform);
  const result = await client.createVideo(req.body);

  // 保存到历史记录 - 兼容双平台响应格式
  if (result.success && result.data) {
    // 贞贞平台返回 task_id，聚鑫平台返回 id
    const taskId = result.data.id || result.data.task_id;
    if (taskId) {
      historyStorage.addRecord({
        taskId: taskId,
        platform,
        prompt,
        model,
        options,
      });
    }
  }

  res.json(result);
});
```

### 2.2 查询任务状态 (Query Task Status)

⚠️ **重要**: 两个平台使用不同的端点

**聚鑫平台** - 使用 `/v1/video/query`:
```javascript
// 任务ID 作为查询参数
const response = await axios.get('https://api.jxincm.cn/v1/video/query', {
  params: { id: taskId },
  headers: { 'Authorization': 'Bearer <sk-key>' }
});

// 返回格式（需要转换）:
{
  "id": "video_xxx",
  "status": "completed",     // pending/processing/completed
  "video_url": "https://...", // 视频URL在顶层
  "progress": 100
}
```

**贞贞平台** - 使用 `/v2/videos/generations`:
```javascript
// 任务ID 作为路径参数
const response = await axios.get(`https://ai.t8star.cn/v2/videos/generations/${taskId}`, {
  headers: { 'Authorization': 'Bearer <sk-key>' }
});

// 返回格式（已经是统一格式）:
{
  "task_id": "xxx",
  "status": "SUCCESS",        // NOT_START/IN_PROGRESS/SUCCESS/FAILURE
  "data": {
    "output": "https://..."   // 视频URL
  }
}
```

### 2.3 统一数据格式转换

为了兼容两个平台，需要将聚鑫的响应转换为统一格式：

```javascript
function convertJuxinToUnified(juxinData) {
  return {
    task_id: juxinData.id,
    platform: 'openai',
    action: 'sora-video',
    status: convertStatus(juxinData.status),  // completed -> SUCCESS
    fail_reason: juxinData.fail_reason || '',
    submit_time: juxinData.created_at,
    start_time: juxinData.created_at,
    finish_time: juxinData.completed_at,
    progress: extractProgress(juxinData),
    data: juxinData.video_url ? { output: juxinData.video_url } : null
  };
}

function convertStatus(juxinStatus) {
  const map = {
    'queued': 'IN_PROGRESS',
    'pending': 'NOT_START',
    'processing': 'IN_PROGRESS',
    'completed': 'SUCCESS',
    'failed': 'FAILURE'
  };
  return map[juxinStatus] || juxinStatus.toUpperCase();
}
```

### 2.4 创建角色 (Create Character)

⚠️ **重要**: 不要传递 `model` 参数！

#### 方法 1: 从视频 URL 创建

```javascript
const response = await axios.post('https://api.jxincm.cn/sora/v1/characters', {
  url: 'https://video-url.com/file.mp4',
  timestamps: '1,3'  // 时间范围差值必须是 1-3 秒
}, {
  headers: { 'Authorization': 'Bearer <sk-key>' }
});
```

**问题**: 直接使用视频 URL 可能会遇到"请求上游地址失败"错误，因为：
- 视频 URL 可能有防盗链保护
- 视频 URL 可能已过期
- 视频需要特殊 headers 才能访问

#### 方法 2: 从已完成的视频任务创建 (推荐) ✅

```javascript
// 1. 先创建视频任务
const videoResponse = await axios.post('https://ai.t8star.cn/v1/video/create', {
  model: 'sora-2',
  prompt: 'A cat sleeping on a windowsill',
  // ... 其他参数
});

const taskId = videoResponse.data.task_id || videoResponse.data.id;

// 2. 等待视频任务完成
const taskResult = await waitForTaskCompletion(taskId);

// 3. 从完成的任务创建角色
const characterResponse = await axios.post('https://ai.t8star.cn/sora/v1/characters', {
  from_task: taskId,  // 使用 from_task 而不是 url
  timestamps: '1,3'
}, {
  headers: { 'Authorization': 'Bearer <sk-key>' }
});

// 返回:
{
  "id": "ch_xxx",
  "username": "df4c928fa.kittenauro",
  "display_name": "Kitten Aura",
  "permalink": "https://sora.chatgpt.com/profile/xxx",
  "profile_picture_url": "https://xxx.jpg"
}
```

**优势**:
- ✅ 不需要担心视频 URL 的可访问性
- ✅ 视频已经由平台处理过，更可靠
- ✅ 适用于从任何平台生成的视频创建角色

---

## 3. 参数映射 (Parameter Mapping)

### 3.1 画面方向
| UI 显示 | API 参数 |
|---------|----------|
| 横屏 (16:9) | `landscape` |
| 竖屏 (9:16) | `portrait` |

### 3.2 分辨率
| UI 显示 | 聚鑫 API | 贞贞 API |
|---------|----------|----------|
| 标清 | `size: 'small'` | `hd: false` |
| 高清 | `size: 'hd'` (不可用) | `hd: true` |

### 3.3 状态码
| 聚鑫状态 | 贞贞状态 (统一) | 说明 |
|---------|----------------|------|
| `queued` | `IN_PROGRESS` | 已排队 |
| `pending` | `NOT_START` | 未开始 |
| `processing` | `IN_PROGRESS` | 处理中 |
| `completed` | `SUCCESS` | 完成 |
| `failed` | `FAILURE` | 失败 |

---

## 4. 轮询策略 (Polling Strategy)

### 4.1 推荐配置
- **轮询间隔**: **30 秒** (sora2 视频生成需要 3-5 分钟，30秒是平衡选择)
- **超时时间**: 600000ms (10 分钟)
- **错误重试**: 指数退避策略

### 4.2 后台自动轮询服务 (推荐) ✅

**服务器端实现**:
```javascript
// 后台轮询服务：每30秒检查所有 queued 和 processing 状态的任务
const POLL_INTERVAL = 30000; // 30秒

async function checkAndUpdateTask(taskId, platform) {
  try {
    const client = getClient(platform);
    const result = await client.getTaskStatus(taskId);

    if (result.success && result.data) {
      const { status, data } = result.data;

      // 任务完成
      if (status === 'SUCCESS' && data) {
        historyStorage.markCompleted(taskId, data);
        console.log(`[轮询] 任务完成: ${taskId}`);
      }
      // 任务失败
      else if (status === 'FAILURE') {
        historyStorage.markFailed(taskId, data?.fail_reason || 'Task failed');
        console.log(`[轮询] 任务失败: ${taskId}`);
      }
      // 处理中，更新状态但不记录日志（避免刷屏）
      else if (status === 'IN_PROGRESS') {
        historyStorage.updateRecord(taskId, { status: 'processing' });
      }
    }
  } catch (error) {
    console.error(`[轮询] 检查任务失败 ${taskId}:`, error.message);
  }
}

// 启动轮询服务
function startPollingService() {
  setInterval(async () => {
    try {
      // 获取所有 queued 和 processing 状态的任务
      const queuedTasks = historyStorage.getAllRecords({ status: 'queued' });
      const processingTasks = historyStorage.getAllRecords({ status: 'processing' });
      const allPendingTasks = [...queuedTasks, ...processingTasks];

      if (allPendingTasks.length > 0) {
        console.log(`[轮询] 检查 ${allPendingTasks.length} 个待处理任务...`);
      }

      for (const record of allPendingTasks) {
        await checkAndUpdateTask(record.taskId, record.platform);
      }
    } catch (error) {
      console.error('[轮询] 服务错误:', error.message);
    }
  }, POLL_INTERVAL);

  console.log(`[轮询] 服务已启动，间隔 ${POLL_INTERVAL / 1000} 秒`);
}

// 在服务器启动时调用
app.listen(PORT, () => {
  startPollingService();
});
```

### 4.3 前端手动查询 (辅助功能)

为用户提供手动查询按钮，可以在不想等待轮询时主动查询：

```javascript
async function queryTaskStatus(taskId, platform, buttonElement) {
  const originalText = buttonElement.innerHTML;
  buttonElement.disabled = true;
  buttonElement.innerHTML = '🔄 查询中...';

  try {
    const response = await fetch(`${API_BASE}/task/${taskId}?platform=${platform}`);
    const result = await response.json();

    if (result.success && result.data) {
      const { status, data } = result.data;

      if (status === 'SUCCESS') {
        alert(`✅ 任务已完成！\n\n视频地址：${data?.output || ''}`);
        loadHistory(); // 刷新历史记录列表
      } else if (status === 'FAILURE') {
        alert(`❌ 任务失败\n\n${data?.fail_reason || '未知错误'}`);
        loadHistory();
      } else {
        alert(`⏳ 任务处理中\n\n当前状态：${status}`);
      }
    } else {
      alert(`❌ 查询失败\n\n${result.error || '未知错误'}`);
    }
  } catch (error) {
    alert(`❌ 网络错误: ${error.message}`);
  } finally {
    buttonElement.disabled = false;
    buttonElement.innerHTML = originalText;
  }
}
```

---

## 5. 常见问题排查 (Troubleshooting)

| 现象 | 原因 | 解决方案 |
|------|------|----------|
| **贞贞平台视频未保存到历史** | 只检查了 `result.data.id`，未检查 `task_id` | 使用 `result.data.id \|\| result.data.task_id` |
| **查询返回 HTML** | 使用了错误的查询端点 | 聚鑫用 `/v1/video/query?id=xxx`，贞贞用 `/v2/videos/generations/xxx` |
| **data.output 为 null** | 未正确提取 video_url | 检查响应结构，优先从顶层 `video_url` 提取 |
| **`channel not found` / 404** | 角色创建传了 `model` 参数 | 移除 payload 中的 `model` |
| **`Invalid token`** | API Key 错误或格式不对 | 检查 Header 为 `Bearer sk-...` |
| **前端一直显示 "Creating..."** | 后端使用了 `spawn` 导致阻塞 | 改用 `await fetch()` 或 `await axios()` |
| **频繁 429 错误** | 轮询间隔太短 | 增加到 30 秒或更长 |
| **轮询服务不工作** | setInterval 未正确启动或服务器重启 | 确保在 app.listen() 后调用 startPollingService() |

---

## 6. 视频下载 (Video Download)

### 6.1 聚鑫平台
- **视频URL位置**: 响应顶层 `video_url` 字段
- **或**: `detail.url` (如果有)
- **或**: `detail.draft_info.downloadable_url`

### 6.2 贞贞平台
- **视频URL位置**: `data.output` 字段

### 6.3 下载实现
```javascript
async function downloadVideo(videoUrl, downloadDir) {
  const response = await axios({
    method: 'GET',
    url: videoUrl,
    responseType: 'stream',
    timeout: 300000  // 5分钟超时
  });

  const fileName = videoUrl.split('/').pop() || 'video.mp4';
  const filePath = path.join(downloadDir, fileName);

  const writer = fs.createWriteStream(filePath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(filePath));
    writer.on('error', reject);
  });
}
```

---

## 7. 环境变量配置 (.env)

```bash
# 聚鑫平台 API Key
SORA2_API_KEY=sk-xxxxxxxxxxxx

# 贞贞平台 API Key
ZHENZHEN_API_KEY=sk-xxxxxxxxxxxx

# 服务器端口
PORT=9000
```

---

## 8. API 端点速查表

| 功能 | 聚鑫端点 | 贞贞端点 | 说明 |
|------|----------|----------|------|
| 创建视频 | `/v1/video/create` | `/v1/video/create` | 相同 |
| 查询任务 | `/v1/video/query?id={taskId}` | `/v2/videos/generations/{taskId}` | **不同** |
| 创建角色 | `/sora/v1/characters` | `/sora/v1/characters` | 相同，都不传 model |
| 故事板 | `/v1/video/storyboard` | `/v1/video/storyboard` | 相同 |

---

## 9. 代码结构建议

```
src/server/
├── sora2-client.js       # API 客户端（封装双平台逻辑）
├── batch-queue.js        # 批量任务队列
├── history-storage.js    # 历史记录存储
├── character-storage.js  # 角色库存储
└── index.js             # Express 服务器

data/
├── history.json          # 历史记录持久化存储
└── characters.json       # 角色库持久化存储
```

---

## 10. 角色库管理 (Character Library)

### 10.1 设计模式

角色库管理遵循与历史记录相同的设计模式：

```javascript
class CharacterStorage {
  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.charactersFile = path.join(this.dataDir, 'characters.json');
    this.characters = this._load();
  }

  _load() {
    if (fs.existsSync(this.charactersFile)) {
      return JSON.parse(fs.readFileSync(this.charactersFile, 'utf-8'));
    }
    return [];
  }

  _save() {
    fs.writeFileSync(this.charactersFile, JSON.stringify(this.characters, null, 2), 'utf-8');
  }

  addCharacter(character) {
    // 检查是否已存在
    const existingIndex = this.characters.findIndex(c => c.id === character.id);
    if (existingIndex !== -1) {
      // 更新现有角色
      this.characters[existingIndex] = {
        ...this.characters[existingIndex],
        ...character,
        updatedAt: new Date().toISOString(),
      };
    } else {
      // 添加新角色（最新的在前面）
      this.characters.unshift({
        ...character,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    this._save();
  }
}
```

### 10.2 角色创建自动保存

在创建角色的 API 端点中自动保存到角色库：

```javascript
app.post('/api/character/create', async (req, res) => {
  const { platform, url, timestamps, from_task } = req.body;
  const client = getClient(platform);
  const result = await client.createCharacter({ url, timestamps, from_task });

  // 自动保存到角色库
  if (result.success && result.data) {
    characterStorage.addCharacter({
      id: result.data.id,
      username: result.data.username,
      permalink: result.data.permalink,
      profilePictureUrl: result.data.profile_picture_url,
      sourceVideoUrl: url,
      platform: platform,
      timestamps: timestamps,
      fromTask: from_task,  // 记录来源任务
    });
  }

  res.json(result);
});
```

### 10.3 角色快速调用功能 ⭐ 可视化网格选择器

**重要更新**: 2025-12-29 - 使用可视化角色卡片网格，支持光标位置插入

#### 10.3.1 设计原则

1. **可视化展示**: 使用角色卡片网格，显示头像、别名和用户名（不显示平台标签，因为 sora2 角色跨平台通用）
2. **光标位置插入**: 点击角色时，在光标位置插入引用，而不是替换全部内容
3. **独立状态管理**: 文生视频和故事板各自维护选中状态

#### 10.3.2 文生视频 - 角色选择器

```javascript
// 加载角色到网格
async function loadCharactersToGrid(gridId, type) {
  const response = await fetch(`${API_BASE}/character/list`);
  const result = await response.json();

  if (result.success && result.data) {
    const gridElement = document.getElementById(gridId);
    gridElement.innerHTML = '';

    result.data.forEach(char => {
      const card = document.createElement('div');
      card.className = 'character-card';
      card.dataset.username = char.username;

      // 显示头像、别名和用户名（不显示平台标签）
      const avatarUrl = char.profilePictureUrl || 'default-avatar.svg';
      const displayName = char.alias || char.username;

      card.innerHTML = `
        <img src="${avatarUrl}" class="character-card-avatar">
        <div class="character-card-name">${displayName}</div>
        ${char.alias ? `<div class="character-card-username">@${char.username}</div>` : ''}
      `;

      // 点击选择角色
      card.addEventListener('click', () => {
        selectCharacter(type, char.username, gridId);
      });

      gridElement.appendChild(card);
    });
  }
}

// 在光标位置插入角色引用
function updatePromptWithCharacter(username) {
  const promptElement = document.getElementById('video-prompt');
  if (!promptElement || !username) return;

  // 获取光标位置
  const start = promptElement.selectionStart;
  const end = promptElement.selectionEnd;
  const text = promptElement.value;
  const refText = `@${username} `;

  // 在光标位置插入
  promptElement.value = text.substring(0, start) + refText + text.substring(end);
  // 移动光标到插入内容之后
  promptElement.setSelectionRange(start + refText.length, start + refText.length);
  // 重新聚焦
  promptElement.focus();
}
```

#### 10.3.3 故事板 - 角色选择器

```javascript
// 记录最后焦点的场景输入框
let lastFocusedSceneInput = null;

// 为场景输入框添加焦点监听
function setupSceneInputListeners() {
  document.querySelectorAll('.shot-scene').forEach(input => {
    input.addEventListener('focus', (e) => {
      lastFocusedSceneInput = e.target;
    });
  });
}

// 在最后焦点的场景中插入角色引用
function updateStoryboardSceneWithCharacter(username) {
  // 使用最后焦点的场景输入框
  let targetInput = lastFocusedSceneInput;

  if (!targetInput || !document.body.contains(targetInput)) {
    // 如果没有记录的焦点，尝试使用当前焦点
    const activeElement = document.activeElement;
    if (activeElement && activeElement.classList.contains('shot-scene')) {
      targetInput = activeElement;
    }
  }

  if (targetInput && username) {
    const start = targetInput.selectionStart;
    const end = targetInput.selectionEnd;
    const text = targetInput.value;
    const refText = `@${username} `;

    // 在光标位置插入
    targetInput.value = text.substring(0, start) + refText + text.substring(end);
    // 移动光标并重新聚焦
    targetInput.setSelectionRange(start + refText.length, start + refText.length);
    targetInput.focus();
  }
}
```

#### 10.3.4 HTML 结构

```html
<!-- 文生视频 - 角色选择网格 -->
<div class="form-group">
  <label>选择角色（可选）</label>
  <button id="video-refresh-characters">刷新角色列表</button>
  <div id="video-character-grid" class="character-grid"></div>
  <p>选择角色后，会在提示词中自动插入 @username 引用（不带花括号）</p>
</div>

<!-- 故事板 - 角色选择网格 -->
<div class="form-group">
  <label>选择角色（可选）</label>
  <button id="storyboard-refresh-characters">刷新角色列表</button>
  <div id="storyboard-character-grid" class="character-grid"></div>
  <p>选择角色后，会在最后焦点的场景描述中自动插入 @username 引用（不带花括号）</p>
</div>
```

#### 10.3.5 CSS 样式

```css
.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.character-card {
  background: #f8f9fa;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: all 0.2s;
}

.character-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
  transform: translateY(-2px);
}

.character-card.selected {
  border-color: #667eea;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

.character-card-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 12px;
  border: 3px solid #e0e0e0;
}

.character-card.selected .character-card-avatar {
  border-color: #667eea;
}

.character-card-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.character-card-username {
  font-size: 12px;
  color: #666;
  word-break: break-all;
}
```

#### 10.3.6 关键要点

1. **不显示平台标签**: sora2 角色跨平台通用，聚鑫和贞贞创建的角色可以互相使用
2. **光标位置插入**: 不会替换用户已输入的内容，只在光标位置插入 `@username` 引用
3. **焦点管理**: 故事板需要记录最后焦点的场景输入框，因为点击角色卡片会转移焦点
4. **选中状态**: 角色卡片支持选中/取消选中（再次点击取消）

### 10.4 角色别名功能

为角色设置别名，方便记忆和使用：

```javascript
// 设置角色别名
async function setCharacterAlias(characterId, username, currentAlias) {
  const newAlias = prompt(
    `设置角色别名\n\n用户名: ${username}\n${currentAlias ? `当前别名: ${currentAlias}` : '当前别名: 无'}`,
    currentAlias || ''
  );

  if (newAlias === null) return;

  const aliasValue = newAlias.trim();
  if (aliasValue === '') {
    if (!confirm('确定要清除别名吗？')) return;
  }

  const response = await fetch(`${API_BASE}/character/${characterId}/alias`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alias: aliasValue }),
  });

  const result = await response.json();
  if (result.success) {
    alert(`别名已${aliasValue ? '设置' : '清除'}成功`);
    loadCharacterLibrary(); // 刷新角色库列表
  }
}
```

### 10.5 API 端点设计

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/character/create` | POST | 创建角色（自动保存到库） |
| `/api/character/list` | GET | 获取角色列表（支持分页、平台筛选） |
| `/api/character/stats` | GET | 获取统计信息 |
| `/api/character/:characterId` | GET | 获取单个角色详情 |
| `/api/character/search/:query` | GET | 搜索角色（按用户名或ID） |
| `/api/character/:characterId/alias` | PUT | 设置/更新角色别名 |
| `/api/character/:characterId` | DELETE | 删除角色 |
| `/api/character/all` | DELETE | 清空所有角色 |

### 10.6 前端实现要点

**角色卡片显示**:
```javascript
function displayCharacter(character) {
  return `
    <div class="character-item">
      <img src="${character.profilePictureUrl}" class="avatar">
      <h3>${character.alias || character.username}</h3>
      ${character.alias ? `<p class="alias">别名: ${character.alias}</p>` : ''}
      <p>🆔 ${character.id}</p>
      <p>🌐 ${character.platform === 'zhenzhen' ? '贞贞' : '聚鑫'}</p>
      <p>📅 ${new Date(character.createdAt).toLocaleString()}</p>
      <a href="${character.permalink}" target="_blank">查看主页</a>
      <button onclick="setCharacterAlias('${character.id}', '${character.username}', '${character.alias || ''}')">设置别名</button>
      <button onclick="copyToClipboard('${character.id}')">复制ID</button>
      <button onclick="deleteCharacter('${character.id}')">删除</button>
    </div>
  `;
}
```

**搜索功能（防抖处理）**:
```javascript
let searchTimeout;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchCharacter(e.target.value);
  }, 500);  // 500ms 防抖
});
```

### 10.7 最佳实践

1. **使用 from_task 优先**: 推荐从已完成的视频任务创建角色，而不是直接使用视频 URL
2. **自动保存**: 角色创建成功后自动保存到角色库，不需要用户手动操作
3. **更新策略**: 如果角色 ID 已存在，则更新而不是重复添加
4. **时间戳记录**: 记录 createdAt 和 updatedAt，便于追踪
5. **搜索优化**: 搜索使用不区分大小写的模糊匹配
6. **别名系统**: 为角色设置易于记忆的别名，提升用户体验
7. **快速调用**: 使用可视化角色卡片网格，在光标位置插入角色引用 ⭐
8. **平台通用性**: sora2 角色跨平台通用，不在界面显示平台标签 ⭐
9. **光标位置插入**: 点击角色时不替换全部内容，只在光标位置插入 `@username` 引用 ⭐

---

## 11. 持久化存储最佳实践

### 11.1 JSON 文件存储

**优点**:
- ✅ 简单直观，易于调试
- ✅ 人类可读，便于手动编辑
- ✅ 不需要额外的数据库服务
- ✅ 适合中小规模数据

**实现要点**:
```javascript
class Storage {
  constructor(filePath) {
    this.filePath = path.join(process.cwd(), 'data', filePath);
    this.ensureDataDir();
    this.data = this.load();
  }

  ensureDataDir() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      }
    } catch (error) {
      console.error(`加载 ${this.filePath} 失败:`, error.message);
    }
    return this.getDefaultData();
  }

  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error(`保存 ${this.filePath} 失败:`, error.message);
    }
  }
}
```

### 11.2 数据目录结构

```
D:\user\github\winjin/
├── data/
│   ├── history.json      # 历史记录
│   └── characters.json   # 角色库
├── downloads/            # 视频下载目录（自动创建）
└── src/
    └── server/
```

### 11.3 .gitignore 配置

```
# 数据和下载
data/
downloads/

# 但保留目录结构（可选）
!data/.gitkeep
!downloads/.gitkeep
```

### 11.4 数据备份建议

```javascript
// 定期备份功能
class BackupStorage extends Storage {
  backup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = this.filePath.replace('.json', `.backup.${timestamp}.json`);
    fs.copyFileSync(this.filePath, backupPath);
    console.log(`备份已创建: ${backupPath}`);
  }
}

// 每天自动备份
setInterval(() => {
  historyStorage.backup();
  characterStorage.backup();
}, 24 * 60 * 60 * 1000);
```

---

## 12. 常见问题补充

| 现象 | 原因 | 解决方案 |
|------|------|----------|
| **"任务还在进行中"** | 创建角色时视频任务未完成 | 等待任务状态为 SUCCESS 后再创建 |
| **"任务 not found"** | 使用了错误的任务ID或任务已过期 | 先查询任务状态确认存在 |
| **"请求上游地址失败"** | 视频 URL 无法访问 | 使用 from_task 参数代替 url |
| **角色库显示"暂无角色"** | 角色创建失败或未自动保存 | 检查服务器日志，确认角色创建成功 |
| **贞贞平台视频未保存历史** | 响应格式差异（task_id vs id） | 使用 `result.data.id \|\| result.data.task_id` |
| **任务状态长时间不更新** | 轮询间隔太长或服务未启动 | 检查轮询服务是否运行，考虑降低间隔到30秒 |

---

## 13. 实战经验总结

### 13.1 双平台兼容性要点

1. **响应格式处理**: 始终使用 `result.data.id || result.data.task_id` 获取任务ID
2. **查询端点**: 根据平台类型选择不同的查询端点
3. **状态码映射**: 将聚鑫的状态码转换为统一格式

### 13.2 用户体验优化

1. **后台自动轮询**: 30秒间隔，用户无需手动刷新
2. **手动查询按钮**: 提供主动查询选项，提升响应速度感知
3. **角色快速调用**: 下拉选择器自动插入引用格式
4. **角色别名系统**: 方便用户识别和使用常用角色
5. **复制ID功能**: 一键复制，方便其他操作使用

### 13.3 调试技巧

1. **服务器日志**: 在轮询服务中添加日志输出，便于追踪任务状态
2. **前端响应**: 使用 alert() 显示任务状态变化，及时反馈
3. **数据文件检查**: 直接查看 `data/history.json` 和 `data/characters.json` 验证存储

---

## 14. 参考图片功能 (Reference Images) ⭐ 新增

**更新日期**: 2025-12-29

### 14.1 功能概述

Sora2 API 支持通过参考图片生成视频，主要分为两种模式：

| 模式 | 说明 | 参考图数量 |
|------|------|-----------|
| **文生视频** | 不使用参考图片，纯文本生成 | 0 张 |
| **图生视频** | 使用参考图片作为视觉基础 | 1 张或多张 |

**关键发现**:
- ✅ **故事板模式**: 每个分镜头都可以独立配置参考图片
- ✅ **简单模式**: 每个视频只使用一张参考图片
- ✅ **角色混合**: 角色客串可以和参考图搭配使用，参考图作为场景，角色在场景中活动

### 14.2 简单模式参考图片

**前端界面设计**:
```html
<div class="form-group">
  <label>参考图片（可选）</label>
  <div class="images-container" id="video-images-container">
    <!-- 图片输入行会动态添加到这里 -->
  </div>
  <button class="btn btn-secondary" id="add-image-btn" style="margin-top: 8px; padding: 8px 16px;">
    + 添加图片
  </button>
  <p style="color: #666; font-size: 13px; margin-top: 8px;">
    如果有参考图片，将自动使用图生视频；否则使用文生视频
  </p>
</div>
```

**动态添加/删除图片**:
```javascript
// 添加图片按钮
document.getElementById('add-image-btn').addEventListener('click', () => {
  const container = document.getElementById('video-images-container');
  const imageItem = document.createElement('div');
  imageItem.className = 'image-item';
  imageItem.innerHTML = `
    <input type="text" placeholder="输入图片 URL..." />
    <button>删除</button>
  `;
  container.appendChild(imageItem);

  // 删除按钮事件
  imageItem.querySelector('button').addEventListener('click', () => {
    imageItem.remove();
  });
});

// 收集图片数据
const images = [];
document.querySelectorAll('.image-item input').forEach(input => {
  const url = input.value.trim();
  if (url) {
    images.push(url);
  }
});
```

**CSS 样式**:
```css
.images-container {
  margin-top: 8px;
}

.image-item {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  align-items: flex-start;
}

.image-item input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
}

.image-item input:focus {
  outline: none;
  border-color: #667eea;
}

.image-item button {
  padding: 8px 16px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.image-item button:hover {
  background: #c82333;
}
```

**API 调用**:
```javascript
const response = await fetch(`${API_BASE}/video/create`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    platform: currentPlatform,
    prompt: prompt,
    model: 'sora-2',
    orientation: 'landscape',
    duration: 10,
    size: 'small',
    watermark: false,
    private: true,
    images: images,  // 参考图片数组
  }),
});

const result = await response.json();
const message = images.length > 0
  ? `图生视频任务已创建（${images.length} 张参考图片）`
  : '文生视频任务已创建';
```

### 14.3 故事板模式参考图片

**关键特性**: 每个分镜头都可以独立配置参考图片

**前端界面设计**:
```html
<!-- 添加镜头时包含图片输入 -->
<div class="shot-item">
  <input type="number" placeholder="时长(秒)" value="5" class="shot-duration" />
  <input type="text" placeholder="场景描述" class="shot-scene" />
  <input type="text" placeholder="参考图片URL（可选）" class="shot-image" />
  <button class="btn-remove-shot">删除</button>
</div>
```

**添加镜头函数**:
```javascript
document.getElementById('add-shot-btn').addEventListener('click', () => {
  const container = document.getElementById('shots-container');
  const shotItem = document.createElement('div');
  shotItem.className = 'shot-item';
  shotItem.innerHTML = `
    <input type="number" placeholder="时长(秒)" value="5" class="shot-duration" />
    <input type="text" placeholder="场景描述" class="shot-scene" />
    <input type="text" placeholder="参考图片URL（可选）" class="shot-image" />
    <button class="btn-remove-shot">删除</button>
  `;
  container.appendChild(shotItem);

  // 为新场景输入框添加焦点监听（角色插入功能）
  const sceneInput = shotItem.querySelector('.shot-scene');
  sceneInput.addEventListener('focus', handleSceneFocus);

  shotItem.querySelector('.btn-remove-shot').addEventListener('click', () => {
    shotItem.remove();
  });
});
```

**创建故事板时收集图片**:
```javascript
document.getElementById('storyboard-create-btn').addEventListener('click', async () => {
  const shots = [];
  document.querySelectorAll('.shot-item').forEach(item => {
    const duration = item.querySelector('.shot-duration').value;
    const scene = item.querySelector('.shot-scene').value.trim();
    const image = item.querySelector('.shot-image').value.trim();

    if (scene) {
      const shotData = {
        duration: parseFloat(duration),
        scene: scene
      };
      // 如果有参考图片，添加到镜头数据中
      if (image) {
        shotData.image = image;
      }
      shots.push(shotData);
    }
  });

  // 创建故事板
  const response = await fetch(`${API_BASE}/video/storyboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      platform: currentPlatform,
      shots: shots,
      model: 'sora-2',
      orientation: 'landscape',
      size: 'small',
      watermark: false,
      private: true,
      images: [],
    }),
  });

  const result = await response.json();
  const shotsWithImages = shots.filter(s => s.image).length;
  const message = shotsWithImages > 0
    ? `故事板任务已创建（${shots.length} 个镜头，${shotsWithImages} 个带参考图片）`
    : `故事板任务已创建（${shots.length} 个镜头）`;
});
```

### 14.4 后端实现

**Sora2Client - createStoryboardVideo 方法**:
```javascript
/**
 * 创建故事板视频（批量生成多个镜头）
 * @param {object} options - 视频创建参数
 * @param {Array} options.shots - 镜头数组
 * @param {string} options.shots[].scene - 每个镜头的场景描述
 * @param {number} options.shots[].duration - 每个镜头的时长（秒）
 * @param {string} [options.shots[].image] - 每个镜头的参考图片URL（可选）⭐
 * @param {string} [options.model='sora-2'] - 模型名称
 * @param {string} [options.orientation='landscape'] - 画面方向
 * @param {string|boolean} [options.size='small'] - 分辨率
 * @param {boolean} [options.watermark=false] - 是否无水印
 * @param {boolean} [options.private=true] - 是否隐藏视频
 * @param {string[]} [options.images] - 参考图片链接数组（全局）
 * @returns {Promise<object>} 任务信息
 */
async createStoryboardVideo(options) {
  try {
    const {
      shots,
      model = 'sora-2',
      orientation = 'landscape',
      size = 'small',
      watermark = false,
      private: isPrivate = true,
      images = [],
    } = options;

    if (!shots || !Array.isArray(shots) || shots.length === 0) {
      throw new Error('shots 是必填参数，且必须是非空数组');
    }

    // 收集所有镜头的参考图片 ⭐ 关键实现
    const allImages = [...images];
    shots.forEach((shot) => {
      if (shot.image) {
        allImages.push(shot.image);
      }
    });

    // 构建故事板提示词
    const promptParts = shots.map((shot, index) => {
      return `Shot ${index + 1}:\nduration: ${shot.duration}sec\nScene: ${shot.scene}`;
    });
    const prompt = promptParts.join('\n\n');

    // 构建请求体
    const body = {
      model,
      prompt,
      images: allImages,  // 使用合并后的图片数组
      watermark,
      private: isPrivate,
    };

    // ... 转换其他参数并发送请求
    const response = await this.client.post(this.platform.videoEndpoint, body, {
      headers: this._getAuthHeaders(),
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
}
```

### 14.5 提示词编写最佳实践

**重要原则**: 先分析图片内容，然后写出与图片相关性强的提示词

**测试案例**:

**图片1** (城市街道上的卡通垃圾车):
```
一辆卡通风格的垃圾车在城市街道上行驶，黄色车头、绿色车身，
车头有可爱的表情（大眼睛、微笑、腮红），车斗通过机械臂抬起正在作业，
晴朗天气，卡通插画风格
```

**图片2** (居民区里的卡通垃圾车和彩色垃圾桶):
```
一辆卡通风格的垃圾车在居民区作业，周围有4个带表情的彩色垃圾桶
（灰色、蓝色、绿色、棕色），垃圾车车头有可爱的表情，
车斗正抬起倾倒垃圾，温馨的社区场景，柔和的暖色调，手绘插画风格
```

**对比分析**:
```
❌ 错误示例: "一个可爱的猫咪在花园里玩耍，阳光明媚"
   问题: 提示词与图片内容完全无关

✅ 正确示例: "一辆卡通风格的垃圾车在城市街道上行驶，黄色车头、绿色车身..."
   优势: 详细描述图片中的视觉元素（颜色、表情、动作、环境、风格）
```

**提示词结构建议**:
1. **主体**: 画面中的主要角色/物体
2. **外观**: 颜色、形状、表情、姿态
3. **动作**: 正在做什么
4. **环境**: 背景场景、周围物体
5. **氛围**: 光线、色调、风格

### 14.6 角色与参考图片混合使用 ⭐

**使用场景**: 参考图片作为场景基础，角色客串在场景中活动

**实现方式**:
```javascript
// 提示词格式
const prompt = '@username 在参考图片场景中活动';

// 示例
const prompt1 = '@783316a1d.diggyloade 在卡通风格的街道上行驶';
const prompt2 = '@df4c928fa.kittenauro 在居民区的垃圾桶旁边玩耍';
```

**前端实现**:
```javascript
// 先选择参考图片
document.querySelectorAll('.image-item input').forEach(input => {
  const url = input.value.trim();
  if (url) {
    images.push(url);
  }
});

// 然后在光标位置插入角色引用
function updatePromptWithCharacter(username) {
  const promptElement = document.getElementById('video-prompt');
  const start = promptElement.selectionStart;
  const end = promptElement.selectionEnd;
  const text = promptElement.value;
  const refText = `@${username} `;

  // 在光标位置插入，不影响已输入的提示词
  promptElement.value = text.substring(0, start) + refText + text.substring(end);
  promptElement.setSelectionRange(start + refText.length, start + refText.length);
  promptElement.focus();
}
```

**测试案例**:
```
配置:
- 参考图片: 城市街道上的卡通垃圾车
- 角色: @783316a1d.diggyloade (装载机)
- 提示词: @783316a1d.diggyloade 在卡通风格的街道上缓慢行驶

预期结果:
- 参考图片提供场景基础（城市街道、卡通风格）
- 角色作为活动主体在场景中出现
- 两者结合生成连贯的视频内容
```

### 14.7 测试验证

**测试一**: 简单模式 - 有图 vs 无图
```
图生视频: video_998a3c86-f020-4df4-9798-7d8acb41e9bc (1张参考图)
文生视频: video_6dfb11dc-c995-47e9-acec-ed33297e7904 (无参考图)
对比效果: 验证参考图片对视频生成的影响
```

**测试二**: 故事板模式 - 混合配置
```
视频一: video_135b3666-b840-4c50-81cd-6c371a3e88a6
- Shot 1: 有参考图
- Shot 2: 无参考图
系统识别: "2 个镜头，1 个带参考图片" ✅

视频二: video_ee7f0f17-50d1-45be-85f9-1cfec2840bf1
- Shot 1: 有参考图（城市街道垃圾车）
- Shot 2: 有参考图（居民区垃圾车+垃圾桶）
系统识别: "2 个镜头，2 个带参考图片" ✅
```

### 14.8 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| **生成的视频与图片不符** | 提示词未描述图片内容 | 先分析图片内容，写出相关性强的提示词 |
| **系统未识别参考图片** | 图片 URL 格式错误或图片无法访问 | 检查 URL 完整性，确保图片可公开访问 |
| **故事板镜头图片丢失** | shot.image 字段未正确传递 | 检查前端收集逻辑，确保每个镜头的图片都被收集 |
| **角色引用不生效** | 格式错误 `@{username}` | 使用正确格式 `@username`（不带花括号） |
| **参考图片和角色冲突** | 提示词未明确两者关系 | 在提示词中描述角色在场景中的活动 |

---

## 15. 历史记录管理 (History Management) ⭐ 新增

### 15.1 功能概述

历史记录管理功能允许用户删除不需要的视频生成记录，保持界面整洁。

**功能对比**:

| 功能 | 操作 | 确认机制 | 刷新 |
|------|------|----------|------|
| **单条删除** | 点击记录旁的"🗑️ 删除"按钮 | 一次确认 | 自动刷新列表 |
| **清空全部** | 点击顶部"清空全部"按钮 | 二次确认 | 自动刷新列表 |

**关键特性**:
- ✅ 所有删除操作都需要用户确认
- ✅ 清空全部操作有双重确认机制
- ✅ 删除成功后自动刷新历史记录列表
- ✅ 删除失败显示详细错误信息
- ✅ 支持按任务ID删除单条记录

### 15.2 后端 API 实现

#### 15.2.1 删除单条记录

**端点**: `DELETE /api/history/:taskId`

**实现代码**:
```javascript
app.delete('/api/history/:taskId', (req, res) => {
  try {
    const { taskId } = req.params;
    const deleted = historyStorage.deleteRecord(taskId);
    res.json({ success: true, data: { deleted } });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});
```

**响应格式**:
```javascript
// 成功
{ success: true, data: { deleted: true } }

// 失败
{ success: false, error: "Record not found" }
```

#### 15.2.2 清空所有记录

**端点**: `DELETE /api/history/all`

**实现代码**:
```javascript
app.delete('/api/history/all', (req, res) => {
  try {
    historyStorage.clearAll();
    res.json({ success: true, data: { message: 'All records cleared' } });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});
```

**响应格式**:
```javascript
// 成功
{ success: true, data: { message: 'All records cleared' } }

// 失败
{ success: false, error: "Clear failed" }
```

### 15.3 前端实现

#### 15.3.1 删除单条记录

**HTML 结构**:
```html
<div class="history-item">
  <!-- 记录信息 -->
  <button class="btn btn-sm btn-danger" onclick="deleteHistoryRecord('${record.taskId}')">
    🗑️ 删除
  </button>
</div>
```

**JavaScript 实现**:
```javascript
async function deleteHistoryRecord(taskId) {
  // 第一步：确认删除
  if (!confirm(`确定要删除这条历史记录吗？\n\n任务ID: ${taskId}`)) {
    return; // 用户取消
  }

  try {
    // 第二步：调用删除 API
    const response = await fetch(`${API_BASE}/history/${taskId}`, {
      method: 'DELETE'
    });
    const result = await response.json();

    // 第三步：处理响应
    if (result.success) {
      alert('✅ 删除成功');
      // 第四步：重新加载历史记录列表
      loadHistory();
    } else {
      alert(`❌ 删除失败\n\n${result.error || '未知错误'}`);
    }
  } catch (error) {
    alert(`❌ 网络错误: ${error.message}`);
  }
}
```

#### 15.3.2 清空全部记录

**HTML 结构**:
```html
<div style="display: flex; gap: 8px;">
  <button class="btn btn-secondary" id="history-refresh-btn">刷新</button>
  <button class="btn btn-secondary" id="history-stats-btn">统计</button>
  <button class="btn btn-danger" id="history-clear-btn">清空全部</button>
</div>
```

**JavaScript 实现**:
```javascript
async function clearAllHistory() {
  // 第一次确认
  if (!confirm('⚠️ 确定要清空所有历史记录吗？\n\n此操作不可恢复！')) {
    return;
  }

  // 第二次确认（双重确认机制）
  if (!confirm('⚠️ 再次确认：真的要清空所有历史记录吗？')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/history/all`, {
      method: 'DELETE'
    });
    const result = await response.json();

    if (result.success) {
      alert('✅ 已清空所有历史记录');
      loadHistory(); // 刷新列表
    } else {
      alert(`❌ 清空失败\n\n${result.error || '未知错误'}`);
    }
  } catch (error) {
    alert(`❌ 网络错误: ${error.message}`);
  }
}

// 绑定按钮事件
document.getElementById('history-clear-btn').addEventListener('click', clearAllHistory);
```

### 15.4 用户体验设计

#### 15.4.1 确认机制设计

**单条删除**:
- 一次确认即可
- 显示任务ID帮助用户识别
- 清晰的警告信息

**清空全部**:
- 双重确认机制
- 第一次：警告操作不可恢复
- 第二次：再次确认操作意图

#### 15.4.2 操作反馈

**删除成功**:
```javascript
// ✅ 显示成功提示
alert('✅ 删除成功');

// ✅ 自动刷新列表，用户立即看到效果
loadHistory();
```

**删除失败**:
```javascript
// ✅ 显示错误原因
alert(`❌ 删除失败\n\n${result.error || '未知错误'}`);

// ✅ 不刷新列表，保留原始状态
```

**网络错误**:
```javascript
// ✅ 友好的错误提示
alert(`❌ 网络错误: ${error.message}`);
```

### 15.5 测试验证

**测试案例 1: 删除单条记录**
```
操作步骤:
1. 打开历史记录页面
2. 找到一条测试记录
3. 点击"🗑️ 删除"按钮
4. 在确认对话框中点击"确定"

预期结果:
✅ 弹出确认对话框，显示任务ID
✅ 确认后显示"✅ 删除成功"
✅ 记录从列表中消失
✅ 列表自动刷新
```

**测试案例 2: 取消删除**
```
操作步骤:
1. 点击"🗑️ 删除"按钮
2. 在确认对话框中点击"取消"

预期结果:
✅ 对话框关闭
✅ 记录保留在列表中
✅ 不调用删除 API
```

**测试案例 3: 清空全部记录**
```
操作步骤:
1. 点击"清空全部"按钮
2. 第一次确认点击"确定"
3. 第二次确认点击"确定"

预期结果:
✅ 弹出两次确认对话框
✅ 每次都有明确的警告信息
✅ 最终显示"✅ 已清空所有历史记录"
✅ 列表清空
```

**测试案例 4: 清空全部 - 第二次取消**
```
操作步骤:
1. 点击"清空全部"按钮
2. 第一次确认点击"确定"
3. 第二次确认点击"取消"

预期结果:
✅ 第二次确认对话框关闭
✅ 记录保留在列表中
✅ 不调用清空 API
```

### 15.6 最佳实践

#### 15.6.1 安全性

**✅ 推荐做法**:
- 所有删除操作都需要确认
- 清空全部使用双重确认
- 确认对话框包含详细的操作说明
- 显示受影响的记录信息（如任务ID）

**❌ 避免的做法**:
- 直接删除不经过确认
- 确认信息不够明确
- 清空全部只用一次确认

#### 15.6.2 用户体验

**✅ 推荐做法**:
- 删除成功后自动刷新列表
- 提供清晰的成功/失败反馈
- 使用图标（🗑️）增强视觉识别
- 红色按钮表示危险操作

**❌ 避免的做法**:
- 删除后不刷新，用户看不到效果
- 错误信息不明确
- 危险操作没有视觉区分

#### 15.6.3 错误处理

**✅ 推荐做法**:
```javascript
// 完整的错误处理
try {
  const response = await fetch(...);
  const result = await response.json();

  if (result.success) {
    // 成功处理
    alert('✅ 删除成功');
    loadHistory();
  } else {
    // 业务错误处理
    alert(`❌ 删除失败\n\n${result.error}`);
  }
} catch (error) {
  // 网络错误处理
  alert(`❌ 网络错误: ${error.message}`);
}
```

### 15.7 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| **删除后列表不更新** | 未调用 `loadHistory()` | 删除成功后调用 `loadHistory()` 刷新列表 |
| **误删重要记录** | 确认对话框不够明确 | 在确认对话框中显示任务ID和详细信息 |
| **清空全部太容易触发** | 只有一次确认 | 实现双重确认机制 |
| **删除失败无提示** | 未处理错误响应 | 添加完整的错误处理逻辑 |

### 15.8 扩展功能建议

**未来可以添加的功能**:
1. **批量删除** - 选择多条记录批量删除
2. **筛选后删除** - 按状态筛选后批量删除
3. **回收站机制** - 删除的记录先进入回收站，可恢复
4. **自动清理** - 定期自动清理超过N天的旧记录

---

## 16. 角色搜索、筛选和收藏 (Character Search, Filter & Favorites) ⭐ 新增

### 16.1 功能概述

随着角色数量增多（超过 20 个），用户需要更便捷的方式查找和使用角色。本功能实现了：

| 功能 | 描述 | 实现方式 |
|------|------|----------|
| **搜索** | 实时搜索角色用户名和别名 | 前端过滤，300ms 防抖 |
| **筛选** | 按类型过滤角色列表 | 全部/收藏/最近使用 |
| **收藏** | 收藏常用角色，快速访问 | 后端持久化，星标图标 |
| **最近使用** | 记录最近使用的角色 | localStorage，最多 20 个 |

### 16.2 后端实现

#### 16.2.1 存储层 - updateByUsername 方法

**文件**: `src/server/character-storage.js`

```javascript
/**
 * 按 username 更新角色 ⭐ 新增
 * @param {string} username - 角色用户名
 * @param {object} updates - 更新内容
 * @returns {object|null} 更新后的角色，不存在返回 null
 */
updateByUsername(username, updates) {
  const index = this.characters.findIndex(c => c.username === username);
  if (index === -1) {
    return null;
  }

  Object.assign(this.characters[index], updates);
  this.characters[index].updatedAt = new Date().toISOString();
  this._save();
  return this.characters[index];
}
```

**关键点**:
- 使用 `username` 而非 `id` 作为查找键
- 自动更新 `updatedAt` 时间戳
- 自动保存到 JSON 文件

#### 16.2.2 API 端点

**文件**: `src/server/index.js`

**设置角色收藏状态**:
```javascript
/**
 * 设置角色收藏状态 ⭐ 新增
 * PUT /api/character/:username/favorite
 * 注意：参数名是 username（不是 ID），使用 updateByUsername 方法
 */
app.put('/api/character/:username/favorite', (req, res) => {
  try {
    const { username } = req.params;
    const { favorite } = req.body;

    // 使用 updateByUsername 方法（按 username 查找）
    const updated = characterStorage.updateByUsername(username, {
      favorite: !!favorite,
      favoritedAt: !!favorite ? new Date().toISOString() : null
    });
    if (!updated) {
      return res.json({ success: false, error: 'Character not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});
```

**获取收藏的角色列表**:
```javascript
/**
 * 获取收藏的角色列表 ⭐ 新增
 * GET /api/character/favorites
 */
app.get('/api/character/favorites', (req, res) => {
  try {
    const allCharacters = characterStorage.getAllCharacters();
    const favorites = allCharacters.filter(c => c.favorite === true);
    res.json({ success: true, data: favorites });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});
```

### 16.3 前端实现

#### 16.3.1 UI 结构

**文件**: `src/renderer/public/index.html`

```html
<div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
  <!-- 搜索输入框 -->
  <input type="text" id="video-character-search" placeholder="🔍 搜索角色..."
         style="flex: 1; min-width: 200px; padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px;">

  <!-- 筛选下拉框 -->
  <select id="video-character-filter" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px;">
    <option value="all">全部角色</option>
    <option value="favorites">⭐ 我的收藏</option>
    <option value="recent">🕐 最近使用</option>
  </select>

  <!-- 刷新按钮 -->
  <button class="btn btn-secondary" id="video-refresh-characters" style="padding: 8px 16px;">🔄 刷新</button>
</div>

<!-- 角色网格 -->
<div id="video-character-grid" class="character-grid"></div>
```

**收藏图标样式**:
```css
.character-card-favorite {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
  z-index: 2;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.character-card-favorite:hover {
  transform: scale(1.15);
  background: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.character-card-favorite.active {
  color: #f59e0b;  /* 金黄色 */
}

.character-card-favorite.inactive {
  color: #d1d5db;  /* 灰色 */
}
```

#### 16.3.2 搜索和筛选功能

**文件**: `src/renderer/public/index.html`

```javascript
// 最近使用的角色（localStorage）
const RECENT_CHARACTERS_KEY = 'recent_characters';
let recentCharacters = JSON.parse(localStorage.getItem(RECENT_CHARACTERS_KEY) || '[]');

// 保存最近使用的角色
function saveRecentCharacter(username) {
  // 移除已存在的（如果有的话）
  recentCharacters = recentCharacters.filter(u => u !== username);
  // 添加到开头
  recentCharacters.unshift(username);
  // 只保留最近 20 个
  if (recentCharacters.length > 20) {
    recentCharacters = recentCharacters.slice(0, 20);
  }
  // 保存到 localStorage
  localStorage.setItem(RECENT_CHARACTERS_KEY, JSON.stringify(recentCharacters));
}

// 加载角色到网格（支持搜索和筛选）⭐ 更新
async function loadCharactersToGrid(gridId, type, searchQuery = '', filterType = 'all') {
  try {
    const response = await fetch(`${API_BASE}/character/list`);
    const result = await response.json();

    if (result.success && result.data) {
      charactersList[type] = result.data;
      const gridElement = document.getElementById(gridId);
      if (!gridElement) return;

      gridElement.innerHTML = '';

      // 根据筛选类型过滤
      let filteredCharacters = result.data;

      // 筛选：收藏 / 最近使用
      if (filterType === 'favorites') {
        filteredCharacters = filteredCharacters.filter(c => c.favorite === true);
      } else if (filterType === 'recent') {
        filteredCharacters = filteredCharacters.filter(c => recentCharacters.includes(c.username));
        // 按最近使用顺序排序
        filteredCharacters.sort((a, b) => {
          const indexA = recentCharacters.indexOf(a.username);
          const indexB = recentCharacters.indexOf(b.username);
          return indexA - indexB;
        });
      }

      // 搜索：按用户名或别名过滤
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filteredCharacters = filteredCharacters.filter(c =>
          c.username.toLowerCase().includes(query) ||
          (c.alias && c.alias.toLowerCase().includes(query))
        );
      }

      if (filteredCharacters.length === 0) {
        if (filterType === 'favorites') {
          gridElement.innerHTML = '<div class="no-character-hint">暂无收藏的角色</div>';
        } else if (filterType === 'recent') {
          gridElement.innerHTML = '<div class="no-character-hint">暂无最近使用的角色</div>';
        } else if (searchQuery.trim()) {
          gridElement.innerHTML = '<div class="no-character-hint">未找到匹配的角色</div>';
        } else {
          gridElement.innerHTML = '<div class="no-character-hint">暂无角色，请先创建角色或点击刷新</div>';
        }
        return;
      }

      // 渲染角色卡片...
    }
  } catch (error) {
    console.error('加载角色列表失败:', error);
  }
}
```

#### 16.3.3 事件监听器

```javascript
// 设置搜索和筛选事件监听 ⭐ 新增
function setupCharacterSearchAndFilter(type) {
  const searchInput = document.getElementById(`${type}-character-search`);
  const filterSelect = document.getElementById(`${type}-character-filter`);
  const refreshBtn = document.getElementById(`${type}-refresh-characters`);
  const gridId = `${type}-character-grid`;

  if (!searchInput || !filterSelect || !refreshBtn) return;

  // 搜索输入（实时，300ms 防抖）
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const searchValue = searchInput.value;
      const filterValue = filterSelect.value;
      loadCharactersToGrid(gridId, type, searchValue, filterValue);
    }, 300);
  });

  // 筛选下拉框
  filterSelect.addEventListener('change', () => {
    const searchValue = searchInput.value;
    const filterValue = filterSelect.value;
    loadCharactersToGrid(gridId, type, searchValue, filterValue);
  });

  // 刷新按钮
  refreshBtn.addEventListener('click', () => {
    const searchValue = searchInput.value;
    const filterValue = filterSelect.value;
    loadCharactersToGrid(gridId, type, searchValue, filterValue);
  });
}

// 初始化时设置事件监听
setupCharacterSearchAndFilter('video');
setupCharacterSearchAndFilter('storyboard');
```

### 16.4 测试验证

**测试案例 1: 搜索功能**
```
操作步骤:
1. 打开文生视频页面
2. 在搜索框输入"猫"
3. 等待 300ms 防抖延迟

预期结果:
✅ 只显示用户名或别名包含"猫"的角色
✅ 其他角色被过滤掉
✅ 清空搜索框后显示所有角色
```

**测试案例 2: 收藏功能**
```
操作步骤:
1. 点击角色卡片上的星标图标（☆）
2. 切换到"⭐ 我的收藏"筛选
3. 再次点击星标图标取消收藏

预期结果:
✅ 点击后星标变为金黄色（★）
✅ 切换到收藏筛选后只显示已收藏的角色
✅ 取消收藏后星标变回灰色（☆）
✅ 取消收藏后角色从收藏列表消失
```

**测试案例 3: 最近使用**
```
操作步骤:
1. 选择一个角色
2. 切换到"🕐 最近使用"筛选

预期结果:
✅ 最近使用的角色显示在列表顶部
✅ 角色按使用顺序排序
✅ 数据保存在 localStorage，刷新页面后保留
```

### 16.5 最佳实践

#### 16.5.1 搜索防抖

```javascript
// ✅ 正确：使用防抖减少 API 调用
let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    // 执行搜索
  }, 300); // 300ms 防抖
});

// ❌ 错误：每次输入都立即搜索
searchInput.addEventListener('input', () => {
  // 频繁调用 API，性能差
});
```

#### 16.5.2 存储层设计

```javascript
// ✅ 正确：添加 updateByUsername 方法
updateByUsername(username, updates) {
  const index = this.characters.findIndex(c => c.username === username);
  if (index === -1) return null;

  Object.assign(this.characters[index], updates);
  this._save();
  return this.characters[index];
}

// ❌ 错误：API 和存储层不匹配
// API 使用 username 参数，但存储只支持按 ID 查找
```

### 16.6 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| **搜索无结果** | 大小写敏感 | 使用 `toLowerCase()` 统一为小写比较 |
| **收藏失败** | API 使用 ID 但传入 username | 添加 `updateByUsername` 方法 |
| **最近使用不更新** | 未调用 `saveRecentCharacter` | 选择角色时保存到 localStorage |
| **筛选后不刷新** | 未触发 `change` 事件 | 手动触发或刷新页面 |

### 16.7 扩展功能建议

**未来可以添加的功能**:
1. **高级搜索** - 支持通配符、正则表达式
2. **标签系统** - 为角色添加自定义标签
3. **收藏夹分组** - 创建多个收藏夹分组管理
4. **导入导出** - 导出收藏配置，分享给其他用户

---

**最后更新**: 2025-12-29
**维护者**: WinJin AIGC Team
