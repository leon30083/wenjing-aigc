---

paths: src/*

---

# 代码规范

## 命名约定

- **文件名**: `kebab-case`
- **变量/函数**: `camelCase`
- **类名**: `PascalCase`
- **常量**: `UPPER_SNAKE_CASE`
- **私有成员**: 前缀下划线 `_`

## 代码风格

- **缩进**: 2 空格
- **引号**: 单引号
- **分号**: 必须
- **注释**: JSDoc 格式

## 错误处理

- 异步函数必须 try-catch
- API 路由必须有错误处理
- 不要吞没错误

## Sora2 API 开发规范

### 平台差异处理

```javascript
// ✅ 正确：根据平台使用不同的查询端点
async getTaskStatus(taskId) {
  if (this.platformType === 'ZHENZHEN') {
    // 贞贞：使用路径参数
    return await this.client.get(`/v2/videos/generations/${taskId}`);
  } else {
    // 聚鑫：使用查询参数
    return await this.client.get('/v1/video/query', {
      params: { id: taskId }
    });
  }
}

// ❌ 错误：所有平台使用相同端点
async getTaskStatus(taskId) {
  return await this.client.get(`/v2/videos/generations/${taskId}`);
}
```

### 双平台任务ID兼容处理 ⚠️ 重要

```javascript
// ✅ 正确：兼容双平台的任务ID格式
app.post('/api/video/create', async (req, res) => {
  const { platform, prompt, model, ...options } = req.body;
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

// ❌ 错误：只检查 id 字段
if (result.success && result.data?.id) {
  // 贞贞平台的视频不会被保存到历史记录
}
```

### 数据格式转换

```javascript
// 聚鑫平台响应需要转换为统一格式
function convertJuxinToUnified(juxinData) {
  return {
    task_id: juxinData.id,
    status: convertStatus(juxinData.status),  // completed -> SUCCESS
    data: juxinData.video_url ? { output: juxinData.video_url } : null
  };
}

// 状态码映射
const STATUS_MAP = {
  'queued': 'IN_PROGRESS',
  'pending': 'NOT_START',
  'processing': 'IN_PROGRESS',
  'completed': 'SUCCESS',
  'failed': 'FAILURE'
};
```

### 视频URL提取优先级

```javascript
// ✅ 正确：按优先级提取视频URL
if (juxinData.video_url) {
  // 1. 优先：顶层 video_url
  unifiedData.data = { output: juxinData.video_url };
} else if (juxinData.detail?.url) {
  // 2. 其次：detail.url
  unifiedData.data = { output: juxinData.detail.url };
} else if (juxinData.detail?.draft_info?.downloadable_url) {
  // 3. 最后：draft_info.downloadable_url
  unifiedData.data = { output: juxinData.detail.draft_info.downloadable_url };
}
```

### 轮询配置

```javascript
// ✅ 正确：使用合理的轮询间隔
const POLL_INTERVAL = 30000;  // 30秒
const TIMEOUT = 600000;       // 10分钟

// ❌ 错误：间隔太短会导致 429 错误
const POLL_INTERVAL = 5000;   // 太短！
```

### 后台轮询服务实现 ⭐

```javascript
// 后台轮询服务：每30秒检查所有 queued 和 processing 状态的任务
const POLL_INTERVAL = 30000; // 30秒

async function checkAndUpdateTask(taskId, platform) {
  try {
    const client = getClient(platform);
    const result = await client.getTaskStatus(taskId);

    if (result.success && result.data) {
      const { status, data } = result.data;

      if (status === 'SUCCESS' && data) {
        historyStorage.markCompleted(taskId, data);
        console.log(`[轮询] 任务完成: ${taskId}`);
      }
      else if (status === 'FAILURE') {
        historyStorage.markFailed(taskId, data?.fail_reason || 'Task failed');
        console.log(`[轮询] 任务失败: ${taskId}`);
      }
      else if (status === 'IN_PROGRESS') {
        historyStorage.updateRecord(taskId, { status: 'processing' });
      }
    }
  } catch (error) {
    console.error(`[轮询] 检查任务失败 ${taskId}:`, error.message);
  }
}

function startPollingService() {
  setInterval(async () => {
    try {
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

### 角色创建规范 ⭐

```javascript
// ❌ 错误：传递 model 参数会导致 404
await axios.post('/sora/v1/characters', {
  model: 'sora-2',  // ❌ 删除此行
  url: videoUrl,
  timestamps: '1,3'
});

// ⚠️ 可用：从视频 URL 创建（可能遇到访问问题）
await axios.post('/sora/v1/characters', {
  url: videoUrl,
  timestamps: '1,3'
});

// ✅ 推荐：从已完成的视频任务创建（更可靠）
// 先等待视频任务完成
const taskResult = await waitForTaskCompletion(taskId);
if (taskResult.status === 'SUCCESS') {
  const character = await axios.post('/sora/v1/characters', {
    from_task: taskId,  // 使用 from_task 参数
    timestamps: '1,3'
  });
}
```

### 角色引用语法

```javascript
// 所有平台统一使用 @username 格式（不带花括号）
// 正确示例：
const prompt1 = '@6f2dbf2b3.zenwhisper 在工地上干活';
const prompt2 = '@783316a1d.diggyloade 在工地上干活';

// ❌ 错误：不要使用花括号
const prompt3 = '@{6f2dbf2b3.zenwhisper} 在工地上干活';
```

## API 路由规范

### 创建视频 - 保存历史记录（兼容双平台）

```javascript
app.post('/api/video/create', async (req, res) => {
  const { platform, prompt, model, ...options } = req.body;
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

### 创建角色 - 自动保存到角色库 ⭐

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
      fromTask: from_task,
    });
  }

  res.json(result);
});
```

### 角色别名功能

```javascript
app.put('/api/character/:characterId/alias', (req, res) => {
  try {
    const { characterId } = req.params;
    const { alias } = req.body;

    if (alias === undefined || alias === null) {
      return res.json({ success: false, error: 'alias 是必填参数' });
    }

    const updated = characterStorage.updateCharacter(characterId, { alias: String(alias).trim() });
    if (!updated) {
      return res.json({ success: false, error: 'Character not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});
```

### 角色快速调用功能 ⭐ 可视化网格选择器

**重要更新**: 2025-12-29 - 使用可视化角色卡片网格，支持光标位置插入

#### 前端实现 - 加载角色到网格

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
```

#### 前端实现 - 光标位置插入（文生视频）

```javascript
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

#### 前端实现 - 焦点管理（故事板）

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

#### 关键要点

1. **不显示平台标签**: sora2 角色跨平台通用，聚鑫和贞贞创建的角色可以互相使用
2. **光标位置插入**: 不会替换用户已输入的内容，只在光标位置插入 `@username` 引用
3. **焦点管理**: 故事板需要记录最后焦点的场景输入框，因为点击角色卡片会转移焦点
4. **选中状态**: 角色卡片支持选中/取消选中（再次点击取消）

### 查询任务 - 返回统一格式

```javascript
app.get('/api/task/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const { platform } = req.query;
  const client = getClient(platform);

  // 自动转换为统一格式
  const result = await client.getTaskStatus(taskId);

  // 自动更新历史记录
  if (result.success && result.data) {
    const { status, data } = result.data;

    if (status === 'SUCCESS' && data) {
      historyStorage.markCompleted(taskId, data);
    } else if (status === 'FAILURE') {
      historyStorage.markFailed(taskId, data?.fail_reason || 'Task failed');
    } else if (status === 'IN_PROGRESS') {
      historyStorage.updateRecord(taskId, { status: 'processing' });
    }
  }

  res.json(result);
});
```

## 文件结构建议

```
src/server/
├── sora2-client.js       # API 客户端（封装双平台逻辑）
├── batch-queue.js        # 批量任务队列（支持自动下载）
├── history-storage.js    # 历史记录存储（JSON文件持久化）
├── character-storage.js  # 角色库存储（JSON文件持久化）⭐
└── index.js             # Express 服务器

data/
├── history.json         # 历史记录持久化存储
└── characters.json      # 角色库持久化存储 ⭐

downloads/               # 视频下载目录（自动创建）
```

## 常见错误模式

### 错误1: 使用错误的查询端点
```javascript
// ❌ 对聚鑫平台使用贞贞的端点
await axios.get(`https://api.jxincm.cn/v2/videos/generations/${taskId}`);

// ✅ 正确：聚鑫使用查询参数
await axios.get('https://api.jxincm.cn/v1/video/query', {
  params: { id: taskId }
});
```

### 错误2: 双平台任务ID不兼容
```javascript
// ❌ 错误：只检查 id 字段
if (result.success && result.data?.id) {
  // 贞贞平台的视频不会被保存到历史记录
}

// ✅ 正确：兼容双平台
const taskId = result.data.id || result.data.task_id;
if (taskId) {
  historyStorage.addRecord({ taskId, platform, prompt, model, options });
}
```

### 错误3: 忘记提取视频URL
```javascript
// ❌ 错误：data 字段为 null
return {
  success: true,
  data: {
    task_id: juxinData.id,
    status: 'SUCCESS',
    data: null  // ❌ 忘记提取 video_url
  }
};

// ✅ 正确：提取 video_url
return {
  success: true,
  data: {
    task_id: juxinData.id,
    status: 'SUCCESS',
    data: { output: juxinData.video_url }
  }
};
```

### 错误4: 轮询间隔太短
```javascript
// ❌ 错误：5秒间隔导致 429 Rate Limit
setInterval(() => checkStatus(taskId), 5000);

// ✅ 正确：30秒间隔
const POLL_INTERVAL = 30000;
setInterval(() => checkStatus(taskId), POLL_INTERVAL);
```

### 错误5: 角色引用格式错误
```javascript
// ❌ 错误：使用花括号
const prompt = '@{username} 在工地上干活';

// ✅ 正确：不使用花括号
const prompt = '@username 在工地上干活';
```

### 错误6: 创建角色时传递 from_task 参数不完整
```javascript
// ❌ 错误：只传递 url，不支持 from_task
app.post('/api/character/create', async (req, res) => {
  const { url, timestamps } = req.body;
  const result = await client.createCharacter({ url, timestamps });
  res.json(result);
});

// ✅ 正确：同时支持 url 和 from_task
app.post('/api/character/create', async (req, res) => {
  const { url, timestamps, from_task } = req.body;
  const result = await client.createCharacter({ url, timestamps, from_task });
  res.json(result);
});
```

### 错误7: 角色插入替换全部内容 ⭐ 新增
```javascript
// ❌ 错误：替换整个提示词内容
function handleCharacterChange() {
  const promptElement = document.getElementById('video-prompt');
  const selectedUsername = selectElement.value;

  // 移除所有角色引用并在开头添加
  const roleRefRegex = /@[a-z0-9_.]+/gi;
  const cleanPrompt = promptElement.value.replace(roleRefRegex, '').trim();
  promptElement.value = `@${selectedUsername} ${cleanPrompt}`;
}

// ✅ 正确：在光标位置插入
function updatePromptWithCharacter(username) {
  const promptElement = document.getElementById('video-prompt');
  const start = promptElement.selectionStart;
  const end = promptElement.selectionEnd;
  const text = promptElement.value;
  const refText = `@${username} `;

  // 在光标位置插入，不影响其他内容
  promptElement.value = text.substring(0, start) + refText + text.substring(end);
  promptElement.setSelectionRange(start + refText.length, start + refText.length);
  promptElement.focus();
}
```

### 错误8: 故事板未管理焦点状态 ⭐ 新增
```javascript
// ❌ 错误：点击角色卡片后丢失焦点，无法插入
function updateStoryboardScene(username) {
  const activeElement = document.activeElement;
  // activeElement 是角色卡片，不是场景输入框
  if (activeElement && activeElement.classList.contains('shot-scene')) {
    activeElement.value = `@${username} ` + activeElement.value;
  }
}

// ✅ 正确：记录最后焦点的场景输入框
let lastFocusedSceneInput = null;

function setupSceneInputListeners() {
  document.querySelectorAll('.shot-scene').forEach(input => {
    input.addEventListener('focus', (e) => {
      lastFocusedSceneInput = e.target;
    });
  });
}

function updateStoryboardScene(username) {
  let targetInput = lastFocusedSceneInput;
  if (!targetInput || !document.body.contains(targetInput)) {
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

    targetInput.value = text.substring(0, start) + refText + text.substring(end);
    targetInput.setSelectionRange(start + refText.length, start + refText.length);
    targetInput.focus();
  }
}
```

### 错误9: 显示平台标签（角色跨平台通用）⭐ 新增
```javascript
// ❌ 错误：显示平台标签（误导用户）
const displayName = char.alias ? `${char.alias} (${char.username})` : char.username;
option.textContent = `[${char.platform === 'juxin' ? '聚鑫' : '贞贞'}] ${displayName}`;

// ✅ 正确：不显示平台标签（sora2 角色跨平台通用）
const displayName = char.alias || char.username;
card.innerHTML = `
  <img src="${avatarUrl}" class="character-card-avatar">
  <div class="character-card-name">${displayName}</div>
  ${char.alias ? `<div class="character-card-username">@${char.username}</div>` : ''}
`;
```

### 错误10: 故事板镜头图片未正确收集 ⭐ 新增
```javascript
// ❌ 错误：只收集场景描述，忽略了图片
const shots = [];
document.querySelectorAll('.shot-item').forEach(item => {
  const scene = item.querySelector('.shot-scene').value.trim();
  if (scene) {
    shots.push({
      duration: parseFloat(item.querySelector('.shot-duration').value),
      scene: scene
      // ❌ 忘略了 shot.image
    });
  }
});

// ✅ 正确：同时收集场景描述和参考图片
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
```

### 错误11: 后端未收集镜头图片 ⭐ 新增
```javascript
// ❌ 错误：只使用全局 images 参数
async createStoryboardVideo(options) {
  const { shots, images = [] } = options;

  const body = {
    model,
    prompt,
    images: images,  // ❌ 忽略了每个镜头的图片
    watermark,
    private: isPrivate,
  };
}

// ✅ 正确：收集所有镜头的参考图片
async createStoryboardVideo(options) {
  const { shots, images = [] } = options;

  // 收集所有镜头的参考图片 ⭐ 关键实现
  const allImages = [...images];
  shots.forEach((shot) => {
    if (shot.image) {
      allImages.push(shot.image);
    }
  });

  const body = {
    model,
    prompt,
    images: allImages,  // ✅ 使用合并后的图片数组
    watermark,
    private: isPrivate,
  };
}
```

### 错误12: 提示词与图片内容无关 ⭐ 新增
```javascript
// ❌ 错误：使用通用提示词，未描述图片内容
const prompt = '一个可爱的猫咪在花园里玩耍，阳光明媚';
// 问题：图片是卡通垃圾车，但提示词描述的是猫咪

// ✅ 正确：先分析图片，再写相关提示词
// 图片内容：黄色车头、绿色车身、可爱表情、城市街道、卡通风格
const prompt = '一辆卡通风格的垃圾车在城市街道上行驶，黄色车头、绿色车身，' +
               '车头有可爱的表情（大眼睛、微笑、腮红），车斗通过机械臂抬起正在作业，' +
               '晴朗天气，卡通插画风格';

// 提示词结构建议：
// 1. 主体：画面中的主要角色/物体
// 2. 外观：颜色、形状、表情、姿态
// 3. 动作：正在做什么
// 4. 环境：背景场景、周围物体
// 5. 氛围：光线、色调、风格
```

### 历史记录删除功能 ⭐ 新增

**后端 API 实现**:
```javascript
// ✅ 正确：删除单条历史记录
app.delete('/api/history/:taskId', (req, res) => {
  try {
    const { taskId } = req.params;
    const deleted = historyStorage.deleteRecord(taskId);
    res.json({ success: true, data: { deleted } });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ✅ 正确：清空所有历史记录
app.delete('/api/history/all', (req, res) => {
  try {
    historyStorage.clearAll();
    res.json({ success: true, data: { message: 'All records cleared' } });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});
```

**前端实现 - 删除单条记录**:
```javascript
// ✅ 正确：带确认对话框的删除
async function deleteHistoryRecord(taskId) {
  // 确认删除
  if (!confirm(`确定要删除这条历史记录吗？\n\n任务ID: ${taskId}`)) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/history/${taskId}`, {
      method: 'DELETE'
    });
    const result = await response.json();

    if (result.success) {
      alert('✅ 删除成功');
      // 重新加载历史记录
      loadHistory();
    } else {
      alert(`❌ 删除失败\n\n${result.error || '未知错误'}`);
    }
  } catch (error) {
    alert(`❌ 网络错误: ${error.message}`);
  }
}
```

**前端实现 - 清空全部**:
```javascript
// ✅ 正确：双重确认机制
async function clearAllHistory() {
  // 第一次确认
  if (!confirm('⚠️ 确定要清空所有历史记录吗？\n\n此操作不可恢复！')) {
    return;
  }

  // 第二次确认
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
      loadHistory();
    } else {
      alert(`❌ 清空失败\n\n${result.error || '未知错误'}`);
    }
  } catch (error) {
    alert(`❌ 网络错误: ${error.message}`);
  }
}
```

### 错误13: 删除操作缺少确认机制 ⭐ 新增
```javascript
// ❌ 错误：直接删除，没有确认
async function deleteHistoryRecord(taskId) {
  await fetch(`${API_BASE}/history/${taskId}`, {
    method: 'DELETE'
  });
  loadHistory();
}

// ✅ 正确：添加确认对话框
async function deleteHistoryRecord(taskId) {
  if (!confirm(`确定要删除这条历史记录吗？\n\n任务ID: ${taskId}`)) {
    return;
  }
  // ... 执行删除操作
}
```

**问题**: 用户可能误删重要数据
**解决方案**: 所有删除操作都必须有确认机制，清空全部需要二次确认

### 错误14: 删除后未刷新列表 ⭐ 新增
```javascript
// ❌ 错误：删除后不刷新列表
async function deleteHistoryRecord(taskId) {
  await fetch(`${API_BASE}/history/${taskId}`, {
    method: 'DELETE'
  });
  alert('删除成功');
  // ❌ 用户看不到删除效果
}

// ✅ 正确：删除后自动刷新
async function deleteHistoryRecord(taskId) {
  const response = await fetch(`${API_BASE}/history/${taskId}`, {
    method: 'DELETE'
  });
  const result = await response.json();

  if (result.success) {
    alert('✅ 删除成功');
    loadHistory(); // ✅ 重新加载列表
  }
}
```

### 角色搜索、筛选和收藏功能 ⭐ 新增

**后端存储 - updateByUsername 方法**:
```javascript
// character-storage.js - 按用户名更新角色
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

**后端 API - 收藏端点**:
```javascript
// index.js - 设置角色收藏状态
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

// 获取收藏的角色列表
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

**前端 - 角色网格加载（支持搜索和筛选）**:
```javascript
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

      // 渲染角色卡片...
    }
  } catch (error) {
    console.error('加载角色列表失败:', error);
  }
}
```

**前端 - 搜索和筛选事件监听**:
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
```

**前端 - 最近使用（localStorage）**:
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

// 选择角色时保存到最近使用
card.addEventListener('click', () => {
  selectCharacter(type, char.username, gridId);
  saveRecentCharacter(char.username); // ✅ 保存到最近使用
});
```

### 错误15: 使用 ID 而非 username 更新角色 ⭐ 新增
```javascript
// ❌ 错误：API 使用 username 作为参数，但存储用 ID 查找
app.put('/api/character/:username/favorite', (req, res) => {
  const { username } = req.params;
  // 使用 updateCharacter 按 ID 查找会失败
  const updated = characterStorage.updateCharacter(username, { favorite: true });
  // username 不等于 id，返回 null
});

// ✅ 正确：添加 updateByUsername 方法
// character-storage.js
updateByUsername(username, updates) {
  const index = this.characters.findIndex(c => c.username === username);
  if (index === -1) return null;

  Object.assign(this.characters[index], updates);
  this._save();
  return this.characters[index];
}

// index.js
app.put('/api/character/:username/favorite', (req, res) => {
  const { username } = req.params;
  const updated = characterStorage.updateByUsername(username, { favorite: true });
  // ✅ 按 username 查找，正确更新
});
```

**问题**: 角色 API 端点使用 `username` 作为路径参数，但存储层使用 `id` 查找，导致更新失败
**解决方案**: 添加 `updateByUsername` 方法，或在 API 中先通过 username 查找 id 再更新

### 错误16: React Flow 节点间数据传递错误 ⭐ 更新 (2026-01-01)

**问题诊断**:
1. **App.jsx 数据传递陷阱**: useEffect 只监听 edges，不监听 nodes，导致节点内部状态变化不传递到目标节点
2. **useEffect 无限循环**: 依赖数组包含 nodes，导致重复渲染
3. **节点 ID 缺失**: data 对象不包含 id，必须使用 useNodeId()

**错误示例**:
useEffect(() => {
  setNodes((nds) =>
    nds.map((node) => {
      // 更新节点数据...
      return { ...node, data: newData };
    })
  );
}, [edges, nodes, setNodes]); // ❌ nodes 在依赖中会导致无限循环

// ✅ 正确：移除 nodes 依赖（函数式更新会自动获取最新值）
useEffect(() => {
  setNodes((nds) =>
    nds.map((node) => {
      // 更新节点数据...
      return { ...node, data: newData };
    })
  );
}, [edges, setNodes]); // ✅ 只依赖 edges 和 setNodes
```

```javascript
// ❌ 错误：尝试从 data 对象获取节点 ID
function VideoGenerateNode({ data }) {
  const handleGenerate = async () => {
    // 派发事件
    window.dispatchEvent(new CustomEvent('video-task-created', {
      detail: { sourceNodeId: data.id, taskId: id } // ❌ data.id 是 undefined
    }));
  };
}
// React Flow 的 data 只包含自定义数据，不包含节点的 id

// ✅ 正确：使用 useNodeId() Hook 获取节点 ID
import { useNodeId } from 'reactflow';

function VideoGenerateNode({ data }) {
  const nodeId = useNodeId(); // ✅ 获取当前节点的 ID

  const handleGenerate = async () => {
    window.dispatchEvent(new CustomEvent('video-task-created', {
      detail: { sourceNodeId: nodeId, taskId: id } // ✅ 使用 nodeId
    }));
  };
}
```

```javascript
// ❌ 错误：TaskResultNode 尝试从 connectedSourceNode 获取 taskId
function TaskResultNode({ data }) {
  const [taskId, setTaskId] = useState(data.taskId || null);

  useEffect(() => {
    // 尝试从连接的源节点获取 taskId
    const nodes = getNodes();
    const edges = getEdges();
    const incomingEdge = edges.find(e => e.target === data.id);
    const sourceNode = nodes.find(n => n.id === incomingEdge.source);

    if (sourceNode?.data?.taskId) {
      setTaskId(sourceNode.data.taskId);
    }
  }, []);
  // ❌ 问题：getNodes() 返回的节点数据可能不是最新的
  // VideoGenerateNode 调用 setNodes() 更新后，getNodes() 可能返回旧数据
}

// ✅ 正确：使用事件系统监听 taskId 更新
function VideoGenerateNode({ data }) {
  const nodeId = useNodeId();

  const handleGenerate = async () => {
    // ... 创建视频成功后 ...
    const id = result.data.id || result.data.task_id;

    // 派发事件
    window.dispatchEvent(new CustomEvent('video-task-created', {
      detail: { sourceNodeId: nodeId, taskId: id }
    }));
  };
}

function TaskResultNode({ data }) {
  const [taskId, setTaskId] = useState(data.taskId || null);

  useEffect(() => {
    // 监听事件
    const handleVideoCreated = (event) => {
      const { sourceNodeId, taskId: newTaskId } = event.detail;
      // 检查是否连接到源节点
      if (data.connectedSourceId === sourceNodeId && newTaskId) {
        setTaskId(newTaskId);
      }
    };

    window.addEventListener('video-task-created', handleVideoCreated);
    return () => window.removeEventListener('video-task-created', handleVideoCreated);
  }, [data.connectedSourceId]);
}
```

**问题**:
1. useEffect 依赖数组包含 nodes 会导致无限循环（setNodes 更新 nodes → 触发 useEffect → 再次 setNodes → ...）
2. React Flow 的 data 对象不包含节点 id
3. 使用 getNodes() 获取的数据可能是旧的，因为 setNodes() 是异步批处理更新

**解决方案**:
1. **源节点直接更新目标节点** ⭐ 核心方案（绕过 App.jsx）
2. 从依赖数组移除 nodes，使用函数式更新自动获取最新值
3. 使用 useNodeId() Hook 获取节点 ID
4. 使用自定义事件系统在节点间传递异步数据（taskId）

**源节点直接更新目标节点的正确模式** ⭐ 2026-01-01 新增:
```javascript
// CharacterLibraryNode.jsx - 源节点直接更新目标节点
useEffect(() => {
  if (nodeId) {
    const edges = getEdges();
    const outgoingEdges = edges.filter(e => e.source === nodeId);
    const characterObjects = characters.filter(c => selectedCharacters.has(c.id));

    // ⭐ 一次 setNodes() 调用同时更新自己和目标节点
    setNodes((nds) =>
      nds.map((node) => {
        // 更新自己的状态
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              selectedCharacters: Array.from(selectedCharacters),
              connectedCharacters: characterObjects
            }
          };
        }

        // ⭐ 直接更新目标节点（绕过 App.jsx 的数据流）
        const isConnected = outgoingEdges.some(e => e.target === node.id);
        if (isConnected) {
          return {
            ...node,
            data: {
              ...node.data,
              connectedCharacters: characterObjects
            }
          };
        }

        return node;
      })
    );
  }
}, [selectedCharacters, nodeId, setNodes, characters, getEdges]);
```

**关键点**:
- 使用 `getEdges()` 找到连接的目标节点
- 一次 `setNodes()` 调用更新多个节点
- 避免 App.jsx 的 useEffect 只监听 edges 的陷阱
- 精确的依赖数组避免无限循环

### 错误17: API 端点路径缺少前缀 ⭐ 新增
```javascript
// ❌ 错误：API 路径缺少 /api/ 前缀
const response = await fetch(`${API_BASE}/task/${taskId}?platform=juxin`);
// 返回 404 Not Found - 端点不存在
```

```javascript
// ✅ 正确：使用完整的 API 路径
const response = await fetch(`${API_BASE}/api/task/${taskId}?platform=juxin`);
// 返回 200 OK - 成功获取任务状态
```

**问题**: 前端调用后端 API 时路径不完整，缺少 `/api/` 前缀，导致 404 错误
**解决方案**: 所有 API 调用必须包含完整路径 `/api/{endpoint}`
**影响范围**: TaskResultNode.jsx 中的轮询和手动刷新函数
**修复日期**: 2025-12-30

### 工作流存储管理 ⭐ 新增

**WorkflowStorage 工具类**:
```javascript
// src/client/src/utils/workflowStorage.js
export class WorkflowStorage {
  static STORAGE_KEY = 'winjin-workflows';
  static CURRENT_WORKFLOW_KEY = 'winjin-current-workflow';

  // 获取所有已保存的工作流
  static getAllWorkflows() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  }

  // 保存工作流
  static saveWorkflow(name, nodes, edges, description = '') {
    const workflows = this.getAllWorkflows();
    workflows[name] = {
      name,
      description,
      nodes,
      edges,
      updatedAt: new Date().toISOString(),
      createdAt: workflows[name]?.createdAt || new Date().toISOString(),
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(workflows));
    localStorage.setItem(this.CURRENT_WORKFLOW_KEY, name);
    return { success: true, data: workflows[name] };
  }

  // 加载工作流
  static loadWorkflow(name) {
    const workflows = this.getAllWorkflows();
    const workflow = workflows[name];
    if (!workflow) {
      return { success: false, error: 'Workflow not found' };
    }
    localStorage.setItem(this.CURRENT_WORKFLOW_KEY, name);
    return { success: true, data: workflow };
  }

  // 删除工作流
  static deleteWorkflow(name) {
    const workflows = this.getAllWorkflows();
    if (!workflows[name]) {
      return { success: false, error: 'Workflow not found' };
    }
    delete workflows[name];
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(workflows));

    // 如果删除的是当前工作流，清除标记
    const current = localStorage.getItem(this.CURRENT_WORKFLOW_KEY);
    if (current === name) {
      localStorage.removeItem(this.CURRENT_WORKFLOW_KEY);
    }
    return { success: true };
  }

  // 导出工作流为 JSON 文件
  static exportWorkflow(name) {
    const workflows = this.getAllWorkflows();
    const workflow = workflows[name];
    if (!workflow) {
      return { success: false, error: 'Workflow not found' };
    }

    const blob = new Blob([JSON.stringify(workflow, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-${name}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { success: true };
  }

  // 从 JSON 文件导入工作流
  static async importWorkflow(file) {
    const text = await file.text();
    const workflow = JSON.parse(text);

    if (!workflow.name || !workflow.nodes || !workflow.edges) {
      return { success: false, error: 'Invalid workflow file format' };
    }

    // 重命名以避免冲突
    const workflows = this.getAllWorkflows();
    let name = workflow.name;
    let counter = 1;
    while (workflows[name]) {
      name = `${workflow.name} (${counter})`;
      counter++;
    }

    return this.saveWorkflow(name, workflow.nodes, workflow.edges, workflow.description);
  }
}
```

**React 组件中使用 WorkflowStorage**:
```javascript
// App.jsx - 工作流状态管理
const [currentWorkflowName, setCurrentWorkflowName] = useState(() =>
  WorkflowStorage.getCurrentWorkflowName()
);
const [showWorkflowList, setShowWorkflowList] = useState(false);
const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
const [saveAsName, setSaveAsName] = useState('');
const [saveAsDescription, setSaveAsDescription] = useState('');

// 保存工作流
const handleSaveWorkflow = () => {
  if (currentWorkflowName) {
    WorkflowStorage.saveWorkflow(currentWorkflowName, nodes, edges);
    alert(`✅ 工作流 "${currentWorkflowName}" 已保存`);
  } else {
    setShowSaveAsDialog(true);
  }
};

// 另存为工作流
const confirmSaveAs = () => {
  const name = saveAsName.trim();
  if (!name) {
    alert('请输入工作流名称');
    return;
  }
  const result = WorkflowStorage.saveWorkflow(
    name, nodes, edges, saveAsDescription
  );
  if (result.success) {
    setCurrentWorkflowName(name);
    setSaveAsName('');
    setSaveAsDescription('');
    setShowSaveAsDialog(false);
    alert(`✅ 工作流 "${name}" 已保存`);
  }
};

// 加载工作流
const handleLoadWorkflow = (name) => {
  const result = WorkflowStorage.loadWorkflow(name);
  if (result.success) {
    const { nodes: savedNodes, edges: savedEdges } = result.data;
    setNodes(savedNodes);
    setEdges(savedEdges);
    setCurrentWorkflowName(name);

    // 更新 nextNodeId
    if (savedNodes.length > 0) {
      const maxId = Math.max(...savedNodes.map(n => parseInt(n.id) || 0));
      setNextNodeId(maxId + 1);
    } else {
      setNextNodeId(10);
    }
  }
};

// 删除工作流
const handleDeleteWorkflow = (name) => {
  if (!confirm(`确定要删除工作流 "${name}" 吗？此操作不可恢复。`)) {
    return;
  }
  const result = WorkflowStorage.deleteWorkflow(name);
  if (result.success) {
    if (currentWorkflowName === name) {
      setCurrentWorkflowName(null);
    }
    alert(`✅ 工作流 "${name}" 已删除`);
  }
};
```

### 剪贴板复制功能 ⭐ 新增

**复制到剪贴板（带旧浏览器降级）**:
```javascript
// TaskResultNode.jsx - 复制 TaskId 和视频 URL
const copyToClipboard = async (text, type) => {
  try {
    // 优先使用现代 clipboard API
    await navigator.clipboard.writeText(text);
    setCopySuccess(type);
    setTimeout(() => setCopySuccess(null), 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
    // 降级方案: execCommand (兼容旧浏览器)
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    setCopySuccess(type);
    setTimeout(() => setCopySuccess(null), 2000);
  }
};

// 使用示例
<button onClick={() => copyToClipboard(taskId, 'taskId')}>
  {copySuccess === 'taskId' ? '✓ 已复制' : '📋 复制'}
</button>
```

### 视频生成节点参数配置 ⭐ 更新

**VideoGenerateNode - 时长和比例配置**:
```javascript
// ✅ 正确: 时长为数字类型，移除 1:1 比例
const [config, setConfig] = useState({
  model: 'Sora-2',
  duration: 10,  // 数字类型: 5, 10, 15, 25
  aspect: '16:9', // 仅 16:9 或 9:16
  watermark: false,
});

// API 调用时转换为小写
const payload = {
  platform: 'juxin',
  model: config.model.toLowerCase(),  // Sora-2 -> sora-2
  prompt: finalPrompt,
  duration: config.duration,          // 数字类型
  aspect_ratio: config.aspect,
  watermark: config.watermark,
};
```

### 角色引用实现 ⭐ 更新

**设计理念**：完全复刻网页版的角色调用方式，灵活自由

**CharacterLibraryNode - 多选初筛**:
```javascript
import { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow, useNodeId } from 'reactflow';

function CharacterLibraryNode({ data }) {
  const nodeId = useNodeId();
  const { setNodes, getNodes, getEdges } = useReactFlow();

  // 模式切换：transfer（传送到视频节点） | manage（批量删除）
  const [selectionMode, setSelectionMode] = useState('transfer');
  const [selectedCharacters, setSelectedCharacters] = useState(new Set());
  const [charactersList, setCharactersList] = useState([]);

  // 传递选中的角色到视频节点
  useEffect(() => {
    data.selectedCharacters = Array.from(selectedCharacters);

    if (selectedCharacters.size > 0 && nodeId) {
      const edges = getEdges();
      const outgoingEdges = edges.filter(e => e.source === nodeId);

      // 获取选中的角色完整对象
      const characterObjects = charactersList.filter(c =>
        selectedCharacters.has(c.id)
      );

      setNodes((nds) =>
        nds.map((node) => {
          const isConnected = outgoingEdges.some(e => e.target === node.id);
          if (isConnected) {
            return {
              ...node,
              data: {
                ...node.data,
                connectedCharacters: characterObjects
              }
            };
          }
          return node;
        })
      );
    }
  }, [selectedCharacters, data, nodeId, getEdges, getNodes, setNodes]);

  // 切换角色选择状态
  const toggleCharacterSelection = (characterId) => {
    const newSelected = new Set(selectedCharacters);
    if (newSelected.has(characterId)) {
      newSelected.delete(characterId);
    } else {
      newSelected.add(characterId);
    }
    setSelectedCharacters(newSelected);
  };

  // 根据模式决定点击行为
  const handleCharacterClick = (char) => {
    if (selectionMode === 'transfer') {
      // 多选模式：切换选中状态
      toggleCharacterSelection(char.id);
    } else {
      // 管理模式：不处理，等待双击编辑
    }
  };

  // 渲染角色卡片
  return (
    <div style={{ padding: '10px' }}>
      {/* 模式切换按钮 */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
        <button
          onClick={() => setSelectionMode('transfer')}
          style={{
            flex: 1,
            padding: '4px',
            fontSize: '10px',
            backgroundColor: selectionMode === 'transfer' ? '#10b981' : '#e5e7eb',
            color: selectionMode === 'transfer' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          📤 传送到视频节点
        </button>
        <button
          onClick={() => setSelectionMode('manage')}
          style={{
            flex: 1,
            padding: '4px',
            fontSize: '10px',
            backgroundColor: selectionMode === 'manage' ? '#f59e0b' : '#e5e7eb',
            color: selectionMode === 'manage' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          🗑️ 批量删除
        </button>
      </div>

      {/* 角色网格 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
        {charactersList.map((char) => (
          <div
            key={char.id}
            onClick={() => handleCharacterClick(char)}
            onDoubleClick={() => selectionMode === 'manage' && openEditDialog(char)}
            style={{
              padding: '6px',
              backgroundColor: selectionMode === 'transfer' && selectedCharacters.has(char.id)
                ? '#d1fae5'
                : 'white',
              borderRadius: '4px',
              border: selectionMode === 'transfer' && selectedCharacters.has(char.id)
                ? '2px solid #10b981'
                : '1px solid #a5f3fc',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            {/* 选中标识 */}
            {selectionMode === 'transfer' && selectedCharacters.has(char.id) && (
              <div style={{
                position: 'absolute',
                top: '2px',
                left: '2px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
              }}>
                ✓
              </div>
            )}

            {/* 角色内容 */}
            <img src={char.profilePictureUrl} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
            <div style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '4px' }}>
              {char.alias || char.username}
            </div>
            {char.alias && (
              <div style={{ fontSize: '8px', color: '#6b7280' }}>
                @{char.username}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**VideoGenerateNode - 点击插入角色**:
```javascript
import { useState, useEffect, useRef } from 'react';
import { Handle, Position, useNodeId } from 'reactflow';

function VideoGenerateNode({ data }) {
  const nodeId = useNodeId();
  const promptInputRef = useRef(null);

  // 状态管理
  const [connectedCharacters, setConnectedCharacters] = useState([]);
  const [manualPrompt, setManualPrompt] = useState('');
  const [status, setStatus] = useState('idle');

  // 从连接的节点获取角色数据
  useEffect(() => {
    if (data.connectedCharacters) {
      setConnectedCharacters(data.connectedCharacters);
    }
  }, [data.connectedCharacters]);

  // 在光标位置插入角色引用
  const insertCharacterAtCursor = (username) => {
    const promptElement = promptInputRef.current;
    if (!promptElement) return;

    // 获取光标位置
    const start = promptElement.selectionStart;
    const end = promptElement.selectionEnd;
    const text = manualPrompt;
    const refText = `@${username} `;

    // 在光标位置插入
    const newText = text.substring(0, start) + refText + text.substring(end);
    setManualPrompt(newText);

    // 移动光标到插入内容之后
    setTimeout(() => {
      promptElement.setSelectionRange(start + refText.length, start + refText.length);
      promptElement.focus();
    }, 0);
  };

  // 生成视频
  const handleGenerate = async () => {
    if (!manualPrompt.trim()) {
      setError('请输入提示词');
      return;
    }

    setStatus('generating');

    // 直接使用 manualPrompt，不做任何自动组装
    const response = await fetch(`${API_BASE}/api/video/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'juxin',
        model: 'sora-2-all',  // ⭐ 聚鑫平台使用 sora-2-all (2026-01-02 更新)
        prompt: manualPrompt,
        duration: 10,
        aspect_ratio: '16:9',
        watermark: false,
      }),
    });

    const result = await response.json();
    if (result.success) {
      const taskId = result.data.id || result.data.task_id;
      setTaskId(taskId);
      setStatus('success');

      // 派发事件
      window.dispatchEvent(new CustomEvent('video-task-created', {
        detail: { sourceNodeId: nodeId, taskId }
      }));
    } else {
      setStatus('error');
      setError(result.error || '生成失败');
    }
  };

  return (
    <div style={{ padding: '10px 15px', border: '2px solid #10b981', borderRadius: '8px' }}>
      {/* 输入端口 */}
      <Handle type="target" position={Position.Left} id="prompt-input" />
      <Handle type="target" position={Position.Left} id="character-input" />
      <Handle type="target" position={Position.Left} id="images-input" />

      {/* 候选角色显示 */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 'bold',
          color: '#059669',
          marginBottom: '4px',
        }}>
          📊 候选角色 (点击插入到光标位置)
        </div>

        {connectedCharacters.length > 0 ? (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {connectedCharacters.map((char) => (
              <div
                key={char.id}
                onClick={() => insertCharacterAtCursor(char.username)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#ecfdf5',
                  borderRadius: '4px',
                  border: '1px solid #6ee7b7',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'background 0.2s',
                }}
                title="点击插入到光标位置"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d1fae5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ecfdf5'}
              >
                <img
                  src={char.profilePictureUrl}
                  alt=""
                  style={{ width: '20px', height: '20px', borderRadius: '50%' }}
                />
                <span style={{ fontSize: '10px', color: '#047857' }}>
                  {char.alias || char.username}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            padding: '6px',
            backgroundColor: '#fef3c7',
            borderRadius: '4px',
            fontSize: '10px',
            color: '#92400e',
            textAlign: 'center'
          }}>
            💡 提示：连接角色库节点并选择角色后，点击角色卡片插入
          </div>
        )}
      </div>

      {/* 提示词输入框 */}
      <textarea
        ref={promptInputRef}
        value={manualPrompt}
        onChange={(e) => setManualPrompt(e.target.value)}
        placeholder="输入提示词，点击上方角色卡片插入 @username 引用..."
        disabled={status === 'generating'}
        style={{
          width: '100%',
          minHeight: '80px',
          padding: '6px 8px',
          borderRadius: '4px',
          border: '1px solid #6ee7b7',
          fontSize: '11px',
          fontFamily: 'monospace',
          marginBottom: '8px',
          resize: 'vertical',
        }}
      />

      {/* 最终提示词预览 */}
      {manualPrompt && (
        <div style={{
          padding: '6px 8px',
          backgroundColor: '#f0fdf4',
          borderRadius: '4px',
          marginBottom: '8px',
          fontSize: '10px',
          color: '#166534',
          fontStyle: 'italic',
          border: '1px dashed #6ee7b7',
        }}>
          📤 最终提示词: {manualPrompt}
        </div>
      )}

      {/* 生成按钮 */}
      <button
        onClick={handleGenerate}
        disabled={status === 'generating'}
        style={{
          width: '100%',
          padding: '8px',
          backgroundColor: status === 'generating' ? '#9ca3af' : '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: status === 'generating' ? 'not-allowed' : 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
        }}
      >
        {status === 'generating' ? '生成中...' : '生成视频'}
      </button>

      {/* 输出端口 */}
      <Handle type="source" position={Position.Right} id="video-output" />
    </div>
  );
}
```

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
useEffect(() => {
  if (data.connectedCharacters) {
    setConnectedCharacters(data.connectedCharacters);
  }
}, [data.connectedCharacters]);
```

