# OpenAIConfigNode - OpenAI 配置节点

> **节点类型**: 输入节点
> **文件路径**: `src/client/src/nodes/input/OpenAIConfigNode.jsx`
> **版本**: v1.0.0
> **更新日期**: 2026-01-18

---

## 功能概述

OpenAI 配置节点用于配置 OpenAI 格式 API，支持 DeepSeek、GLM 等兼容 OpenAI API 格式的服务。主要用于旁白优化、角色识别等 AI 功能。

**核心功能**：
- 🔧 **API 配置**：Base URL、API Key、Model
- 🧪 **测试连接**：验证 API 配置是否正确
- 📂 **保存/加载**：持久化配置到 localStorage
- 🗑️ **清除配置**：重置为默认配置
- 📤 **自动传递**：将配置传递到下游节点

**典型用途**：为旁白处理节点提供 OpenAI 配置，用于智能角色识别和旁白优化。

---

## 输入/输出 Handles

### 输入 Handle

| Handle ID | 类型 | 数据格式 | 说明 |
|-----------|------|----------|------|
| `config-input` | 输入 | `OpenAIConfig` | 外部配置输入（可选） |

### 输出 Handle

| Handle ID | 类型 | 数据格式 | 说明 |
|-----------|------|----------|------|
| `openai-config` | 输出 | `OpenAIConfig` | OpenAI 配置对象 ⭐ |

**OpenAI 配置格式**:
```javascript
{
  base_url: "https://api.deepseek.com",  // API Base URL
  api_key: "sk-xxxxx...",                // API Key
  model: "deepseek-chat"                 // 模型名称
}
```

---

## 节点配置

### 1. Base URL

OpenAI 兼容 API 的基础 URL。

**常用服务**：
| 服务 | Base URL |
|------|----------|
| DeepSeek | `https://api.deepseek.com` |
| OpenAI | `https://api.openai.com/v1` |
| GLM | `https://open.bigmodel.cn/api/paas/v4` |

### 2. API Key

OpenAI 兼容 API 的密钥。

**格式要求**：
- 通常以 `sk-` 开头
- 长度约 40-50 字符
- 区分大小写

**⚠️ 安全提示**：
- API Key 会保存到 localStorage（浏览器本地存储）
- 不要在公共设备上保存敏感密钥
- 定期更换 API Key 以提高安全性

### 3. Model

要使用的模型名称。

**常用模型**：
| 服务 | 推荐模型 |
|------|----------|
| DeepSeek | `deepseek-chat`, `deepseek-coder` |
| OpenAI | `gpt-4`, `gpt-3.5-turbo` |
| GLM | `glm-4`, `glm-3-turbo` |

---

## 数据传递

### 配置优先级 ⭐

节点初始化时的配置优先级：

```javascript
// 1. 优先：node.data.openaiConfig（工作流专属配置）
if (data.openaiConfig) {
  return data.openaiConfig;
}

// 2. 降级：localStorage（全局配置，仅作为备份）
const local = localStorage.getItem('winjin-openai-config');
if (local) {
  return JSON.parse(local);
}

// 3. 最后：空配置
return { base_url: '', api_key: '', model: '' };
```

**关键特性**：
- **工作流优先**：工作流中保存的配置优先于全局配置
- **自动同步**：配置修改后自动同步到 `node.data.openaiConfig`
- **延迟同步**：挂载后延迟 100ms 同步，确保工作流已加载

### 自动传递到下游

```javascript
// 传递配置到下游节点
useEffect(() => {
  const outgoingEdges = edges.filter(e => e.source === nodeId);

  setNodes((nds) =>
    nds.map((node) => {
      const isConnected = outgoingEdges.some(e => e.target === node.id);
      if (isConnected) {
        return {
          ...node,
          data: {
            ...node.data,
            openaiConfig: config,                    // ⭐ 配置对象
            openaiConfigSourceId: nodeId,            // 源节点 ID
            openaiConfigSourceLabel: data.label      // 源节点标签
          }
        };
      }
      return node;
    })
  );
}, [config, edges]);
```

---

## 使用示例

### 示例 1: 为旁白处理节点提供配置

```
工作流结构：
OpenAIConfigNode (id: 13)
  ↓ openai-config
NarratorProcessorNode (id: 14)
  - 使用 OpenAI 优化旁白
```

