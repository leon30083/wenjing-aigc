---

paths: src/*

---

# 语言层要素与代码规范

> **版本**: v2.0.0
> **更新日期**: 2026-01-18
> **来源**: 从 `rules/code.md` 拆分 + Vibe-Coding-CN 12层框架

---

## 核心概念：看懂 100% 代码 = 掌握 12 个层级

> **关键误区**: 看不懂代码 ≠ 不懂语法
> **真相**: 看不懂代码 = **不懂其中某一层模型**

---

## L1-L3: 基础层（语法与数据）

### L1: 基础控制语法

**你已经知道的这一层**:
```text
变量
if / else
for / while
函数 / return
```

**WinJin 项目应用**:
```javascript
// React 节点组件基础结构
function MyNode({ data }) {
  const [state, setState] = useState(initialValue);

  const handleChange = (value) => {
    setState(value);
  };

  return <div>{state}</div>;
}
```

---

### L2: 数据与内存模型

**你必须理解**:
```text
值 vs 引用
栈 vs 堆
拷贝 vs 共享
指针 / 引用
可变 / 不可变
```

**WinJin 项目应用**:
```javascript
// ✅ 正确：理解引用传递
const updateNode = (nodeId, newData) => {
  setNodes((nds) =>
    nds.map((node) =>
      node.id === nodeId
        ? { ...node, data: { ...node.data, ...newData } }  // 浅拷贝避免引用污染
        : node
    )
  );
};

// ❌ 错误：直接修改引用
const updateNode = (nodeId, newData) => {
  const node = nodes.find(n => n.id === nodeId);
  node.data = newData;  // 直接修改，React 可能不会检测到变化
};
```

**关键点**:
- React state 必须使用不可变更新模式
- 对象展开运算符 `...` 创建浅拷贝
- 避免直接修改 state 或 props

---

### L3: 类型系统

**你需要懂**:
```text
静态类型 / 动态类型
类型推导
泛型 / 模板
类型约束
Null / Option
```

**WinJin 项目应用**:
```javascript
// 使用 PropTypes 进行类型检查
import PropTypes from 'prop-types';

function VideoGenerateNode({ data }) {
  // ...
}

VideoGenerateNode.propTypes = {
  data: PropTypes.shape({
    label: PropTypes.string.isRequired,
    platform: PropTypes.oneOf(['juxin', 'zhenzhen']),
    taskId: PropTypes.string,
    manualPrompt: PropTypes.string,
  }).isRequired,
};
```

**代码规范 - 命名约定**:

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| **文件名** | kebab-case | `video-generate-node.jsx` |
| **变量/函数** | camelCase | `getUserData`, `userName` |
| **类名/组件** | PascalCase | `UserService`, `VideoGenerateNode` |
| **常量** | UPPER_SNAKE_CASE | `MAX_RETRIES`, `API_BASE_URL` |
| **私有成员** | 前缀下划线 | `_privateVar`, `_internalMethod` |

---

## L4-L6: 执行层（运行时行为）

### L4: 执行模型 ⭐ 最关键

**你必须理解**:
```text
同步 vs 异步
阻塞 vs 非阻塞
线程 vs 协程
事件循环
内存可见性
```

**WinJin 项目应用**:
```javascript
// ✅ 正确：理解异步执行
const createVideo = async (prompt) => {
  try {
    const response = await axios.post('/api/video/create', { prompt });
    return response.data;
  } catch (error) {
    console.error('视频创建失败:', error);
    throw error;
  }
};

// ❌ 错误：不理解异步顺序
const createVideo = async (prompt) => {
  const response = axios.post('/api/video/create', { prompt});  // 没有 await
  console.log(response.data);  // undefined，因为 Promise 还未 resolve
};
```

**关键点**:
- API 调用必须使用 `async/await`
- 每个异步函数必须有错误处理 (`try-catch`)
- 理解事件循环和宏任务/微任务队列

---

### L5: 错误处理与边界语法

**你需要懂**:
```text
异常 vs 返回值
panic / throw
defer / finally
```

**代码规范 - 错误处理**:
```javascript
// ✅ 正确：完整的错误处理
async function fetchVideoStatus(taskId) {
  try {
    const response = await axios.get(`/api/task/${taskId}`);
    return { success: true, data: response.data };
  } catch (error) {
    if (error.response?.status === 404) {
      return { success: false, error: '任务不存在' };
    } else if (error.response?.status === 429) {
      return { success: false, error: '请求过于频繁，请稍后重试' };
    }
    return { success: false, error: error.message };
  }
}

// ❌ 错误：吞没错误
async function fetchVideoStatus(taskId) {
  try {
    const response = await axios.get(`/api/task/${taskId}`);
    return response.data;
  } catch (error) {
    // 什么都不做，调用者无法知道是否失败
  }
}
```

**规范**:
- ✅ 异步函数必须 try-catch
- ✅ API 路由必须有错误处理
- ❌ 不要吞没错误

---

### L6: 元语法

**这是很多人"看不懂"的根源**:
```text
宏
装饰器
注解
反射
代码生成
```

**WinJin 项目应用**:
```javascript
// React Flow 自定义节点使用装饰器模式
import { Handle, Position } from 'reactflow';

function VideoGenerateNode({ data, selected }) {
  // Handle 是 React Flow 提供的"元语法"组件
  // 它在运行时生成特殊的连接点 UI
  return (
    <div className={`node ${selected ? 'selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        id="prompt-input"
      />
      {/* 节点内容 */}
    </div>
  );
}
```

**代码规范 - 代码风格**:

| 规则 | 说明 |
|------|------|
| **缩进** | 2 空格 |
| **引号** | 单引号 |
| **分号** | 必须 |
| **注释** | JSDoc 格式 |

```javascript
/**
 * 创建视频任务
 * @param {string} prompt - 视频生成提示词
 * @param {Object} options - 可选参数
 * @param {string} options.platform - API 平台 ('juxin' | 'zhenzhen')
 * @param {string} options.model - 模型名称
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function createVideo(prompt, options = {}) {
  // 实现...
}
```

---

## L7-L9: 范式层（设计思路）

### L7: 语言范式

```text
面向对象（OOP）
函数式（FP）
过程式
声明式
```

**WinJin 项目应用**:
```javascript
// React Hooks = 函数式编程 + 声明式范式
function VideoGenerateNode({ data }) {
  // 声明式：声明状态，React 负责更新
  const [status, setStatus] = useState('idle');
  const [taskId, setTaskId] = useState(null);

  // 函数式：纯函数，无副作用
  const handleSubmit = async () => {
    const result = await createVideo(data.prompt);
    if (result.success) {
      setTaskId(result.data.taskId);
    }
  };

  return <div>{/* 声明式 UI */}</div>;
}
```

---

### L8: 领域语法 & 生态约定

```text
SQL
正则
Shell
DSL
框架约定
```

**WinJin 项目应用**:
```javascript
// Sora2 API 角色引用语法
const prompt1 = '@6f2dbf2b3.zenwhisper 在工地上干活';  // ✅ 正确
const prompt2 = '@{6f2dbf2b3.zenwhisper} 在工地上干活';  // ❌ 错误：不要使用花括号