**光标插入实现**:
```javascript
/**
 * 在光标位置插入角色引用
 * @param {string} username - 角色用户名
 */
const insertCharacterAtCursor = (username) => {
  const promptElement = promptInputRef.current;
  if (!promptElement) return;

  // 获取光标位置
  const start = promptElement.selectionStart;
  const end = promptElement.selectionEnd;
  const text = manualPrompt;
  const refText = `@${username} `;

  // 在光标位置插入
  const newText = text.substring(0, start) + refText + text.substring(end);
  setManualPrompt(newText);

  // 移动光标到插入内容之后
  setTimeout(() => {
    promptElement.setSelectionRange(start + refText.length, start + refText.length);
    promptElement.focus();
  }, 0);
};
```

**关键要点**:
1. ✅ 角色库节点做初筛，多选传递
2. ✅ 视频生成节点显示候选角色列表
3. ✅ 点击角色卡片在光标位置插入
4. ✅ 用户完全自由编辑提示词
5. ✅ 不做任何自动组装


```javascript
// ❌ 错误: 时长为字符串类型
const [config, setConfig] = useState({
  duration: '10',  // 字符串会导致 API 调用失败
});

// ❌ 错误: Sora2 不支持 1:1 比例
<select value={config.aspect}>
  <option value="1:1">1:1 正方形</option>  // 会导致 API 错误
</select>
```

