# NarratorNode - 旁白输入节点

> **节点类型**: 输入节点
> **文件路径**: `src/client/src/nodes/input/NarratorNode.jsx`
> **版本**: v1.0.0
> **更新日期**: 2026-01-18

---

## 功能概述

旁白输入节点用于输入多行旁白文本，支持角色引用和智能角色匹配。每个句子可以包含角色引用，用于视频生成或旁白优化。

**核心功能**：
- 📖 **多行输入**：每行一个句子，支持角色引用 `@username`
- 🪄 **智能匹配**：使用 OpenAI 自动识别句子中的角色并插入引用
- 📊 **候选角色**：显示连接的角色库角色，点击插入到光标位置
- 🎨 **风格设置**：绘本风格、电影风格、纪录片风格、动画风格、自定义
- ⏱️ **时长设置**：10秒、15秒、25秒
- ⚖️ **优化方向**：平衡、更详细、更简洁、更创意、更专业

**典型用途**：输入绘本旁白，AI 自动优化为详细的视频生成提示词。

---

## 输入/输出 Handles

### 输入 Handles

| Handle ID | 类型 | 数据格式 | 说明 |
|-----------|------|----------|------|
| `character-input` | 输入 | `Character[]` | 角色对象数组（来自角色库）⭐ |
| `openai-config` | 输入 | `OpenAIConfig` | OpenAI 配置（可选，用于智能匹配） |

### 输出 Handle

| Handle ID | 类型 | 数据格式 | 说明 |
|-----------|------|----------|------|
| `narrator-output` | 输出 | `NarratorData` | 旁白数据对象 ⭐ |

**旁白数据格式**:
```javascript
{
  rawText: "@装载机 在工地上干活\n@阳光小猫 在海边玩耍",
  sentences: [
    { id: "sentence-1", index: 0, text: "@装载机 在工地上干活", optimized: "", status: "pending" },
    { id: "sentence-2", index: 1, text: "@阳光小猫 在海边玩耍", optimized: "", status: "pending" }
  ],
  connectedCharacters: [...],  // 角色对象数组
  openaiConfig: {...},         // OpenAI 配置
  style: "picture-book",        // 风格
  targetDuration: 10,           // 目标时长（秒）
  optimizationDirection: "balanced"  // 优化方向
}
```

---

## 节点配置

### 1. 旁白文本输入

**格式要求**：
- 每行一个句子
- 支持角色引用格式：`@username`
- 自动去除空行

**示例**：
```
@装载机 在工地上干活，认真负责的样子
@阳光小猫 在海边玩耍，充满好奇和喜悦
```

### 2. 智能匹配角色 🪄

**触发条件**：
- ✅ 已连接 OpenAI 配置节点（或 NarratorProcessorNode）
- ✅ 已连接角色库节点并选择角色
- ✅ 已输入旁白文本

**匹配规则**：
- 使用 OpenAI API 识别句子中的角色
- 置信度 > 0.8 才会插入引用
- 支持一个句子匹配多个角色
- 已有引用的行会跳过

**匹配结果**：
- 在句子开头插入所有匹配的角色引用
- 格式：`@username1 @username2 原句文本`

### 3. 风格设置

| 风格 | 说明 | 推荐场景 |
|------|------|----------|
| `picture-book` | 📖 绘本风格 | 儿童绘本、故事书 |
| `cinematic` | 🎬 电影风格 | 电影镜头、大片感 |
| `documentary` | 📹 纪录片风格 | 纪实、纪录片 |
| `animation` | 🎨 动画风格 | 动画片、卡通 |
| `custom` | ✏️ 自定义风格 | 需要填写描述 |

### 4. 时长设置

| 时长 | 适用场景 |
|------|----------|
| `10秒` | 快速镜头、短视频 |
| `15秒` | 标准镜头 |
| `25秒` | 长镜头、复杂场景 |

### 5. 优化方向

| 方向 | 说明 |
|------|------|
| `balanced` | ⚖️ 平衡（默认） |
| `detailed` | 📝 更详细（增加细节描述） |
| `concise` | ✂️ 更简洁（精简表达） |
| `creative` | 🎨 更创意（增加创意元素） |
| `professional` | 🎬 更专业（专业术语） |

### 6. 自定义风格描述

当选择 `custom` 风格时，需要填写自定义风格描述。

**示例**：
```
吉卜力风格，温暖治愈，色彩鲜艳，充满想象力
```

---

## 数据传递

### 接收角色数据 ⭐ Error 55 修复

```javascript
// ✅ 正确：优先使用 connectedCharacters（完整对象）
const characterData = sourceNode.data?.connectedCharacters || sourceNode.data?.selectedCharacters;

// ❌ 错误：仅使用 selectedCharacters（仅ID，会导致 Error 55）
const characterData = sourceNode.data?.selectedCharacters;
```

**原因**：`selectedCharacters` 仅包含 ID 数组，没有 `username` 等字段，导致智能匹配时 `char.username` 为 `undefined`。

### OpenAI 配置优先级

1. **直接连接**：从 `OpenAIConfigNode` 直接连接到 `openai-config` Handle
2. **继承配置**：从 `NarratorProcessorNode` 继承 OpenAI 配置
3. **动态获取**：调用 `getOpenAIConfig()` 方法获取可用配置

