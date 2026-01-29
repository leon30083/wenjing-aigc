---

path: *

---

# 胶水编程原理

> **版本**: v1.0.0
> **更新日期**: 2026-01-18
> **来源**: Vibe-Coding-CN 胶水编程理念 + WinJin 实践

---

## 核心理念

**传统编程**: 人写代码
**Vibe Coding**: AI 写代码，人审代码
**胶水编程**: **AI 连接代码，人审连接**

---

## 什么是胶水编程？

### 定义

胶水编程是一种开发范式，其核心原则是：

1. **零代码生成**: 不生成新的底层逻辑代码
2. **连接成熟模块**: 只连接已存在的、经过验证的开源模块
3. **避免 AI 幻觉**: 减少因 AI 生成代码而引入的错误
4. **降低复杂性**: 通过组合而非创造来简化系统

### 核心公式

```
胶水代码 = 接口适配 + 数据转换 + 流程编排
```

---

## 胶水编程在 WinJin 的体现

### 架构概览

```
┌─────────────────────────────────────────────────────────┐
│                    React Flow 画布                       │
│                    (可视化工作流编辑器)                    │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  输入节点     │───→│  处理节点     │───→│  输出节点     │
│ (成熟模块)    │    │  (胶水代码)   │    │ (结果接收)    │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ TextNode     │    │ Prompt       │    │ TaskResult   │
│ CharacterLib │    │ Optimizer    │    │ CharacterRes │
│ RefImage     │    │ VideoGen     │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
                            │
                    ┌───────┴───────┐
                    ▼               ▼
            ┌───────────┐   ┌───────────┐
            │ OpenAI    │   │ Sora2     │
            │ API       │   │ API       │
            │ (成熟模块) │   │ (成熟模块) │
            └───────────┘   └───────────┘
```

### 节点作为胶水层

**输入节点** = 成熟模块的接口
- `TextNode`: 文本输入（用户界面）
- `CharacterLibraryNode`: 角色库选择（数据访问）
- `ReferenceImageNode`: 图片上传（文件处理）

**处理节点** = 胶水代码
- `PromptOptimizerNode`: 连接 OpenAI API，转换数据格式
- `VideoGenerateNode`: 连接 Sora2 API，处理双平台差异
- `StoryboardNode`: 批量任务编排，状态管理

**输出节点** = 结果接收器
- `TaskResultNode`: 展示视频生成结果
- `CharacterResultNode`: 展示角色创建结果

---

## 胶水编程的核心原则

### 原则 1: 不实现底层逻辑

**❌ 错误做法**:
```javascript
// 自行实现 HTTP 客户端
class MyHTTPClient {
  async get(url) {
    // 自己实现 HTTP 逻辑
    return new Promise((resolve, reject) => {
      // ... 大量底层代码
    });
  }
}
```

**✅ 正确做法**:
```javascript
// 使用成熟的开源库
import axios from 'axios';

const response = await axios.get(url);
```

**WinJin 应用**:
- 使用 `axios` 而非自行实现 HTTP 客户端
- 使用 `React Flow` 而非自行实现节点编辑器
- 使用 `OpenAI API` 而非自行实现 AI 模型

---

### 原则 2: 不修改第三方库

**❌ 错误做法**:
```javascript
// 修改 React Flow 源码
import ReactFlow from 'reactflow';
ReactFlow.prototype.someMethod = function() {
  /* 修改 */
};
```

**✅ 正确做法**:
```javascript
// 使用官方扩展机制
import { Background, Controls, MiniMap } from 'reactflow';

<ReactFlow nodes={nodes} edges={edges}>
  <Background />
  <Controls />
  <MiniMap />
</ReactFlow>
```

**WinJin 应用**:
- 使用 React Flow 的 Handle 机制进行节点连接
- 使用 React Flow 的自定义节点 API
- 不修改 `node_modules` 中的代码

---

### 原则 3: 只连接，不生成

**❌ 错误做法**:
```javascript
// 生成大量业务逻辑代码
function processVideo(prompt) {
  // 100+ 行生成的逻辑代码
  const segments = prompt.split(' ');
  const filtered = segments.filter(s => s.length > 3);
  const transformed = filtered.map(s => s.toUpperCase());
  // ... 更多生成的代码
}
```

**✅ 正确做法**:
```javascript
// 连接成熟的服务
async function processVideo(prompt) {
  // 调用 OpenAI API 优化提示词
  const optimized = await openaiClient.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }]
  });

  // 调用 Sora2 API 生成视频
  const video = await sora2Client.createVideo({
    prompt: optimized.choices[0].message.content
  });

  return video;
}
```

**WinJin 应用**:
- `PromptOptimizerNode` 连接 OpenAI API
- `VideoGenerateNode` 连接 Sora2 API
- `CharacterLibraryNode` 连接本地 JSON 存储

---

## 胶水编程的优势

### 1. 避免幻觉错误

**AI 生成代码的问题**:
- AI 可能生成不存在的方法
- AI 可能误解 API 用法
- AI 可能引入安全漏洞

