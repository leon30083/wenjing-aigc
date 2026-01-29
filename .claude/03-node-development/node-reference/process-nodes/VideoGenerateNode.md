# VideoGenerateNode 视频生成节点

> **节点类型**: 处理节点
> **文件路径**: `src/client/src/nodes/process/VideoGenerateNode.jsx`
> **版本**: v1.0.0
> **更新日期**: 2026-01-18

---

## 功能概述

**VideoGenerateNode** 是 WinJin AIGC 的核心处理节点，负责调用 Sora2 API 生成视频。

**主要功能**:
- 接收提示词、角色、图片、API 配置
- 角色引用双显示功能（用户看别名，API用真实ID）
- 旁白模式支持（批量生成）
- 调用后端 API 创建视频任务
- 派发任务完成事件通知下游节点

---

## 输入/输出 Handles

### 输入 Handles (target)

| Handle ID | 数据类型 | 说明 | 连接来源 |
|-----------|---------|------|---------|
| `api-config` | object | API 配置 | APISettingsNode.api-output |
| `prompt-input` | string | 提示词文本 | TextNode.text-output, PromptOptimizerNode.optimized-prompt |
| `character-input` | array | 角色对象数组 | CharacterLibraryNode.characters-output ⭐ |
| `images-input` | array | 参考图片URL数组 | ReferenceImageNode.images-output |
| `sentence-output` | object | 旁白句子 | NarratorProcessorNode.sentence-output |

### 输出 Handle (source)

| Handle ID | 数据类型 | 说明 | 连接到 |
|-----------|---------|------|--------|
| `video-output` | string | 任务ID | TaskResultNode.task-input ⭐ |

---

## 节点配置

### 节点样式

```javascript
{
  backgroundColor: '#ecfdf5',  // 浅绿背景
  borderColor: '#10b981',       // 绿色边框
  borderWidth: '2px',
  borderRadius: '8px',
  padding: '10px 15px',
  paddingLeft: '85px',  // 为左侧Handle标签留空间
  paddingRight: '85px',
  minWidth: 260,
  minHeight: 400
}
```

### 可配置参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `apiConfig` | object | - | 来自 APISettingsNode 的配置 ⭐ 优先 |
| `platform` | string | `'juxin'` | 平台: `juxin` 或 `zhenzhen` |
| `model` | string | `'sora-2-all'` | 模型: `sora-2`, `sora-2-all` |
| `aspect` | string | `'16:9'` | 宽高比: `16:9`, `9:16`, `1:1` |
| `watermark` | boolean | `false` | 是否添加水印 |
| `duration` | number | `10` | 视频时长（秒）: 5, 10, 15, 25 |
| `manualPrompt` | string | `''` | 手动输入的提示词 |

---

## 数据传递

### 1. API 配置传递 ⭐ Error 55 修复

```javascript
// ✅ 正确：优先使用外部 API 配置
const externalApiConfig = data.apiConfig || null;
const apiConfig = externalApiConfig || defaultApiConfig;

// 外部配置包含完整对象
{
  platform: 'juxin',
  model: 'sora-2-all',
  aspect: '16:9',
  watermark: false,
  apiKey: 'sk-xxxxx'
}
```

### 2. 角色数据传递 ⭐ Error 55 修复

```javascript
// ✅ 正确：使用 connectedCharacters（完整对象数组）
const [connectedCharacters, setConnectedCharacters] = useState([]);

// data.connectedCharacters 由 App.jsx 传入：
useEffect(() => {
  setNodes((nds) =>
    nds.map((node) => {
      if (node.id === 'videoGenerateNode') {
        const charEdge = edges.find(
          (e) => e.target === node.id && e.targetHandle === 'character-input'
        );
        if (charEdge) {
          const sourceNode = nds.find((n) => n.id === charEdge.source);
          // ⭐ 关键：传递完整角色对象数组
          return {
            ...node,
            data: {
              ...node.data,
              connectedCharacters: sourceNode?.data?.connectedCharacters || []
            }
          };
        }
      }
      return node;
    })
  );
}, [edges, setNodes]);

// ⭐ connectedCharacters 格式：
[
  {
    id: 'char-id',
    username: '6f2dbf2b3.zenwhisper',  // ⭐ 真实ID（API用）
    alias: '测试小猫',                // ⭐ 别名（用户看）
    permalink: 'https://...',
    profilePictureUrl: 'https://...'
  }
]
```

### 3. 任务ID传递到下游

```javascript
// 视频创建成功后派发事件
window.dispatchEvent(new CustomEvent('video-task-created', {
  detail: {
    sourceNodeId: nodeId,
    taskId: id,
    platform: apiConfig.platform
  }
}));
```

---

## 角色引用双显示功能 ⭐

### 核心原理

| 显示位置 | 显示内容 | 说明 |
|---------|---------|------|
| **输入框** | 别名 `@测试小猫` | 用户友好 |
| **API调用** | 真实ID `@6f2dbf2b3.zenwhisper` | API要求 |

### 转换逻辑

