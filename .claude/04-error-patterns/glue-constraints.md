---

paths: *

---

# 约束映射与错误预防

> **版本**: v2.0.0
> **更新日期**: 2026-01-18
> **来源**: Vibe-Coding-CN 强约束 + WinJin 错误模式映射

---

## 核心概念

**胶水编程** = AI 连接代码，人审连接

**强约束原则**: 28条约束 + WinJin 扩展

**映射关系**: 每条约束 → 可能导致的错误 → 预防措施

---

## 28条胶水开发约束

### 约束 #1: 不得自行实现底层逻辑

**违反示例**:
```javascript
// ❌ 错误：自行实现 HTTP 客户端
class MyHTTPClient {
  async get(url) {
    // 自己实现 HTTP 逻辑
  }
}

// ✅ 正确：使用成熟库 axios
import axios from 'axios';
const response = await axios.get(url);
```

**可能导致错误**:
- 错误2: 角色创建返回 404（不使用官方 API）
- 错误17: API 端点路径错误（不熟悉官方规范）

**预防措施**:
- 使用 `axios` 而非 `fetch` 或自行实现
- 遵循 API 规范文档
- 不修改第三方库代码

---

### 约束 #2: 不得裁剪或重写依赖库

**违反示例**:
```javascript
// ❌ 错误：修改 React Flow 源码
import ReactFlow from 'reactflow';
ReactFlow.prototype.someMethod = function() { /* 修改 */ };

// ✅ 正确：使用官方扩展机制
import { Background, Controls } from 'reactflow';
```

**可能导致错误**:
- 错误4: React Flow 无限循环（修改核心逻辑）
- 错误22: Handle 与标签布局冲突（不理解内部机制）

**预防措施**:
- 使用官方 API 和扩展点
- 不修改 `node_modules`
- 定期更新依赖版本

---

### 约束 #3: 必须复用成熟仓库

**违反示例**:
```javascript
// ❌ 错误：自行实现状态管理
class MyStateManager {
  constructor() {
    this.state = {};
  }
  setState(path, value) {
    // 自己实现状态管理
  }
}

// ✅ 正确：使用 React Hook 或 Redux
import { useState, useEffect } from 'react';
```

**可能导致错误**:
- 错误16: 节点间数据传递错误（不熟悉 React 状态管理）
- 错误29: useEffect 无限循环（不理解 React 执行模型）

**预防措施**:
- 使用 React Hook 进行状态管理
- 使用 React Flow 进行节点可视化
- 不重复造轮子

---

### 约束 #4: 不使用已废弃的库

**违反示例**:
```javascript
// ❌ 错误：使用 request 库（已废弃）
const request = require('request');
request(url, (err, res, body) => { });

// ✅ 正确：使用 axios
import axios from 'axios';
const response = await axios.get(url);
```

**可能导致错误**:
- 安全漏洞（废弃库不再维护）
- 兼容性问题（新 Node.js 版本不支持）

