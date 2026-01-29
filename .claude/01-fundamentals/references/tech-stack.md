---

paths: *

---

# 技术栈规范

> **版本**: v2.0.0
> **更新日期**: 2026-01-18
> **来源**: 从 `rules/base.md` 拆分提取

---

## 运行时环境

### 必需环境

- **Node.js**: 16.x 或更高
- **npm**: 8.x 或更高
- **操作系统**: Windows 10/11（主要目标平台）

### 验证版本

```bash
# 检查 Node.js 版本
node --version

# 检查 npm 版本
npm --version
```

---

## 核心框架版本

### 后端框架

| 框架/库 | 版本要求 | 用途 |
|---------|----------|------|
| Electron | ^28.0.0 | 桌面应用框架 |
| Express | ^4.18.2 | HTTP 服务器 |
| axios | ^1.6.5 | HTTP 客户端 |
| dotenv | ^17.2.3 | 环境变量管理 |
| form-data | ^4.0.0 | 多表单数据 |

### 前端框架 ⭐

| 框架/库 | 版本要求 | 用途 |
|---------|----------|------|
| **React** | ^19.0.0 | 前端 UI 框架（工作流编辑器） |
| **React Flow** | ^11.0.0 | 节点编辑器库（可视化工作流） |
| **Vite** | ^5.0.0 | 前端构建工具 |
| **Tailwind CSS** | ^3.4.0 | CSS 框架（可选） |

---

## 前端架构说明

### v1.x 架构（原生 HTML）

```
原生 HTML + JavaScript
└── src/renderer/public/index.html
```

**状态**: 已停止开发更新

### v2.0 架构（React Flow 工作流编辑器）⭐

```
React + React Flow
└── src/client/
    ├── src/nodes/         # 自定义节点
    ├── src/components/   # UI 组件
    └── src/hooks/        # 业务逻辑
```

**状态**: 当前主要开发方向

### 架构共存说明

- ✅ Express 后端保持不变，继续服务现有 API
- ✅ React 前端通过 HTTP 调用 Express API
- ✅ 两种架构并存，逐步迁移

---

## 开发命令

### 后端命令

| 命令 | 说明 |
|------|------|
| `npm start` | 启动 Electron 应用 |
| `npm run server` | 仅启动 HTTP 服务器（端口 9000） |

### 前端命令（流式画布）⭐

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

---

## 环境变量

### .env 文件配置

项目使用 `.env` 文件管理敏感信息：

```bash
# 聚鑫平台 API Key
SORA2_API_KEY=sk-xxxxxxxxxxxx

# 贞贞平台 API Key
ZHENZHEN_API_KEY=sk-xxxxxxxxxxxx

# 服务器端口
PORT=9000

# OpenAI API (可选 - 提示词优化)
OPENAI_API_KEY=sk-xxxxxxxxxxxx
OPENAI_BASE_URL=https://api.deepseek.com
```

### 安全规范

⚠️ **重要**:
- ✅ `.env` 文件不提交到 Git
- ✅ 不在代码中硬编码 API Key
- ❌ 不在代码中暴露敏感信息

---

## 参考文档

**API 规范**: 详见 [api-platforms.md](./api-platforms.md)
- Sora2 双平台支持
- 角色引用语法
- API 端点差异

**开发规范**: 详见 [../02-methodology/development-flow.md](../02-methodology/development-flow.md)
- Plan → Code → Update 流程
- 自动化测试规范

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
