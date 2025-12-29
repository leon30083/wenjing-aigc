# 项目开发交接书

**文档版本**: v1.0
**更新日期**: YYYY-MM-DD
**项目**: [项目名称]
**仓库**: [GitHub URL]

---

## 📋 目录

1. [项目概述](#项目概述)
2. [环境要求](#环境要求)
3. [快速开始](#快速开始)
4. [项目结构](#项目结构)
5. [常用命令](#常用命令)
6. [API 端点](#api-端点)
7. [开发规范](#开发规范)
8. [最新开发进度](#最新开发进度)
9. [注意事项](#注意事项)
10. [故障排查](#故障排查)

---

## 项目概述

[项目描述]

**核心功能**:
- 功能1
- 功能2
- 功能3

**技术栈**:
- 后端: [技术栈]
- 前端: [技术栈]
- 数据库: [数据库]
- 部署: [部署方式]

---

## 环境要求

### 必需软件

| 软件 | 版本要求 | 下载地址 |
|------|----------|----------|
| Node.js | 18.x+ | https://nodejs.org/ |
| npm | 9.x+ | 随 Node.js 安装 |
| Git | 最新版 | https://git-scm.com/ |

### 可选软件

- [编辑器]: VS Code / WebStorm
- [API 工具]: Postman / curl
- [数据库工具]: [具体工具]

---

## 快速开始

### 1. 克隆项目

```bash
git clone [仓库地址]
cd [项目目录]
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入配置
```

### 4. 启动开发服务器

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

---

## 项目结构

```
project/
├── .claude/              # Claude Code 配置
├── docs/                 # 项目文档
├── src/                  # 源代码
├── tests/                # 测试文件
├── .env.example          # 环境变量模板
├── .gitignore           # Git 忽略规则
├── package.json         # 项目依赖
└── README.md            # 项目说明
```

---

## 常用命令

### 开发命令

```bash
npm run dev       # 开发模式（热重载）
npm start         # 生产模式
npm test          # 运行测试
npm run lint      # 代码检查
```

### Git 命令

```bash
git status        # 查看状态
git add .         # 暂存变更
git commit -m "..."  # 提交变更
git push          # 推送到远程
```

---

## API 端点

### 资源管理
```
GET    /api/resources        # 获取资源列表
POST   /api/resources        # 创建资源
GET    /api/resources/:id    # 获取单个资源
PUT    /api/resources/:id    # 更新资源
DELETE /api/resources/:id    # 删除资源
```

### 其他端点
[添加更多端点]

---

## 开发规范

### 代码风格

- 使用 ESLint 进行代码检查
- 遵循项目代码规范
- 提交前运行 `npm run lint`

### Git 提交规范

```
feat: 新功能
fix: 修复 Bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具相关
```

---

## 最新开发进度

### 已完成功能 ✅

#### 1. [功能名称] (YYYY-MM-DD)
- 功能点1
- 功能点2
- 功能点3

### 已知问题
[列出已知问题]

### 待开发功能
[列出待开发功能]

---

## 注意事项

### ⚠️ 禁止事项

1. **不要提交敏感信息**
   - 不提交 `.env` 文件
   - 不提交 API Key
   - 不提交用户数据

2. **不要忽略错误处理**
   - 所有异步函数都要 try-catch
   - API 路由要有错误处理

3. **不要破坏向后兼容**
   - API 变更要通知使用者
   - 废弃功能要保留过渡期

---

## 故障排查

### 问题1: [问题描述]

**现象**: [具体表现]
**原因**: [根本原因]
**解决方案**: [解决方法]

### 问题2: [问题描述]

**现象**: [具体表现]
**原因**: [根本原因]
**解决方案**: [解决方法]

---

## 快速参考

### 环境变量速查

```bash
PORT=3000              # 服务器端口
NODE_ENV=development   # 运行环境
API_KEY=sk-xxxxx       # API 密钥
DATABASE_URL=...       # 数据库连接
```

### 常用端口

- HTTP 服务器: `http://localhost:3000`
- API 文档: `http://localhost:3000/docs`

### 数据文件位置

- 配置文件: `config/`
- 日志文件: `logs/`
- 临时文件: `tmp/`

---

**最后更新**: YYYY-MM-DD
**维护者**: [你的名字]
**版本**: v1.0