**预防措施**:
- 定期检查依赖包状态
- 使用 `npm outdated` 检查过时包
- 参考 [npm stats](https://npmjs.com/) 查看包活跃度

---

### 约束 #5: 不使用 child_process 调用 API

**违反示例**:
```javascript
// ❌ 错误：使用 child_process 调用 API
const { exec } = require('child_process');
exec(`curl ${apiUrl}`, (err, stdout, stderr) => {
  // 处理响应
});

// ✅ 正确：使用 axios
import axios from 'axios';
const response = await axios.get(apiUrl);
```

**可能导致错误**:
- 进程僵死（子进程未正确回收）
- 跨平台问题（命令在 Windows/Linux 表现不同）

**预防措施**:
- 禁止模式文档明确禁止此操作
- Code Review 时检查 `child_process` 使用
- 优先使用 HTTP 客户端库

---

## WinJin 特定约束 (#29-35)

### 约束 #29: 禁止硬编码 API 端点

**违反示例**:
```javascript
// ❌ 错误：硬编码端点
const API_URL = 'https://api.jxincm.cn';
const response = await fetch(`${API_URL}/v1/video/create`);

// ✅ 正确：使用环境变量
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:9000';
const response = await fetch(`${API_URL}/api/video/create`);
```

**可能导致错误**:
- 错误17: API 端点路径缺少前缀
- 错误3: TaskResultNode 无法获取视频 URL

**预防措施**:
- 所有 API 调用必须通过 `/api/` 前缀
- 使用相对路径或环境变量
- Code Review 检查硬编码 URL

---

### 约束 #30: 必须处理双平台差异

**违反示例**:
```javascript
// ❌ 错误：所有平台使用相同端点
async getTaskStatus(taskId) {
  return await axios.get(`/v2/videos/generations/${taskId}`);
}

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

**可能导致错误**:
- 错误1: 双平台任务ID不兼容
- 错误38: platform 字段缺失导致查询失败
- 错误39: 聚鑫平台模型名称错误

**预防措施**:
- 所有 API 调用必须检查平台类型
- 任务ID 必须兼容 `id` 和 `task_id`
- 模型名称根据平台自动选择

---

### 约束 #31: 禁止假设任务ID字段名称

**违反示例**:
```javascript
// ❌ 错误：只检查 id 字段
if (result.data.id) {
  saveTask(result.data.id);
}

// ✅ 正确：兼容双平台格式
const taskId = result.data.id || result.data.task_id;
if (taskId) {
  saveTask(taskId);
}
```

**可能导致错误**:
- 错误1: 双平台任务ID不兼容
- 历史记录保存失败

**预防措施**:
- 使用 `const taskId = result.data.id || result.data.task_id`
- 所有任务ID 处理必须兼容双格式
- Code Review 检查任务ID 提取逻辑

---

### 约束 #32: 禁止使用过短的轮询间隔

**违反示例**:
```javascript
// ❌ 错误：5秒间隔导致 429 错误
const POLL_INTERVAL = 5000;
setInterval(() => checkStatus(taskId), POLL_INTERVAL);

// ✅ 正确：30秒间隔
const POLL_INTERVAL = 30000;  // Sora2 生成需 3-5 分钟
setInterval(() => checkStatus(taskId), POLL_INTERVAL);
```

**可能导致错误**:
- 错误6: 轮询间隔太短（429错误）
- API 配额浪费

**预防措施**:
- 轮询间隔必须 ≥ 30 秒
- 添加 24 小时超时限制
- 使用指数退避策略

---

### 约束 #33: 角色引用必须保留在提示词中

**违反示例**:
```javascript
// ❌ 错误：优化后丢失角色引用
// 输入: "@测试小猫 在海边玩"
// 输出: "一只可爱的猫咪在海边玩耍" ❌ 角色引用丢失

// ✅ 正确：保留角色引用，不描述外观
// 输入: "@ebfb9a758.sunnykitte 在海边玩"
// 输出: "卡通风格的视频。@ebfb9a758.sunnykitte 在海边玩耍，充满好奇和喜悦地探索。阳光温柔地洒在海浪和沙滩上..."
```

**可能导致错误**:
- 错误48: 优化节点错误使用双显示功能导致角色引用丢失
- 错误55: NarratorProcessorNode 角色引用丢失

**预防措施**:
- 优化节点始终使用真实 ID（不使用别名）
- AI 系统提示词明确要求保留 `@username`
- 代码审查检查角色引用是否保留

---

### 约束 #34: 禁止在 React 组件中直接渲染对象

**违反示例**:
```javascript
// ❌ 错误：直接渲染 error 对象
function VideoNode() {
  const [error, setError] = useState(null);
  return <div>{error && <div>{error}</div>}</div>;
}

// ✅ 正确：渲染 error.message 或 JSON.stringify
function VideoNode() {
  const [error, setError] = useState(null);
  return (
    <div>
      {error && (
        <div>
          {typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}
        </div>
      )}
    </div>
  );
}
```

**可能导致错误**:
- 错误44: React 对象渲染错误

**预防措施**:
- 所有渲染值必须转换为 string 或 number
- 使用 `JSON.stringify()` 序列化对象
- 使用 `?.` 可选链和 `||` 提供默认值

---

### 约束 #35: 禁止在 useEffect 依赖数组中包含 data 对象

**违反示例**:
```javascript
// ❌ 错误：data 在依赖数组中导致无限循环
useEffect(() => {
  if (data.onSizeChange) {
    data.onSizeChange(nodeId, nodeSize.width, nodeSize.height);
  }
}, [nodeSize.width, nodeSize.height, data]);

// ✅ 正确：使用 useRef 存储回调
const onSizeChangeRef = useRef(data.onSizeChange);
useEffect(() => {
  onSizeChangeRef.current = data.onSizeChange;
}, [data.onSizeChange]);

useEffect(() => {
  if (onSizeChangeRef.current) {
    onSizeChangeRef.current(nodeId, nodeSize.width, nodeSize.height);
  }
}, [nodeSize.width, nodeSize.height, nodeId]);
```

**可能导致错误**:
- 错误4: React Flow 无限循环
- 错误29: useEffect 无限循环（data 依赖）

**预防措施**:
- 使用 `useRef` 存储回调函数
- 只依赖真正变化的值（如 `data.onSizeChange`）
- 移除 `data` 从依赖数组

---

## 约束映射表

| 约束编号 | 约束描述 | 可能导致错误 | 严重程度 |
|---------|---------|------------|----------|
| #1 | 不得自行实现底层逻辑 | 错误2, 17 | ⭐⭐⭐ |
| #2 | 不得裁剪或重写依赖库 | 错误4, 22 | ⭐⭐⭐ |
| #3 | 必须复用成熟仓库 | 错误16, 29 | ⭐⭐ |
| #4 | 不使用已废弃的库 | 安全漏洞 | ⭐⭐⭐ |
| #5 | 不使用 child_process | 进程僵死 | ⭐⭐⭐ |
| #29 | 禁止硬编码 API 端点 | 错误3, 17 | ⭐⭐⭐ |
| #30 | 必须处理双平台差异 | 错误1, 38, 39 | ⭐⭐⭐ |
| #31 | 禁止假设任务ID字段名 | 错误1, 38 | ⭐⭐⭐ |
| #32 | 禁止使用过短的轮询间隔 | 错误6, 46 | ⭐⭐⭐ |
| #33 | 角色引用必须保留 | 错误48, 55 | ⭐⭐⭐ |
| #34 | 禁止直接渲染对象 | 错误44 | ⭐⭐ |
| #35 | 禁止在 useEffect 中依赖 data | 错误4, 29 | ⭐⭐⭐ |

---

## 预防措施清单

### Code Review 检查点

```markdown
## API 调用检查
- [ ] API 端点使用完整路径（包含 /api/ 前缀）
- [ ] 平台类型已传递（juxin 或 zhenzhen）
- [ ] 任务ID 兼容双格式（id || task_id）
- [ ] 轮询间隔 ≥ 30 秒
- [ ] 使用 axios 而非 fetch 或 child_process

## 角色引用检查
- [ ] 角色引用使用真实 ID（@username）
- [ ] 优化节点不使用双显示功能
- [ ] 角色引用在优化结果中保留
- [ ] 不描述角色外观（Sora2 会使用真实外观）

## React Flow 检查
- [ ] useEffect 依赖数组不包含 data 对象
- [ ] 所有交互元素添加 className="nodrag"
- [ ] Handle 和标签分离定位
- [ ] 节点连接验证已实现

## 状态管理检查
- [ ] useState 同步到 node.data
- [ ] 不在 useEffect 中依赖 nodes
- [ ] 使用 useRef 存储回调函数
- [ ] 使用函数式更新 setNodes(nds => ...)
```

### 自动化检查

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    // 禁止 child_process
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['child_process', 'request'],
        message: '使用 axios 而非 child_process 或 request'
      }]
    }],

    // 禁止硬编码 API 端点
    'no-restricted-properties': ['error', {
      object: 'fetch',
      property: 'url',
      message: '使用相对路径或环境变量，禁止硬编码 URL'
    }]
  }
};
```

---

## 错误预防流程

### 开发前（Plan 模式）

1. **调研阶段**
   - 查阅 [错误模式库](./errors-by-type.md)
   - 查阅 [API 规范](../01-fundamentals/api-platforms.md)
   - 查阅 [节点架构](../03-node-development/node-architecture.md)

2. **设计阶段**
   - 识别涉及的约束（双平台、角色引用、轮询）
   - 设计兼容方案（类型白名单、数据格式转换）
   - 制定测试计划（单元测试、集成测试）

### 开发中（Code 模式）

1. **编写代码**
   - 遵循代码规范（命名、风格、错误处理）
   - 使用代码模板（节点模板、API 路由模板）
   - 添加类型检查（PropTypes）

2. **测试验证**
   - 使用 MCP Chrome DevTools 自动测试
   - 验证约束合规性
   - 检查控制台错误和警告

### 开发后（Update Docs 模式）

1. **文档更新**
   - 更新 [SKILL.md](../../skills/winjin-dev/SKILL.md)
   - 更新 [errors-by-type.md](./errors-by-type.md)（如有新错误）
   - 更新版本号和变更说明

2. **经验沉淀**
   - 识别新错误模式
   - 添加到约束映射表
   - 更新预防检查清单

---

## 高频错误快速参考

### Top 6 错误（必读）

1. **错误1**: 双平台任务ID不兼容 ⭐⭐⭐
   - 约束: #31 禁止假设任务ID字段名称
   - 解决: `const taskId = result.data.id || result.data.task_id`

2. **错误6**: 轮询间隔太短（429错误）⭐⭐⭐
   - 约束: #32 禁止使用过短的轮询间隔
   - 解决: `const POLL_INTERVAL = 30000` (30秒)

3. **错误16**: React Flow 节点间数据传递错误 ⭐⭐⭐
   - 约束: #35 禁止在 useEffect 中依赖 data
   - 解决: 源节点直接更新目标节点

4. **错误17**: API 端点路径缺少前缀 ⭐⭐⭐
   - 约束: #29 禁止硬编码 API 端点
   - 解决: 使用 `/api/{endpoint}` 完整路径

5. **错误48**: 优化节点错误使用双显示功能导致角色引用丢失 ⭐⭐⭐
   - 约束: #33 角色引用必须保留
   - 解决: 优化节点始终使用真实ID

6. **错误55**: NarratorProcessorNode 角色引用丢失 ⭐⭐⭐
   - 约束: #35 React Flow 节点间数据传递必须使用完整对象
   - 解决: 优先读取 `connectedCharacters`（完整对象）而非 `selectedCharacters`（仅 ID）

---

## 参考文档

**错误模式**:
- [错误模式库（按类型分类）](./errors-by-type.md) - 所有55个错误

**技术规范**:
- [API 平台规范](../01-fundamentals/api-platforms.md) - 双平台差异、角色引用
- [语言层要素](../01-fundamentals/language-layers.md) - 12层语言要素

**开发规范**:
- [节点架构](../03-node-development/node-architecture.md) - 节点架构模式
- [Handle 连接](../03-node-development/handle-connections.md) - Handle 连接规范
- [开发流程](../02-methodology/development-flow.md) - Plan → Code → Update

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
