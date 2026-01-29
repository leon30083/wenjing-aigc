# WinJin AIGC - 开源重构版本

> 基于原版 WinJin AIGC 的开源重构，移除激活验证机制，使用现代技术栈重新实现。
> **核心特性**: 可视化工作流画布 - 拖拽节点，自由连接，一键生成视频

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue)](https://reactjs.org/)
[![React Flow](https://img.shields.io/badge/React_Flow-11.0.0-purple)](https://reactflow.dev/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Download](https://img.shields.io/badge/download-v2.0.2-brightgreen)](https://github.com/leon30083/wenjing-aigc/releases/latest)

---

## 📥 下载桌面应用

### 最新版本: v2.0.2

**[下载 WinJin AIGC v2.0.2](https://github.com/leon30083/wenjing-aIGC/releases/download/v2.0.2/WinJinAIGC-v2.0.2.zip)**

| 版本 | 日期 | 大小 | 说明 |
|------|------|------|------|
| [v2.0.2](https://github.com/leon30083/wenjing-aIGC/releases/tag/v2.0.2) | 2026-01-29 | 573 MB | 🎉 后端服务可见终端窗口支持 |
| [v2.0.1](https://github.com/leon30083/wenjing-aIGC/releases/tag/v2.0.1) | 2026-01-29 | - | 后端服务启动验证 |
| [v2.0.0](https://github.com/leon30083/wenjing-aIGC/releases/tag/v2.0.0) | 2026-01-23 | - | 首次 Electron 版本 |

**使用方法**:
1. 下载并解压 ZIP 文件
2. 双击 `WinJin AIGC.exe` 启动应用
3. 主窗口显示前端界面，独立终端窗口显示后端日志

---

## ✨ 核心功能

### 🎨 可视化工作流画布 ⭐ 核心特性

基于 React Flow 的可视化编辑器，通过拖拽节点和连线构建复杂的视频生成工作流。

**特点**:
- 🖱️ **拖拽式节点编辑** - 拖拽添加节点，可视化连线连接
- 🔗 **智能数据传递** - 节点间自动传递数据，支持角色、图片、提示词等
- 💾 **工作流管理** - 保存、加载、导出、导入工作流
- 🔄 **实时预览** - 实时查看任务进度和生成结果

### 🎬 视频生成节点

**功能**: 生成单个视频，支持文本生成和图片生成两种模式

**特性**:
- ✅ **双平台支持** - 聚鑫平台、贞贞平台（内置 API Key）
- ✅ **角色引用** - 支持使用 `@username` 格式引用角色
- ✅ **参考图片** - 支持多张参考图片生成视频
- ✅ **旁白模式** - 从旁白处理器加载优化后的句子
- ✅ **参数配置** - 模型、时长（5/10/15/25秒）、比例（16:9/9:16）

### 👤 角色系统节点

#### 角色库节点 (Character Library Node)
**功能**: 管理已创建的角色库

**特性**:
- 📊 **显示所有角色** - 头像、别名、用户名
- 🔍 **搜索和筛选** - 按名称搜索，支持全部/收藏/最近使用筛选
- ⭐ **收藏功能** - 标记常用角色
- 📤 **传送到视频节点** - 连接后可选择角色传递给视频生成节点
- ✏️ **角色编辑** - 编辑角色别名、删除角色

#### 角色创建节点 (Character Create Node)
**功能**: 从已完成的视频中提取角色

**特性**:
- 🎯 **一键创建** - 从任务结果节点创建角色
- 📸 **时间戳选择** - 选择视频中的关键时刻（1-3秒范围）
- 📋 **创建历史** - 查看所有创建记录

#### 角色结果节点 (Character Result Node)
**功能**: 显示角色创建任务的详细结果

**特性**:
- 📋 **显示角色详情** - ID、用户名、别名、头像
- 📎 **复制功能** - 一键复制角色 ID、用户名

### 📖 旁白处理节点

#### 旁白输入节点 (Narrator Input Node)
**功能**: 输入多行旁白文本（每行一个句子）

**特性**:
- 📝 **多行输入** - 支持每行一个句子的格式
- 👤 **角色引用** - 支持在句子中使用 `@username` 引用角色
- 🎨 **风格选择** - 绘本/电影/纪录片/动画/自定义风格
- ⏱️ **时长设置** - 5/10/15/25秒
- ⚖️ **优化方向** - 平衡/更详细/更简洁/更创意/更专业

#### 旁白处理器节点 (Narrator Processor Node)
**功能**: 调用 OpenAI API 优化旁白句子

**特性**:
- 🚀 **批量优化** - 一键优化所有句子
- 📊 **优化进度** - 实时显示优化进度和状态
- ⏮️⏭️ **导航功能** - 上一句/下一句切换
- 📋 **复制结果** - 一键复制优化后的提示词
- 🔄 **重新优化** - 对单个句子或全部句子重新优化
- 📺 **旁白模式** - 传递给视频生成节点，支持加载当前句子/下一个句子

#### OpenAI 配置节点 (OpenAI Config Node)
**功能**: 配置 OpenAI API 用于提示词优化

**特性**:
- 🔧 **灵活配置** - 支持自定义 Base URL、API Key、模型
- 🧪 **测试功能** - 测试 API 连接是否正常
- 📂 **加载配置** - 从 localStorage 加载已保存的配置
- 🗑️ **清除配置** - 清除当前配置

### ⚙️ API 设置节点 (API Settings Node)
**功能**: 配置视频生成 API 参数

**特性**:
- 🌐 **双平台选择** - 聚鑫平台、贞贞平台（内置密钥）
- 🎯 **模型选择** - 根据平台自动显示可用模型
- 📐 **比例设置** - 16:9 横屏、9:16 竖屏
- 💧 **水印选项** - 是否添加水印

### 📺 任务结果节点 (Task Result Node)
**功能**: 显示视频生成任务的实时状态和最终结果

**特性**:
- 📊 **实时进度** - 显示任务处理进度百分比
- 🔄 **自动轮询** - 自动查询任务状态
- 📹 **视频预览** - 任务完成后显示视频播放器
- ⬇️ **下载视频** - 一键下载生成的视频
- 🔗 **复制链接** - 复制视频 URL
- 🔄 **手动查询** - 手动刷新任务状态

### 📁 工作流管理

**功能**: 管理工作流的保存、加载、导出、导入

**特性**:
- 💾 **保存工作流** - 保存当前节点和连线到本地存储
- 📂 **加载工作流** - 从已保存的工作流列表加载
- 🗑️ **删除工作流** - 删除指定工作流（带确认）
- 📤 **导出工作流** - 导出为 JSON 文件
- 📥 **导入工作流** - 从 JSON 文件导入

**⚠️ 已知限制**:
- 工作流重命名功能暂未实现

---

## 📁 项目结构

```
winjin/
├── .claude/                      # Claude Code 配置和开发规范
│   ├── rules/                    # 开发规则文档
│   │   ├── base.md               # 技术栈约束
│   │   ├── code.md               # 代码规范
│   │   ├── error-patterns.md     # 错误模式参考
│   │   └── quick-reference.md    # 快速参考 ⭐ 开发前必读
│   ├── templates/                # 文档模板
│   └── metrics/                  # 验证指标数据
├── data/                         # 数据持久化（自动创建）
│   ├── history.json              # 历史记录
│   └── characters.json           # 角色库
├── downloads/                    # 视频下载目录（自动创建）
├── docs/                         # 项目文档 ⭐ Phase 3
│   └── validation-guide.md       # 验证系统使用指南
├── reference/                    # 参考文档
│   └── 用户输入文件夹/
│       ├── 开发经验/             # 开发文档
│       ├── 聚鑫sora2/            # 聚鑫 API 文档
│       └── 贞贞工坊/             # 贞贞 API 文档
├── scripts/                      # 验证和修复脚本 ⭐ Phase 3
│   ├── auto-fix.js               # 自动修复工具
│   ├── check-claude-sync.js      # 配置同步检查 ⭐ 新增
│   ├── install-git-hooks.js      # Git Hooks 安装器 ⭐ 新增
│   ├── validate-*.js             # 验证脚本
│   └── detect-*.js               # 检测脚本
├── src/
│   ├── server/                   # Express 后端 API
│   │   ├── index.js              # 主文件
│   │   ├── sora2-client.js       # Sora2 API 客户端
│   │   ├── history-storage.js    # 历史记录存储
│   │   ├── character-storage.js  # 角色库存储
│   │   └── services/             # 业务服务
│   │       ├── openaiClient.js   # OpenAI API 客户端 ⭐ 新增
│   │       └── ...
│   └── client/                   # React 前端（工作流画布）⭐ 核心
│       ├── src/
│       │   ├── nodes/            # 自定义节点 ⭐ 核心
│       │   │   ├── input/        # 输入节点
│       │   │   │   ├── APISettingsNode.jsx
│       │   │   │   ├── CharacterLibraryNode.jsx
│       │   │   │   ├── NarratorNode.jsx
│       │   │   │   ├── OpenAIConfigNode.jsx
│       │   │   │   ├── ReferenceImageNode.jsx
│       │   │   │   └── TextNode.jsx
│       │   │   ├── output/       # 输出节点
│       │   │   │   ├── CharacterResultNode.jsx
│       │   │   │   └── TaskResultNode.jsx
│       │   │   └── process/      # 处理节点
│       │   │       ├── CharacterCreateNode.jsx
│       │   │       ├── JuxinStoryboardNode.jsx
│       │   │       ├── NarratorProcessorNode.jsx
│       │   │       ├── PromptOptimizerNode.jsx
│       │   │       ├── StoryboardNode.jsx
│       │   │       ├── VideoGenerateNode.jsx
│       │   │       ├── VideoNode.jsx
│       │   │       └── ZhenzhenStoryboardNode.jsx
│       │   ├── components/      # UI 组件
│       │   ├── hooks/           # 业务逻辑
│       │   ├── App.jsx          # 主应用
│       │   └── main.jsx         # 入口
│       └── package.json         # 前端依赖
├── .env.example                  # 环境变量模板
├── .git-hooks/                   # Git Hooks 模板 ⭐ 新增
│   ├── post-merge               # 合并后检测
│   └── post-checkout            # 分支切换检测
├── .gitignore                    # 包含 .synced 忽略规则 ⭐ 新增
├── package.json                  # 包含 sync: 命令 ⭐ 新增
├── README.md                     # 本文件
└── CLAUDE.md                     # 项目开发规范 ⭐ 必读
```

---

## 🚀 快速开始

### 快速启动 ⚡

#### Windows 用户（推荐）

**一键启动开发环境**:
双击运行 `start-dev.bat` 即可。

脚本会自动：
1. ✅ 检查 Node.js 和 npm 是否安装
2. ✅ 检查 .env 文件是否存在（不存在则自动创建）
3. ✅ 检查端口 9000 和 5173 是否被占用（询问是否清理）
4. ✅ 启动后端服务器（端口 9000）
5. ✅ 启动前端开发服务器（端口 5173）
6. ✅ 自动打开浏览器访问 http://localhost:5173/

**停止开发环境**:
双击运行 `stop-dev.bat` 即可停止所有服务。

#### 手动启动（高级用户）

如果需要手动启动，请参考以下步骤：

**步骤 1: 启动后端服务器**（终端1）
```bash
npm run server
```

**步骤 2: 启动前端开发服务器**（终端2）
```bash
cd src/client
npm run dev
```

**步骤 3: 浏览器访问**
```
http://localhost:5173/
```

**⚠️ 注意**:
- 必须同时运行两个服务器（后端 + 前端）
- 访问 5173 端口（工作流画布），不是 9000 端口
- 9000 端口是后端 API，不直接访问

### 环境要求

- **Node.js**: >= 16.0.0
- **npm**: >= 8.0.0

### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/leon30083/wenjing-aigc.git
cd wenjing-aigc

# 2. 安装依赖
npm install

# 3. 配置环境变量（可选）
cp .env.example .env
# 编辑 .env 文件，填入你的 API Key（或使用内置密钥）

# 4. 启动开发环境
npm run server     # 终端1
cd src/client && npm run dev   # 终端2

# 5. 浏览器访问
# http://localhost:5173/
```

### 环境变量配置

```bash
# .env 文件内容（可选，项目已内置双平台密钥）
SORA2_API_KEY=sk-your-juxin-api-key      # 聚鑫平台 API Key（可选）
ZHENZHEN_API_KEY=sk-your-zhenzhen-api-key # 贞贞平台 API Key（可选）
OPENAI_API_KEY=sk-your-openai-key         # OpenAI API Key（可选）
PORT=9000                                  # 服务器端口
```

**💡 提示**: 项目已内置聚鑫和贞贞平台的 API Key，可以直接使用。如需使用自己的密钥，可在 `.env` 文件中配置。

---

## 🎯 使用指南

### 工作流画布基础

#### 添加节点

1. 点击工具栏的 **"+ 添加节点"** 按钮
2. 从下拉菜单中选择节点类型
3. 新节点会出现在画布中央

#### 连接节点

1. 拖拽源节点的输出端口（右侧圆点）到目标节点的输入端口（左侧圆点）
2. 连接线上会显示端口名称
3. 数据会自动从源节点传递到目标节点

#### 删除节点

1. **单个删除**: 右键点击节点 → 选择"删除节点"
2. **批量删除**: 选中多个节点 → 点击工具栏"🗑️ 删除选中"按钮
3. **快捷键**: 选中节点后按 Delete 键

#### 移动节点

拖拽节点标题栏可移动节点位置

#### 调整节点大小

拖拽节点右下角的三角形缩放手柄

### 典型工作流示例

#### 示例 1: 简单视频生成

```
[API 设置] → [视频生成] → [任务结果]
```

**步骤**:
1. 添加 API 设置节点，配置平台和模型
2. 添加视频生成节点，输入提示词
3. 添加任务结果节点，查看生成结果
4. 连接节点：API 设置 → 视频生成 → 任务结果

#### 示例 2: 带角色的视频生成

```
[角色库] → [视频生成] → [任务结果]
             ↑
        [API 设置]
```

**步骤**:
1. 添加角色库节点，选择要使用的角色
2. 添加视频生成节点，在提示词中插入角色引用
3. 连接角色库到视频生成节点
4. 点击视频生成节点的角色卡片插入 `@username`

#### 示例 3: 旁白优化 + 视频生成

```
[旁白输入] → [旁白处理器] → [视频生成] → [任务结果]
                              ↑
                         [OpenAI 配置]
                              ↑
                         [API 设置]
```

**步骤**:
1. 添加旁白输入节点，输入多行旁白
2. 添加 OpenAI 配置节点，配置 API
3. 添加旁白处理器节点，点击"🚀 全部优化"
4. 添加视频生成节点，点击"📥 加载当前旁白"
5. 连接所有节点
6. 生成视频后，点击"⏭️ 下一个"生成下一个句子

#### 示例 4: 角色创建

```
[视频生成] → [任务结果] → [角色创建] → [角色结果]
```

**步骤**:
1. 完成视频生成后，在任务结果节点点击"👤 创建角色"
2. 添加角色创建节点，自动填充视频 URL
3. 添加角色结果节点，查看创建结果
4. 连接节点并创建角色

---

## 📡 API 接口文档

### 健康检查

| 接口 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/api/platform/list` | GET | 获取支持的平台列表 |

### 视频生成

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/video/create` | POST | 创建视频（文生视频/图生视频） |
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
| `/api/character/:username/favorite` | PUT | 设置收藏状态 ⭐ 新增 |

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

### OpenAI API ⭐ 新增

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/openai/optimize` | POST | 优化提示词 |

---

## 💡 使用示例

### 1. 创建视频（API 调用）

```bash
curl -X POST http://localhost:9000/api/video/create \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "juxin",
    "prompt": "一只可爱的猫咪在玩耍",
    "model": "sora-2-all",
    "orientation": "landscape",
    "duration": 10,
    "size": "small"
  }'
```

### 2. 创建角色（从任务）

```bash
curl -X POST http://localhost:9000/api/character/create \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "zhenzhen",
    "from_task": "video_xxx",
    "timestamps": "1,3"
  }'
```

### 3. 优化提示词（旁白）⭐ 新增

```bash
curl -X POST http://localhost:9000/api/openai/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "base_url": "https://api.deepseek.com",
    "api_key": "sk-xxx",
    "model": "deepseek-chat",
    "prompt": "一只小猫在玩耍",
    "style": "picture-book",
    "context": {
      "target_duration": 10,
      "characters": [{
        "username": "ebfb9a758.sunnykitte",
        "alias": "测试小猫"
      }]
    }
  }'
```

---

## 📚 开发文档

| 文档 | 位置 | 说明 |
|------|------|------|
| **快速参考** ⭐ 必读 | `.claude/rules/quick-reference.md` | 开发前必读 |
| **开发交接书** | `reference/用户输入文件夹/开发经验/开发交接书.md` | 项目进度记录 |
| **角色创建最佳实践** | `reference/用户输入文件夹/开发经验/Sora2_Character_Best_Practices.md` | Sora2 角色系统 |
| **错误模式参考** ⭐ 重要 | `.claude/rules/error-patterns.md` | 55+ 已知错误及解决方案 |
| **验证系统指南** ⭐ Phase 3 | `docs/validation-guide.md` | 自动化验证系统使用 |

### 开发规范

详见 `.claude/rules/` 目录：

- **base.md** - 技术栈约束和 API 版本要求
- **code.md** - 代码风格、命名约定和最佳实践
- **error-patterns.md** - 所有已知的错误模式和解决方案
- **quick-reference.md** - 快速参考，开发前必读 ⭐

---

## ⚠️ 重要提示

### 工作流画布相关

1. **节点连接验证**: 每个输入端口只能连接特定类型的节点，无效连接会被自动清除
2. **数据传递**: 源节点状态变化时，目标节点会自动更新
3. **工作流自动保存**: 优化完成后自动保存到 localStorage
4. **旁白模式**: 视频生成节点显示"📺 旁白模式"时，可加载当前句子或下一个句子

### API 相关

1. **轮询间隔**: 建议使用 30 秒间隔，过短会导致 429 Rate Limit 错误
2. **双平台差异**:
   - 聚鑫使用 `sora-2-all` 模型
   - 贞贞使用 `sora-2` 或 `sora-2-pro` 模型
3. **角色引用格式**: `@username`（不带花括号）

### 数据持久化

1. **历史记录**: 视频创建成功后自动保存
2. **角色库**: 角色创建成功后自动保存
3. **工作流**: 保存到浏览器 localStorage

---

## 🛠️ 常用命令

```bash
# 启动后端服务器
npm run server

# 启动前端开发服务器
cd src/client && npm run dev

# 配置同步 ⭐ 新增 (2026-01-23)
npm run sync:check      # 检查配置状态
npm run sync:verify     # 验证配置完整性
npm run sync:hooks      # 安装 Git Hooks

# 运行验证 ⭐ Phase 3
npm run validate:all

# 扫描可修复问题
npm run fix:scan

# 查看指标趋势
npm run metrics:trend

# 启动 Electron 应用（打包用）
npm start
```

---

## 🔄 自动化配置同步系统 ⭐ 新增 (2026-01-23)

> **重要**: 多电脑开发环境自动配置同步，确保开发体验一致

### 功能概述

三层自动化机制，自动同步 Claude Code 配置文件：

| 层级 | 机制 | 触发时机 | 功能 |
|------|------|----------|------|
| **Layer 1** | npm postinstall | `npm install` | 自动同步配置文件 |
| **Layer 2** | Claude Code Skill | 自然语言命令 | 智能识别同步命令 |
| **Layer 3** | Git Hooks | git 操作后 | 自动检测配置变化 |

### 快速命令

```bash
# 配置同步命令
npm run sync:check      # 检查配置状态
npm run sync:verify     # 验证配置完整性
npm run sync:config     # 手动同步配置（bash 脚本）

# Git Hooks 管理
npm run sync:hooks          # 安装/更新 Git Hooks
npm run sync:hooks:check   # 检查 Hooks 状态
npm run sync:hooks:uninstall # 卸载 Hooks
```

### 使用场景

#### 新电脑设置
```bash
# 1. 克隆项目
git clone https://github.com/leon30083/wenjing-aigc.git
cd wenjing-aigc

# 2. 安装依赖（自动同步配置）
npm install

# 3. 安装 Git Hooks（可选）
npm run sync:hooks
```

#### 日常使用
```bash
# Git 操作后自动检测
git pull origin main        # 自动触发配置检查
git checkout feature-branch  # 自动触发配置检查

# Skill 命令（在 Claude Code 中）
"同步配置"                   # 同步配置文件
"验证配置"                   # 验证配置完整性
"安装 git hooks"            # 安装 Git Hooks
```

### 核心文件

| 文件 | 功能 | 行数 |
|------|------|------|
| `scripts/check-claude-sync.js` | 配置检查脚本 | 200+ |
| `scripts/install-git-hooks.js` | Git Hooks 安装器 | 180+ |
| `.git-hooks/post-merge` | 合并后检测 | 20 |
| `.git-hooks/post-checkout` | 分支切换检测 | 33 |
| `.claude/skills/auto-config-sync/SKILL.md` | 自然语言 Skill | v1.1.0 |

### 跨平台支持

| 平台 | Git Hooks | 特殊处理 |
|------|-----------|----------|
| **Windows** | PowerShell 脚本 | Bash wrapper 调用 |
| **Linux/macOS** | Bash 脚本 | 直接复制 + chmod |

### 特性

- ✅ **自动同步** - npm install 时自动配置
- ✅ **过期检测** - 7天过期自动重新同步
- ✅ **Git 集成** - 合并/切换分支自动检测
- ✅ **跨平台** - Windows/Unix 兼容
- ✅ **智能识别** - Claude Code 自然语言命令
- ✅ **非侵入式** - 不影响现有工作流

### 验证状态

✅ **全部测试通过** (2026-01-23)

- ✅ npm postinstall 自动同步
- ✅ Claude Code Skill 命令识别（5种模式）
- ✅ Git Hooks 自动检测（post-merge, post-checkout）
- ✅ 跨平台兼容性（Windows PowerShell, Unix Bash）

详细验证报告：[docs/verification-report-sync-system.md](docs/verification-report-sync-system.md)

---

## 📦 技术栈

### 后端
- **Node.js**: >= 16.0.0
- **Express**: ^4.18.2
- **axios**: ^1.6.5
- **dotenv**: ^17.2.3
- **form-data**: ^4.0.0

### 前端（工作流画布）⭐ 核心
- **React**: ^19.0.0
- **React Flow**: ^11.0.0
- **Vite**: ^5.0.0
- **Tailwind CSS**: ^3.4.0（可选）

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开发流程

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

MIT License

---

## 🎉 致谢

- [Sora2 API](https://sora.chatgpt.com/) - 视频生成 API
- [React Flow](https://reactflow.dev/) - 可视化工作流编辑器
- 原版 WinJin AIGC 项目

---

**版本**: 2.0.0 (工作流画布版)
**最后更新**: 2026-01-23
**原项目**: 归档于 `reference/` 目录
