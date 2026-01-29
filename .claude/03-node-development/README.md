# 03-node-development: 节点开发层

> **版本**: v2.0.0
> **更新日期**: 2026-01-23
> **定位**: React Flow 节点的开发规范和架构模式

---

## 核心公式

```
节点架构 = 数据传递 + 状态同步 + Handle 连接

双显示 = 用户看别名 + API 用真实ID

数据流 = 源节点直接更新目标节点（绕过 App.jsx）
```

---

## 节点类型分类

| 类型 | 颜色 | 示例 | 用途 |
|------|------|------|------|
| **输入节点** | 蓝色 (#3b82f6) | APISettingsNode, CharacterLibraryNode | 提供配置和数据 |
| **处理节点** | 绿色 (#10b981) | VideoGenerateNode, PromptOptimizerNode | 执行业务逻辑 |
| **输出节点** | 浅蓝 (#0ea5e9) | TaskResultNode, CharacterResultNode | 显示结果 |

---

## Handle 连接规范 ⭐ 核心

### 输入端口到源节点类型的映射

| 目标端口 | 允许的源节点类型 | 数据传递 | 用途 |
|---------|----------------|----------|------|
| `prompt-input` | textNode, promptOptimizerNode, narratorProcessorNode | connectedPrompt | 文本提示词输入和优化 |
| `character-input` | characterLibraryNode | connectedCharacters | 角色库数据传递 |
| `images-input` | referenceImageNode | connectedImages | 参考图片传递 |
| `api-config` | apiSettingsNode | apiConfig | API 配置连接 |
| `task-input` | videoGenerateNode, storyboardNode, juxinStoryboardNode, zhenzhenStoryboardNode, characterCreateNode | taskId | 任务结果监听 |

### 连接验证机制
```javascript
// ✅ App.jsx 中的验证逻辑
const validCharacterSourceTypes = ['characterLibraryNode'];
if (sourceNode && validCharacterSourceTypes.includes(sourceNode.type)) {
  newData.connectedCharacters = sourceNode.data.connectedCharacters;
} else {
  newData.connectedCharacters = undefined; // 静默失败
}
```

---

## 数据传递架构 ⭐ 重要

### 核心原则
**源节点直接更新目标节点，避免依赖父组件中转**

```javascript
// ✅ 正确：源节点直接更新目标节点
useEffect(() => {
  if (nodeId) {
    const edges = getEdges();
    const outgoingEdges = edges.filter(e => e.source === nodeId);

    setNodes((nds) =>
      nds.map((node) => {
        // 更新自己
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, selectedCharacters } };
        }
        // 直接更新目标节点（绕过 App.jsx）
        const isConnected = outgoingEdges.some(e => e.target === node.id);
        if (isConnected) {
          return { ...node, data: { ...node.data, connectedCharacters } };
        }
        return node;
      })
    );
  }
}, [selectedCharacters, nodeId, setNodes, characters, getEdges]);
```

### ❌ 错误模式：依赖 App.jsx 中转
```javascript
// ❌ 错误：只监听 edges，节点内部状态变化不传递
useEffect(() => {
  setNodes((nds) =>
    nds.map((node) => {
      const sourceNode = nds.find(n => n.id === edge.source);
      return node.id === edge.target
        ? { ...node, data: { ...node.data, connectedData: sourceNode.data.xxx } }
        : node;
    })
  );
}, [edges]); // 只监听 edges，节点内部状态变化不传递
```

---

## 双显示功能 ⭐ 角色

### 设计理念
用户看到友好的别名，API 接收准确的真实 ID

### 实现示例
```javascript
// 创建映射
const usernameToAlias = React.useMemo(() => {
  const map = {};
  connectedCharacters.forEach(char => {
    map[char.username] = char.alias || char.username;
  });
  return map;
}, [connectedCharacters]);

// 真实ID → 显示别名
const realToDisplay = (text) => {
  let result = text;
  Object.entries(usernameToAlias).forEach(([username, alias]) => {
    const regex = new RegExp(`@${username}(?=\\s|$|@)`, 'g');
    result = result.replace(regex, `@${alias}`);
  });
  return result;
};

// 显示别名 → 真实ID（按最长匹配优先）
const displayToReal = (text) => {
  let result = text;
  const sortedAliases = Object.entries(usernameToAlias)
    .sort((a, b) => b[1].length - a[1].length);
  sortedAliases.forEach(([username, alias]) => {
    const regex = new RegExp(`@${alias}(?=\\s|$|@)`, 'g');
    result = result.replace(regex, `@${username}`);
  });
  return result;
};

// Textarea 显示别名
<textarea
  value={realToDisplay(manualPrompt)}
  onChange={(e) => setManualPrompt(displayToReal(e.target.value))}
/>
```

---

## 节点开发最佳实践

### 1. useState 同步到 node.data
```javascript
// 初始化
const [manualPrompt, setManualPrompt] = useState(data.manualPrompt || '');

// 同步到 node.data
useEffect(() => {
  if (manualPrompt !== data.manualPrompt) {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, manualPrompt } }
          : node
      )
    );
  }
}, [manualPrompt, nodeId, setNodes, data.manualPrompt]);
```

### 2. useEffect 依赖最佳实践
```javascript
// ❌ 错误：依赖 data 对象
useEffect(() => {
  // ...
}, [data]); // data 每次都是新引用

// ✅ 正确：依赖具体值
useEffect(() => {
  // ...
}, [data.value]); // 只依赖实际变化的值
```

### 3. 防止节点内交互触发拖动
```jsx
{/* 使用 nodrag 类 */}
<textarea className="nodrag" />
<select className="nodrag">...</select>
<input className="nodrag" type="checkbox" />
<button className="nodrag">生成</button>
```

---

## 详细文档

- [节点架构](references/node-architecture.md) - 完整的架构模式
- [Handle 连接](references/handle-connections.md) - 连接规范详解
- [节点模板](references/node-templates.md) - 代码模板库
- [节点功能参考手册](node-reference/README.md) - 所有节点功能文档

---

## 快速开始

### 新手入门（15分钟）
1. 阅读 [节点架构](references/node-architecture.md) - 理解节点架构
2. 阅读 [Handle 连接](references/handle-connections.md) - 学习连接规范
3. 浏览 [节点模板](references/node-templates.md) - 使用代码模板

### 进阶开发者（20分钟）
1. 深入理解 [Handle 连接](references/handle-connections.md) - 掌握连接验证
2. 精读 [节点功能参考手册](node-reference/README.md) - 熟悉所有节点
3. 应用到实际开发 - 创建自定义节点

---

## 常见问题

### Q: 如何防止节点间数据传递丢失？

**A**: 使用**源节点直接更新目标节点**模式，绕过 App.jsx 的中转

### Q: useEffect 无限循环怎么办？

**A**:
1. 移除 `data` 从依赖数组
2. 使用 `useRef` 存储回调
3. 只依赖实际变化的值

### Q: 如何实现双显示功能？

**A**: 参考上面的"双显示功能"示例代码

---

## 相关文档

### 上层文档
- [哲学层](../00-philosophy/) - 核心理念
- [基础知识层](../01-fundamentals/) - 技术栈
- [方法论层](../02-methodology/) - 开发流程

### 并行文档
- [错误模式层](../04-error-patterns/) - 错误库

---

**维护者**: WinJin AIGC Team
**最后更新**: 2026-01-23
**版本**: v2.0.0