### 错误18: localStorage 数据未验证 ⭐ 新增
```javascript
// ❌ 错误: 直接使用 localStorage 数据，未验证格式
const saved = localStorage.getItem('workflow-nodes');
const nodes = JSON.parse(saved);  // 可能损坏或格式不正确
setNodes(nodes);
```

```javascript
// ✅ 正确: 使用 try-catch 和默认值
const loadSavedWorkflow = () => {
  try {
    const saved = localStorage.getItem('workflow-nodes');
    if (saved) {
      const nodes = JSON.parse(saved);
      // 验证数据格式
      if (Array.isArray(nodes)) {
        return { nodes, edges: [] };
      }
    }
    return { nodes: [], edges: [] };
  } catch (error) {
    console.error('Failed to load saved workflow:', error);
    return { nodes: [], edges: [] };  // 返回安全的默认值
  }
};
```

**问题**: localStorage 数据可能损坏或格式不正确，直接使用会导致应用崩溃
**解决方案**: 使用 try-catch 捕获错误，并验证数据格式，返回安全的默认值

### 错误19: 导入工作流未验证 JSON 格式 ⭐ 新增
```javascript
// ❌ 错误: 未验证 JSON 格式直接使用
const importWorkflow = async (file) => {
  const text = await file.text();
  const workflow = JSON.parse(text);  // 可能格式不正确
  saveWorkflow(workflow.name, workflow.nodes, workflow.edges);
};
```

```javascript
// ✅ 正确: 验证必需字段
const importWorkflow = async (file) => {
  try {
    const text = await file.text();
    const workflow = JSON.parse(text);

    // 验证必需字段
    if (!workflow.name || !workflow.nodes || !workflow.edges) {
      return { success: false, error: 'Invalid workflow file format' };
    }

    // 验证数据类型
    if (!Array.isArray(workflow.nodes) || !Array.isArray(workflow.edges)) {
      return { success: false, error: 'Invalid data format' };
    }

    return saveWorkflow(workflow.name, workflow.nodes, workflow.edges);
  } catch (error) {
    return { success: false, error: 'Failed to parse JSON' };
  }
};
```

**问题**: 导入的 JSON 文件可能格式不正确，缺少必需字段
**解决方案**: 验证 name, nodes, edges 字段存在，并验证数据类型

### 错误20: React Flow Provider 未配置 ⭐ 新增
```javascript
// ❌ 错误: 未使用 ReactFlowProvider 包裹应用
// main.jsx
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />  // ❌ 缺少 Provider，会导致 useReactFlow Hook 失败
  </StrictMode>,
);
```

```javascript
// ✅ 正确: 使用 ReactFlowProvider 包裹应用
import { ReactFlowProvider } from 'reactflow';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ReactFlowProvider>
      <App />  // ✅ useReactFlow 可以正常使用
    </ReactFlowProvider>
  </StrictMode>,
);
```

**问题**: React Flow 的 `useReactFlow` Hook 必须在 Provider 内部使用，否则会报错
**解决方案**: 在 `main.jsx` 中使用 `ReactFlowProvider` 包裹整个应用

