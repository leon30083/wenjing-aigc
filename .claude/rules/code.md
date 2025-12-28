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

## API 路由规范

### 创建视频 - 保存历史记录

```javascript
app.post('/api/video/create', async (req, res) => {
  const { platform, prompt, model, ...options } = req.body;
  const result = await client.createVideo(req.body);

  // 保存到历史记录
  if (result.success && result.data?.id) {
    historyStorage.addRecord({
      taskId: result.data.id,
      platform,
      prompt,
      model,
      options
    });
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

### 查询任务 - 返回统一格式

```javascript
app.get('/api/task/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const { platform } = req.query;
  const client = getClient(platform);

  // 自动转换为统一格式
  const result = await client.getTaskStatus(taskId);
  res.json(result);
});
```

## 文件结构建议

```
src/server/
├── sora2-client.js      # API 客户端（封装双平台逻辑）
├── batch-queue.js       # 批量任务队列（支持自动下载）
├── history-storage.js   # 历史记录存储（JSON文件持久化）
├── character-storage.js # 角色库存储（JSON文件持久化）⭐
└── index.js            # Express 服务器

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

### 错误2: 忘记提取视频URL
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

### 错误3: 轮询间隔太短
```javascript
// ❌ 错误：5秒间隔导致 429 Rate Limit
setInterval(() => checkStatus(taskId), 5000);

// ✅ 正确：30秒间隔
setInterval(() => checkStatus(taskId), 30000);
```

### 错误4: 创建角色时传递 from_task 参数不完整
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

## 开发参考

原项目代码位于 `reference/` 目录，开发时可参考：
- `reference/doubao/` - Chrome 扩展实现
- `reference/tools/` - HTTP 服务器实现
- `reference/用户输入文件夹/聚鑫sora2/` - 聚鑫 API 文档
- `reference/用户输入文件夹/贞贞工坊/` - 贞贞 API 文档
- `reference/用户输入文件夹/开发经验/Sora2_Character_Best_Practices.md` - 开发经验总结
