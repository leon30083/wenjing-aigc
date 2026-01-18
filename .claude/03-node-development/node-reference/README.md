# 节点功能参考手册

> **版本**: v1.0.0
> **更新日期**: 2026-01-18
> **维护者**: WinJin AIGC Team

---

## 概述

本手册提供了 WinJin AIGC 项目中所有 React Flow 节点的详细功能说明。每个节点文档包含：功能概述、输入/输出 Handles、节点配置、数据传递、使用示例和常见问题。

**目标读者**:
- 🤖 AI 助手：理解节点功能以生成正确的工作流
- 👨‍💻 开发者：了解节点实现细节和使用方法
- 🧪 测试人员：验证节点功能和工作流正确性

---

## 快速导航

### 按节点类型查找

**[输入节点](./input-nodes/)** (6个)
- [TextNode](./input-nodes/TextNode.md) - 文本输入
- [ReferenceImageNode](./input-nodes/ReferenceImageNode.md) - 参考图片
- [CharacterLibraryNode](./input-nodes/CharacterLibraryNode.md) - 角色库 ⭐
- [APISettingsNode](./input-nodes/APISettingsNode.md) - API 配置
- [OpenAIConfigNode](./input-nodes/OpenAIConfigNode.md) - OpenAI 配置
- [NarratorNode](./input-nodes/NarratorNode.md) - 旁白输入

**[处理节点](./process-nodes/)** (8个)
- [VideoGenerateNode](./process-nodes/VideoGenerateNode.md) - 视频生成 ⭐
- [PromptOptimizerNode](./process-nodes/PromptOptimizerNode.md) - 提示词优化
- [CharacterCreateNode](./process-nodes/CharacterCreateNode.md) - 角色创建
- [StoryboardNode](./process-nodes/StoryboardNode.md) - 故事板
- [NarratorProcessorNode](./process-nodes/NarratorProcessorNode.md) - 旁白处理
- [VideoNode](./process-nodes/VideoNode.md) - 视频节点
- [JuxinStoryboardNode](./process-nodes/JuxinStoryboardNode.md) - 聚鑫故事板
- [ZhenzhenStoryboardNode](./process-nodes/ZhenzhenStoryboardNode.md) - 贞贞故事板

**[输出节点](./output-nodes/)** (2个)
- [TaskResultNode](./output-nodes/TaskResultNode.md) - 任务结果 ⭐
- [CharacterResultNode](./output-nodes/CharacterResultNode.md) - 角色结果

---

## 按功能场景查找

### 角色视频生成流程 ⭐
```
CharacterLibraryNode → VideoGenerateNode → TaskResultNode
```

**相关节点**:
- [CharacterLibraryNode](./input-nodes/CharacterLibraryNode.md) - 选择角色
- [VideoGenerateNode](./process-nodes/VideoGenerateNode.md) - 生成视频
- [TaskResultNode](./output-nodes/TaskResultNode.md) - 查看结果

### 批量视频生成流程（故事板）
```
CharacterLibraryNode ─┐
TextNode ───────────────┤
                         ↓
                  StoryboardNode → TaskResultNode
```

**相关节点**:
- [StoryboardNode](./process-nodes/StoryboardNode.md) - 多镜头生成

### 提示词优化流程
```
TextNode → PromptOptimizerNode → VideoGenerateNode
```

**相关节点**:
- [PromptOptimizerNode](./process-nodes/PromptOptimizerNode.md) - 优化提示词

---

## 核心概念

### Handle 连接规范

所有节点的 Handle 遵循统一命名规范：

**输入 Handle** (target):
```
{数据类型}-input

示例：
- prompt-input      # 提示词输入
- character-input   # 角色输入
- images-input      # 图片输入
```

**输出 Handle** (source):
```
{数据类型}-output

示例：
- text-output       # 文本输出
- characters-output # 角色输出
- video-output      # 视频输出
```

### 数据传递原则

1. **完整对象传递** ⭐ Error 55 修复
   - 传递完整对象而非仅 ID
   - 例如：`connectedCharacters` 包含 `{id, username, alias, ...}`