**胶水编程的解决**:
- 只使用经过验证的开源库
- 代码逻辑简单，易于审查
- 减少不确定性

### 2. 降低维护成本

**传统代码**:
```javascript
// 复杂的业务逻辑（需要持续维护）
function calculatePrice(items, user, location, time) {
  // 500+ 行自定义逻辑
  // 每次业务变化都需要修改
}
```

**胶水代码**:
```javascript
// 简单的编排逻辑（稳定）
async function calculatePrice(items, user) {
  const basePrice = await pricingService.calculate(items);
  const discount = await discountService.getDiscount(user);
  const tax = await taxService.calculate(basePrice, user.location);

  return basePrice - discount + tax;
}
```

### 3. 提高开发速度

**10分开发，7分找资料**:
- 2 分编写胶水代码
- 1 分测试集成
- 7 分调研和选择合适的模块

---

## WinJin 中的胶水编程示例

### 示例 1: 提示词优化节点

**胶水代码**:
```javascript
// PromptOptimizerNode.jsx
const handleOptimize = async () => {
  try {
    setOptimizing(true);

    // 胶水点 1: 从上游节点获取数据
    const inputPrompt = data.connectedPrompt || manualPrompt;

    // 胶水点 2: 调用 OpenAI API（成熟模块）
    const response = await fetch('/api/optimize-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: inputPrompt,
        style: selectedStyle
      })
    });

    const result = await response.json();

    // 胶水点 3: 数据格式转换
    if (result.success) {
      const optimizedPrompt = result.data.optimizedPrompt;

      // 胶水点 4: 更新节点数据（传递给下游）
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, optimizedPrompt } }
            : n
        )
      );
    }
  } catch (error) {
    console.error('优化失败:', error);
  } finally {
    setOptimizing(false);
  }
};
```

**分析**:
- ✅ 不实现 AI 模型（使用 OpenAI API）
- ✅ 不实现 HTTP 客户端（使用 fetch/axios）
- ✅ 只负责数据流转和格式转换

---

### 示例 2: 视频生成节点

**胶水代码**:
```javascript
// VideoGenerateNode.jsx
const handleCreate = async () => {
  try {
    setCreating(true);

    // 胶水点 1: 收集输入数据
    const prompt = data.connectedPrompt || manualPrompt;
    const character = data.connectedCharacter;
    const images = data.connectedImages;

    // 胶水点 2: 数据格式转换
    const requestBody = {
      prompt: character ? `${character} ${prompt}` : prompt,
      platform: data.platform,
      model: data.model || (data.platform === 'juxin' ? 'sora-2-all' : 'sora-2')
    };

    if (images && images.length > 0) {
      requestBody.image_url = images[0].url;
    }

    // 胶水点 3: 调用 Sora2 API（成熟模块）
    const response = await fetch('/api/video/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();

    // 胶水点 4: 处理双平台响应差异
    const taskId = result.data.id || result.data.task_id;

    // 胶水点 5: 传递给下游节点
    setNodes((nds) =>
      nds.map((n) => {
        // 更新自己
        if (n.id === nodeId) {
          return { ...n, data: { ...n.data, taskId, status: 'processing' } };
        }
        // 直接更新目标节点
        const isConnected = outgoingEdges.some(e => e.target === n.id);
        if (isConnected) {
          return { ...n, data: { ...n.data, taskId } };
        }
        return n;
      })
    );
  } catch (error) {
    console.error('创建失败:', error);
  } finally {
    setCreating(false);
  }
};
```

**分析**:
- ✅ 不实现视频生成逻辑（使用 Sora2 API）
- ✅ 处理双平台差异（胶水逻辑）
- ✅ 直接更新目标节点（数据流转）

---

### 示例 3: 后端 API 路由

**胶水代码**:
```javascript
// src/server/index.js
app.post('/api/video/create', async (req, res) => {
  // 胶水点 1: 接收请求数据
  const { platform, prompt, model, ...options } = req.body;

  try {
    // 胶水点 2: 选择合适的客户端（成熟模块）
    const client = platform === 'zhenzhen' ? zhenzhenClient : juxinClient;

    // 胶水点 3: 调用 Sora2 API
    const result = await client.createVideo({ prompt, model, ...options });

    // 胶水点 4: 数据格式转换（双平台兼容）
    const taskId = result.data.id || result.data.task_id;

    // 胶水点 5: 持久化存储
    if (taskId) {
      historyStorage.addRecord({
        taskId,
        platform,
        prompt,
        model,
        options,
        timestamp: Date.now()
      });
    }

    // 胶水点 6: 统一响应格式
    res.json({ success: true, data: result.data });
  } catch (error) {
    // 胶水点 7: 错误处理
    res.json({ success: false, error: error.message });
  }
});
```

**分析**:
- ✅ 不实现视频生成（调用 Sora2 客户端）
- ✅ 处理双平台差异（客户端选择）
- ✅ 数据持久化（调用存储服务）