### 错误21: 节点变量重复声明 ⭐ 新增
```javascript
// ❌ 错误: 同一作用域内重复声明 characterEdge
useEffect(() => {
  setNodes((nds) =>
    nds.map((node) => {
      const incomingEdges = edges.filter((e) => e.target === node.id);

      // 第一次声明
      const characterEdge = incomingEdges.find((e) => e.targetHandle === 'character-input');
      if (characterEdge) {
        newData.connectedCharacter = sourceNode.data.selectedCharacter;
      }

      // ... 其他代码 ...

      // 第二次声明 ❌ 导致编译错误 "Identifier 'characterEdge' has already been declared"
      const characterEdge = incomingEdges.find((e) => e.targetHandle === 'character-input');
      if (characterEdge) {
        newData.connectedSourceId = characterEdge.source;
      }

      return { ...node, data: newData };
    })
  );
}, [edges, setNodes]);
```

```javascript
// ✅ 正确: 合并逻辑，只声明一次
useEffect(() => {
  setNodes((nds) =>
    nds.map((node) => {
      const incomingEdges = edges.filter((e) => e.target === node.id);

      // 只声明一次，处理所有逻辑
      const characterEdge = incomingEdges.find((e) => e.targetHandle === 'character-input');
      if (characterEdge) {
        const sourceNode = nds.find((n) => n.id === characterEdge.source);

        // 视频生成节点: 获取角色
        if (sourceNode?.data?.selectedCharacter) {
          newData.connectedCharacter = sourceNode.data.selectedCharacter;
        }

        // 角色结果节点: 存储连接源 ID
        if (node.type === 'characterResultNode') {
          newData.connectedSourceId = characterEdge.source;
        }
      }

      return { ...node, data: newData };
    })
  );
}, [edges, setNodes]);
```

**问题**: 同一变量在同一作用域内重复声明会导致 Babel 编译错误
**解决方案**: 合并相关逻辑，使用条件分支处理不同场景

### 错误22: 右键删除节点逻辑错误 ⭐ 新增
```javascript
// ❌ 错误: 右键删除时删除了所有选中节点，而不是右键点击的节点
const ContextMenu = ({ node, onDelete }) => {
  const handleDelete = () => {
    deleteSelectedNodes();  // ❌ 删除所有选中的节点
    setContextMenu(null);
  };

  return (
    <div>
      <button onClick={handleDelete}>🗑️ 删除节点</button>
    </div>
  );
};
```

```javascript
// ✅ 正确: 删除右键点击的特定节点
const deleteNode = useCallback((nodeToDelete) => {
  setNodes((nds) => nds.filter((node) => node.id !== nodeToDelete.id));
  setEdges((eds) => eds.filter((edge) =>
    edge.source !== nodeToDelete.id && edge.target !== nodeToDelete.id
  ));
  setContextMenu(null);
}, [setNodes, setEdges]);

const ContextMenu = ({ node, onDelete }) => {
  return (
    <div>
      <button onClick={() => deleteNode(contextMenu.node)}>🗑️ 删除节点</button>
    </div>
  );
};
```

**问题**: 用户期望右键删除只删除右键点击的那个节点，而不是所有选中的节点
**解决方案**: 创建 `deleteNode` 函数，通过节点 ID 精确删除单个节点

### 角色库管理功能 ⭐ 新增

**删除单个角色**:
```javascript
// CharacterLibraryNode.jsx - 删除单个角色
const deleteCharacter = async (characterId) => {
  try {
    const response = await fetch(`${API_BASE}/api/character/${characterId}`, {
      method: 'DELETE'
    });
    const result = await response.json();
    if (result.success) {
      await loadCharacters(); // 重新加载角色列表
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to delete character:', error);
    return false;
  }
};

// 删除确认对话框
const confirmDelete = (character) => {
  setCharacterToDelete(character);
  setShowConfirmDialog(true);
};

const executeDelete = async () => {
  if (characterToDelete) {
    const success = await deleteCharacter(characterToDelete.id);
    if (success) {
      alert('✅ 角色已删除');
      setShowConfirmDialog(false);
      setCharacterToDelete(null);
    } else {
      alert('❌ 删除失败');
    }
  }
};
```

**批量删除角色**:
```javascript
// CharacterLibraryNode.jsx - 批量删除
const deleteBatchCharacters = async (characterIds) => {
  try {
    // 并发调用删除 API
    const promises = characterIds.map(id =>
      fetch(`${API_BASE}/api/character/${id}`, { method: 'DELETE' })
    );
    await Promise.all(promises);
    await loadCharacters(); // 重新加载角色列表
    return true;
  } catch (error) {
    console.error('Failed to delete characters:', error);
    return false;
  }
};

const deleteSelected = async () => {
  if (selectedCharacters.size === 0) {
    alert('请先选择要删除的角色');
    return;
  }

  if (!confirm(`确定要删除选中的 ${selectedCharacters.size} 个角色吗？`)) {
    return;
  }

  const success = await deleteBatchCharacters(Array.from(selectedCharacters));
  if (success) {
    alert(`✅ 已删除 ${selectedCharacters.size} 个角色`);
    setSelectedCharacters(new Set());
    setBatchMode(false);
  } else {
    alert('❌ 删除失败');
  }
};
```

**编辑角色别名**:
```javascript
// CharacterLibraryNode.jsx - 编辑别名
const updateAlias = async (characterId, newAlias) => {
  try {
    const response = await fetch(`${API_BASE}/api/character/${characterId}/alias`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alias: newAlias })
    });
    const result = await response.json();
    if (result.success) {
      await loadCharacters(); // 重新加载角色列表
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to update alias:', error);
    return false;
  }
};

const saveAlias = async () => {
  if (editingCharacter) {
    const success = await updateAlias(editingCharacter.id, editAlias);
    if (success) {
      closeEditDialog();
      alert('✅ 别名已更新');
    } else {
      alert('❌ 更新失败');
    }
  }
};
```

**批量选择模式**:
```javascript
// CharacterLibraryNode.jsx - 批量选择状态管理
const [batchMode, setBatchMode] = useState(false);
const [selectedCharacters, setSelectedCharacters] = useState(new Set());

// 切换批量模式
const toggleBatchMode = () => {
  setBatchMode(!batchMode);
  setSelectedCharacters(new Set()); // 清空选择
};

// 切换角色选择
const toggleCharacterSelection = (characterId) => {
  const newSelected = new Set(selectedCharacters);
  if (newSelected.has(characterId)) {
    newSelected.delete(characterId);
  } else {
    newSelected.add(characterId);
  }
  setSelectedCharacters(newSelected);
};

// 全选/取消全选
const toggleSelectAll = () => {
  if (selectedCharacters.size === filteredCharacters.length) {
    setSelectedCharacters(new Set()); // 取消全选
  } else {
    setSelectedCharacters(new Set(filteredCharacters.map(c => c.id))); // 全选
  }
};
```

**UI 实现细节**:
```javascript
// 批量模式按钮
<button onClick={toggleBatchMode} style={{
  flex: 1,
  padding: '4px',
  fontSize: '10px',
  backgroundColor: batchMode ? '#f59e0b' : '#e5e7eb',
  color: 'white',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
}}>
  {batchMode ? '✓ 批量模式' : '批量操作'}
</button>

// 角色卡片 - 点击行为
<div
  onClick={() => batchMode ? toggleCharacterSelection(char.id) : openEditDialog(char)}
  style={{
    padding: '6px',
    backgroundColor: batchMode && selectedCharacters.has(char.id) ? '#fef3c7' : 'white',
    borderRadius: '4px',
    border: batchMode && selectedCharacters.has(char.id) ? '2px solid #f59e0b' : '1px solid #a5f3fc',
    cursor: 'pointer',
    position: 'relative',
  }}
>
  {/* 批量模式 - 复选框 */}
  {batchMode && (
    <div style={{
      position: 'absolute',
      top: '4px',
      right: '4px',
      width: '14px',
      height: '14px',
      borderRadius: '2px',
      border: '1px solid #d1d5db',
      backgroundColor: selectedCharacters.has(char.id) ? '#f59e0b' : 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '10px',
      color: selectedCharacters.has(char.id) ? 'white' : '#9ca3af',
    }}>
      {selectedCharacters.has(char.id) ? '✓' : ''}
    </div>
  )}

  {/* 非批量模式 - 删除按钮（hover 显示） */}
  {!batchMode && (
    <button
      onClick={(e) => {
        e.stopPropagation();
        confirmDelete(char);
      }}
      style={{
        position: 'absolute',
        top: '2px',
        right: '2px',
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        border: 'none',
        cursor: 'pointer',
        fontSize: '10px',
        opacity: '0',
        transition: 'opacity 0.2s',
      }}
      title="删除角色"
      onMouseEnter={(e) => e.target.style.opacity = '1'}
      onMouseLeave={(e) => e.target.style.opacity = '0'}
    >
      ✕
    </button>
  )}

  {/* 角色内容 */}
  <img src={char.profilePictureUrl} alt={char.username} style={{...}} />
  <div>{char.alias || char.username}</div>
</div>
```

### 错误23: 删除操作未重新加载列表 ⭐ 新增
```javascript
// ❌ 错误：删除后不刷新列表
async function deleteCharacter(characterId) {
  const response = await fetch(`${API_BASE}/api/character/${characterId}`, {
    method: 'DELETE'
  });
  alert('删除成功');
  // ❌ 用户看不到删除效果
}

// ✅ 正确：删除后重新加载列表
async function deleteCharacter(characterId) {
  const response = await fetch(`${API_BASE}/api/character/${characterId}`, {
    method: 'DELETE'
  });
  const result = await response.json();

  if (result.success) {
    alert('✅ 角色已删除');
    await loadCharacters(); // ✅ 重新加载列表
  }
}
```

**问题**: 删除操作后列表未刷新，用户看不到变化
**解决方案**: 删除成功后必须重新加载数据列表

---

### 角色引用双显示功能 ⭐ 新增

**功能描述**: 输入框显示别名（便于用户阅读），API使用真实ID（用于角色引用）

```javascript
// VideoGenerateNode.jsx - 角色引用双显示实现
function VideoGenerateNode({ data }) {
  const [connectedCharacters, setConnectedCharacters] = useState([]);
  const [manualPrompt, setManualPrompt] = useState('');

  // ⭐ 创建用户名到别名的映射
  const usernameToAlias = React.useMemo(() => {
    const map = {};
    connectedCharacters.forEach(char => {
      map[char.username] = char.alias || char.username;
    });
    return map;
  }, [connectedCharacters]);

  // ⭐ 将真实提示词转换为显示提示词（用户看：别名）
  const realToDisplay = (text) => {
    if (!text) return '';
    let result = text;
    Object.entries(usernameToAlias).forEach(([username, alias]) => {
      const regex = new RegExp(`@${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      result = result.replace(regex, `@${alias}`);
    });
    return result;
  };

  // ⭐ 将显示提示词转换为真实提示词（API用：真实ID）
  const displayToReal = (text) => {
    if (!text) return '';
    let result = text;
    // 按最长匹配优先排序，避免部分匹配
    const sortedAliases = Object.entries(usernameToAlias)
      .sort((a, b) => b[1].length - a[1].length);

    sortedAliases.forEach(([username, alias]) => {
      // ⚠️ 关键：使用 (?=\s|$|@) 而不是 \b，支持中文
      const regex = new RegExp(`@${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|@)`, 'g');
      result = result.replace(regex, `@${username}`);
    });
    return result;
  };

  // ⭐ 在光标位置插入角色引用
  const insertCharacterAtCursor = (username, alias) => {
    const promptElement = promptInputRef.current;
    if (!promptElement) return;

    const start = promptElement.selectionStart;
    const end = promptElement.selectionEnd;
    const displayText = realToDisplay(manualPrompt);
    const refText = `@${alias} `; // 插入别名到显示位置

    const newDisplayText = displayText.substring(0, start) + refText + displayText.substring(end);
    const newRealText = displayToReal(newDisplayText); // 转换回真实ID并存储
    setManualPrompt(newRealText);

    setTimeout(() => {
      promptElement.setSelectionRange(start + refText.length, start + refText.length);
      promptElement.focus();
    }, 0);
  };

  return (
    <div>
      {/* 输入框显示别名 */}
      <textarea
        value={realToDisplay(manualPrompt)}
        onChange={(e) => {
          const realText = displayToReal(e.target.value);
          setManualPrompt(realText);
        }}
      />

      {/* 最终提示词预览显示真实ID */}
      {manualPrompt && (
        <div>
          📤 最终提示词 (API): {manualPrompt}
        </div>
      )}

      {/* 提示信息 */}
      <div>💡 输入框显示别名，API使用真实ID</div>
    </div>
  );
}
```

**使用示例**:
```javascript
// 用户在输入框看到和输入：
textarea value = "@阳光小猫 和@测试小猫 在海边玩"

// 内部存储（manualPrompt）和API接收：
manualPrompt = "@5562be00d.sunbeamkit 和@ebfb9a758.sunnykitte 在海边玩"

// 测试验证：
// ✅ @测试小猫 → @ebfb9a758.sunnykitte
// ✅ @装载机 → @783316a1d.diggyloade
// ✅ 视频生成成功: video_399a3462-9eff-4d2a-a11d-910dcc7838e6
```

### 错误24: 正则表达式 \b 不支持中文 ⭐ 新增
```javascript
// ❌ 错误：使用 \b 单词边界无法匹配中文
const displayToReal = (text) => {
  const regex = new RegExp(`@阳光小猫\\b`, 'g');
  // 问题：\b 在 "阳光小猫 " 后无法匹配（中文不是单词字符）
  return text.replace(regex, '@5562be00d.sunbeamkit');
};

