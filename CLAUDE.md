# WinJin AIGC 项目开发规范

> **版本**: v2.0.0
> **更新日期**: 2026-01-08
> **自动化开发系统**: 已启用

---

## 项目概述

WinJin AIGC 开源重构版本，基于 Electron + Express + React Flow 的可视化视频生成工作流编辑器。

**核心功能：**
- **工作流编辑器**: 基于 React Flow 的可视化节点编辑器
- **Sora2 视频生成**: 文生视频、角色参考、故事板批量生成
- **角色管理系统**: 角色库管理、别名、收藏、快速调用
- **提示词优化**: AI 自动优化提示词（支持多种风格）
- **双平台支持**: 聚鑫平台 (api.jxincm.cn) 和贞贞平台 (ai.t8star.cn)

---

## 技术栈

### 运行时环境
- **Node.js**: 16.x 或更高
- **npm**: 8.x 或更高
- **操作系统**: Windows 10/11（主要目标平台）

### 核心框架

| 框架/库 | 版本 | 用途 |
|---------|------|------|
| Electron | ^28.0.0 | 桌面应用框架 |
| Express | ^4.18.2 | HTTP 服务器 |
| React | ^19.2.0 | 前端 UI 框架（工作流编辑器） |
| React Flow | ^11.11.4 | 节点编辑器库（可视化工作流） |
| Vite | ^7.2.4 | 前端构建工具 |
| axios | ^1.6.5 | HTTP 客户端 |
| dotenv | ^17.2.3 | 环境变量管理 |

### 架构说明

**后端架构** (Express):
```
src/server/
├── index.js              # Express 服务器主文件
├── sora2-client.js       # Sora2 API 客户端封装
├── history-storage.js    # 历史记录存储
├── character-storage.js  # 角色库存储
└── services/
    └── openaiClient.js   # OpenAI 客户端 (DeepSeek)
```

**前端架构** (React + React Flow):
```
src/client/                      # React 前端 (工作流编辑器) ⭐ 流式画布
├── src/
│   ├── App.jsx                  # 主应用组件 (React Flow)
│   ├── main.jsx                 # React 入口
│   ├── nodes/                   # 自定义节点
│   │   ├── input/               # 输入节点
│   │   │   ├── TextNode.jsx                    # 文本输入
│   │   │   ├── ReferenceImageNode.jsx          # 参考图片
│   │   │   ├── CharacterLibraryNode.jsx        # 角色库选择
│   │   │   └── APISettingsNode.jsx             # API 配置
│   │   ├── process/             # 处理节点
│   │   │   ├── VideoGenerateNode.jsx           # 视频生成
│   │   │   ├── CharacterCreateNode.jsx         # 角色创建
│   │   │   ├── StoryboardNode.jsx              # 故事板
│   │   │   └── VideoNode.jsx                   # 视频节点
│   │   └── output/              # 输出节点
│   │       ├── TaskResultNode.jsx              # 任务结果
│   │       └── CharacterResultNode.jsx         # 角色结果
│   ├── hooks/                  # 自定义 Hooks
│   │   ├── useWorkflowExecution.js            # 工作流执行
│   │   └── useNodeResize.js                   # 节点大小调整
│   └── utils/                  # 工具函数
│       └── workflowStorage.js              # 工作流存储管理
├── package.json
├── vite.config.js
└── index.html
```

**前端架构** (原生 HTML - 已停止维护):
```
src/renderer/
└── public/
    └── index.html              # 原生 HTML 前端 (旧版，已停止开发)
```

---

## 代码规范

### 命名约定

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| 变量/函数 | camelCase | `getUserData`, `userName` |
| 类名/组件 | PascalCase | `UserService`, `VideoGenerateNode` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRIES`, `API_BASE_URL` |
| 私有成员 | 前缀下划线 | `_privateVar`, `_internalMethod` |
| 文件名 | kebab-case 或 PascalCase | `video-generate-node.jsx` |

### 目录结构

```
src/
├── server/                    # Express 后端 API
│   ├── index.js              # 主服务器文件
│   ├── sora2-client.js       # Sora2 API 客户端封装
│   ├── services/             # 业务服务
│   └── routes/               # API 路由
├── client/                    # React 前端 (工作流编辑器)
│   └── src/
│       ├── App.jsx           # 主应用组件
│       ├── nodes/            # 自定义节点
│       ├── components/       # UI 组件
│       ├── hooks/            # 自定义 Hooks
│       └── utils/            # 工具函数
└── renderer/                  # 原生 HTML 前端 (旧版)
    └── public/index.html
