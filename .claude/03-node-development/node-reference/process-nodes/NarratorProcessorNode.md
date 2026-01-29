# NarratorProcessorNode - 旁白处理节点

> **节点类型**: 处理节点
> **文件路径**: `src/client/src/nodes/process/NarratorProcessorNode.jsx`
> **版本**: v1.0.0
> **更新日期**: 2026-01-18

---

## 功能概述

旁白处理节点是旁白优化流程的核心节点，用于接收旁白输入节点的句子数组，并逐句调用 OpenAI API 进行优化。

**核心功能**：
- 📥 **接收旁白**：从 NarratorNode 接收句子数组和配置参数
- 🔄 **逐句优化**：调用 OpenAI API 优化每个句子
- 📊 **进度显示**：实时显示优化进度（进度条 + 百分比）
- 📋 **结果导航**：上一个/下一个句子，查看优化结果
- 🔁 **重新优化**：支持重新优化单个句子或全部句子
- 📤 **输出结果**：将优化后的句子输出到 VideoGenerateNode

**典型用途**：将简单的旁白文本优化为详细的视频生成提示词。

---

## 输入/输出 Handles

### 输入 Handles

| Handle ID | 类型 | 数据格式 | 说明 |
|-----------|------|----------|------|
| `narrator-input` | 输入 | `NarratorData` | 旁白数据（来自 NarratorNode）⭐ |
| `openai-config` | 输入 | `OpenAIConfig` | OpenAI 配置 ⭐ |

### 输出 Handle

| Handle ID | 类型 | 数据格式 | 说明 |
|-----------|------|----------|------|
| `sentence-output` | 输出 | `Sentence[]` | 优化后的句子数组 ⭐ |

**句子对象格式**:
```javascript
{
  id: "sentence-123",           // 句子ID
  index: 0,                     // 句子索引
  text: "@装载机 在工地上干活",   // 原始文本
  optimized: "卡通风格的...",    // 优化后的提示词
  status: "ready"                // 状态：pending/optimizing/ready/error
}
```

---

## 节点配置

### 优化状态

| 状态 | 说明 |
|------|------|
| `pending` | ⏳ 待优化 |
| `optimizing` | 🔄 优化中 |
| `ready` | ✅ 已就绪 |
| `error` | ❌ 失败 |

### 进度显示

- **进度条**：可视化进度条
- **百分比**：`优化进度: 3/5 (60%)`
- **实时更新**：每个句子优化完成后更新

### 导航按钮

| 按钮 | 功能 |
|------|------|
| `◀ 上一个` | 查看上一个优化结果 |
| `下一个 ▶` | 查看下一个优化结果 |
| `🔄 重新优化` | 重新优化当前句子 |
| `🔄 重新加载旁白` | 从 NarratorNode 重新加载旁白 |
| `📋 复制` | 复制优化结果到剪贴板 |
| `🚀 全部优化` | 批量优化所有句子 |

---

## 数据传递

### 接收旁白数据 ⭐

```javascript
// 从 NarratorNode 接收数据
{
  sentences: [...],              // 句子数组
  style: "picture-book",          // 风格
  targetDuration: 10,             // 目标时长
  optimizationDirection: "balanced",  // 优化方向
  customStyleDescription: "...",  // 自定义风格描述
  connectedCharacters: [...],     // 角色对象数组
  openaiConfig: {...}             // OpenAI 配置
}
```

### 保留优化结果 ⭐

**关键特性**：工作流恢复时，优先保留已优化的数据，避免覆盖优化结果。

```javascript
// 检查是否有已优化的数据
const hasOptimizedData = sentences.some(s => s.optimized);

if (hasOptimizedData) {
  // 只更新配置参数，不覆盖 sentences
  setStyle(sourceNode.data.style);
  setTargetDuration(sourceNode.data.targetDuration);
  // ...
} else {
  // 没有优化数据时，才从源节点读取
  setSentences(sourceSentences);
}
```

### 角色数据传递 ⭐ Error 55 修复

```javascript
// ✅ 正确：直接从源节点读取最新的 connectedCharacters
const latestConnectedCharacters = sourceNode.data?.connectedCharacters;

// 构建角色上下文
const referencedCharacters = latestConnectedCharacters.filter(char =>
  referencedUsernames.includes(char.username)
);
```

**原因**：避免使用过期的状态变量，确保使用最新的角色数据。

---

## 使用示例

### 示例 1: 完整的旁白优化流程