---

## 胶水编程的最佳实践

### 1. 选择成熟的开源模块

**评估标准**:
- ⭐ GitHub stars > 1000
- ⭐ 活跃维护（最近 3 个月有更新）
- ⭐ 完善的文档
- ⭐ 广泛的使用案例

**WinJin 使用的成熟模块**:
- `React` (220k+ stars) - UI 框架
- `React Flow` (20k+ stars) - 节点编辑器
- `axios` (103k+ stars) - HTTP 客户端
- `Express` (64k+ stars) - Web 服务器
- `Vite` (66k+ stars) - 构建工具

---

### 2. 接口适配层

**问题**: 不同模块的接口不兼容

**解决**: 创建适配器层

```javascript
// 双平台适配器
class Sora2ClientAdapter {
  constructor(platform) {
    this.platform = platform;
    this.client = platform === 'zhenzhen' ? zhenzhenClient : juxinClient;
  }

  async createVideo(params) {
    // 统一接口
    const result = await this.client.createVideo(params);

    // 统一响应格式
    return {
      success: true,
      data: {
        taskId: result.data.id || result.data.task_id,
        status: this.normalizeStatus(result.data.status)
      }
    };
  }

  normalizeStatus(status) {
    // 聚鑫平台: SUCCESS
    // 贞贞平台: success
    const statusMap = {
      'SUCCESS': 'SUCCESS',
      'success': 'SUCCESS',
      'IN_PROGRESS': 'IN_PROGRESS',
      'processing': 'IN_PROGRESS'
    };
    return statusMap[status] || status;
  }
}
```

---

### 3. 数据转换层

**问题**: 数据格式在不同模块间不兼容

**解决**: 创建数据转换函数

```javascript
// 角色引用格式转换
function transformCharacterRef(character, displayFormat = 'real-id') {
  if (displayFormat === 'real-id') {
    // 优化节点使用真实 ID
    return `@${character.username}`;
  } else if (displayFormat === 'alias') {
    // 视频生成节点显示别名
    return `@${character.alias || character.username}`;
  } else if (displayFormat === 'full') {
    // 角色卡片显示完整信息
    return `${character.alias} (@${character.username})`;
  }
}

// 平台响应格式转换
function transformPlatformResponse(data, platform) {
  if (platform === 'juxin') {
    return {
      taskId: data.id,
      status: STATUS_MAP[data.status] || 'IN_PROGRESS',
      videoUrl: data.video_url
    };
  } else {
    return {
      taskId: data.task_id,
      status: data.status,
      videoUrl: data.data?.output
    };
  }
}
```

---

### 4. 错误处理层

**问题**: 不同模块的错误格式不统一

**解决**: 统一错误处理

```javascript
// 统一错误处理
async function handleAPICall(apiFunction) {
  try {
    const result = await apiFunction();
    return { success: true, data: result };
  } catch (error) {
    if (error.response?.status === 404) {
      return { success: false, error: '任务不存在' };
    } else if (error.response?.status === 429) {
      return { success: false, error: '请求过于频繁，请稍后重试' };
    } else if (error.code === 'ECONNREFUSED') {
      return { success: false, error: '网络连接失败' };
    }
    return { success: false, error: error.message };
  }
}
```

---

## 胶水编程的局限性与应对

### 局限性 1: 依赖模块的质量

**问题**: 如果依赖的模块有 bug，胶水代码也会受影响

**应对**:
- 选择活跃维护的模块
- 定期更新依赖版本
- 编写测试用例验证集成

---

### 局限性 2: 接口变更风险

**问题**: 依赖模块的接口变更会导致胶水代码失效

**应对**:
- 使用版本锁定（package.json）
- 创建适配器层隔离变更
- 监控依赖的更新日志

---

### 局限性 3: 性能开销

**问题**: 多层胶水代码可能影响性能

**应对**:
- 减少不必要的数据转换
- 使用缓存避免重复调用
- 优化关键路径

---

## 与其他范式的对比

| 范式 | 核心思想 | 优势 | 劣势 |
|------|---------|------|------|
| **传统编程** | 人写代码 | 完全控制 | 开发慢 |
| **Vibe Coding** | AI 写代码 | 开发快 | 可能幻觉 |
| **胶水编程** | AI 连接代码 | 可靠 + 快速 | 依赖模块 |

---

## 总结

**胶水编程 = 可靠性 + 速度**

- ✅ 避免幻觉错误（使用成熟模块）
- ✅ 降低维护成本（简单的连接逻辑）
- ✅ 提高开发速度（7 分找资料，2 分写代码）

**WinJin 的成功实践**:
- 9 种节点类型，全部是胶水代码
- 双平台支持，通过适配器实现
- 55 个错误模式，全部来自集成问题而非底层逻辑

**核心理念**:
> **"不重新发明轮子，只连接轮子"**

---

**下一步**: 阅读 [28条强约束](./strong-constraints.md) 了解胶水编程的具体约束规则。

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