2. **双向同步**
   - 上游节点更新时，下游节点自动更新
   - 使用 `useEffect` 监听 `data.connectedXXX` 字段

3. **状态优先级**
   - `connectedCharacters` (完整对象) ✅ 优先
   - `selectedCharacters` (仅 ID) ❌ 降级

---

## 节点类型分类

### 输入节点 (Input Nodes)

提供数据输入功能，是工作流的起点。

| 节点 | 主要功能 | 输出 Handle |
|------|---------|-----------|
| TextNode | 文本输入 | `text-output` |
| ReferenceImageNode | 图片管理 | `images-output` |
| CharacterLibraryNode | 角色选择 | `characters-output` |
| APISettingsNode | API 配置 | `api-config` |
| OpenAIConfigNode | OpenAI 配置 | `openai-config` |
| NarratorNode | 旁白输入 | `narrator-output` |

### 处理节点 (Process Nodes)

执行核心业务逻辑，处理和转换数据。

| 节点 | 主要功能 | 输入 Handle | 输出 Handle |
|------|---------|-----------|-----------|
| VideoGenerateNode | 视频生成 | `prompt-input`, `character-input`, `images-input` | `video-output` |
| PromptOptimizerNode | 提示词优化 | `prompt-input` | `optimized-prompt` |
| CharacterCreateNode | 角色创建 | `video-input` | `character-output` |
| StoryboardNode | 故事板批量 | `character-input`, `images-input` | `storyboard-output` |
| NarratorProcessorNode | 旁白处理 | `narrator-input` | `sentence-output` |
| VideoNode | 简单视频生成 | `prompt-input` | `video-output` |
| JuxinStoryboardNode | 聚鑫故事板 | `character-input`, `images-input` | `storyboard-output` |
| ZhenzhenStoryboardNode | 贞贞故事板 | `character-input`, `images-input` | `storyboard-output` |

### 输出节点 (Output Nodes)

显示结果信息，是工作流的终点。

| 节点 | 主要功能 | 输入 Handle |
|------|---------|-----------|
| TaskResultNode | 任务结果显示 | `task-input` |
| CharacterResultNode | 角色结果显示 | `character-input` |

---

## 常见工作流模式

### 模式 1: 简单文本生成视频
```
TextNode → VideoGenerateNode → TaskResultNode
```

### 模式 2: 角色视频生成 ⭐
```
CharacterLibraryNode → VideoGenerateNode → TaskResultNode
TextNode ──────────────┘
```

### 模式 3: 提示词优化生成
```
TextNode → PromptOptimizerNode → VideoGenerateNode → TaskResultNode
```

### 模式 4: 批量故事板生成
```
CharacterLibraryNode ─┐
TextNode ───────────────┤
                         ↓
                  StoryboardNode → TaskResultNode
```

---

## 使用指南

### 如何使用本手册

1. **查找节点文档**
   - 按类型浏览（输入/处理/输出）
   - 按功能场景查找
   - 使用文档内搜索

2. **理解节点功能**
   - 阅读"功能概述"了解用途
   - 查看"输入/输出 Handles"了解连接方式
   - 参考"使用示例"学习实际应用

3. **构建工作流**
   - 选择合适的输入节点
   - 添加处理节点并连接 Handles
   - 使用输出节点查看结果
   - 参考"常见问题"解决疑难

### 文档更新记录

| 日期 | 版本 | 更新内容 |
|------|------|---------|
| 2026-01-18 | v1.0.0 | 初始版本 - 创建节点参考手册框架 |

---

## 相关文档

### 上层文档
- [节点开发层总览](../README.md)
- [节点架构](../node-architecture.md)
- [Handle 连接](../handle-connections.md)
- [节点模板](../node-templates.md)

### 并行文档
- [错误模式层](../../04-error-patterns/)
- [测试规范](../../rules/testing.md) (待创建)
- [服务器管理规范](../../rules/server-management.md) (待创建)

### 外部文档
- [React Flow 官方文档](https://reactflow.dev/)

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