// ✅ 正确：使用正向肯定预查 (?=\s|$|@)
const displayToReal = (text) => {
  // 匹配 @别名 后面是：空白字符、字符串结尾、或下一个@
  const regex = new RegExp(`@阳光小猫(?=\\s|$|@)`, 'g');
  return text.replace(regex, '@5562be00d.sunbeamkit');
};
```

**问题**: `\b` 单词边界只匹配 `[a-zA-Z0-9_]` 和非单词字符之间，无法处理中文
**解决方案**: 使用 `(?=\s|$|@)` 正向肯定预查，匹配空白字符、字符串结尾或下一个引用

### 错误25: 节点内交互元素触发拖动 ⭐ 新增
```javascript
// ❌ 错误：使用 stopPropagation 无法阻止 React Flow 拖动
function VideoGenerateNode({ data }) {
  const handleTextareaMouseDown = (e) => {
    e.stopPropagation();  // ❌ React Flow 使用捕获阶段，此方法无效
  };

  return <textarea onMouseDown={handleTextareaMouseDown} />;
}
```

```javascript
// ✅ 正确：使用 React Flow 官方 nodrag 类
function VideoGenerateNode({ data }) {
  return (
    <div>
      {/* 所有交互元素添加 nodrag 类 */}
      <textarea className="nodrag" />
      <select className="nodrag">...</select>
      <input className="nodrag" type="checkbox" />
      <button className="nodrag">生成</button>
      <div className="nodrag" onMouseDown={handleResize}>⤡</div>
    </div>
  );
}
```

**问题**:
1. React Flow 在捕获阶段监听事件，`stopPropagation()` 在冒泡阶段执行，无法阻止拖动
2. 在 textarea 中选择文本时仍然会拖动节点

**解决方案**:
1. 使用 `className="nodrag"` 标记所有交互元素
2. 这是 React Flow 官方推荐的方式

### 错误26: useEffect 无限循环（data 依赖） ⭐ 新增
```javascript
// ❌ 错误：data 在依赖数组中导致无限循环
function VideoGenerateNode({ data }) {
  const [nodeSize, setNodeSize] = useState({ width: 280, height: 400 });

  // data 对象在每次渲染时都是新引用
  useEffect(() => {
    if (data.onSizeChange) {
      data.onSizeChange(nodeId, nodeSize.width, nodeSize.height);
    }
  }, [nodeSize.width, nodeSize.height, data]); // ❌ data 导致无限循环

  return <div style={{ width: nodeSize.width }} />;
}
```

```javascript
// ✅ 正确：使用 useRef 存储回调，只监听 onSizeChange 变化
function VideoGenerateNode({ data }) {
  const nodeId = useNodeId();
  const onSizeChangeRef = useRef(data.onSizeChange);
  const [nodeSize, setNodeSize] = useState({ width: 280, height: 400 });

  // 更新 ref（仅当 onSizeChange 变化时）
  useEffect(() => {
    onSizeChangeRef.current = data.onSizeChange;
  }, [data.onSizeChange]);

  // 使用 ref.current，移除 data 依赖
  useEffect(() => {
    if (onSizeChangeRef.current) {
      onSizeChangeRef.current(nodeId, nodeSize.width, nodeSize.height);
    }
  }, [nodeSize.width, nodeSize.height, nodeId]); // ✅ 无 data 依赖

  return <div style={{ width: nodeSize.width }} />;
}
```

```javascript
// ✅ 正确：父组件使用 useCallback 创建稳定回调
function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  // 使用 useCallback 创建稳定的回调函数
  const handleNodeSizeChange = useCallback((nodeId, width, height) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: { ...n.data, width, height },
              style: { ...n.style, width: `${width}px`, minHeight: `${height}px` },
            }
          : n
      )
    );
  }, [setNodes]);

  // 传递稳定的回调
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onSizeChange: handleNodeSizeChange, // ✅ 稳定引用
        },
      }))
    );
  }, [edges, setNodes, handleNodeSizeChange]);
}
```

**问题**:
1. `data` 对象在父组件每次渲染时都是新引用
2. useEffect 依赖 `data` → 触发 → 更新节点 → `data` 变化 → 再次触发 → 无限循环
3. 浏览器崩溃："Maximum update depth exceeded"

**解决方案**:
1. **节点内部**: 使用 `useRef` 存储 `onSizeChange`，只在回调函数变化时更新 ref
2. **父组件**: 使用 `useCallback` 创建稳定的回调函数
3. **移除依赖**: 从 useEffect 依赖数组移除 `data`

### ComfyUI 风格节点调整实现 ⭐ 新增

**VideoGenerateNode.jsx - 节点大小可调整**:
```javascript
import { Handle, Position, useNodeId } from 'reactflow';
import React, { useState, useEffect, useRef } from 'react';

const MIN_WIDTH = 260;
const MIN_HEIGHT = 400;

// 全局跟踪，防止调整大小时拖动节点
let isResizingNode = false;

function VideoGenerateNode({ data }) {
  const nodeId = useNodeId();
  const promptInputRef = useRef(null);
  const nodeRef = useRef(null);
  const resizeHandleRef = useRef(null);
  const onSizeChangeRef = useRef(data.onSizeChange);

  // 更新 ref（仅当 onSizeChange 变化时）
  useEffect(() => {
    onSizeChangeRef.current = data.onSizeChange;
  }, [data.onSizeChange]);

  // 节点大小状态
  const [nodeSize, setNodeSize] = useState(() => ({
    width: data.width || 280,
    height: data.height || MIN_HEIGHT,
  }));
  const [isResizing, setIsResizing] = useState(false);

  // 更新父节点数据（当大小变化时）
  useEffect(() => {
    if (onSizeChangeRef.current) {
      onSizeChangeRef.current(nodeId, nodeSize.width, nodeSize.height);
    }
  }, [nodeSize.width, nodeSize.height, nodeId]); // 移除 data 依赖

  // 调整大小处理 - 使用捕获阶段并阻止默认
  const handleResizeMouseDown = (e) => {
    if (e.button !== 0) return; // 仅左键

    e.preventDefault();
    e.stopPropagation();

    isResizingNode = true;

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = nodeSize.width;
    const startHeight = nodeSize.height;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const newWidth = Math.max(MIN_WIDTH, startWidth + deltaX);
      const newHeight = Math.max(MIN_HEIGHT, startHeight + deltaY);

      setNodeSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      isResizingNode = false;
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    setIsResizing(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={nodeRef}
      style={{
        padding: '10px 15px',
        borderRadius: '8px',
        borderWidth: '2px',
        borderColor: '#10b981',
        borderStyle: 'solid',
        backgroundColor: '#ecfdf5',
        width: `${nodeSize.width}px`,
        minHeight: `${nodeSize.height}px`,
        position: 'relative',
        userSelect: isResizing ? 'none' : 'auto',
      }}
    >
      {/* 输入框 - 添加 nodrag 类 */}
      <textarea
        className="nodrag"
        ref={promptInputRef}
        placeholder="输入提示词..."
        style={{
          width: '100%',
          minHeight: '80px',
          padding: '6px 8px',
          borderRadius: '4px',
          border: '1px solid #6ee7b7',
          resize: 'vertical',
        }}
      />

      {/* 按钮 - 添加 nodrag 类 */}
      <button
        className="nodrag"
        onClick={handleGenerate}
        style={{
          width: '100%',
          padding: '8px',
          backgroundColor: '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        生成视频
      </button>

      {/* ComfyUI 风格调整手柄 - 右下角三角形 */}
      <div
        className="nodrag"
        ref={resizeHandleRef}
        onMouseDown={handleResizeMouseDown}
        style={{
          position: 'absolute',
          right: '0',
          bottom: '0',
          width: '16px',
          height: '16px',
          cursor: 'nwse-resize',
          background: 'linear-gradient(135deg, transparent 50%, #10b981 50%)',
          borderRadius: '0 0 6px 0',
          opacity: '0.6',
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
        title="拖动调整节点大小"
      />
    </div>
  );
}
```

**关键要点**:
1. **`nodrag` 类**: 所有交互元素必须添加此类
2. **useRef 模式**: 存储回调函数避免无限循环
3. **全局标志**: `isResizingNode` 防止调整大小时触发节点拖动
4. **最小尺寸**: 限制节点不能小于指定尺寸
5. **用户选择**: `userSelect: isResizing ? 'none' : 'auto'` 调整大小时禁用文本选择

### 错误27: 故事板实现错误 ⭐ 重大纠正

**问题**: 故事板被错误理解为"批量生成多个视频"，导致循环调用 N 次 API

**错误理解**:
- ❌ 故事板 = 多个独立视频任务
- ❌ 每个镜头调用一次 API
- ❌ 返回 N 个 taskId 数组

**正确理解**:
- ✅ 故事板 = **单个视频任务**，通过特殊格式描述多个时间段
- ✅ 调用 **一次 API**，返回 **单个 taskId**
- ✅ API 通过特殊提示词格式识别故事板模式

**故事板格式**（贞贞平台文档）:
```
Shot 1:
duration: 7.5sec
Scene: 飞机起飞

Shot 2:
duration: 7.5sec
Scene: 飞机降落
```

```javascript
// ❌ 错误：循环调用 API（每个 shot 一次）
for (let i = 0; i < validShots.length; i++) {
  const shot = validShots[i];
  const payload = {
    platform: 'juxin',
    prompt: shot.scene,  // ❌ 直接用 scene，未拼接故事板格式
    storyboard_mode: true,  // ❌ 后端不识别此参数
    shot_index: i,  // ❌ 后端不识别此参数
  };
  const response = await fetch(`${API_BASE}/video/create`, ...);
  // ❌ 每次循环创建一个独立视频
}

// ✅ 正确：拼接故事板格式，调用一次 API
const promptParts = shots.map((shot, index) => {
  return `Shot ${index + 1}:\nduration: ${shot.duration}sec\nScene: ${shot.scene}`;
});
const prompt = promptParts.join('\n\n');  // ✅ 拼接故事板格式

const response = await fetch(`${API_BASE}/api/video/storyboard`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    platform: 'juxin',
    model: 'sora-2-all',  // ⭐ 聚鑫平台使用 sora-2-all (2026-01-02 更新)
    shots: validShots,  // ✅ 传递完整的 shots 数组
    images: allImages,  // ✅ 收集所有图片（全局 + 镜头）
    aspect_ratio: config.aspect,
    watermark: config.watermark,
  }),
});

const result = await response.json();
const taskId = result.data.id || result.data.task_id;  // ✅ 单个 taskId
```

**后端实现**（sora2-client.js - createStoryboardVideo）:
```javascript
async createStoryboardVideo(options) {
  const { shots, model, orientation, size, watermark, images = [] } = options;

  // 根据平台设置默认模型 ⭐ 关键逻辑 (2026-01-02 更新)
  const finalModel = model || (this.platformType === 'JUXIN' ? 'sora-2-all' : 'sora-2');

  // 收集所有镜头的参考图片
  const allImages = [...images];
  shots.forEach((shot) => {
    if (shot.image) {
      allImages.push(shot.image);
    }
  });

  // ✅ 拼接故事板提示词格式
  const promptParts = shots.map((shot, index) => {
    return `Shot ${index + 1}:\nduration: ${shot.duration}sec\nScene: ${shot.scene}`;
  });
  const prompt = promptParts.join('\n\n');

  // ✅ 调用一次统一的视频创建 API
  const body = {
    model,
    prompt,  // 故事板格式的提示词
    images: allImages,
    watermark,
    private: isPrivate,
  };

  // 转换画面方向和分辨率参数
  if (this.platform.useAspectRatio) {
    body.aspect_ratio = this._convertOrientationParam(orientation);
    if (typeof size === 'boolean') {
      body.hd = size;
    } else {
      body.duration = size;
    }
  } else {
    body.orientation = this._convertOrientationParam(orientation);
    body.size = size;
  }

  return await this.createVideo(body);  // ✅ 调用一次 API
}
```

**影响范围**:
- StoryboardNode.jsx（工作流编辑器节点）
- index.html（网页版故事板功能）
- 所有调用故事板 API 的前端代码

**关键要点**:
1. 故事板是**单个视频任务**，不是多个视频
2. 提示词必须使用特殊格式：`Shot N:\nduration: Xsec\nScene: Y\n\n`
3. 调用 `/api/video/storyboard` 端点（后端已正确实现）
4. 收集所有镜头的参考图片并合并到 `images` 数组
5. 返回单个 taskId，轮询获取最终视频

**前端角色引用实现**（StoryboardNode.jsx）:
```javascript
// ⭐ 角色引用相关状态
const connectedCharacters = data.connectedCharacters || [];
const sceneRefs = useRef([]);
const lastFocusedSceneIndex = useRef(null);

// ⭐ 场景输入框获取焦点时记录索引
const handleSceneFocus = (index) => {
  lastFocusedSceneIndex.current = index;
};

// ⭐ 在焦点场景插入角色引用
const insertCharacterToFocusedScene = (username, alias) => {
  const targetIndex = lastFocusedSceneIndex.current;
  if (targetIndex === null) {
    alert('请先点击一个场景输入框');
    return;
  }

  const sceneInput = sceneRefs.current[targetIndex];
  if (!sceneInput) return;

  const start = sceneInput.selectionStart;
  const end = sceneInput.selectionEnd;
  const text = shots[targetIndex].scene;
  const refText = `@${alias} `;

  // 更新场景描述
  const newScene = text.substring(0, start) + refText + text.substring(end);
  updateShot(shots[targetIndex].id, 'scene', newScene);

  // 移动光标
  setTimeout(() => {
    sceneInput.setSelectionRange(start + refText.length, start + refText.length);
    sceneInput.focus();
  }, 0);
};

// ⭐ 场景输入框绑定
{shots.map((shot, index) => (
  <input
    ref={(el) => sceneRefs.current[index] = el}
    type="text"
    value={shot.scene}
    onChange={(e) => updateShot(shot.id, 'scene', e.target.value)}
    onFocus={() => handleSceneFocus(index)}
    placeholder="场景描述..."
  />
))}
```

### 错误28: 故事板发送额外 duration 参数导致 400 错误 ⭐ 新增 (2025-12-30)

```javascript
// ❌ 错误：故事板请求中包含单独的 duration 参数
const response = await fetch(`${API_BASE}/api/video/storyboard`, {
  method: 'POST',
  body: JSON.stringify({
    platform: 'juxin',
    model: 'sora-2-all',  // ⭐ 聚鑫平台使用 sora-2-all (2026-01-02 更新)
    shots: shotsWithDuration,
    images: allImages,
    duration: String(totalDuration), // ❌ 导致 400 错误
    aspect_ratio: '16:9',
  }),
});

// ✅ 正确：不发送 duration 参数，总时长由各镜头时长之和决定
const response = await fetch(`${API_BASE}/api/video/storyboard`, {
  method: 'POST',
  body: JSON.stringify({
    platform: 'juxin',
    model: 'sora-2-all',  // ⭐ 聚鑫平台使用 sora-2-all (2026-01-02 更新)
    shots: shotsWithDuration,
    images: allImages,
    // duration: String(totalDuration), // ⚠️ 已移除
    aspect_ratio: '16:9',
  }),
});
```

**问题**: 故事板模式已在 prompt 中包含每个镜头的时长，发送额外的 `duration` 参数会导致 API 拒绝请求（400 错误）

**解决方案**:
- 移除单独的 `duration` 参数
- 总时长 = 各镜头的 duration 之和
- 前端应让用户手动输入每个镜头的时长

---

### 错误29: React Flow Handle 与标签布局冲突 ⭐ 新增 (2025-12-31)

```javascript
// ❌ 错误：把 Handle 和标签放在同一个容器中，Handle 会覆盖标签文字
<div style={{ position: 'absolute', left: '10px', display: 'flex', gap: '4px' }}>
  <span>API</span>
  <Handle type="target" position={Position.Left} id="api-config" />
</div>

// ❌ 错误：标签放到了节点外部
<div style={{ position: 'absolute', left: '-35px' }}>
  <span>API</span>
  <Handle type="target" position={Position.Left} id="api-config" />
</div>

// ✅ 正确：Handle 和标签完全分离，各自独立定位
<Handle
  type="target"
  position={Position.Left}
  id="api-config"
  style={{ background: '#3b82f6', width: 10, height: 10, top: '10%' }}
/>
<div style={{ position: 'absolute', left: '18px', top: '10%', transform: 'translateY(-50%)', zIndex: 10 }}>
  <span style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 'bold', whiteSpace: 'nowrap' }}>API</span>
</div>
```

**问题**:
1. React Flow 的 Handle 组件会被自动定位到节点边缘（`position: absolute, left: 0` 或 `right: 0`）
2. Handle 不参与父容器的 flex/grid 布局
3. 把 Handle 和标签放在同一容器会导致 Handle 覆盖标签文字

**根本原因**:
- 对 React Flow Handle 组件的定位机制理解不足
- Handle 的 `position` 属性由 React Flow 管理，不受 CSS 布局影响

**解决方案**:
1. **Handle 独立声明**：不与标签放在同一个容器中
2. **标签单独定位**：使用 `position: absolute` 单独定位标签
3. **设置足够的间距**：标签距离边缘至少 18px（`left: 18px` / `right: 18px`）
4. **增加节点 padding**：节点容器添加 `paddingLeft` 和 `paddingRight`（如 85px）为标签预留空间

**实现模板**:
```javascript
// 节点容器样式
const containerStyle = {
  padding: '10px 15px',
  paddingLeft: '85px',   // 为标签预留空间
  paddingRight: '85px',
  // ... 其他样式
};

// 输入端口（左侧）
<Handle
  type="target"
  position={Position.Left}
  id="input-id"
  style={{ background: '#颜色', width: 10, height: 10, top: '10%' }}  // top 定位垂直位置