```

### 代码风格

```javascript
// ✅ 正确的命名和格式
const getUserData = async (userId) => {
  try {
    const response = await axios.get(`/api/user/${userId}`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ❌ 错误：缺少错误处理
const getUserData = (userId) => {
  return axios.get(`/api/user/${userId}`);
};
```

---

## API 设计规范

### 统一响应格式

```javascript
// 成功响应
{ success: true, data: {...} }

// 失败响应
{ success: false, error: "错误信息" }
```

### API 调用规范

- ✅ 使用 async/await
- ✅ 必须有错误处理 (try-catch)
- ✅ 统一返回格式
- ❌ 不使用回调函数
- ❌ 不忽略错误

---

## 开发流程规范

### 1. Plan → Code → Update Docs

```
1. Plan 模式 (Shift+Tab×2)
   ├─ 分析需求
   ├─ 设计方案
   └─ 等待确认

2. Code 开发
   ├─ 编写代码
   ├─ 自动测试
   └─ 代码审查

3. Update Docs 更新文档
   ├─ .claude/skills/winjin-dev/SKILL.md
   ├─ .claude/rules/base.md
   ├─ .claude/rules/code.md
   ├─ .claude/rules/error-patterns.md
   └─ 用户输入文件夹/开发对话/开发交接书.md
```

### 2. 自动化测试流程

**✅ 自动化优先**:
- 使用 MCP 工具在浏览器中自动测试
- 不需要频繁询问用户"能否测试"
- 每个功能都应该用自动化方式验证

**测试检查清单**:
- [ ] 页面加载成功（无 console 错误）
- [ ] 节点显示正常（截图验证）
- [ ] 表单输入响应
- [ ] API 请求正确
- [ ] 数据更新及时

### 3. 错误模式管理

- 所有错误模式记录在 `.claude/rules/error-patterns.md`
- 新增错误时添加类型标签：`API`, `React Flow`, `Character` 等
- 每周检查错误模式，识别高频错误
- 自动生成防护规则和测试用例

---

## 命令规范

### 开发命令

| 命令 | 说明 |
|------|------|
| `npm start` | 启动 Electron 应用 |
| `npm run server` | 仅启动 HTTP 服务器（端口 9000） |
| `cd src/client && npm run dev` | 启动流式画布（Vite 开发服务器，端口 5173） ⭐ |

### 流式画布开发命令 ⭐

```bash
# 进入前端目录
cd src/client

# 安装依赖（首次运行）
npm install

# 启动开发服务器
npm run dev          # Vite 开发服务器 (http://localhost:5173)
npm run build        # 构建生产版本
npm run preview      # 预览生产构建
npm run lint         # ESLint 检查
```

### Git 命令

| 命令 | 说明 |
|------|------|
| `git status` | 查看状态 |
| `git add .` | 添加所有更改 |
| `git commit -m "msg"` | 提交更改 |
| `git push` | 推送到远程 |

### Claude Code 命令

| 命令 | 说明 |
|------|------|
| `/context` | 查看项目记忆 |
| `/sandbox` | 查看允许的命令 |
| `/hooks` | 查看生命周期配置 |
| `/skills` | 查看可用技能 |
| `/skills reactflow-dev` | 创建 React Flow 节点 ⭐ |
| `/plan` | 进入计划模式 |

---

## 安全规范

### 环境变量管理

```bash
# .env 文件（不提交到Git）
SORA2_API_KEY=sk-xxxxx
ZHENZHEN_API_KEY=sk-xxxxx
OPENAI_API_KEY=sk-xxxxx
PORT=9000
```

### 安全最佳实践

- ✅ 使用 `.env` 文件管理敏感信息
- ✅ `.env` 文件不提交到 Git
- ✅ 不在代码中硬编码 API Key
- ❌ 不使用 `child_process` 调用 API（会导致进程僵死）
- ❌ 不直接修改数据库文件

---

## 提示词优化规范

### 版本管理

每次提示词优化必须记录：
- 版本号（语义化版本）
- 变更说明
- Token 计数
- 性能指标

### A/B 测试

- 至少测试 2 个版本
- 使用 `/skills prompt-tester --versions=v1.0,v1.1`
- 生成对比报告
- 选择最优版本

### Token 计数检查

- 自动检查 Token 消耗
- 超限时自动警告
- 优化 Token 使用

---

## 自动化开发系统

### 系统组件

1. **项目记忆层** (CLAUDE.md)
   - 技术栈规范
   - 代码规范
   - API 规范
   - 开发流程

2. **权限管理层** (settings.json)
   - Sandbox 命令白名单
   - 生命周期 Hooks
   - 自动批准配置
   - 状态栏增强

3. **规则层** (.claude/rules/)
   - 基础规则 (base.md)
   - 代码规范 (code.md)
   - 模块规则 (prompt-optimizer.md)
   - 错误模式 (error-patterns.md)
   - 文档规范 (docs.md)

4. **技能层** (.claude/skills/)
   - 提示词测试 (prompt-tester)
   - **React Flow 节点开发 (reactflow-dev)** ⭐
   - 工作流测试 (workflow-tester)
   - 自动报告 (auto-reporter)
   - 代码审查 (code-reviewer)

5. **测试自动化层**
   - 单元测试
   - 集成测试
   - E2E 测试
   - 性能测试

6. **自动迭代层** (.claude/auto-learner/)
   - 错误监控
   - 模式识别
   - 规则生成
   - 效果追踪

### 使用方式

```bash
# 查看系统状态
/context
/sandbox
/hooks
/skills

# 使用技能
/skills prompt-tester --versions=v1.0,v1.1
/skills reactflow-dev --type=process --name=MyCustomNode  # ⭐ 创建 React Flow 节点
/skills workflow-tester
/skills auto-reporter

# 自动迭代
/learner analyze
/learner generate-rules
/learner report
```

---

## 常见问题

### Q: 如何启动流式画布？

A: 运行以下命令：
```bash
# 终端 1：启动后端服务器
npm run server

# 终端 2：启动流式画布
cd src/client
npm install  # 首次运行
npm run dev
```
然后访问 `http://localhost:5173`

### Q: 如何创建新的节点？

A: 使用 `/skills reactflow-dev --type=input|process|output --name=MyNode`

### Q: 如何调试节点连接问题？

A: 参考 `.claude/rules/reactflow.md` 中的"连接验证规范"章节

### Q: 如何测试提示词效果？

A: 使用 `/skills prompt-tester --versions=v1.0,v1.1` 自动测试多个版本

### Q: 如何避免常见错误？

A: 参考 `.claude/rules/error-patterns.md` 中的错误模式

### Q: 如何更新文档？

A: 功能完成后系统会自动提示更新文档

### Q: 如何查看系统改进效果？

A: 使用 `/learner report` 查看改进报告

---

## 参考文档

**内部文档**:
- `.claude/rules/base.md` - 基础技术栈规则
- `.claude/rules/code.md` - 代码规范
- `.claude/rules/reactflow.md` - React Flow 开发规则 ⭐
- `.claude/rules/prompt-optimizer.md` - 提示词优化规则
- `.claude/rules/error-patterns.md` - 错误模式参考
- `.claude/skills/` - 技能说明
- `用户输入文件夹/开发对话/开发交接书.md` - 项目交接

**外部文档**:
- [Electron 官方文档](https://electronjs.org/docs/latest)
- [Express.js 官方文档](https://expressjs.com/)
- [React Flow 官方文档](https://reactflow.dev/) ⭐
- [React 官方文档](https://react.dev/)
- [Vite 官方文档](https://vitejs.dev/)
- [Node.js 官方文档](https://nodejs.org/docs)

---

**最后更新**: 2026-01-08
**维护者**: WinJin AIGC Team
**版本**: v2.0.0