### 候选角色显示和插入

当连接了角色库节点后，会显示候选角色列表：

```javascript
// 显示格式
{char.alias || char.username} (@{char.username})

// 点击插入
insertCharacterAtCursor(char.username, displayName)
// 插入格式：@username （真实ID，不是别名）
```

**示例**：
- 显示：`测试小猫 (@6f2dbf2b3.zenwhisper)`
- 插入：`@6f2dbf2b3.zenwhisper `

---

## 使用示例

### 示例 1: 手动输入旁白 + 角色引用

```
工作流结构：
CharacterLibraryNode (id: 1)
  ↓ characters-output
NarratorNode (id: 12)
  - 旁白文本：
    - @6f2dbf2b3.zenwhisper 在海边玩耍，充满好奇和喜悦地探索
  ↓ narrator-output
NarratorProcessorNode (id: 14)
```

**操作步骤**：
1. 连接角色库节点到旁白输入节点
2. 在旁白输入框输入文本（每行一个句子）
3. 手动插入角色引用：点击候选角色卡片
4. 选择风格和时长
5. 旁白数据自动传递到旁白处理节点

### 示例 2: 智能匹配角色

```
工作流结构：
CharacterLibraryNode (id: 1) ──┐
OpenAIConfigNode (id: 13) ────┤
                                ↓
                         NarratorNode (id: 12)
  - 旁白文本（不含引用）：
    - 阳光小猫在海边玩耍
    - 装载机在工地上干活
```

**操作步骤**：
1. 连接角色库节点（已选择角色）
2. 连接 OpenAI 配置节点
3. 输入旁白文本（不包含角色引用）
4. 点击"🪄 智能匹配角色"按钮
5. OpenAI 自动识别并插入角色引用
6. 结果：
   - `@6f2dbf2b3.zenwhisper 阳光小猫在海边玩耍`
   - `@ebfb9a758.sunnykitte 装载机在工地上干活`

### 示例 3: 完整的旁白优化流程

```
工作流结构：
CharacterLibraryNode (id: 1) ──┐
OpenAIConfigNode (id: 13) ─────┤
                                ↓
                         NarratorNode (id: 12)
  - 风格：📖 绘本风格
  - 时长：10秒
  - 优化方向：⚖️ 平衡
                                ↓
                         NarratorProcessorNode (id: 14)
  - 自动调用 OpenAI 优化每个句子
                                ↓
                         VideoGenerateNode (id: 6)
  - 优化后的句子：
    - 卡通风格的绘本动画。阳光温柔地洒在湛蓝的海面上，@6f2dbf2b3.zenwhisper 在海边玩耍，充满好奇和喜悦地探索着...
```

---

## 常见问题

### Q1: 为什么"智能匹配角色"按钮是灰色的？

**A**: 检查以下几点：
1. 确认已连接 OpenAI 配置节点（或旁白处理节点）
2. 确认已连接角色库节点并选择角色
3. 确认已输入旁白文本

### Q2: 智能匹配后，角色引用格式不正确？

**A**: 确认角色引用格式：
- ✅ 正确：`@6f2dbf2b3.zenwhisper 在海边玩耍`（真实ID）
- ❌ 错误：`@{6f2dbf2b3.zenwhisper} 在海边玩耍`（带花括号）

### Q3: 候选角色列表不显示？

**A**: 检查角色连接：
1. 确认已创建连接：`CharacterLibraryNode.characters-output` → `NarratorNode.character-input`
2. 确认在角色库节点选择了角色
3. 查看浏览器控制台，检查是否有 `[NarratorNode] ✅ 设置角色数据` 日志

### Q4: 自定义风格描述在哪里填写？

**A**:
1. 在"风格"下拉框中选择"✏️ 自定义风格"
2. 下方会显示"自定义风格描述"输入框
3. 填写你想要的视觉风格描述

### Q5: 句子状态说明？

**A**:
- `⏳ 待优化`：初始状态，尚未优化
- `🔄 优化中`：正在调用 OpenAI 优化
- `✅ 已就绪`：优化完成，可以使用
- `❌ 失败`：优化失败，检查错误

---

## API 依赖

### 后端 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/openai/identify-characters` | POST | 智能识别句子中的角色 |

### OpenAI 配置格式

```javascript
{
  base_url: "https://api.deepseek.com",  // API Base URL
  api_key: "sk-xxxxx...",                // API Key
  model: "deepseek-chat"                 // 模型名称
}
```

---

## 相关节点

- **CharacterLibraryNode**: 角色库节点（提供角色数据）
- **OpenAIConfigNode**: OpenAI 配置节点（提供配置）
- **NarratorProcessorNode**: 旁白处理节点（接收旁白数据并优化）

---

## 相关文档

- [节点功能参考手册](../README.md)
- [CharacterLibraryNode 文档](./CharacterLibraryNode.md)
- [NarratorProcessorNode 文档](../process-nodes/NarratorProcessorNode.md)
- [错误模式参考 - Error 55](../../../rules/error-patterns.md#error-16)

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
