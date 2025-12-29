# Sora2 API 开发最佳实践

**更新日期**: 2025-12-29
**项目**: WinJin AIGC
**支持平台**: 聚鑫 (api.jxincm.cn) / 贞贞 (ai.t8star.cn)
**参考文档**: `D:\user\github\winjin\reference\用户输入文件夹/`

**更新记录**:
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

**最后更新**: 2025-12-29
**维护者**: WinJin AIGC Team
