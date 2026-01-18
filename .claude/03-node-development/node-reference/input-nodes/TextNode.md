# TextNode 文本输入节点

> **节点类型**: 输入节点
> **文件路径**: `src/client/src/nodes/input/TextNode.jsx`
> **版本**: v1.0.0
> **更新日期**: 2026-01-18

---

## 功能概述

**TextNode** 是工作流的文本输入起点，用于输入视频生成的提示词（Prompt）。

**主要功能**:
- 提供多行文本输入框
- 实时同步文本内容到下游节点
- 支持节点大小调整（ComfyUI 风格）
- 蓝色边框标识输入节点类型

---

## 输入/输出 Handles

### 输出 Handle (source)

| Handle ID | 数据类型 | 说明 |
|-----------|---------|------|
| `text-output` | string | 提示词文本输出 |

**连接到**:
- `VideoGenerateNode.prompt-input` - 提示词输入
- `PromptOptimizerNode.prompt-input` - 待优化提示词

---

## 节点配置

### 节点样式

```javascript
{
  backgroundColor: '#eff6ff',  // 浅蓝背景
  borderColor: '#3b82f6',       // 蓝色边框
  borderWidth: '2px',
  borderRadius: '8px',
  padding: '10px 15px',
  minWidth: 200,
  minHeight: 120
}
```

### 可配置参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `data.label` | string | `'文本节点'` | 节点显示名称 |
| `data.value` | string | `''` | 初始文本内容 |
| `data.onChange` | function | - | 文本变化回调函数 |

### 节点大小

- **最小宽度**: 200px
- **最小高度**: 120px
- **初始尺寸**: 220px × 120px
- **支持**: 拖动右下角调整大小

---

## 数据传递

### 输出数据格式

```javascript
// data.value 包含用户输入的文本
{
  value: string  // 用户输入的提示词文本
}
```

### 下游节点接收

下游节点通过 `data.connectedPrompt` 接收文本：

```javascript
// App.jsx 中的连接处理
useEffect(() => {
  setNodes((nds) =>
    nds.map((node) => {
      if (node.id === 'videoGenerateNode') {
        const promptEdge = edges.find(
          (e) => e.target === node.id && e.targetHandle === 'prompt-input'
        );
        if (promptEdge) {
          const sourceNode = nds.find((n) => n.id === promptEdge.source);
          return {
            ...node,
            data: {
              ...node.data,
              connectedPrompt: sourceNode?.data?.value || ''
            }
          };
        }
      }
      return node;
    })
  );
}, [edges, setNodes]);
```

---

## 使用示例

### 示例 1: 基础文本输入

**场景**: 用户手动输入提示词生成视频

```
工作流:
TextNode → VideoGenerateNode → TaskResultNode
```

**操作步骤**:
1. 添加 TextNode
2. 在文本框输入: "一只猫在睡觉"
3. 连接到 VideoGenerateNode
4. 点击生成视频

### 示例 2: 连接提示词优化器

**场景**: 先优化提示词，再生成视频

```
工作流:
TextNode → PromptOptimizerNode → VideoGenerateNode → TaskResultNode
```

**操作步骤**:
1. 添加 TextNode，输入简单描述: "猫睡觉"
2. 连接到 PromptOptimizerNode
3. 点击"优化提示词"按钮
4. 优化后的提示词自动传递到 VideoGenerateNode

---

## 常见问题

### Q1: 文本框输入后，下游节点没有更新？

**A**: 检查连接是否正确建立：
```javascript
// 验证连接
const edges = window.__REACT_FLOW_TEST_API__.getEdges();
const promptEdge = edges.find(e =>
  e.source === 'textNodeId' &&
  e.target === 'videoNodeId' &&
  e.sourceHandle === 'text-output' &&
  e.targetHandle === 'prompt-input'
);
```

### Q2: 文本框太小，输入不方便？

**A**: 拖动节点右下角调整大小：
1. 鼠标移到右下角（绿色三角）
2. 按住左键拖动
3. 释放鼠标完成调整

### Q3: 如何清空文本内容？

**A**: 有两种方式：
1. 手动删除文本框内容
2. 使用控制台：
```javascript
// 清空指定节点
const nodes = window.__REACT_FLOW_TEST_API__.getNodes();
const textNode = nodes.find(n => n.type === 'textNode');
textNode.data.value = '';
```

### Q4: 文本框支持多行输入吗？

**A**: 支持。TextNode 使用 `<textarea>` 元素：
- 支持 Enter 键换行
- 可拖动右下角调整高度
- CSS `resize: vertical` 允许垂直调整

### Q5: 输入的文本会保存吗？

**A**: 会。通过工作流存储系统自动保存：
```javascript
// 保存到 localStorage
localStorage.setItem('winjin-current-workflow', JSON.stringify({
  nodes: [
    {
      id: '1',
      type: 'textNode',
      data: {
        label: '文本节点',
        value: '我的提示词'  // ⭐ 会被保存
      }
    }
  ]
}));
```

---

## 相关文档

### 上层文档
- [节点开发层总览](../README.md)
- [输入节点概述](../README.md#输入节点-input-nodes)
- [Handle 连接规范](../handle-connections.md)

### 并行文档
- [错误模式层](../../../04-error-patterns/)
- [React Flow 规则](../../../rules/reactflow.md)

### 外部参考
- [React Flow 官方文档 - Custom Nodes](https://reactflow.dev/docs/api/nodes/custom-node/)

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
