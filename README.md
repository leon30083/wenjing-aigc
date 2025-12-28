# WinJin AIGC - 开源重构版本

> 基于原版 WinJin AIGC 的开源重构，移除激活验证机制，使用现代技术栈重新实现。

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

## ✨ 功能特性

### 🎬 视频生成
- ✅ **文生视频** - 单个提示词生成视频
- ✅ **故事板视频** - 单次 API 生成多镜头视频
- ✅ **带角色参考** - 使用角色 (@username) 生成视频

### 👤 角色管理
- ✅ **角色创建** - 从视频中提取角色
- ✅ **角色库管理** - 保存、搜索、统计创建的角色
- ✅ **从历史记录创建** - 一键从已完成的视频创建角色

### 📊 数据管理
- ✅ **历史记录** - 自动保存所有任务记录
- ✅ **任务状态跟踪** - 实时查询任务进度
- ✅ **视频下载** - 自动下载完成的视频

### ⚙️ 批量任务
- ✅ **批量任务队列** - 逐一提交，按序轮询
- ✅ **批量状态查询** - 统一管理多个任务

### 🌐 双平台支持
- ✅ **聚鑫平台** (api.jxincm.cn)
- ✅ **贞贞平台** (ai.t8star.cn)

## 📁 项目结构

```
winjin/
├── .claude/                      # Claude Code 配置
│   ├── settings.json             # MCP 服务器配置
│   └── rules/                    # 开发规则
│       ├── base.md               # 技术栈约束
│       └── code.md               # 代码规范
├── data/                         # 数据持久化（自动创建）
│   ├── history.json              # 历史记录
│   └── characters.json           # 角色库
├── downloads/                    # 视频下载目录（自动创建）
├── reference/                    # 参考文档
│   └── 用户输入文件夹/
│       ├── 开发经验/             # 开发文档
│       │   ├── Sora2_Character_Best_Practices.md
│       │   └── 开发交接书.md
│       ├── 聚鑫sora2/            # 聚鑫 API 文档
│       └── 贞贞工坊/             # 贞贞 API 文档
├── src/
│   ├── server/                   # HTTP 服务器
│   │   ├── index.js              # Express 主文件
│   │   ├── sora2-client.js       # Sora2 API 客户端
│   │   ├── history-storage.js    # 历史记录存储
│   │   ├── character-storage.js  # 角色库存储
│   │   └── batch-queue.js        # 批量任务队列
│   └── renderer/
│       └── public/
│           └── index.html        # Web 前端界面
├── .env.example                  # 环境变量模板
├── .gitignore
├── package.json
└── README.md
```

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/leon30083/wenjing-aigc.git
cd wenjing-aigc

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的 API Key

# 4. 启动 HTTP 服务器
npm run server

# 5. 访问 Web 界面
# 在浏览器中打开: file:///E:/path/to/winjin/src/renderer/public/index.html
```

### 环境变量配置

```bash
# .env 文件内容
SORA2_API_KEY=sk-your-juxin-api-key      # 聚鑫平台 API Key（必填）
ZHENZHEN_API_KEY=sk-your-zhenzhen-api-key # 贞贞平台 API Key（可选）
PORT=9000                                  # 服务器端口
```

## 📡 API 接口文档

### 健康检查

| 接口 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/api/platform/list` | GET | 获取支持的平台列表 |

### 视频生成

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/video/create` | POST | 创建视频（文生视频） |
| `/api/video/create-with-character` | POST | 创建视频（带角色参考） |
| `/api/video/storyboard` | POST | 创建故事板视频（多镜头） |
| `/api/video/download` | POST | 下载视频 |

### 角色管理

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/character/create` | POST | 创建角色 |
| `/api/character/list` | GET | 获取角色列表 |
| `/api/character/stats` | GET | 获取角色统计 |
| `/api/character/:id` | GET | 获取单个角色 |
| `/api/character/search/:query` | GET | 搜索角色 |
| `/api/character/:id` | DELETE | 删除角色 |
| `/api/character/all` | DELETE | 清空所有角色 |

### 任务查询

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/task/:taskId` | GET | 查询任务状态 |
| `/api/task/:taskId/wait` | GET | 等待任务完成 |

### 历史记录

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/history/list` | GET | 获取历史记录 |
| `/api/history/stats` | GET | 获取统计信息 |
| `/api/history/:taskId` | GET | 获取单条记录 |
| `/api/history/:taskId` | DELETE | 删除记录 |
| `/api/history/all` | DELETE | 清空所有记录 |

### 批量任务

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/batch/create` | POST | 创建批量任务 |
| `/api/batch/:batchId/submit` | POST | 提交批量任务 |
| `/api/batch/:batchId/poll` | GET | 轮询批量任务 |
| `/api/batch/:batchId/status` | GET | 获取批量任务状态 |
| `/api/batch/list` | GET | 获取所有批量任务 |
| `/api/batch/:batchId` | DELETE | 删除批量任务 |

## 💡 使用示例

### 1. 创建视频

```bash
curl -X POST http://localhost:9000/api/video/create \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "juxin",
    "prompt": "A cute cat playing with a ball",
    "model": "sora-2",
    "orientation": "landscape",
    "duration": 10,
    "size": "small"
  }'
