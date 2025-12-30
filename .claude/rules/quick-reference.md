# 快速参考 ⚡ 开发前必读

> **重要性**: 本文件包含开发前必须掌握的基础知识，请确保理解后再开始开发！

---

## 1. 启动开发服务器

### ⭐ 工作流画布开发（当前重点）⭐

**⚠️ 重要**: 这是当前项目的主要开发目标！

```bash
# 步骤1: 启动后端 API 服务器（终端1）
npm run server

# 步骤2: 启动前端 Vite 开发服务器（终端2）
cd src/client
npm run dev

# 步骤3: 浏览器访问工作流画布
http://localhost:5173/
```

**关键点**:
- ✅ **必须同时运行两个服务器**（后端 + 前端）
- ✅ **测试时访问 5173 端口，不是 9000 端口** ⚠️
- ✅ **5173 是工作流画布（React Flow）** ⭐
- ❌ 9000 端口是网页版，不是工作流画布

---

### 网页版开发（非当前重点）

```bash
# 仅启动 HTTP 服务器
npm run server

# 浏览器访问
http://localhost:9000
```

**用途**: 测试 API 接口、网页版功能（非工作流画布）

---

### Electron 桌面应用（打包用）

```bash
# 启动完整的 Electron 桌面应用
npm start
```

**要求**: 需要先安装 electron (`npm install electron --save-dev`)
**用途**: 打包桌面应用、测试桌面功能

---

## 2. 测试目标区分 ⚠️ 易犯错误

| 端口 | 技术 | 用途 | 测试目标 | 当前重点 |
|------|------|------|----------|----------|
| **5173** | React Flow | **工作流画布** | **节点开发、连线测试** | ⭐ **YES** |
| 9000 | 原生 HTML | 网页版 | API 接口测试 | NO |

### ❌ 错误操作

```bash
# 错误1: 只启动后端，访问网页版
npm run server
# 浏览器打开 localhost:9000  ← 测试的是网页版，不是工作流画布！

# 错误2: 只启动 Vite，前端无法连接 API
cd src/client && npm run dev
# 前端运行，但无法调用后端 API（端口 9000 未启动）
```

### ✅ 正确操作

```bash
# 终端1: 后端 API 服务器
npm run server

# 终端2: 前端 Vite 开发服务器
cd src/client && npm run dev

# 浏览器访问
http://localhost:5173/  ← 这才是工作流画布！
```

---

## 3. 常见问题快速排查

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| `electron: command not found` | electron 未安装 | 使用 `npm run server` 代替 `npm start` |
| **测试了网页版而非画布** | ❌ 访问 localhost:9000 | ✅ 访问 localhost:5173 |
| **前端无法连接 API** | 只启动了 Vite，没启动后端 | 同时运行 `npm run server` 和 `npm run dev` |
| 端口被占用 | 9000 端口已被使用 | 修改 `.env` 中的 PORT 配置 |

---

## 4. 开发流程推荐 ⭐

**标准开发流程**:
```bash
# 1. 启动后端（终端1）
npm run server

# 2. 启动前端（终端2）
cd src/client && npm run dev

# 3. 浏览器访问工作流画布
http://localhost:5173/

# 4. 开发完成后，提交代码
git add .
git commit -m "feat: description"
```

---

## 5. 项目结构速查

```
winjin/
├── src/
│   ├── server/              # Express 后端 API
│   └── client/              # React 前端（工作流画布）⭐
│       ├── src/
│       │   ├── nodes/       # 自定义节点
│       │   ├── components/  # UI 组件
│       │   └── hooks/       # 业务逻辑
│       └── package.json     # 前端依赖
├── .claude/rules/           # 开发规范
│   ├── quick-reference.md   # 本文件（快速参考）⭐
│   ├── base.md              # 技术栈规范
│   └── code.md              # 代码规范
└── 用户输入文件夹/开发对话/  # 项目文档
    └── 开发交接书.md         # 主要交接文档
```

---

## 6. 关键文档位置

| 文档 | 位置 | 用途 |
|------|------|------|
| **快速参考** | `.claude/rules/quick-reference.md` | **本文件，开发前必读** ⭐ |
| 技术规范 | `.claude/rules/base.md` | 技术栈、API 规范 |
| 代码规范 | `.claude/rules/code.md` | 代码示例、错误模式 |
| 开发经验 | `用户输入文件夹/开发经验/Sora2_Character_Best_Practices.md` | Sora2 最佳实践 |
| 交接书 | `用户输入文件夹/开发对话/开发交接书.md` | 项目交接文档 |

---

## 7. 技术栈速记

| 类别 | 技术 | 版本 |
|------|------|------|
| 后端 | Node.js + Express | 16.x / 4.18.2 |
| 前端 | React + React Flow | 19.x / 11.x |
| 构建 | Vite | 5.x |
| 桌面 | Electron | 28.x（可选） |

---

**最后更新**: 2025-12-30
**维护者**: Claude Code 开发团队