**操作步骤**：
1. 拖拽 OpenAIConfigNode 到画布
2. 配置 DeepSeek API（Base URL、API Key、Model）
3. 连接 `openai-config` → NarratorProcessorNode 的 `openai-config` Handle
4. 在旁白处理节点点击"🚀 全部优化"
5. 自动调用 OpenAI API 优化每个句子

### 示例 2: 为旁白输入节点提供智能匹配功能

```
工作流结构：
OpenAIConfigNode (id: 13) ──┐
CharacterLibraryNode (id: 1) ──┤
                              ↓
                       NarratorNode (id: 12)
  - 使用 OpenAI 智能识别旁白中的角色
```

**操作步骤**：
1. 连接 OpenAI 配置节点到旁白输入节点
2. 连接角色库节点
3. 在旁白输入节点输入文本（不包含角色引用）
4. 点击"🪄 智能匹配角色"
5. OpenAI 自动识别并插入 `@username` 引用

### 示例 3: 测试 API 连接

**操作步骤**：
1. 填写 Base URL：`https://api.deepseek.com`
2. 填写 API Key：`sk-xxxxx...`
3. 填写 Model：`deepseek-chat`
4. 点击"🧪 测试"按钮
5. 查看测试结果：
   - ✅ 成功：显示模型名称和响应消息
   - ❌ 失败：显示错误信息

---

## 常见问题

### Q1: 测试连接失败？

**A**: 检查以下几点：
1. Base URL 是否正确（不要包含 `/chat/completions` 等路径）
2. API Key 是否有效（以 `sk-` 开头）
3. Model 名称是否正确（区分大小写）
4. 网络连接是否正常（检查后端服务是否启动）
5. 后端是否支持 OpenAI 测试端点（`/api/openai/test`）

### Q2: 配置没有传递到下游节点？

**A**: 检查以下几点：
1. 确认已创建连接：`OpenAIConfigNode.openai-config` → `TargetNode.openai-config`
2. 查看浏览器控制台，检查是否有 `[OpenAIConfigNode] 推送配置到下游节点` 日志
3. 查看目标节点的 `data.openaiConfig` 字段是否包含配置
4. 确认工作流已加载（延迟 100ms 同步机制）

### Q3: 工作流恢复后配置丢失？

**A**: 配置优先级问题：
- ✅ **工作流配置**优先于 `localStorage`
- 如果工作流中有配置，会使用工作流的配置
- 如果要使用全局配置，删除工作流中的配置字段

**验证方法**：
```javascript
// 在浏览器控制台执行
const node = window.__REACT_FLOW_TEST_API__.getNodes().find(n => n.id === '13');
console.log(node.data.openaiConfig);  // 查看配置对象
```

### Q4: 如何清除配置？

**A**: 三种方式：
1. **清除节点配置**：点击"🗑️ 清除"按钮（重置为默认）
2. **清除全局配置**：在浏览器控制台执行 `localStorage.removeItem('winjin-openai-config')`
3. **清除工作流配置**：手动编辑工作流 JSON，删除 `openaiConfig` 字段

### Q5: 支持哪些 OpenAI 兼容服务？

**A**: 理论上支持所有 OpenAI API 格式兼容的服务：
- ✅ DeepSeek（推荐，性价比高）
- ✅ OpenAI（官方）
- ✅ GLM（智谱 AI）
- ✅ 其他兼容服务

---

## API 依赖

### 后端 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/openai/test` | POST | 测试 OpenAI API 连接 |

**请求格式**：
```javascript
{
  base_url: "https://api.deepseek.com",
  api_key: "sk-xxxxx...",
  model: "deepseek-chat"
}
```

**响应格式**：
```javascript
{
  success: true,
  data: {
    model: "deepseek-chat",
    message: "Hello! This is a test response."
  }
}
```

---

## 相关节点

- **NarratorProcessorNode**: 旁白处理节点（接收配置，用于旁白优化）⭐
- **NarratorNode**: 旁白输入节点（接收配置，用于智能匹配）⭐
- **CharacterLibraryNode**: 角色库节点（可选，提供角色数据）

---

## 相关文档

- [节点功能参考手册](../README.md)
- [NarratorProcessorNode 文档](../process-nodes/NarratorProcessorNode.md)
- [NarratorNode 文档](./NarratorNode.md)
- [错误模式参考](../../../rules/error-patterns.md)

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