```

### 2. 创建角色（推荐方式）

```bash
# 方式1: 从已完成的视频任务创建（推荐）
curl -X POST http://localhost:9000/api/character/create \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "zhenzhen",
    "from_task": "video_xxx",
    "timestamps": "1,3"
  }'

# 方式2: 从视频 URL 创建（可能失败）
curl -X POST http://localhost:9000/api/character/create \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "zhenzhen",
    "url": "https://video-url.com/file.mp4",
    "timestamps": "1,3"
  }'
```

### 3. 故事板视频（多镜头）

```bash
curl -X POST http://localhost:9000/api/video/storyboard \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "juxin",
    "shots": [
      {"duration": 5, "scene": "飞机起飞"},
      {"duration": 5, "scene": "飞机降落"}
    ],
    "model": "sora-2"
  }'
```

### 4. 批量任务队列

```bash
# 步骤 1: 创建批量任务
curl -X POST http://localhost:9000/api/batch/create \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "juxin",
    "jobs": [
      {"prompt": "A cat playing"},
      {"prompt": "A dog running"},
      {"prompt": "A bird flying"}
    ]
  }'
# 返回: {"success": true, "data": {"batchId": "batch_xxx"}}

# 步骤 2: 提交批量任务
curl -X POST http://localhost:9000/api/batch/batch_xxx/submit

# 步骤 3: 轮询批量任务状态
curl http://localhost:9000/api/batch/batch_xxx/poll
```

## 🎨 Web 界面功能

### 文生视频
- 选择平台（聚鑫/贞贞）
- 输入提示词
- 配置视频参数（模型、方向、时长、分辨率）
- 创建视频并显示结果

### 创建角色
- 支持从视频 URL 创建
- 支持从历史记录一键创建（推荐）
- 自动保存到角色库

### 角色库
- 查看所有创建的角色
- 搜索角色（按用户名或 ID）
- 查看角色统计信息
- 删除角色

### 历史记录
- 查看所有任务记录
- 从已完成的任务创建角色
- 查看视频预览
- 删除记录

## 📚 开发文档

| 文档 | 位置 |
|------|------|
| **开发交接书** | `reference/用户输入文件夹/开发经验/开发交接书.md` |
| **角色创建最佳实践** | `reference/用户输入文件夹/开发经验/Sora2_Character_Best_Practices.md` |
| **Sora2 API (聚鑫)** | `reference/用户输入文件夹/聚鑫sora2/` |
| **Sora2 API (贞贞)** | `reference/用户输入文件夹/贞贞工坊/` |
| **开发规范** | `.claude/rules/` |

## 🔧 开发规范

详见 `.claude/rules/` 目录：

- **base.md** - 技术栈约束和 API 版本要求
- **code.md** - 代码风格、命名约定和最佳实践

### 关键规范

1. **角色创建禁止传递 `model` 参数**
   ```javascript
   // ❌ 错误
   await axios.post('/sora/v1/characters', {
     model: 'sora-2',  // 会导致 404 错误
     url: videoUrl,
     timestamps: '1,3'
   });

   // ✅ 正确
   await axios.post('/sora/v1/characters', {
     from_task: taskId,
     timestamps: '1,3'
   });
   ```

2. **禁止使用 `child_process` 调用 API**
   ```javascript
   // ❌ 错误：会导致进程僵死
   const { spawn } = require('child_process');
   spawn('curl', ['https://api...']);

   // ✅ 正确：使用 axios
   await axios.post('https://api...', data);
   ```

3. **平台差异处理**
   - 聚鑫查询任务: `GET /v1/video/query?id={taskId}`
   - 贞贞查询任务: `GET /v2/videos/generations/{taskId}`

## ⚠️ 重要提示

1. **角色创建推荐使用 `from_task` 参数**
   - 直接使用视频 URL 可能因防盗链/过期而失败
   - 从已完成的视频任务创建更可靠

2. **轮询间隔建议 30-60 秒**
   - Sora2 视频生成需要 3-5 分钟
   - 过短会导致 429 Rate Limit 错误

3. **贞贞平台使用 `aspect_ratio`（如 "16:9"）**
   - 聚鑫平台使用 `orientation`（如 "landscape"）

4. **数据自动保存**
   - 视频创建成功 → 自动保存到历史记录
   - 角色创建成功 → 自动保存到角色库

## 🛠️ 常用命令

```bash
# 启动 HTTP 服务器
npm run server

# 启动 Electron 应用
npm start

# 开发模式（热重载）
npm run dev
```

## 📦 依赖项

### 核心依赖
- **express** (^4.18.2) - HTTP 服务器框架
- **axios** (^1.6.5) - HTTP 客户端
- **dotenv** (^17.2.3) - 环境变量管理
- **cors** (^2.8.5) - 跨域支持
- **form-data** (^4.0.0) - 表单数据

### 开发依赖
- **electron** (^28.0.0) - 桌面应用框架
- **vite** (^5.0.12) - 前端构建工具
- **nodemon** (^3.0.2) - 开发时自动重启
- **prettier** (^3.2.5) - 代码格式化

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**版本**: 2.0.0 (重构版)
**最后更新**: 2025-12-29
**原项目**: 归档于 `reference/` 目录
