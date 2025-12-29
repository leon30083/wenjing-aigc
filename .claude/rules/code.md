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

## 开发参考

原项目代码位于 `reference/` 目录，开发时可参考：
- `reference/doubao/` - Chrome 扩展实现
- `reference/tools/` - HTTP 服务器实现
- `reference/用户输入文件夹/聚鑫sora2/` - 聚鑫 API 文档
- `reference/用户输入文件夹/贞贞工坊/` - 贞贞 API 文档
- `reference/用户输入文件夹/开发经验/Sora2_Character_Best_Practices.md` - 开发经验总结
