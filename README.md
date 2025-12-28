# WinJin AIGC - 开源重构版本

> 基于原版 WinJin AIGC 的开源重构，移除激活验证机制

## ✨ 已实现功能

### 核心模块
- ✅ **Sora2 API 客户端** - 支持聚鑫/贞贞双平台
- ✅ **HTTP 服务器** - 端口 9000，提供 RESTful API
- ✅ **批量任务队列** - 逐一提交，按序轮询
- ✅ **Web 界面** - 简洁的视频生成界面

### 视频生成功能
- ✅ **文生视频** - 单个提示词生成视频
- ✅ **故事板视频** - 单次 API 生成多镜头视频
- ✅ **带角色参考** - 使用角色 (@username) 生成视频
- ✅ **角色创建** - 从视频中提取角色

### 批量任务机制（重点功能）
```
用户提交多个任务
    ↓
系统逐一提交 → 收集所有任务 ID
    ↓
从第一个任务开始查询状态
    ↓
完成后查询下一个任务
    ↓
直到所有任务完成
```

## 📁 项目结构

```
winjin/
├── src/
│   ├── server/
│   │   ├── index.js          # HTTP 服务器主入口
│   │   ├── sora2-client.js   # Sora2 API 客户端（支持双平台）
│   │   └── batch-queue.js    # 批量任务队列模块
│   └── renderer/
│       └── public/
│           └── index.html    # Web 界面
├── reference/                # 原项目代码参考（归档）
│   ├── 文镜AIGC.exe
│   ├── doubao/               # Chrome 扩展
│   ├── tools/                # HTTP 服务器参考
│   └── 用户输入文件夹/        # Sora2 API 文档
├── .claude/                  # Claude Code 配置
├── .env.example              # 环境变量模板
└── package.json
```

## 🚀 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置 API Key
cp .env.example .env
# 编辑 .env 文件，填入你的 SORA2_API_KEY

# 3. 启动 HTTP 服务器
npm run server

# 4. 访问 Web 界面
# 打开浏览器访问: file:///E:/User/GitHub/winjin/src/renderer/public/index.html
```

## 📡 API 接口文档

### 基础接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/api/platform/list` | GET | 获取支持的平台列表 |

### 视频生成

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/video/create` | POST | 创建视频（文生视频） |
| `/api/video/create-with-character` | POST | 创建视频（带角色参考） |
| `/api/video/storyboard` | POST | 创建故事板视频（单次 API 多镜头） |
| `/api/character/create` | POST | 创建角色（从视频提取） |

### 任务查询

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/task/:taskId` | GET | 查询任务状态 |
| `/api/task/:taskId/wait` | GET | 轮询等待任务完成 |

### 批量任务队列

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/batch/create` | POST | 创建批量任务 |
| `/api/batch/:batchId/submit` | POST | 提交批量任务（逐一提交） |
| `/api/batch/:batchId/poll` | GET | 轮询批量任务状态（按序查询） |
| `/api/batch/:batchId/status` | GET | 获取批量任务状态 |
| `/api/batch/list` | GET | 获取所有批量任务 |
| `/api/batch/:batchId` | DELETE | 删除批量任务 |

## 🔑 使用示例

### 1. 文生视频

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

### 2. 故事板视频（多镜头）

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

### 3. 批量任务队列

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

## 📚 参考文档

| 资源 | 位置 |
|------|------|
| **Sora2 API (聚鑫)** | `reference/用户输入文件夹/聚鑫sora2/` |
| **Sora2 API (贞贞)** | `reference/用户输入文件夹/贞贞工坊/` |
| **开发经验/最佳实践** | `reference/用户输入文件夹/开发经验/` |
| **原项目代码** | `reference/` |

## 🔧 开发规范

详见 `.claude/rules/` 目录：
- `base.md` - 技术栈约束和 API 版本要求
- `code.md` - 代码风格和命名约定

## ⚠️ 重要提示

1. **角色创建时禁止传递 `model` 参数**，否则会导致 404 错误
2. **禁止使用 `child_process` 调用 API**，必须使用 `fetch` 或 `axios`
3. **贞贞平台使用 `aspect_ratio`（如 "16:9"）**，聚鑫平台使用 `orientation`（如 "landscape"）
4. **故事板是单个任务**，批量队列是多个独立任务

---

**版本**: 2.0.0 (重构版)
**原项目**: 归档于 `reference/` 目录
