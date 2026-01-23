# 01-fundamentals: 基础知识层

> **版本**: v2.0.0
> **更新日期**: 2026-01-23
> **定位**: WinJin 项目的技术基础和规范

---

## 核心公式

```
技术栈 = Node.js + Express + React Flow

API 兼容 = 双平台差异 + 统一响应格式

代码规范 = 12层语言要素 + React Hooks 最佳实践
```

---

## 技术栈速查

### 运行时环境

| 工具 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | 16.x+ | 运行环境 |
| npm | 8.x+ | 包管理器 |
| 操作系统 | Windows 10/11 | 主要目标平台 |

### 核心框架

| 框架/库 | 版本 | 用途 |
|---------|------|------|
| Electron | ^28.0.0 | 桌面应用框架 |
| Express | ^4.18.2 | HTTP 服务器 |
| React | ^19.2.0 | 前端 UI 框架 |
| React Flow | ^11.11.4 | 节点编辑器 |
| Vite | ^7.2.4 | 前端构建工具 |

### 开发命令

```bash
# 启动项目
npm start                    # 启动 Electron 应用
npm run server              # 仅启动 HTTP 服务器（端口 9000）
cd src/client && npm run dev # 启动流式画布（端口 5173）

# 代码检查
npm run lint                # ESLint 检查
npm run validate:all        # 运行所有验证
```

---

## API 平台差异 ⭐ 重要

### 查询端点

```javascript
// 聚鑫平台: GET /v1/video/query?id={taskId}
// 贞贞平台: GET /v2/videos/generations/{taskId}

// ✅ 正确：根据平台使用不同端点
async getTaskStatus(taskId) {
  if (this.platformType === 'ZHENZHEN') {
    return await axios.get(`/v2/videos/generations/${taskId}`);
  } else {
    return await axios.get('/v1/video/query', { params: { id: taskId } });
  }
}
```

### 响应格式

```javascript
// 聚鑫平台: { id: 'task-123' }
// 贞贞平台: { task_id: 'task-123' }

// ✅ 正确：兼容处理
const taskId = result.data.id || result.data.task_id;
```

### 角色引用

```
✅ 正确格式: @username 提示词内容
❌ 错误格式: @{username} 提示词内容
```

---

## 代码风格示例

### 异步函数

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

// ❌ 错误：缺少前缀（返回 404）
fetch('/video/create', { method: 'POST' });
```

---

## 12 层语言要素速查

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

**详细文档**: [12层语言要素](references/language-layers.md)

---

## useEffect 依赖最佳实践 ⭐

```javascript
// ❌ 错误：依赖 data 对象
useEffect(() => {
  // ...
}, [data]);  // data 每次都是新引用，导致无限循环

// ✅ 正确：依赖具体值
useEffect(() => {
  // ...
}, [data.value]);  // 只依赖实际变化的值
```

---

## 命名规范

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| 变量/函数 | camelCase | `getUserData`, `userName` |
| 类名/组件 | PascalCase | `VideoGenerateNode` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRIES`, `API_BASE_URL` |
| 文件名 | kebab-case 或 PascalCase | `video-generate-node.jsx` |

---

## 详细文档

- [技术栈约束](references/tech-stack.md) - 完整的技术栈和框架版本
- [API 平台规范](references/api-platforms.md) - 双平台差异详解
- [12层语言要素](references/language-layers.md) - 代码规范和最佳实践

---

## 快速开始

### 新手入门（10分钟）
1. 阅读 [技术栈约束](references/tech-stack.md) - 了解项目技术栈
2. 阅读 [API 平台规范](references/api-platforms.md) - 理解双平台差异
3. 浏览 [12层语言要素](references/language-layers.md) - 学习代码规范

### 进阶开发者（15分钟）
1. 深入理解 [12层语言要素](references/language-layers.md) - 掌握执行模型
2. 精读 [API 平台规范](references/api-platforms.md) - 处理双平台兼容性
3. 应用到实际开发 - 参考节点开发层文档

---

## 相关文档

### 上层文档
- [哲学层](../00-philosophy/) - 核心理念
- [方法论层](../02-methodology/) - 开发流程
- [节点开发层](../03-node-development/) - React Flow 节点

### 并行文档
- [错误模式层](../04-error-patterns/) - 错误库和约束映射

---

**维护者**: WinJin AIGC Team
**最后更新**: 2026-01-23
**版本**: v2.0.0