// 角色引用正则表达式（支持中文）
const regex = /@([a-zA-Z0-9_.]+)(?=\s|$|@)/g;
```

---

### L9: 时间维度模型

**你不仅要知道代码怎么跑，还要知道**:
```text
它在「什么时候」跑
它会「跑多久」
它是否「重复跑」
它是否「延迟跑」
```

**WinJin 项目应用**:
```javascript
// React useEffect 依赖数组决定执行时机
useEffect(() => {
  // 仅当 connectedCharacters 真正变化时才执行
  const usernameToAlias = {};
  connectedCharacters.forEach(char => {
    usernameToAlias[char.username] = char.alias || char.username;
  });
  setUsernameMap(usernameToAlias);
}, [connectedCharacters]);  // ✅ 正确：精确的依赖

// ❌ 错误：每次都重新执行
useEffect(() => {
  const usernameToAlias = {};
  connectedCharacters.forEach(char => {
    usernameToAlias[char.username] = char.alias || char.username;
  });
  setUsernameMap(usernameToAlias);
});  // 缺少依赖数组，每次渲染都执行

// ❌ 错误：无限循环
useEffect(() => {
  setNodes(nds => nds.map(n => {
    if (n.id === nodeId) {
      return { ...n, data: { ...n.data, value: newValue } };
    }
    return n;
  }));
}, [nodes]);  // 依赖 nodes，每次更新都触发 effect
```

---

## L10-L12: 架构层（系统设计）

### L10: 资源模型

**代码 = 对资源的调度语言**

```text
CPU 密集
IO 密集
内存绑定
网络阻塞
```

**WinJin 项目应用**:
```javascript
// ✅ 正确：识别 IO 密集操作，使用异步
const pollTaskStatus = async (taskId) => {
  while (true) {
    const result = await getTaskStatus(taskId);  // IO 密集：网络请求
    if (result.data.status === 'SUCCESS') {
      return result;
    }
    await delay(30000);  // 避免频繁请求（429 错误）
  }
};

// ❌ 错误：轮询间隔太短，浪费资源
const pollTaskStatus = async (taskId) => {
  while (true) {
    const result = await getTaskStatus(taskId);
    if (result.data.status === 'SUCCESS') {
      return result;
    }
    await delay(5000);  // 太短！Sora2 生成需要 3-5 分钟
  }
};
```

**轮询配置规范**:
```javascript
const POLL_INTERVAL = 30000;  // 30秒（Sora2 生成需 3-5 分钟）
const TIMEOUT = 600000;       // 10分钟
const MAX_POLLING_AGE = 24 * 60 * 60 * 1000; // 24小时 - 超过此时间不再轮询
```

---

### L11: 隐含契约 & 非语法规则

**这是 99% 教程不会写，但你在真实项目里天天踩雷的东西**:
```text
函数是否允许返回 None
是否允许 panic
是否允许阻塞
是否线程安全
是否可重入
是否可重复调用
```

**WinJin 项目应用**:
```javascript
// API 路由的隐含契约
app.post('/api/video/create', async (req, res) => {
  // 契约1：必须返回 {success, data?}
  // 契约2：不能抛出未捕获的异常（会导致服务器崩溃）
  // 契约3：必须处理所有可能的错误情况
  // 契约4：应该尽快响应（不能阻塞太久）

  try {
    const result = await client.createVideo(req.body);
    res.json(result);
  } catch (error) {
    // 契约：即使失败也必须返回统一格式
    res.json({ success: false, error: error.message });
  }
});
```

**统一响应格式**:
```javascript
// 成功
{ success: true, data: {...} }

