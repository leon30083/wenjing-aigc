---

path: *

---

# 28条胶水开发强约束

> **版本**: v1.0.0
> **更新日期**: 2026-01-18
> **来源**: Vibe-Coding-CN 强约束 + WinJin 特定扩展

---

## 约束概述

**强约束** = 不可违反的规则

违反约束会导致：
- ⚠️ 已知错误（如错误1、错误6、错误48）
- ⚠️ 安全漏洞（如使用废弃库）
- ⚠️ 维护困难（如修改第三方库）
- ⚠️ 系统不稳定（如进程僵死）

---

## Vibe-Coding-CN 基础约束 (#1-#28)

### 约束 #1: 不得自行实现底层逻辑

**规则**: 必须使用成熟的开源库，不重新发明轮子

**违反示例**:
```javascript
// ❌ 错误：自行实现 HTTP 客户端
class MyHTTPClient {
  async get(url) {
    // 自己实现 HTTP 逻辑
  }
}
```

**正确做法**:
```javascript
// ✅ 正确：使用成熟库 axios
import axios from 'axios';
const response = await axios.get(url);
```

**WinJin 应用**:
- 使用 `axios` 而非自行实现 HTTP 客户端
- 使用 `React Flow` 而非自行实现节点编辑器
- 使用 `OpenAI API` 而非自行实现 AI 模型

**可能导致错误**:
- 错误2: 角色创建返回 404（不使用官方 API）
- 错误17: API 端点路径错误（不熟悉官方规范）

**严重程度**: ⭐⭐⭐

---

### 约束 #2: 不得裁剪或重写依赖库

**规则**: 不修改第三方库源码，使用官方扩展机制

**违反示例**:
```javascript
// ❌ 错误：修改 React Flow 源码
import ReactFlow from 'reactflow';
ReactFlow.prototype.someMethod = function() { /* 修改 */ };
```

**正确做法**:
```javascript
// ✅ 正确：使用官方扩展机制
import { Background, Controls } from 'reactflow';
```

**WinJin 应用**:
- 使用 React Flow 的自定义节点 API
- 使用 React Flow 的 Handle 机制
- 不修改 `node_modules` 中的代码

**可能导致错误**:
- 错误4: React Flow 无限循环（修改核心逻辑）
- 错误22: Handle 与标签布局冲突（不理解内部机制）

**严重程度**: ⭐⭐⭐

---

### 约束 #3: 必须复用成熟仓库

**规则**: 使用成熟的开源库，不重复造轮子

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
```

**正确做法**:
```javascript
// ✅ 正确：使用 React Hook 或 Redux
import { useState, useEffect } from 'react';
```

**WinJin 应用**:
- 使用 React Hook 进行状态管理
- 使用 React Flow 进行节点可视化
- 使用 `localStorage` 进行数据持久化

**可能导致错误**:
- 错误16: 节点间数据传递错误（不熟悉 React 状态管理）
- 错误29: useEffect 无限循环（不理解 React 执行模型）

**严重程度**: ⭐⭐

---

### 约束 #4: 不使用已废弃的库

**规则**: 使用活跃维护的库，避免安全漏洞

**违反示例**:
```javascript
// ❌ 错误：使用 request 库（已废弃）
const request = require('request');
request(url, (err, res, body) => { });
```

**正确做法**:
```javascript
// ✅ 正确：使用 axios
import axios from 'axios';
const response = await axios.get(url);
```

**检查方法**:
```bash
npm outdated  # 检查过时的包
npm audit     # 检查安全漏洞
```

**严重程度**: ⭐⭐⭐

---

### 约束 #5: 不使用 child_process 调用 API

**规则**: 禁止使用 child_process 调用 HTTP API

**违反示例**:
```javascript
// ❌ 错误：使用 child_process 调用 API
const { exec } = require('child_process');
exec(`curl ${apiUrl}`, (err, stdout, stderr) => {
  // 处理响应
});
```

**正确做法**:
```javascript
// ✅ 正确：使用 axios
import axios from 'axios';
const response = await axios.get(apiUrl);
```

**WinJin 应用**:
- 所有 API 调用使用 `axios` 或 `fetch`
- 不使用 `child_process` 调用外部命令
- 不使用 `request` 库（已废弃）

**可能导致错误**:
- 进程僵死（子进程未正确回收）
- 跨平台问题（命令在 Windows/Linux 表现不同）

**严重程度**: ⭐⭐⭐

---

### 约束 #6-#28

（省略详细内容，参考 Vibe-Coding-CN 完整约束列表）

---

## WinJin 特定约束 (#29-#35)

### 约束 #29: 禁止硬编码 API 端点

**规则**: 所有 API 端点必须使用环境变量或相对路径

**违反示例**:
```javascript
// ❌ 错误：硬编码端点
const API_URL = 'https://api.jxincm.cn';
const response = await fetch(`${API_URL}/v1/video/create`);
```

**正确做法**:
```javascript
// ✅ 正确：使用环境变量
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:9000';
const response = await fetch(`${API_URL}/api/video/create`);
```

**WinJin 应用**:
- 所有 API 调用必须通过 `/api/` 前缀
- 使用相对路径或环境变量
- Code Review 检查硬编码 URL

**可能导致错误**:
- 错误17: API 端点路径缺少前缀
- 错误3: TaskResultNode 无法获取视频 URL

**严重程度**: ⭐⭐⭐

---

### 约束 #30: 必须处理双平台差异

**规则**: 所有 API 调用必须检查平台类型

**违反示例**:
```javascript
// ❌ 错误：所有平台使用相同端点
async getTaskStatus(taskId) {
  return await axios.get(`/v2/videos/generations/${taskId}`);
}
```

**正确做法**:
```javascript
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

