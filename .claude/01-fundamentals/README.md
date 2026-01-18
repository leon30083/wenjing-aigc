# 基础知识层 - 技术基础

> **版本**: v1.0.0
> **更新日期**: 2026-01-18

---

## 概述

基础知识层包含 WinJin 项目的技术栈、API 规范、代码规范和开发环境配置。这些是所有开发者必须掌握的基础知识。

---

## 文档导航

### 1. [技术栈约束](./tech-stack.md)

**主要内容**:
- 运行时环境（Node.js, npm）
- 核心框架版本（Electron, Express, React Flow）
- Sora2 双平台支持
- 开发命令

**适合读者**: 所有开发者
**阅读时间**: 10 分钟

---

### 2. [语言层要素](./language-layers.md)

**主要内容**:
- 12 层语言要素框架（L1-L12）
- 代码命名规范
- 错误处理模式
- React Hooks 最佳实践
- 代码风格指南

**适合读者**: 所有开发者
**阅读时间**: 20 分钟

**关键层**:
- L1: 基础控制语法
- L2: 数据与内存模型
- L3: 类型系统
- L4: 执行模型（useEffect 依赖）
- L5: 错误处理

---

### 3. [API 平台规范](./api-platforms.md)

**主要内容**:
- 聚鑫平台 (api.jxincm.cn)
- 贞贞平台 (ai.t8star.cn)
- 双平台差异处理
- 统一响应格式
- 角色引用语法
- 轮询策略

**适合读者**: 后端开发者，API 集成开发者
**阅读时间**: 15 分钟

**关键差异**:
- 查询端点：聚鑫用 `?id=`，贞贞用 `/{taskId}`
- 响应格式：聚鑫返回 `{id}`，贞贞返回 `{task_id}`
- **必须兼容处理**

---

## 快速开始

### 新手入门

```
第1步: 阅读 [技术栈约束]
       ↓
      了解项目技术栈和运行环境

第2步: 阅读 [API 平台规范]
       ↓
      理解双平台差异和兼容处理

第3步: 浏览 [语言层要素]
       ↓
      学习代码规范和最佳实践

第4步: 开始开发
       ↓
      使用代码模板，遵循约束规则
```

### 进阶开发

```
第1步: 深入理解 [语言层要素]
       ↓
      掌握 12 层语言要素

第2步: 精读 [API 平台规范]
       ↓
      处理双平台兼容性

第3步: 应用到实际开发
       ↓
      参考节点开发层文档
```

---

## 核心规范

### 代码风格

```javascript
// ✅ 正确
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

### API 调用

```javascript
// ✅ 正确：完整路径
fetch('/api/video/create', {
  method: 'POST',
  body: JSON.stringify({ prompt })
});

// ❌ 错误：缺少前缀
fetch('/video/create', {
  // 返回 404 Not Found
});
```

### 双平台兼容

```javascript
// ✅ 正确：兼容双平台格式
const taskId = result.data.id || result.data.task_id;

// ❌ 错误：只假设一种格式
const taskId = result.data.id;  // 贞贞平台会失败
```

---

## 技术栈速查

### 运行时环境

| 工具 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | 16.x 或更高 | 运行环境 |
| npm | 8.x 或更高 | 包管理器 |
| 操作系统 | Windows 10/11 | 主要目标平台 |

### 核心框架

| 框架/库 | 版本 | 用途 |
|---------|------|------|
| Electron | ^28.0.0 | 桌面应用框架 |
| Express | ^4.18.2 | HTTP 服务器 |
| React | ^19.2.0 | 前端 UI 框架 |
| React Flow | ^11.11.4 | 节点编辑器 |
| Vite | ^7.2.4 | 前端构建工具 |
| axios | ^1.6.5 | HTTP 客户端 |

### 开发命令

```bash
# 启动项目
npm start                    # 启动 Electron 应用
npm run server              # 仅启动 HTTP 服务器
cd src/client && npm run dev # 启动流式画布

# 代码检查
npm run lint                # ESLint 检查
npm run validate:all        # 运行所有验证

# 测试
npm run test:all            # 运行所有测试
npm run test:e2e            # E2E 测试
```

---

## API 平台差异

### 查询端点

```javascript
// 聚鑫平台
GET /v1/video/query?id={taskId}

// 贞贞平台
GET /v2/videos/generations/{taskId}

// ✅ 正确：根据平台使用不同端点
async getTaskStatus(taskId) {
  if (this.platformType === 'ZHENZHEN') {
    return await axios.get(`/v2/videos/generations/${taskId}`);
  } else {
    return await axios.get('/v1/video/query', {
      params: { id: taskId }
    });
  }
}
```

### 响应格式

```javascript
// 聚鑫平台
{ id: 'task-123' }

// 贞贞平台
{ task_id: 'task-123' }

// ✅ 正确：兼容处理
const taskId = result.data.id || result.data.task_id;
```

### 角色引用

```
✅ 正确格式
@username 提示词内容

❌ 错误格式
@{username} 提示词内容  // 不要使用花括号
```

---

## 12 层语言要素

| 层级 | 名称 | 重点关注 |
|------|------|----------|
| L1 | 基础控制语法 | 箭头函数、if/else |
| L2 | 数据与内存 | React state, localStorage |
| L3 | 类型系统 | PropTypes, TypeScript |
| L4 | 执行模型 | useEffect 依赖 ⭐ |
| L5 | 错误处理 | try-catch, 边界处理 |
| L6 | 元语法 | 装饰器、高阶函数 |
| L7 | 语言范式 | 函数式、面向对象 |
| L8 | 工程实践 | 模块化、构建 |

**详细文档**: [language-layers.md](./language-layers.md)

---

## 相关文档

### 上层文档

- [哲学层](../00-philosophy/) - 核心理念
- [方法论层](../02-methodology/) - 开发流程
- [节点开发层](../03-node-development/) - React Flow 节点

### 并行文档

- [错误模式层](../04-error-patterns/) - 错误库和约束映射

---

## 常见问题

### Q1: 如何启动开发环境？

**A**:
```bash
# 终端 1：启动后端
npm run server

# 终端 2：启动流式画布
cd src/client
npm run dev
```

访问 `http://localhost:5173`

### Q2: 如何处理双平台差异？

**A**: 参阅 [API 平台规范](./api-platforms.md)，关键点：
- 查询端点不同
- 响应格式不同
- 必须兼容处理

### Q3: useEffect 依赖如何设置？

**A**: 参阅 [语言层要素](./language-layers.md) L4 执行模型：
```javascript
// ❌ 错误：依赖 data 对象
useEffect(() => {
  // ...
}, [data]);  // data 每次都是新引用

// ✅ 正确：依赖具体值
useEffect(() => {
  // ...
}, [data.value]);  // 只依赖实际变化的值
```

### Q4: 如何命名变量和函数？

**A**: 参阅 [语言层要素](./language-layers.md)：
- 变量/函数：camelCase (`getUserData`)
- 类名/组件：PascalCase (`VideoGenerateNode`)
- 常量：UPPER_SNAKE_CASE (`MAX_RETRIES`)

---

## 更新日志

| 日期 | 版本 | 变更说明 |
|------|------|---------|
| 2026-01-18 | v1.0.0 | 初始版本 - 创建基础知识层文档 |

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
**版本**: v1.0.0
