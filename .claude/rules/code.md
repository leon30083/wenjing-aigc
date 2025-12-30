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

### 错误16: React Flow 节点间数据传递错误 ⭐ 新增
```javascript
// ❌ 错误：useEffect 依赖数组包含 nodes 导致无限循环
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
1. 从依赖数组移除 nodes，使用函数式更新自动获取最新值
2. 使用 useNodeId() Hook 获取节点 ID
3. 使用自定义事件系统在节点间传递数据

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
        model: 'sora-2',
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

---

## 开发参考

原项目代码位于 `reference/` 目录，开发时可参考：
- `reference/doubao/` - Chrome 扩展实现
- `reference/tools/` - HTTP 服务器实现
- `reference/用户输入文件夹/聚鑫sora2/` - 聚鑫 API 文档
- `reference/用户输入文件夹/贞贞工坊/` - 贞贞 API 文档
- `reference/用户输入文件夹/开发经验/Sora2_Character_Best_Practices.md` - 开发经验总结