// 失败
{ success: false, error: "错误信息" }
```

---

### L12: 代码意图层

**你要做到的不是 "这段代码在干嘛"，而是 "作者为什么要这么写？"**

**WinJin 项目应用**:
```javascript
// ✅ 兼容双平台任务ID格式
// 意图：作者在防御不同平台的响应差异
const taskId = result.data.id || result.data.task_id;

// ✅ 兼容双平台查询端点
// 意图：作者在抽象平台差异，提供统一接口
async getTaskStatus(taskId) {
  if (this.platformType === 'ZHENZHEN') {
    return await this.client.get(`/v2/videos/generations/${taskId}`);
  } else {
    return await this.client.get('/v1/video/query', {
      params: { id: taskId }
    });
  }
}

// ✅ 转换聚鑫响应为统一格式
// 意图：作者在统一数据模型，简化上层逻辑
function convertJuxinToUnified(juxinData) {
  return {
    task_id: juxinData.id,
    status: STATUS_MAP[juxinData.status] || 'IN_PROGRESS',
    data: juxinData.video_url ? { output: juxinData.video_url } : null
  };
}
```

---

## 文件结构建议

```
src/server/
├── sora2-client.js       # API 客户端（封装双平台逻辑）
├── batch-queue.js        # 批量任务队列
├── history-storage.js    # 历史记录存储（JSON文件持久化）
├── character-storage.js  # 角色库存储（JSON文件持久化）
└── index.js             # Express 服务器

data/
├── history.json         # 历史记录持久化存储
└── characters.json      # 角色库持久化存储

downloads/               # 视频下载目录（自动创建）
```

---

## 完整代码示例：FastAPI 风格的节点剥洋葱分析

```javascript
// VideoGenerateNode.jsx - 逐层分析
function VideoGenerateNode({ data }) {
  const [status, setStatus] = useState('idle');
  const [taskId, setTaskId] = useState(null);

  useEffect(() => {
    if (data.connectedPrompt) {
      setManualPrompt(data.connectedPrompt);
    }
  }, [data.connectedPrompt]);

  const handleCreate = async () => {
    try {
      setStatus('loading');
      const result = await createVideo({ prompt: manualPrompt });
      if (result.success) {
        setTaskId(result.data.taskId);
        setStatus('success');
      }
    } catch (error) {
      setStatus('error');
    }
  };

  return <div>{/* UI */}</div>;
}
```

| 层级 | 你要看到什么 |
|:---|:---|
| L1 | 函数定义、if、return |
| L2 | `data` 是引用，`useState` 创建状态 |
| L3 | `data.connectedPrompt` 类型约束（可选 PropTypes） |
| L4 | `async/await` 非阻塞，`useEffect` 异步更新 |
| L5 | `try-catch` 捕获错误，避免崩溃 |
| L6 | React 组件、Hooks 是"元语法" |
| L7 | 函数式组件，声明式状态管理 |
| L8 | React Flow 框架约定 |
| L9 | `useEffect` 依赖数组控制执行时机 |
| L10 | `await` IO 密集操作（网络请求） |
| L11 | `data.connectedPrompt` 可能未定义，需防御 |
| L12 | 作者用 Hooks 强制单向数据流，防止状态混乱 |

---

## 终极检验：你到了哪一层？

| 能力表现 | 所在层级 |
|:---|:---|
| 能写出能跑的代码 | L1-L3 |
| 能调试异步/并发 bug | L4-L6 |
| 能快速上手新语言 | L7-L8 |
| 能做性能优化 | L9-L10 |
| 能写出生产级代码 | L11 |
| 能设计 API/架构 | L12 |

> **目标不是"学完 12 层"，而是"遇到问题知道卡在哪一层"**

---

## 参考文档

**更多 API 详情**，请查看：
- [Sora2 双平台支持](./api-platforms.md) - 平台差异、角色引用、轮询策略
- [节点连接规范](../03-node-development/handle-connections.md) - Handle 连接、数据传递
- [错误模式参考](../04-error-patterns/errors-by-type.md) - 所有错误模式

**开发方法论**，请查看：
- [开发流程](../02-methodology/development-flow.md) - Plan → Code → Update
- [测试自动化](../02-methodology/testing-automation.md) - MCP 测试

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