**WinJin 应用**:
- 所有 API 调用必须检查平台类型
- 任务ID 必须兼容 `id` 和 `task_id`
- 模型名称根据平台自动选择

**可能导致错误**:
- 错误1: 双平台任务ID不兼容
- 错误38: platform 字段缺失导致查询失败
- 错误39: 聚鑫平台模型名称错误

**严重程度**: ⭐⭐⭐

---

### 约束 #31: 禁止假设任务ID字段名称

**规则**: 任务ID 必须兼容双平台格式

**违反示例**:
```javascript
// ❌ 错误：只检查 id 字段
if (result.data.id) {
  saveTask(result.data.id);
}
```

**正确做法**:
```javascript
// ✅ 正确：兼容双平台格式
const taskId = result.data.id || result.data.task_id;
if (taskId) {
  saveTask(taskId);
}
```

**WinJin 应用**:
- 使用 `const taskId = result.data.id || result.data.task_id`
- 所有任务ID 处理必须兼容双格式
- Code Review 检查任务ID 提取逻辑

**可能导致错误**:
- 错误1: 双平台任务ID不兼容
- 历史记录保存失败

**严重程度**: ⭐⭐⭐

---

### 约束 #32: 禁止使用过短的轮询间隔

**规则**: 轮询间隔必须 ≥ 30 秒

**违反示例**:
```javascript
// ❌ 错误：5秒间隔导致 429 错误
const POLL_INTERVAL = 5000;
setInterval(() => checkStatus(taskId), POLL_INTERVAL);
```

**正确做法**:
```javascript
// ✅ 正确：30秒间隔
const POLL_INTERVAL = 30000;  // Sora2 生成需 3-5 分钟
setInterval(() => checkStatus(taskId), POLL_INTERVAL);
```

**WinJin 应用**:
- 轮询间隔必须 ≥ 30 秒
- 添加 24 小时超时限制
- 使用指数退避策略

**可能导致错误**:
- 错误6: 轮询间隔太短（429错误）
- API 配额浪费

**严重程度**: ⭐⭐⭐

---

### 约束 #33: 角色引用必须保留在提示词中

**规则**: AI 优化后必须保留 `@username` 格式的角色引用

**违反示例**:
```javascript
// ❌ 错误：优化后丢失角色引用
// 输入: "@测试小猫 在海边玩"
// 输出: "一只可爱的猫咪在海边玩耍" ❌ 角色引用丢失
```

**正确做法**:
```javascript
// ✅ 正确：保留角色引用，不描述外观
// 输入: "@ebfb9a758.sunnykitte 在海边玩"
// 输出: "卡通风格的视频。@ebfb9a758.sunnykitte 在海边玩耍，充满好奇和喜悦地探索。阳光温柔地洒在海浪和沙滩上..."
```

**WinJin 应用**:
- 优化节点始终使用真实 ID（不使用别名）
- AI 系统提示词明确要求保留 `@username`
- 代码审查检查角色引用是否保留

**可能导致错误**:
- 错误48: 优化节点错误使用双显示功能导致角色引用丢失
- 错误55: NarratorProcessorNode 角色引用丢失

**严重程度**: ⭐⭐⭐

---

### 约束 #34: 禁止在 React 组件中直接渲染对象

**规则**: 所有渲染值必须转换为 string 或 number

**违反示例**:
```javascript
// ❌ 错误：直接渲染 error 对象
function VideoNode() {
  const [error, setError] = useState(null);
  return <div>{error && <div>{error}</div>}</div>;
}
```