```
工作流结构：
CharacterLibraryNode (id: 1) ──┐
OpenAIConfigNode (id: 13) ─────┤
                                ↓
                         NarratorNode (id: 12)
  - 旁白文本：
    - @6f2dbf2b3.zenwhisper 在海边玩耍
    - @6f2dbf2b3.zenwhisper 在草地上奔跑
                                ↓
                         NarratorProcessorNode (id: 14)
  - 点击"🚀 全部优化"
  - 逐句调用 OpenAI 优化
  - 显示优化进度：1/2 (50%) → 2/2 (100%)
                                ↓
                         VideoGenerateNode (id: 6)
  - 优化结果：
    [0] 卡通风格的绘本动画。@6f2dbf2b3.zenwhisper 在海边玩耍，充满好奇和喜悦...
    [1] 卡通风格的绘本动画。@6f2dbf2b3.zenwhisper 在草地上奔跑，追逐着蝴蝶...
```

**操作步骤**：
1. 连接角色库节点、OpenAI配置节点、旁白输入节点
2. 在旁白输入节点输入旁白文本
3. 点击旁白处理节点的"🚀 全部优化"按钮
4. 等待优化完成（进度：0% → 100%）
5. 使用"上一个/下一个"按钮查看优化结果
6. 优化结果自动传递到视频生成节点

### 示例 2: 重新优化单个句子

**操作步骤**：
1. 导航到要重新优化的句子（使用"上一个/下一个"按钮）
2. 点击"🔄 重新优化"按钮
3. 等待优化完成
4. 查看新的优化结果

---

## API 依赖

### 后端 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/openai/optimize` | POST | 优化单个句子 |

**请求格式**：
```javascript
{
  base_url: "https://api.deepseek.com",
  api_key: "sk-xxxxx...",
  model: "deepseek-chat",
  prompt: "@6f2dbf2b3.zenwhisper 在海边玩耍",
  style: "picture-book",
  customStyleDescription: "...",
  optimizationDirection: "balanced",
  context: {
    target_duration: 10,
    characters: [
      {
        username: "6f2dbf2b3.zenwhisper",
        alias: "测试小猫",
        profilePictureUrl: "https://..."
      }
    ]
  }
}
```

**响应格式**：
```javascript
{
  success: true,
  data: {
    optimized_prompt: "卡通风格的绘本动画。@6f2dbf2b3.zenwhisper 在海边玩耍，充满好奇和喜悦..."
  }
}
```

---

## 常见问题

### Q1: 点击"全部优化"后没有反应？

**A**: 检查以下几点：
1. 确认已连接 OpenAI 配置节点
2. 确认 OpenAI 配置正确（API Key 有效）
3. 确认已连接旁白输入节点并输入旁白文本
4. 查看浏览器控制台是否有错误

### Q2: 优化进度卡住不动？

**A**: 可能的原因：
- OpenAI API 请求超时
- 网络问题
- API Key 配额不足

**解决方法**：
1. 检查网络连接
2. 检查 OpenAI API 配额
3. 刷新页面重新加载工作流

### Q3: 优化结果质量不满意？

**A**: 调整以下参数：
- **风格**：尝试不同的风格（绘本、电影、纪录片等）
- **优化方向**：尝试"更详细"或"更创意"
- **自定义风格**：填写详细的自定义风格描述
- **重新优化**：点击"🔄 重新优化"按钮

### Q4: 如何查看所有优化结果？

**A**:
1. 使用"上一个/下一个"按钮逐个查看
2. 点击"📋 复制"按钮复制所有结果
3. 优化结果会自动传递到视频生成节点

### Q5: 工作流恢复后，优化结果丢失？

**A**: 检查以下几点：
1. 确认优化已全部完成（100%）
2. 确认已保存工作流
3. 查看 node.data.sentences 是否包含优化结果

**防护机制**：节点会优先保留已优化的数据，避免覆盖。

---

## 相关节点

- **NarratorNode**: 旁白输入节点（提供旁白数据）
- **OpenAIConfigNode**: OpenAI 配置节点（提供配置）
- **VideoGenerateNode**: 视频生成节点（接收优化结果）

---

## 相关文档

- [节点功能参考手册](../README.md)
- [NarratorNode 文档](../input-nodes/NarratorNode.md)
- [OpenAIConfigNode 文档](../input-nodes/OpenAIConfigNode.md)
- [错误模式参考 - Error 55](../../../rules/error-patterns.md#error-16)

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
