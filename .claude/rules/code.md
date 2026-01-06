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
  100:  'queued': 'IN_PROGRESS',
  101:  'pending': 'NOT_START',
  102:  'processing': 'IN_PROGRESS',
  103:  'completed': 'SUCCESS',
  104:  'failed': 'FAILURE'
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
const MAX_POLLING_AGE = 24 * 60 * 60 * 1000; // 24小时 - 超过此时间的任务不再轮询

async function checkAndUpdateTask(taskId, platform, createdAt) {
  try {
    // ⭐ 时间检查：超过24小时的任务标记为 stale
    if (createdAt) {
      const age = Date.now() - new Date(createdAt).getTime();
      if (age > MAX_POLLING_AGE) {
        historyStorage.updateRecord(taskId, { status: 'stale' });
        console.log(`[轮询] 任务超时（${Math.floor(age / (60 * 60 * 1000))}小时前），标记为 stale: ${taskId}`);
        return;
      }
    }

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
    try {
      const queuedTasks = historyStorage.getAllRecords({ status: 'queued' });
      const processingTasks = historyStorage.getAllRecords({ status: 'processing' });
      const allPendingTasks = [...queuedTasks, ...processingTasks];

      if (allPendingTasks.length > 0) {
        console.log(`[轮询] 检查 ${allPendingTasks.length} 个待处理任务...`);
      }

      for (const record of allPendingTasks) {
        await checkAndUpdateTask(record.taskId, record.platform, record.createdAt);
      }
    } catch (error) {
      console.error('[轮询] 服务错误:', error.message);
    }
  }, POLL_INTERVAL);

  console.log(`[轮询] 服务已启动，间隔 ${POLL_INTERVAL / 1000} 秒（最大轮询时间: 24小时）`);
}

// 在服务器启动时调用
app.listen(PORT, () => {
  startPollingService();
});
```

**任务状态定义**:
- `'queued'`: 已提交，等待处理
- `'processing'`: 正在处理中
- `'completed'`: 已完成
- `'failed'`: 失败
- `'stale'`: 超过24小时未完成的任务（不再自动轮询）⭐ 新增 (2026-01-04)

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

---

## 错误模式参考 ⭐ 2026-01-06 更新

> **重要**: 所有错误模式已统一管理到 `.claude/rules/error-patterns.md`，按类型分类便于查找。

### 快速链接

| 类型 | 错误数量 | 关键词 |
|------|----------|--------|
| [API 相关](error-patterns.md#api-相关) | 8个 | 双平台、轮询、端点、模型 |
| [React Flow 相关](error-patterns.md#react-flow-相关) | 6个 | 数据传递、Handle、连接 |
| [角色系统相关](error-patterns.md#角色系统相关) | 5个 | 引用、显示、插入 |
| [表单/输入相关](error-patterns.md#表单输入相关) | 2个 | 验证、格式 |
| [存储/持久化相关](error-patterns.md#存储持久化相关) | 4个 | localStorage、工作流 |
| [UI/渲染相关](error-patterns.md#ui渲染相关) | 3个 | 布局、样式 |
| [其他](error-patterns.md#其他) | 20个 | ... |

### 高频错误（必读）

1. **错误1**: 双平台任务ID不兼容 ⭐⭐⭐
2. **错误6**: 轮询间隔太短（429错误）⭐⭐⭐
3. **错误16**: React Flow 节点间数据传递错误 ⭐⭐⭐
4. **错误17**: API 端点路径缺少前缀 ⭐⭐⭐
5. **错误48**: 优化节点错误使用双显示功能 ⭐⭐⭐

**查看完整错误模式**: [`.claude/rules/error-patterns.md`](error-patterns.md)

---

## 参考文档

| 文档 | 位置 | 用途 |
|------|------|------|
| **错误模式参考** | `.claude/rules/error-patterns.md` | 所有错误模式（按类型分类）⭐ |
| **技术规范** | `.claude/rules/base.md` | 技术栈、API 规范 |
| **文档更新规范** | `.claude/rules/docs.md` | 文档更新流程 |
| **快速参考** | `.claude/rules/quick-reference.md` | 开发前必读 |
