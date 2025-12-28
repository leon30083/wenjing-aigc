# Sora2 API 开发最佳实践

**更新日期**: 2025-12-28
**项目**: WinJin AIGC
**支持平台**: 聚鑫 (api.jxincm.cn) / 贞贞 (ai.t8star.cn)
**参考文档**: `E:\User\GitHub\winjin\reference\用户输入文件夹/`

---

## 1. 核心结论 (Critical Findings)

### 1.1 严禁使用 child_process
- **问题**: 使用 `child_process.spawn` 调用 API 会导致进程间通信卡死，前端无法收到响应
- **正确做法**: 使用 `axios` 或 `fetch` 直接调用 API

### 1.2 角色创建禁止传 model 参数
- **端点**: `POST /sora/v1/characters`
- **必填**: `url` (视频链接) + `timestamps` (时间范围 "1,3")
- **禁止**: **不要传递 `model` 参数**，否则会导致 `channel not found` / `404`

### 1.3 双平台支持
- **聚鑫平台**: `api.jxincm.cn` - OpenAI 官方格式 + 统一格式
- **贞贞平台**: `ai.t8star.cn` - 统一格式
- **关键差异**: 查询任务端点不同（见下方详细说明）

### 1.4 查询任务状态
- **聚鑫平台**: `GET /v1/video/query?id={taskId}` (查询参数)
- **贞贞平台**: `GET /v2/videos/generations/{taskId}` (路径参数)
- **数据格式**: 需要统一转换为标准格式（见下方）

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

```javascript
const response = await axios.post('https://api.jxincm.cn/sora/v1/characters', {
  url: 'https://video-url.com/file.mp4',
  timestamps: '1,3'  // 时间范围差值必须是 1-3 秒
}, {
  headers: { 'Authorization': 'Bearer <sk-key>' }
});
```

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
- **轮询间隔**: **30-60 秒** (sora2 视频生成需要 3-5 分钟)
- **超时时间**: 600000ms (10 分钟)
- **错误重试**: 指数退避策略

### 4.2 前端轮询示例
```javascript
async function pollTaskStatus(taskId) {
  const interval = 30000;  // 30秒
  const timeout = 600000;  // 10分钟

  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const result = await fetch(`/api/task/${taskId}?platform=juxin`);
    const data = await result.json();

    if (data.data.status === 'SUCCESS') {
      return data.data;  // 返回完整数据
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Task timeout');
}
```

---

## 5. 常见问题排查 (Troubleshooting)

| 现象 | 原因 | 解决方案 |
|------|------|----------|
| **查询返回 HTML** | 使用了错误的查询端点 | 聚鑫用 `/v1/video/query?id=xxx`，贞贞用 `/v2/videos/generations/xxx` |
| **data.output 为 null** | 未正确提取 video_url | 检查响应结构，优先从顶层 `video_url` 提取 |
| **`channel not found` / 404** | 角色创建传了 `model` 参数 | 移除 payload 中的 `model` |
| **`Invalid token`** | API Key 错误或格式不对 | 检查 Header 为 `Bearer sk-...` |
| **前端一直显示 "Creating..."** | 后端使用了 `spawn` 导致阻塞 | 改用 `await fetch()` 或 `await axios()` |
| **频繁 429 错误** | 轮询间隔太短 | 增加到 30-60 秒 |

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
SORA2_API_KEY=sk-Q6DwAtsNvutSlaZXYAzXR39pUmwKHAHDgll0QifCL5GbwJd7

# 贞贞平台 API Key
ZHENZHEN_API_KEY=sk-eaVbmLPTFZ8QSrLV030977Ce0dB94b28B0Ac2495A93cA833

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
├── sora2-client.js      # API 客户端（封装双平台逻辑）
├── batch-queue.js       # 批量任务队列
├── history-storage.js   # 历史记录存储
└── index.js            # Express 服务器
```

---

**最后更新**: 2025-12-28
**维护者**: WinJin AIGC Team