**正确做法**:
```javascript
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

**严重程度**: ⭐⭐

---

### 约束 #35: 禁止在 useEffect 依赖数组中包含 data 对象

**规则**: useEffect 依赖数组不包含 `data` 对象

**违反示例**:
```javascript
// ❌ 错误：data 在依赖数组中导致无限循环
useEffect(() => {
  if (data.onSizeChange) {
    data.onSizeChange(nodeId, nodeSize.width, nodeSize.height);
  }
}, [nodeSize.width, nodeSize.height, data]);
```

**正确做法**:
```javascript
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

**严重程度**: ⭐⭐⭐

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

## Code Review 检查点

### API 调用检查

- [ ] API 端点使用完整路径（包含 /api/ 前缀）
- [ ] 平台类型已传递（juxin 或 zhenzhen）
- [ ] 任务ID 兼容双格式（id || task_id）
- [ ] 轮询间隔 ≥ 30 秒
- [ ] 使用 axios 而非 fetch 或 child_process

### 角色引用检查

- [ ] 角色引用使用真实 ID（@username）
- [ ] 优化节点不使用双显示功能
- [ ] 角色引用在优化结果中保留
- [ ] 不描述角色外观（Sora2 会使用真实外观）

### React Flow 检查

- [ ] useEffect 依赖数组不包含 data 对象
- [ ] 所有交互元素添加 className="nodrag"
- [ ] Handle 和标签分离定位
- [ ] 节点连接验证已实现

### 状态管理检查

- [ ] useState 同步到 node.data
- [ ] 不在 useEffect 中依赖 nodes
- [ ] 使用 useRef 存储回调函数
- [ ] 使用函数式更新 setNodes(nds => ...)

---

## ESLint 自动化规则

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    // 禁止 child_process
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['child_process', 'request'],
        message: '使用 axios 而非 child_process 或 request（约束 #5）'
      }]
    }],

    // 禁止硬编码 API 端点
    'no-restricted-properties': ['error', {
      object: 'fetch',
      property: 'url',
      message: '使用相对路径或环境变量（约束 #29）'
    }],

    // 检测轮询间隔
    'no-magic-numbers': ['error', {
      ignore: [1, 2, 30000, 86400000],  // 允许 30秒和24小时
      ignoreArrayIndexes: true,
      ignoreDefaultValues: true
    }]
  }
};
```

---

## Pre-commit Hook 检查

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "🔍 运行强约束检查..."

# 1. ESLint 检查
echo "📋 ESLint 检查..."
npm run lint || exit 1

# 2. 检查硬编码 URL
echo "🔍 检查硬编码 URL..."
if git diff --cached --name-only | xargs grep -l "api.jxincm.cn\|ai.t8star.cn"; then
  echo "❌ 发现硬编码 API URL！"
  exit 1
fi

# 3. 检查 child_process
echo "🔍 检查 child_process..."
if git diff --cached --name-only | xargs grep -l "child_process"; then
  echo "❌ 发现 child_process 导入！"
  exit 1
fi

# 4. 检查轮询间隔
echo "🔍 检查轮询间隔..."
if git diff --cached --name-only | xargs grep -E "POLL_INTERVAL\s*=\s*[0-9]{4,}"; then
  if grep -E "POLL_INTERVAL\s*=\s*(5000|10000)" $(git diff --cached --name-only); then
    echo "⚠️ 轮询间隔可能过短（建议 ≥ 30000ms）"
  fi
fi

echo "✅ 强约束检查通过！"
```

---

## 高频错误快速参考

### Top 5 错误（必读）

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

5. **错误48**: 优化节点错误使用双显示功能 ⭐⭐⭐
   - 约束: #33 角色引用必须保留
   - 解决: 优化节点始终使用真实ID

---

## 违反约束的后果

### 开发阶段

- ⚠️ 代码审查不通过
- ⚠️ PR 被拒绝
- ⚠️ 需要重写代码

### 运行阶段

- ⚠️ 已知错误重现（如 429 错误、数据丢失）
- ⚠️ 安全漏洞（如使用废弃库）
- ⚠️ 系统不稳定（如无限循环、进程僵死）

### 维护阶段

- ⚠️ 技术债务累积
- ⚠️ 修复成本高昂
- ⚠️ 团队效率下降

---

## 总结

**35条强约束 = 安全网**

- ✅ 防止已知错误（55个错误模式）
- ✅ 提高代码质量
- ✅ 降低维护成本
- ✅ 保证系统稳定

**遵守约束的关键**:
1. Code Review 必须检查约束合规性
2. ESLint 自动化检测违反约束的代码
3. Pre-commit Hook 阻止违反约束的提交
4. 定期更新约束映射表

**核心理念**:
> **"约束不是限制，而是保护"**

---

**相关文档**:
- [胶水编程原理](./glue-programming.md) - 理解胶水编程
- [血的教训](./blood-lessons.md) - 调研优先原则
- [约束→错误映射](../04-error-patterns/glue-constraints.md) - 详细映射

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