/>
<div style={{ position: 'absolute', left: '18px', top: '10%', transform: 'translateY(-50%)', zIndex: 10 }}>
  <span style={{ fontSize: '10px', color: '#颜色', fontWeight: 'bold', whiteSpace: 'nowrap' }}>标签</span>
</div>

// 输出端口（右侧）
<Handle
  type="source"
  position={Position.Right}
  id="output-id"
  style={{ background: '#颜色', width: 10, height: 10 }}
/>
<div style={{ position: 'absolute', right: '18px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
  <span style={{ fontSize: '10px', color: '#颜色', fontWeight: 'bold', whiteSpace: 'nowrap' }}>标签</span>
</div>
```

**调试清单**:
- [ ] Handle 和标签是否完全分离（不在同一容器）
- [ ] 标签是否在节点内部显示（不在外部）
- [ ] 标签距离边缘是否足够（至少 18px）
- [ ] 节点是否有足够的 padding（至少 85px）
- [ ] 标签文字是否完整显示，不被 Handle 覆盖

---

### 错误30: 图生视频提示词未描述参考图内容 ⭐ 新增 (2025-12-31)

```javascript
// ❌ 错误：提示词未描述参考图内容
const prompt = '@装载机 在干活';
const images = ['https://volcano-scene.jpg'];
// 问题：生成的视频与火山场景无关

// ❌ 错误：硬编码角色而非使用角色引用
const prompt = '火山场景中，一辆黄色装载机在搬运岩石';
// 问题：没有使用角色引用功能
```

**问题**:
1. 使用参考图片生成视频时，提示词只描述角色活动，未描述参考图片的场景
2. 用户期望生成的视频与参考图片有关联，但实际上没有关联

**根本原因**:
1. 对"参考图片 + 角色引用"组合使用模式理解不足
2. 参考图片 = 场景背景（提供环境），角色引用 = 场景中的演员
3. 提示词必须同时描述参考图片的场景内容和角色的活动

**解决方案**:
1. **先分析参考图片内容**: 使用图片分析工具识别场景元素
2. **描述场景基础**: 主体、外观、环境、氛围
3. **添加角色引用**: 使用 `@username` 格式
4. **描述角色活动**: 角色在场景中的具体动作

**正确示例**:
```javascript
// ✅ 正确：提示词同时描述参考场景和角色活动
// 参考图片：卡通火山场景（火山口有熔岩流动，底部冒白烟，蓝天白云背景）
const prompt = '卡通风格的火山场景，火山口有熔岩流动，底部冒白烟，蓝天白云背景。@装载机 在火山附近作业，正在搬运岩石，卡通插画风格';
const images = ['https://volcano-scene.jpg'];

// 提示词结构：
// 1. 场景描述（来自参考图片）：卡通火山、熔岩、白烟、蓝天白云
// 2. 角色引用：@装载机
// 3. 活动描述：在火山附近作业，搬运岩石
// 4. 风格说明：卡通插画风格
```

**提示词结构模板**:
```javascript
// 场景背景 + 角色引用 + 活动描述
const prompt = `
  [场景描述：主体、外观、环境、氛围]
  @[角色用户名] [角色在场景中的活动]
  [风格说明]
`;

// 示例1：火山场景
const prompt1 = '卡通风格的火山场景，火山口有熔岩流动，底部冒白烟，蓝天白云背景。@装载机 在火山附近作业，正在搬运岩石，卡通插画风格';

// 示例2：城市街道
const prompt2 = '繁华的城市街道，高楼大厦林立，阳光明媚，车水马龙。@阳光小猫 在街道上散步，卡通插画风格';

// 示例3：花园场景
const prompt3 = '美丽的花园，五颜六色的花朵盛开，绿树成荫，阳光洒在草地上。@测试小猫 在花园里玩耍，追逐蝴蝶，卡通插画风格';
```

**关键点**:
1. **参考图片提供场景**: 提供环境基础（如火山、街道、海滩）
2. **提示词必须描述场景**: 让 AI 理解参考图片的内容（熔岩、蓝天、高楼）
3. **角色引用描述活动**: 角色在场景中的具体动作（@装载机 在搬运岩石）
4. **使用 @username 格式**: 调用角色引用，不要硬编码角色名称
5. **风格一致性**: 确保提示词风格与参考图片一致（卡通、写实等）

---

### 错误31: 表单字段缺少 id/name 属性 ⭐ 新增 (2025-12-31)

```javascript
// ❌ 错误：表单字段缺少 id 和 name 属性
<input
  type="text"
  value={videoUrl}
  onChange={(e) => setVideoUrl(e.target.value)}
  placeholder="视频 URL"
/>

// ❌ 错误：select 元素缺少 id 和 name
<select
  value={platform}
  onChange={(e) => setPlatform(e.target.value)}
>
  <option value="juxin">聚鑫平台</option>
  <option value="zhenzhen">贞贞平台</option>
</select>
```

**问题**:
1. 浏览器控制台显示警告："A form field element should have an id or name attribute"
2. 表单字段无法被正确识别和访问
3. 不符合 HTML 可访问性标准

**根本原因**:
- 表单字段缺少 `id` 或 `name` 属性，浏览器无法正确标识这些元素

**解决方案**:
1. **为所有 input 元素添加 id 和 name**
2. **为所有 select 元素添加 id 和 name**
3. **为所有 textarea 元素添加 id 和 name**
4. **确保 id 值在同一文档中唯一**

**正确示例**:
```javascript
// ✅ 正确：添加 id 和 name 属性
<input
  id="video-url-input"
  name="videoUrl"
  type="text"
  value={videoUrl}
  onChange={(e) => setVideoUrl(e.target.value)}
  placeholder="视频 URL"
/>

// ✅ 正确：select 元素添加 id 和 name
<select
  id="platform-select"
  name="platform"
  value={platform}
  onChange={(e) => setPlatform(e.target.value)}
>
  <option value="juxin">聚鑫平台</option>
  <option value="zhenzhen">贞贞平台</option>
</select>

// ✅ 正确：textarea 元素添加 id 和 name
<textarea
  id="prompt-textarea"
  name="prompt"
  value={prompt}
  onChange={(e) => setPrompt(e.target.value)}
  placeholder="输入提示词..."
/>

// ✅ 正确：checkbox 元素添加 id 和 name
<input
  id="use-global-images"
  name="useGlobalImages"
  type="checkbox"
  checked={useGlobalImages}
  onChange={(e) => setUseGlobalImages(e.target.checked)}
/>
```

**命名规范**:
- `id`: 使用 kebab-case，描述元素用途，如 `video-url-input`, `platform-select`
- `name`: 使用 camelCase，对应变量名，如 `videoUrl`, `platform`
- 对于动态生成的元素（如故事板镜头），使用唯一标识：
  ```javascript
  <input
    id={`scene-input-${shot.id}`}
    name={`scene-${shot.id}`}
    value={shot.scene}
    onChange={(e) => updateShot(shot.id, 'scene', e.target.value)}
  />
  ```

**调试清单**:
- [ ] 所有 `<input>` 元素是否有 id 和 name 属性
- [ ] 所有 `<select>` 元素是否有 id 和 name 属性
- [ ] 所有 `<textarea>` 元素是否有 id 和 name 属性
- [ ] id 值在同一文档中是否唯一
- [ ] 命名是否符合规范（id 用 kebab-case，name 用 camelCase）

---

### 错误32: 历史记录卡片不显示视频结果 ⭐ 新增 (2025-12-31)

```javascript
// ❌ 错误：只检查 thumbnail 字段
function HistoryCard({ record }) {
  const { thumbnail } = record;

  return (
    <div>
      {thumbnail ? (
        <img src={thumbnail} alt="视频缩略图" />
      ) : (
        <div>🖼️</div>  // 总是显示占位符
      )}
    </div>
  );
}
```

**问题**:
1. 历史记录卡片只显示占位符，不显示生成的视频
2. 用户看不到视频结果和视频链接
3. 工作流参数（模型、时长、比例等）未显示

**根本原因**:
- HistoryCard 组件只检查 `thumbnail` 字段
- 未检查 `result.output`（视频 URL）
- 未显示 `options` 和 `model` 等工作流参数

**解决方案**:
1. **优先级检查**: thumbnail → result.output → 占位符
2. **视频悬停播放**: 鼠标悬停时播放，移开时暂停并重置
3. **参数面板**: 显示模型、时长、比例、水印等参数
4. **视频链接**: 可点击的视频 URL（不触发卡片点击）

**正确示例**:
```javascript
// ✅ 正确：显示视频或缩略图
function HistoryCard({ record }) {
  const { thumbnail, result, model, options } = record;

  return (
    <div>
      {/* 缩略图/视频区域 */}
      <div style={{ width: '100%', height: '120px', backgroundColor: '#f3f4f6' }}>
        {thumbnail ? (
          <img src={thumbnail} alt="视频缩略图" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : result?.output ? (
          <video
            src={result.output}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            muted
            onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
            onMouseLeave={(e) => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
          />
        ) : (
          <div style={{ fontSize: '32px', color: '#9ca3af' }}>🖼️</div>
        )}
      </div>

      {/* 工作流参数面板 */}
      {(model || options) && (
        <div style={{ padding: '6px 8px', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
          {model && <div><strong>模型:</strong> {model}</div>}
          {options?.duration && <div><strong>时长:</strong> {options.duration}秒</div>}
          {options?.aspect_ratio && <div><strong>比例:</strong> {options.aspect_ratio}</div>}
          {options?.watermark !== undefined && <div><strong>水印:</strong> {options.watermark ? '开启' : '关闭'}</div>}
          {result?.output && (
            <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed #cbd5e1' }}>
              <strong>视频:</strong>
              <a
                href={result.output}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#3b82f6', textDecoration: 'none' }}
                onClick={(e) => e.stopPropagation()}  // 不触发卡片点击
              >
                {result.output.length > 40 ? result.output.substring(0, 40) + '...' : result.output}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**关键点**:
1. 视频悬停播放，移开时暂停并重置（提供更好的用户体验）
2. 视频链接点击不触发卡片点击（使用 `stopPropagation`）
3. 参数面板使用浅色背景（`#f8fafc`）区分
4. 链接过长时自动截断（超过 40 字符显示省略号）

---

### 参考图片节点协作实现 ⭐ 新增 (2025-12-30)

**功能概述**: 参考图片节点与视频生成/故事板节点的协作，实现图片预览和自动合并

#### ReferenceImageNode - 双模式设计

```javascript
import { Handle, Position, useReactFlow, useNodeId } from 'reactflow';
import React, { useState, useEffect } from 'react';

function ReferenceImageNode({ data }) {
  const nodeId = useNodeId();
  const { setNodes, getEdges } = useReactFlow();

  const [images, setImages] = useState(data.images || []);
  const [inputValue, setInputValue] = useState('');
  const [selectedImages, setSelectedImages] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState('select');
  const [previewImage, setPreviewImage] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // 传递选中的图片到连接节点
  useEffect(() => {
    if (selectedImages.size > 0 && nodeId) {
      const edges = getEdges();
      const outgoingEdges = edges.filter(e => e.source === nodeId);
      const imageUrls = images.filter(img => selectedImages.has(img));

      setNodes((nds) =>
        nds.map((node) => {
          const isConnected = outgoingEdges.some(e => e.target === node.id);
          if (isConnected) {
            return {
              ...node,
              data: { ...node.data, connectedImages: imageUrls }
            };
          }
          return node;
        })
      );
    }
  }, [selectedImages, images, nodeId, getEdges, setNodes]);

  return (
    <div>
      {/* 模式切换：选择 / 预览 */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <button onClick={() => setSelectionMode('select')}>✓ 选择模式</button>
        <button onClick={() => setSelectionMode('preview')}>👁️ 预览模式</button>
      </div>

      {/* 图片网格 */}
      {images.map((url, index) => (
        <div
          key={index}
          onClick={() => selectionMode === 'select'
            ? toggleSelection(url)
            : openPreview(url)}
          style={{
            border: selectedImages.has(url) ? '2px solid #8b5cf6' : '1px solid #c4b5fd'
          }}
        >
          <img src={url} alt="" style={{ width: '100%', aspectRatio: '16/9' }} />
        </div>
      ))}

      {/* 预览模态框 */}
      {showPreview && previewImage && (
        <div onClick={closePreview} style={{ position: 'fixed', zIndex: 1000, ... }}>
          <div style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
            <img src={previewImage} alt="" style={{ maxWidth: '100%', maxHeight: '400px' }} />
            <div>{previewImage}</div>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### VideoGenerateNode - 接收和显示参考图

```javascript
function VideoGenerateNode({ data }) {
  const [connectedImages, setConnectedImages] = useState([]);

  useEffect(() => {
    if (data.connectedImages) {
      setConnectedImages(data.connectedImages);
    }
  }, [data.connectedImages]);

  const handleGenerate = async () => {
    const response = await fetch(`${API_BASE}/api/video/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'juxin',
        model: 'sora-2-all',  // ⭐ 聚鑫平台使用 sora-2-all (2026-01-02 更新)
        prompt: manualPrompt,
        duration: 10,
        aspect_ratio: '16:9',
        watermark: false,
        images: connectedImages, // ✅ 自动添加
      }),
    });
  };

  return (
    <div>
      {connectedImages.length > 0 ? (
        <div>
          <div>🖼️ 已连接参考图 ({connectedImages.length} 张)</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {connectedImages.map((url, i) => (
              <img key={i} src={url} alt="" style={{ width: '48px', height: '48px' }} />
            ))}
          </div>
        </div>
      ) : (
        <div>💡 提示：连接参考图节点并选择图片</div>
      )}
    </div>
  );
}
```

#### StoryboardNode - 全局图片控制 + 镜头图片选择 + 自动均分时长 ⭐ 更新 (2025-12-30)

```javascript
function StoryboardNode({ data }) {
  const connectedImages = data.connectedImages || [];
  const [useGlobalImages, setUseGlobalImages] = useState(false); // ⭐ 全局图片复选框
  const [totalDuration, setTotalDuration] = useState(15); // ⭐ 总时长选项
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [selectedShotIndex, setSelectedShotIndex] = useState(null);

  // ⭐ 自动计算每个镜头的时长
  const shotDuration = shots.length > 0
    ? (totalDuration / shots.length).toFixed(1)
    : 5;

  // ⭐ 计算当前总时长（用于提示）
  const currentTotalDuration = shots.reduce((sum, shot) => sum + (shot.duration || 0), 0);

  // ⭐ 为镜头选择图片
  const openImageSelector = (index) => {
    setSelectedShotIndex(index);
    setShowImageSelector(true);
  };

  const selectImageForShot = (imageUrl) => {
    const newShots = [...shots];
    newShots[selectedShotIndex].image = imageUrl;
    setShots(newShots);
    setShowImageSelector(false);
  };

  const clearShotImage = () => {
    const newShots = [...shots];
    newShots[selectedShotIndex].image = '';
    setShots(newShots);
    setShowImageSelector(false);
  };

  const handleGenerate = async () => {
    const validShots = shots.filter(s => s.scene.trim());
    if (validShots.length === 0) {
      alert('请至少填写一个分镜头场景');
      return;
    }

    // ⭐ 收集所有图片（根据复选框和镜头选择）
    const allImages = [];

    // 1. 全局图片（仅当复选框选中时）
    if (useGlobalImages && connectedImages.length > 0) {
      allImages.push(...connectedImages);
    }

    // 2. 镜头图片（每个镜头独立选择的图片）
    validShots.forEach(shot => {
      if (shot.image && shot.image.trim()) {
        allImages.push(shot.image.trim());
      }
    });

    // ⭐ 使用自动均分的时长
    const shotsWithDuration = validShots.map(s => ({
      ...s,
      duration: parseFloat(shotDuration),
    }));

    // API 调用（包含 duration 参数）
    await fetch(`${API_BASE}/api/video/storyboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'juxin',
        model: 'sora-2-all',  // ⭐ 聚鑫平台使用 sora-2-all (2026-01-02 更新)
        shots: shotsWithDuration,
        images: allImages,
        duration: totalDuration, // ⭐ 传递总时长给后端
        aspect_ratio: '16:9',
        watermark: false,
      }),
    });
  };

  return (
    <div>
      {/* ⭐ 全局参考图区域（带复选框控制） */}
      {connectedImages.length > 0 && (
        <div style={{ padding: '6px', backgroundColor: '#f3e8ff', borderRadius: '4px' }}>
          <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
            🖼️ 全局参考图 ({connectedImages.length} 张)
          </div>

          {/* 复选框控制 */}
          <div className="nodrag" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <input
              className="nodrag"
              type="checkbox"
              checked={useGlobalImages}
              onChange={(e) => setUseGlobalImages(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <label style={{ fontSize: '11px', color: '#6b21a8', cursor: 'pointer' }}>
              启用全局参考图（应用到所有镜头）
            </label>
          </div>

          {/* 缩略图预览 */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {connectedImages.map((url, index) => (
              <img key={index} src={url} alt="" style={{ width: '36px', height: '36px', borderRadius: '3px' }} />
            ))}
          </div>
        </div>
      )}

      {/* ⭐ 总时长选项 */}
      <div style={{ padding: '6px', backgroundColor: '#ecfdf5', borderRadius: '4px', marginBottom: '8px' }}>
        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#059669', marginBottom: '4px' }}>
          ⏱️ 总时长设置
        </div>
        <div className="nodrag" style={{ display: 'flex', gap: '4px' }}>
          <select
            className="nodrag"
            value={totalDuration}
            onChange={(e) => setTotalDuration(Number(e.target.value))}
            style={{ flex: 1, padding: '4px', fontSize: '11px' }}
          >
            <option value={5}>5 秒</option>
            <option value={10}>10 秒</option>
            <option value={15}>15 秒</option>
            <option value={25}>25 秒</option>
          </select>
          <div style={{ fontSize: '10px', color: '#047857', padding: '4px' }}>
            每镜头: {shotDuration} 秒
          </div>
        </div>

        {/* ⭐ 智能提示 */}
        {currentTotalDuration > 25 && (
          <div style={{ marginTop: '4px', padding: '4px', backgroundColor: '#fecaca', borderRadius: '3px', fontSize: '10px', color: '#991b1b' }}>
            ⚠️ 当前总时长 {currentTotalDuration} 秒超过 API 限制（25秒）
          </div>
        )}
      </div>

      {/* 镜头列表 */}
      <div>
        {shots.map((shot, index) => (
          <div key={shot.id} style={{ marginBottom: '4px' }}>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: '#6b7280' }}>
                ⏱️ 自动均分 {shotDuration}秒
              </span>

              {/* 场景输入 */}
              <input
                className="nodrag"
                type="text"
                value={shot.scene}
                onChange={(e) => updateShot(shot.id, 'scene', e.target.value)}
                placeholder="场景描述"
                style={{ flex: 1, padding: '4px', fontSize: '11px' }}
              />

              {/* ⭐ 图片选择按钮 */}
              <button
                className="nodrag"
                onClick={() => openImageSelector(index)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: shot.image ? '#8b5cf6' : '#e5e7eb',
                  color: shot.image ? 'white' : '#374151',
                  fontSize: '10px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                }}
                title={shot.image ? '已选择参考图' : '选择参考图'}
              >
                📷
              </button>
            </div>
            {shot.image && (
              <div style={{ fontSize: '9px', color: '#6b21a8', marginTop: '2px' }}>
                已选图: {shot.image.substring(0, 40)}...
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ⭐ 图片选择模态框 */}
      {showImageSelector && (
        <div onClick={() => setShowImageSelector(false)} style={{ position: 'fixed', zIndex: 1000, ... }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px' }}>
            <h3>为镜头 {selectedShotIndex + 1} 选择参考图</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {connectedImages.map((url, index) => (
                <div
                  key={index}
                  onClick={() => selectImageForShot(url)}
                  style={{
                    padding: '4px',
                    border: shots[selectedShotIndex]?.image === url
                      ? '2px solid #8b5cf6'
                      : '1px solid #e5e7eb',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <img src={url} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
              <button onClick={clearShotImage} style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px' }}>
                清除选择
              </button>
              <button onClick={() => setShowImageSelector(false)} style={{ padding: '6px 12px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px' }}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### 后端 sora2-client.js - 添加 duration 参数支持 ⭐ 新增 (2025-12-30)

```javascript
// src/server/sora2-client.js
async createStoryboardVideo(options) {
  try {
    const {
      shots,
      duration, // ⭐ 新增：总时长参数（可选）
      model,
      orientation = 'landscape',
      size = 'small',
      watermark = false,
      private: isPrivate = true,
      images = [],
    } = options;

    // 根据平台设置默认模型 ⭐ 关键逻辑 (2026-01-02 更新)
    const finalModel = model || (this.platformType === 'JUXIN' ? 'sora-2-all' : 'sora-2');

    if (!shots || !Array.isArray(shots) || shots.length === 0) {
      throw new Error('shots 是必填参数，且必须是非空数组');
    }

    // 收集所有镜头的参考图片
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
      images: allImages,
      watermark,
      private: isPrivate,
    };

    // ⚠️ 注意：故事板模式不需要单独的 duration 参数
    // 总时长由 prompt 中各镜头的 duration 之和决定
    // 前端应计算每个镜头的时长，而不是发送总时长

    // 转换画面方向参数
    const orientationParam = this._convertOrientationParam(orientation);
    if (this.platform.useAspectRatio) {
      body.aspect_ratio = orientationParam;
    } else {
      body.orientation = orientationParam;
    }

    // ... 其余代码
  }
}
```

### 错误33: 工作流快照持久化时机问题 ⭐ 新增 (2025-12-31)

```javascript
// ❌ 错误：useState 未同步到 node.data，导致工作流快照缺失参数
function VideoGenerateNode({ data }) {
  // useState 只在组件内部，不会自动同步到 node.data
  const [manualPrompt, setManualPrompt] = useState('');  // ❌ 未从 data 初始化
  const [taskId, setTaskId] = useState(null);

  const handleGenerate = async () => {
    // ... API 调用逻辑 ...

    // ⚠️ 问题：getNodes() 返回的 node.data 不包含 useState 的最新值
    const workflowSnapshot = {
      nodes: getNodes(),  // manualPrompt 未同步，快照为空或旧值
      edges: getEdges(),
    };

    // 保存到历史记录...
  };
}
```

**问题**:
1. **工作流快照不完整**: 恢复工作流时只有节点，缺少参数（manualPrompt, shots 等）
2. **useState vs node.data**: useState 是组件内部状态，不会自动同步到 React Flow 的 node.data
3. **useEffect 时机**: useEffect 在渲染后执行，但 getNodes() 可能在 useEffect 之前调用

**根本原因**:
- React Flow 的 `getNodes()` 返回的是 `node.data` 对象
- useState 的值只存在于组件内存中，不在 node.data 里
- useEffect 虽然可以同步 useState 到 node.data，但执行时机晚于 getNodes()

**解决方案**:
1. **初始化**: 从 `data` 属性初始化 useState
2. **useEffect 同步**: 当 useState 变化时同步到 node.data
3. **关键修复**: 在 getNodes() 之前手动调用 setNodes() 同步数据

**正确示例**:
```javascript
// ✅ 正确：完整的状态同步模式
function VideoGenerateNode({ data }) {
  const nodeId = useNodeId();
  const { setNodes, getNodes, getEdges } = useReactFlow();

  // 1. 从 data 初始化 useState（支持工作流恢复）
  const [manualPrompt, setManualPrompt] = useState(data.manualPrompt || '');
  const [status, setStatus] = useState(data.taskId ? 'success' : 'idle');
  const [taskId, setTaskId] = useState(data.taskId || null);

  // 2. useEffect: manualPrompt 变化时同步到 node.data
  useEffect(() => {
    if (manualPrompt !== data.manualPrompt) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, manualPrompt } }
            : node
        )
      );
    }
  }, [manualPrompt, nodeId, setNodes, data.manualPrompt]);

  // 3. useEffect: taskId 变化时同步到 node.data
  useEffect(() => {
    if (taskId && data.taskId !== taskId) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, taskId } }
            : node
        )
      );
    }
  }, [taskId, nodeId, setNodes, data.taskId]);

  const handleGenerate = async () => {
    // ... 验证逻辑 ...

    // ⭐ 关键修复：先同步 manualPrompt 到节点 data，确保工作流快照包含完整数据
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, manualPrompt } }
          : node
      )
    );

    // ⭐ 捕获工作流快照（现在包含最新的 manualPrompt）
    const workflowSnapshot = {
      nodes: getNodes(),
      edges: getEdges(),
    };

    // ... API 调用和保存到历史记录 ...
  };
}
```

**StoryboardNode 同样模式**:
```javascript
// ✅ StoryboardNode: 同样需要同步 shots 和 useGlobalImages
function StoryboardNode({ data }) {
  const nodeId = useNodeId();
  const { setNodes, getNodes, getEdges } = useReactFlow();

  // 1. 从 data 初始化
  const [shots, setShots] = useState(
    data.shots || [{ id: '1', scene: '', duration: 5, image: '' }]
  );
  const [useGlobalImages, setUseGlobalImages] = useState(data.useGlobalImages || false);

  // 2. useEffect: 同步 shots 到 node.data
  useEffect(() => {
    if (shots !== data.shots) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, shots } }
            : node
        )
      );
    }
  }, [shots, nodeId, setNodes, data.shots]);

  // 3. useEffect: 同步 useGlobalImages 到 node.data
  useEffect(() => {
    if (useGlobalImages !== data.useGlobalImages) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, useGlobalImages } }
            : node
        )
      );
    }
  }, [useGlobalImages, nodeId, setNodes, data.useGlobalImages]);

  const handleGenerate = async () => {
    // ... 验证逻辑 ...

    // ⭐ 关键修复：先同步 shots 和 useGlobalImages 到节点 data
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, shots, useGlobalImages } }
          : node
      )
    );

    // ⭐ 捕获工作流快照（现在包含完整数据）
    const workflowSnapshot = {
      nodes: getNodes(),
      edges: getEdges(),
    };

    // ... API 调用和保存到历史记录 ...
  };
}
```

**关键点**:
1. **初始化模式**: `useState(data.prop || defaultValue)` - 支持工作流恢复
2. **useEffect 同步**: 当状态变化时，通过 setNodes() 同步到 node.data
3. **手动同步**: 在 getNodes() 之前手动调用 setNodes() 确保数据是最新的
4. **时机问题**: useEffect 在渲染后执行，getNodes() 可能在 useEffect 之前被调用
5. **完整恢复**: 恢复工作流时，node.data 会被用作 useState 的初始值

**相关文档**:
- base.md: 工作流持久化方案（第242-275行）
- SKILL.md: 错误模式 33

---

### 错误34: 工作流快照时机问题 ⭐ 2026-01-01 新增

```javascript
// ❌ 错误：getNodes() 在 TaskResultNode 同步之前调用
function VideoGenerateNode({ data }) {
  const handleGenerate = async () => {
    // 手动同步 manualPrompt
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, manualPrompt } }
          : node
      )
    );

    // ⚠️ 问题：立即调用 getNodes()，但 TaskResultNode 的 useEffect 还没执行
    const workflowSnapshot = {
      nodes: getNodes(),  // TaskResultNode.data 可能还是旧的
      edges: getEdges(),
    };

    // ... API 调用，保存快照到历史记录 ...
  };
}

// TaskResultNode.jsx - useEffect 是异步的
useEffect(() => {
  if ((taskStatus === 'SUCCESS' && videoUrl) || taskStatus === 'FAILURE') {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                taskId,      // ⚠️ 这个更新可能晚于 VideoGenerateNode 的 getNodes()
                taskStatus,
                videoUrl,
                error
              }
            }
          : node
      )
    );
  }
}, [taskStatus, videoUrl, error, taskId, nodeId, setNodes]);
```

**问题**:
1. **时机问题**: VideoGenerateNode 调用 getNodes() 捕获快照时，TaskResultNode 的 useEffect 还没执行
2. **异步陷阱**: useState 是异步的，useEffect 在渲染后执行，getNodes() 可能返回旧数据
3. **实际影响**: 加载历史记录时显示错误视频（第一次的视频结果，而不是第二次的）

**场景**:
```
1. 第一次生成"小猫视频"，TaskResultNode 显示小猫视频 ✅
2. 用户修改提示词，点击生成第二次（火山视频）
3. VideoGenerateNode 调用 getNodes()，此时 TaskResultNode.data 还是小猫视频
4. 快照保存到历史记录，包含小猫视频 ❌
5. 用户加载历史记录，看到小猫视频而不是火山视频 ❌
```

**解决方案**:

**短期修复** - 加载历史记录时覆盖 TaskResultNode 数据:
```javascript
// ✅ App.jsx - handleLoadWorkflowFromHistory
const handleLoadWorkflowFromHistory = (record) => {
  const { workflowSnapshot, taskId, result } = record;

  if (!workflowSnapshot) {
    alert('⚠️ 该历史记录没有工作流快照，无法恢复工作流。');
    return;
  }

  const { nodes: savedNodes, edges: savedEdges } = workflowSnapshot;

  // ⭐ 关键修复：从历史记录的实际数据恢复 TaskResultNode
  const cleanedNodes = savedNodes.map(node => {
    if (node.type === 'taskResultNode') {
      // 使用历史记录的真实数据，而不是快照中的数据
      return {
        ...node,
        data: {
          ...node.data,
          taskId: taskId,              // ⭐ 使用历史记录的 taskId
          taskStatus: result?.status || 'idle',
          videoUrl: result?.data?.output || null,  // ⭐ 使用历史记录的视频 URL
          error: result?.data?.fail_reason || null,
        }
      };
    }
    return {
      ...node,
      data: {
        ...node.data,
        onSizeChange: undefined,
      }
    };
  });

  setNodes(cleanedNodes);
  setEdges(savedEdges);
  // ...
};
```

**长期修复** - TaskResultNode 主动同步数据:
```javascript
// ✅ TaskResultNode.jsx - 轮询收到结果时立即同步
const pollTaskStatus = async () => {
  const response = await fetch(`${API_BASE}/api/task/${taskId}?platform=juxin`);
  const result = await response.json();

  if (result.success && result.data) {
    const { status, data: taskData } = result.data;
    setTaskStatus(status);  // useState 更新

    // ⭐ 关键修复：立即同步到 node.data（不等待 useEffect）
    if (status === 'SUCCESS' && taskData?.output) {
      setVideoUrl(taskData.output);

      // 立即同步到 node.data
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  taskId,
                  taskStatus: status,
                  videoUrl: taskData.output,
                  error: null
                }
              }
            : node
        )
      );
    }
  }
};
```

**关键点**:
1. **时机问题**: getNodes() 是同步的，useState 是异步的，useEffect 在渲染后执行
2. **短期方案**: 加载历史记录时，从历史记录的实际数据覆盖快照中的旧数据
3. **长期方案**: TaskResultNode 在轮询收到结果时，立即同步 node.data（不依赖 useEffect）
4. **核心原则**: 关键时刻手动调用 setNodes() 确保数据同步

**相关文档**:
- SKILL.md: 错误模式 34
- Plan: `vivid-kindling-yeti.md` - 工作流数据架构修复与新问题分析

---

### 错误25: 本地视频 URL 缺少完整前缀导致无法播放 ⭐ 2026-01-01 新增

```javascript
// ❌ 错误：直接使用相对路径，导致视频无法播放
const response = await fetch(`${API_BASE}/api/task/${taskId}`);
const result = await response.json();
const { data: taskData } = result.data;

setVideoUrl(taskData.output); // "/downloads/xxx.mp4"
// 浏览器解析为: http://localhost:5173/downloads/xxx.mp4 (404 - 视频在 9000 端口)
```

```javascript
// ✅ 正确：为本地路径拼接完整前缀
const response = await fetch(`${API_BASE}/api/task/${taskId}`);
const result = await response.json();
const { data: taskData } = result.data;

let finalVideoUrl = taskData.output;

// ⭐ 关键：检查是否为本地路径，拼接完整 URL
if (finalVideoUrl.startsWith('/downloads/')) {
  finalVideoUrl = `${API_BASE}${finalVideoUrl}`;
}
// 结果: "http://localhost:9000/downloads/xxx.mp4"

setVideoUrl(finalVideoUrl);
```

**问题**:
1. **相对路径解析错误**: `/downloads/xxx.mp4` 被浏览器解析为当前页面域名（5173端口）
2. **端口不匹配**: 视频文件在 9000 端口服务器，但请求发到了 5173 端口
3. **浏览器缓存**: 手动刷新可能返回 304 缓存，获取不到最新数据

**解决方案**:
1. **路径检查**: 检查 URL 是否以 `/downloads/` 开头
2. **URL 拼接**: 本地路径拼接 `API_BASE` 前缀
3. **缓存破坏**: 手动刷新添加 `&_t=Date.now()` 参数

**手动刷新缓存破坏**:
```javascript
// ✅ 正确：添加时间戳参数破坏缓存
const refreshStatus = async () => {
  const cacheBuster = Date.now();
  const response = await fetch(
    `${API_BASE}/api/task/${taskId}?platform=juxin&_t=${cacheBuster}`
  );
  // ...
};
```

**关键规则**:
1. **相对路径识别**: `/downloads/` 开头 = 本地视频
2. **URL 拼接**: 本地路径必须拼接 API_BASE
3. **远程路径**: `http://` 或 `https://` 开头直接使用
4. **轮询间隔**: 必须使用 30 秒（避免 429 错误）
5. **缓存破坏**: 手动刷新添加时间戳参数

**修复日期**: 2026-01-01

**相关文档**:
- SKILL.md: 错误模式 25

---

### 错误26: 节点连接验证缺失导致事件错误响应 ⭐ 2026-01-01 新增

```javascript
// ❌ 错误：App.jsx 未验证源节点类型
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

```javascript
// ✅ 正确：App.jsx 验证源节点类型
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

**问题**:
1. **未连接节点响应**: 画布上有两个TaskResultNode，一个连接到VideoGenerateNode，另一个未连接，但未连接的节点在任务提交时也显示执行了任务
2. **连接验证缺失**: App.jsx 在设置 `connectedSourceId` 时没有验证源节点类型
3. **事件广播机制**: `window.dispatchEvent` 是全局广播，所有监听器都会收到事件

**解决方案**:
1. **源节点类型验证**: 在 App.jsx 的连接处理逻辑中，设置 connectedSourceId 之前验证源节点类型
2. **双重保护**: App.jsx（数据层）+ TaskResultNode（事件层）两层验证
3. **类型白名单**: 每个输入端口只接受特定类型的节点

**输入端口节点类型映射**:
| 输入端口 (Handle ID) | 有效源节点类型 | 用途 |
|---------------------|---------------|------|
| `prompt-input` | `textNode` | 文本提示词输入 |
| `character-input` | `characterLibraryNode` | 角色库连接 |
| `characters-input` | `characterLibraryNode` | 多选角色连接 |
| `images-input` | `referenceImageNode` | 参考图片连接 |
| `api-config` | `apiSettingsNode` | API 配置连接 |
| `task-input` | `videoGenerateNode`, `storyboardNode`, `characterCreateNode` | 任务结果接收 |

**修复文件**:
- `src/client/src/App.jsx` - Lines 218-299（所有输入端口添加源节点类型验证）
- `src/client/src/nodes/output/TaskResultNode.jsx` - Lines 9, 105-117（导入 getNodes，事件处理器添加源节点类型验证）

**相关文档**:
- SKILL.md: 错误模式 26

---

### 错误36: TaskResultNode 进度百分比未显示 ⭐ 新增 (2026-01-01)

**问题**:
1. **进度显示错误**: 已完成任务显示 "✓ 完成 0%" 而非 "✓ 完成 100%"
2. **getStatusText 忽略参数**: 状态文本函数硬编码返回 "✓ 完成"，未使用 progressValue 参数
3. **轮询未设置进度**: API 返回 SUCCESS 时，没有设置 progress 为 100
4. **恢复逻辑缺陷**: 从历史记录恢复时，未正确设置 progress 的默认值

**错误代码**:
```javascript
// ❌ 错误：getStatusText 忽略 progressValue 参数
const getStatusText = (status, progressValue) => {
  switch (status) {
    case 'SUCCESS': return '✓ 完成';  // ❌ 未显示进度
    case 'FAILURE': return '✗ 失败';
    case 'IN_PROGRESS': return `⏳ 处理中 ${progressValue}%`;
    case 'NOT_START': return '⏸️ 未开始';
    default: return '⏸️ 等待中';
  }
};

// ❌ 错误：轮询函数未设置 progress 为 100
if (status === 'SUCCESS' && taskData?.output) {
  setVideoUrl(finalVideoUrl);
  setPolling(false);
  clearInterval(pollInterval);
  // ❌ 未设置 progress
}

// ❌ 错误：恢复逻辑只检查 _isCompletedFromHistory
if (data._isCompletedFromHistory) {
  // 恢复逻辑
}
if (!isCompletedFromHistoryRef.current) {
  return; // ❌ 已完成但未标记为历史的任务被跳过
}
```

**正确代码**:
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
  clearInterval(pollInterval);
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

**关键点**:
1. **getStatusText 必须包含进度**: 成功状态显示 "✓ 完成 100%" 而非 "✓ 完成"
2. **轮询时设置进度**: API 返回 SUCCESS 时，自动设置 progress 为 100
3. **手动刷新设置进度**: 刷新已完成任务时，如果 progress 为 0，设置为 100
4. **恢复逻辑检查任务状态**: 优先检查 `taskStatus === 'SUCCESS' && videoUrl` 而非 `_isCompletedFromHistory`
5. **默认值逻辑**: 如果 progress 为 undefined 或 0，且任务已完成，默认为 100

**修复文件**:
- `src/client/src/nodes/output/TaskResultNode.jsx` - Lines 364, 228, 326-329, 50, 72-77

**相关文档**:
- SKILL.md: 错误模式 36

---

### 错误37: TaskResultNode 任务ID竞态条件 ⭐ 新增 (2026-01-01)

**问题**:
1. **新任务被旧任务覆盖**: 提交新任务后，TaskResultNode 仍然显示旧的 taskId
2. **useEffect 依赖 data.taskId**: 当事件监听器更新 node.data.taskId 时，useEffect 重新运行
3. **闭包陷阱**: useEffect 从旧的闭包数据中恢复旧的 taskId
4. **竞态条件**: 事件监听器设置新 taskId → node.data 变化 → useEffect 重新运行 → 从旧的闭包数据中恢复旧 taskId

**错误代码**:
```javascript
// ❌ 错误：useEffect 依赖 data.taskId，导致重新运行
useEffect(() => {
  const isCompletedTask = data.taskStatus === 'SUCCESS' && data.videoUrl;

  if (data._isCompletedFromHistory || isCompletedTask) {
    isCompletedFromHistoryRef.current = true;
    // 恢复所有状态
    if (data.taskStatus) setTaskStatus(data.taskStatus);
    if (data.videoUrl) setVideoUrl(data.videoUrl);
    setPolling(false);
    return;
  }

  // ❌ 每次 data.taskId 变化都会重新运行，恢复旧的 taskId
  if (data.taskId && data.taskId !== taskIdRef.current) {
    setTaskId(data.taskId);  // ❌ 这会恢复旧的 taskId
    taskIdRef.current = data.taskId;
  }
}, [data.taskId]);  // ❌ 依赖 data.taskId 导致重新运行
```

**正确代码**:
```javascript
// ✅ 正确：useEffect 使用空依赖数组，只在挂载时运行一次
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

**关键点**:
1. **空依赖数组**: useEffect 使用 `[]` 而非 `[data.taskId]`，只在挂载时运行一次
2. **taskIdRef 初始检查**: 只在 `taskIdRef.current === null` 时设置初始 taskId，防止重复设置
3. **事件监听器先设置 ref**: 更新 node.data 之前设置 `isCompletedFromHistoryRef.current = true`
4. **事件监听器后重置 ref**: 所有状态更新完成后重置 ref 为 false
5. **taskId 管理权移交**: taskId 完全由事件监听器管理，useEffect 不再恢复 taskId

**修复文件**:
- `src/client/src/nodes/output/TaskResultNode.jsx` - Lines 47-110 (useEffect 1), Lines 132-169 (事件监听器)

**相关文档**:
- SKILL.md: 错误模式 37

---

### 错误38: TaskResultNode platform 字段缺失导致 API 查询失败 ⭐ 新增 (2026-01-01)

**问题**:
1. **API 查询 400 错误**: 旧任务查询 API 时返回 400 错误
2. **平台不匹配**: 贞贞平台的任务用聚鑫端点查询（`platform=juxin` 而非 `zhenzhen`）
3. **字段缺失**: localStorage 保存的旧任务没有 `platform` 字段
4. **默认值错误**: TaskResultNode 初始化使用默认值 `'juxin'`

**错误代码**:
```javascript
// ❌ 错误：platform 字段缺失，使用默认值
const [platform, setPlatform] = useState(data.platform || 'juxin');

// 查询 API 时使用错误的 platform
fetch(`${API_BASE}/api/task/${taskId}?platform=${platform}`);
// 实际请求: /api/task/video_xxx?platform=juxin
// 应该请求: /api/task/video_xxx?platform=zhenzhen
```

**正确代码**:
```javascript
// ✅ 正确：自动从连接的 VideoGenerateNode 检测 platform
useEffect(() => {
  const sourceId = data.connectedSourceId || connectedSourceIdRef.current;

  // 只在 platform 缺失或可能是错误值时执行
  if (sourceId && (!platform || platform === 'juxin')) {
    const allNodes = getNodes();
    const sourceNode = allNodes.find(n => n.id === sourceId);

    // 从 VideoGenerateNode 读取 apiConfig.platform
    if (sourceNode && sourceNode.type === 'videoGenerateNode' && sourceNode.data?.apiConfig?.platform) {
      const sourcePlatform = sourceNode.data.apiConfig.platform;

      // 同步更新内部状态和 node.data
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
1. **自动检测**: 从连接的源节点读取配置信息
2. **条件触发**: 只在字段缺失或可能是错误值时执行
3. **同步更新**: 同时更新内部状态和 node.data
4. **向后兼容**: 自动修复旧数据，无需手动干预
5. **持久化**: 更新的 node.data 自动保存到 localStorage

**修复文件**:
- `src/client/src/nodes/output/TaskResultNode.jsx` - Lines 118-140 (useEffect 1.5)

**相关文档**:
- SKILL.md: 错误模式 38

---

### 错误39: 聚鑫平台模型名称错误 ⭐ 新增 (2026-01-02)
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

// ✅ 正确：后端自动选择
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

**问题**: 聚鑫平台使用 `sora-2-all` 模型名称，贞贞平台使用 `sora-2` 或 `sora-2-pro`
**解决方案**:
1. 后端根据平台自动选择默认模型
2. 前端默认值设置为正确的模型名称
3. 用户手动选择时限制选项范围
**修复日期**: 2026-01-02

**修复文件**:
- `src/server/sora2-client.js` - Lines 132-144, 228, 323（添加平台自动切换）
- `src/client/src/nodes/input/APISettingsNode.jsx` - Lines 9-15, 95-100（更新默认值和自动切换）
- `src/client/src/nodes/process/VideoGenerateNode.jsx` - Lines 36-41（更新默认值）
- `src/client/src/nodes/process/StoryboardNode.jsx` - Lines 16-21（更新默认值）
- `src/renderer/public/index.html` - Lines 666-669, 746-750（添加模型选项）

**相关文档**:
- SKILL.md: 错误模式 39
- troubleshooting.md: 问题 12

---

### 错误40: App.jsx 把 selectedImages 数组当作 Set 处理 ⭐ 新增 (2026-01-02)

```javascript
// ❌ 错误：App.jsx 把数组当作 Set
const imagesEdge = incomingEdges.find((e) => e.targetHandle === 'images-input');
if (imagesEdge) {
  const sourceNode = nds.find((n) => n.id === imagesEdge.source);
  if (sourceNode?.type === 'referenceImageNode') {
    const allImages = sourceNode.data?.images || [];
    const selectedImagesSet = sourceNode.data?.selectedImages; // ⚠️ 这是数组，不是 Set

    // ❌ 数组没有 .size 和 .has() 方法
    if (selectedImagesSet && selectedImagesSet.size > 0) {
      newData.connectedImages = allImages.filter(img => selectedImagesSet.has(img));
    }
  }
}

// ✅ 正确：selectedImages 是已过滤的数组，直接使用
const imagesEdge = incomingEdges.find((e) => e.targetHandle === 'images-input');
if (imagesEdge) {
  const sourceNode = nds.find((n) => n.id === imagesEdge.source);
  if (sourceNode?.type === 'referenceImageNode') {
    // ReferenceImageNode 保存 selectedImages 为数组
    const selectedImagesArray = sourceNode.data?.selectedImages;
    const allImages = sourceNode.data?.images || [];

    if (selectedImagesArray && Array.isArray(selectedImagesArray)) {
      // 有 selectedImages 数据：使用它（已过滤）
      newData.connectedImages = selectedImagesArray;
    } else {
      // 向后兼容：没有 selectedImages 数据时传递所有图片
      newData.connectedImages = allImages;
    }
  } else {
    newData.connectedImages = undefined;
  }
} else {
  newData.connectedImages = undefined;
}
```

**问题**: ReferenceImageNode 保存 `selectedImages` 到 `node.data` 时是**数组**，App.jsx 中间件错误地使用 Set 的 `.size` 和 `.has()` 方法处理

**解决方案**:
1. 使用 `Array.isArray()` 检查数据类型
2. 直接使用已过滤的数组，无需再次过滤
3. 向后兼容：没有数据时使用所有图片
4. 数据流：ReferenceImageNode (Set) → 过滤 → Array → node.data → App.jsx → 目标节点

**修复日期**: 2026-01-02

**修复文件**:
- `src/client/src/nodes/input/ReferenceImageNode.jsx` - Lines 12-17, 29-39, 47, 59（工作流恢复支持）
- `src/client/src/App.jsx` - Lines 269-280（修复数组处理逻辑）

**相关文档**:
- SKILL.md: 错误模式 40

---

## 开发参考

原项目代码位于 `reference/` 目录，开发时可参考：
- `reference/doubao/` - Chrome 扩展实现
- `reference/tools/` - HTTP 服务器实现
- `reference/用户输入文件夹/聚鑫sora2/` - 聚鑫 API 文档
- `reference/用户输入文件夹/贞贞工坊/` - 贞贞 API 文档
- `reference/用户输入文件夹/开发经验/Sora2_Character_Best_Practices.md` - 开发经验总结