```javascript
// 1. 显示转换：真实ID → 别名（输入框显示）
const realToDisplay = (text) => {
  let result = text;
  Object.entries(usernameToAlias).forEach(([username, alias]) => {
    const regex = new RegExp(`@${username}(?=\\s|$|@)`, 'g');
    result = result.replace(regex, `@${alias}`);
  });
  return result;
};

// 2. API转换：别名 → 真实ID（API调用）
const displayToReal = (text) => {
  let result = text;
  const sortedAliases = Object.entries(usernameToAlias)
    .sort((a, b) => b[1].length - a[1].length); // 长别名优先

  sortedAliases.forEach(([username, alias]) => {
    const regex = new RegExp(`@${alias}(?=\\s|$|@)`, 'g');
    result = result.replace(regex, `@${username}`);
  });
  return result;
};
```

### 角色插入功能

```javascript
// 点击角色卡片插入到光标位置
const insertCharacterAtCursor = (username, alias) => {
  const promptElement = promptInputRef.current;
  const start = promptElement.selectionStart;
  const end = promptElement.selectionEnd;
  const displayText = realToDisplay(manualPrompt);
  const refText = `@${alias} `; // ⭐ 插入别名

  const newDisplayText = displayText.substring(0, start) + refText + displayText.substring(end);
  const newRealText = displayToReal(newDisplayText); // ⭐ 转换为真实ID存储
  setManualPrompt(newRealText);

  // 移动光标
  setTimeout(() => {
    promptElement.setSelectionRange(start + refText.length, start + refText.length);
    promptElement.focus();
  }, 0);
};
```

---

## 使用示例

### 示例 1: 简单文本生成视频

```
工作流:
TextNode → VideoGenerateNode → TaskResultNode
```

**操作步骤**:
1. TextNode 输入: "一只猫在睡觉"
2. VideoGenerateNode 配置: 10秒, 16:9
3. 点击"生成视频"

### 示例 2: 角色视频生成 ⭐ Error 55 修复验证

```
工作流:
CharacterLibraryNode → VideoGenerateNode → TaskResultNode
TextNode ──────────────┘
```

**操作步骤**:
1. CharacterLibraryNode 选择角色
2. TextNode 输入提示词（不包含角色描述）
3. 点击 VideoGenerateNode 中的角色卡片插入引用
4. 输入框显示: `@测试小猫 在海边玩耍`
5. API 使用: `@6f2dbf2b3.zenwhisper 在海边玩耍`
6. 点击"生成视频"

**验证点**:
- ✅ connectedCharacters 包含完整角色对象
- ✅ 角色引用使用真实ID
- ✅ 不描述角色外观（Sora2使用真实外观）

### 示例 3: 旁白模式批量生成

```
工作流:
NarratorNode → NarratorProcessorNode ──┐
                                      ├─→ VideoGenerateNode → TaskResultNode
CharacterLibraryNode ──────────────────┘
```

**操作步骤**:
1. NarratorNode 输入旁白文本
2. NarratorProcessorNode 分句并优化
3. VideoGenerateNode 切换到旁白模式
4. 点击"加载当前旁白"加载第一句
5. 点击"下一个"循环加载（支持循环）

---

## 常见问题

### Q1: 角色引用在输入框显示别名，但API使用真实ID？

**A**: 这是双显示功能的正常行为：
- 输入框显示 `@测试小猫`（别名，用户友好）
- API 使用 `@6f2dbf2b3.zenwhisper`（真实ID，API要求）
- 自动转换，无需手动处理

### Q2: 为什么不描述角色外观？

**A**: Sora2 角色引用会使用角色真实外观：
- ❌ 错误：描述"大眼睛、可爱姿态"
- ✅ 正确：只描述活动"在海边玩耍、充满好奇"
- Sora2 自动使用角色库中的真实外观

### Q3: 如何在光标位置插入角色引用？

**A**:
1. 先在输入框中点击，确定光标位置
2. 点击上方的角色卡片
3. 引用自动插入到光标位置：`@测试小猫 `
4. 光标移动到引用之后

### Q4: 连接的提示词没有显示？

**A**: 检查以下几点：
1. 确认连接已建立（text-output → prompt-input）
2. 查看是否有"💡 提示词来自优化节点"提示
3. 可以继续编辑，不会覆盖原内容

### Q5: API 配置显示"💡 提示：连接 API 设置节点"？

**A**: 需要连接 APISettingsNode：
1. 添加 APISettingsNode
2. 配置平台、模型、密钥
3. 连接 api-output → api-config
4. VideoGenerateNode 会显示配置信息

### Q6: 视频生成失败，提示错误？

**A**: 检查以下几点：
1. API Key 是否正确
2. 提示词是否为空
3. 网络是否正常
4. 后端服务器是否运行（端口 9000）

### Q7: 旁白模式句子索引不正确？

**A**: 检查以下几点：
1. NarratorProcessorNode 是否正确连接
2. 旁白是否已分句和优化
3. 点击"加载当前旁白"刷新
4. 查看控制台日志调试

---

## 相关文档

### 上层文档
- [节点开发层总览](../README.md)
- [处理节点概述](../README.md#处理节点-process-nodes)
- [Handle 连接规范](../handle-connections.md)

### 错误模式
- [错误55: 角色对象传递不完整](../../../04-error-patterns/README.md#error55)
- [错误48: 优化节点错误使用双显示功能](../../../04-error-patterns/README.md#error48)

### 并行文档
- [角色引用规范](../../../rules/base.md#角色引用语法)
- [双平台API规范](../../../rules/code.md#sora2-api-开发规范)

### 外部参考
- [React Flow 官方文档 - Custom Nodes](https://reactflow.dev/docs/api/nodes/custom-node/)

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
