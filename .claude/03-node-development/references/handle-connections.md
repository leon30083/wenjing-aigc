---

paths: *

---

# React Flow 节点连接与数据传递规范

> **版本**: v2.0.0
> **更新日期**: 2026-01-18
> **来源**: 从 `rules/base.md` 拆分提取

---

## 角色引用策略 ⭐

### 设计理念

完全复刻网页版的角色调用方式，灵活自由。

### 工作流程

```
CharacterLibraryNode (多选初筛)
  ↓ selectedCharacters 数组
  ↓ 通过节点连接传递
VideoGenerateNode (接收候选角色列表)
  ↓ 显示候选角色卡片
  ↓ 用户点击角色卡片
  ↓ 在光标位置插入 @username
```

### CharacterLibraryNode - 初筛功能

**多选模式切换**: 提供"传送到视频节点"和"角色编辑"两种模式

**传送到视频节点模式**:
- 点击角色卡片进行多选（绿色边框 + ✓ 标识）
- 再次点击取消选择
- 通过节点连接传递选中的角色数组

**角色编辑模式**:
- 单个角色删除：hover 显示删除按钮（✕）
- 双击编辑角色别名
- 批量选择和删除操作
- 更准确的模式描述（原名"批量删除"）

**搜索和筛选**: 支持按用户名/别名搜索，支持筛选（全部/收藏/最近）

### VideoGenerateNode - 手动插入功能

**候选角色显示**:
- 显示从 CharacterLibraryNode 接收的候选角色列表
- 每个角色显示：头像 + 别名/用户名
- hover 高亮效果

**点击插入**:
- 点击角色卡片，在光标位置插入 `@alias`
- 自动移动光标到插入内容之后
- 可多次插入，插入到不同位置

**提示词编辑**:
- 用户完全自由编辑提示词
- 可以手动输入/修改/删除 `@username` 引用
- 不做任何自动组装

**空状态提示**:
- 未连接角色库节点时：显示提示信息
- 连接但未选择角色时：显示提示信息

### 双显示功能 ⭐

**设计理念**: 用户看到友好的别名，API 接收准确的真实 ID

**用户体验**:
- 输入框显示：`@阳光小猫 和@测试小猫 在海边玩`（易读）
- 内部存储：`@5562be00d.sunbeamkit 和@ebfb9a758.sunnykitte 在海边玩`（准确）

**映射机制**:
- 创建 `usernameToAlias` 映射表（React.useMemo 优化性能）
- `realToDisplay()`: 将真实 ID 转换为别名（显示用）
- `displayToReal()`: 将别名转换为真实 ID（API 用）

**正则表达式修复** ⚠️ 关键:
- **问题**: `\b` 单词边界不支持中文（只匹配 `[a-zA-Z0-9_]`）
- **解决**: 使用 `(?=\s|$|@)` 正向肯定预查
- **匹配**: 空白字符、字符串结尾、或下一个 `@` 符号

**实现示例**:
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
    const regex = new RegExp(`@${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    result = result.replace(regex, `@${alias}`);
  });
  return result;
};

// 显示别名 → 真实ID（按最长匹配优先，支持中文）
const displayToReal = (text) => {
  let result = text;
  const sortedAliases = Object.entries(usernameToAlias)
    .sort((a, b) => b[1].length - a[1].length); // 长别名优先
  sortedAliases.forEach(([username, alias]) => {
    // ⚠️ 关键：使用 (?=\s|$|@) 而不是 \b
    const regex = new RegExp(`@${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|@)`, 'g');
    result = result.replace(regex, `@${username}`);
  });
  return result;
};

// Textarea 显示别名
<textarea
  value={realToDisplay(manualPrompt)}
  onChange={(e) => setManualPrompt(displayToReal(e.target.value))}
/>

// 预览显示真实ID
<div>📤 最终提示词 (API): {manualPrompt}</div>
<div>💡 输入框显示别名，API使用真实ID</div>
```

### 角色引用格式

- **显示格式**（用户输入框显示）：`@alias`（用户友好的别名）
- **API 格式**（内部存储和 API 调用）：`@username`（真实用户名 ID）
- **示例**：
  - 显示：`@阳光小猫 和@测试小猫 在海边玩`
  - API：`@5562be00d.sunbeamkit 和@ebfb9a758.sunnykitte 在海边玩`
- **位置**: 用户完全控制插入位置，系统不做任何自动插入

### 数据传递格式

```javascript
// CharacterLibraryNode 传递
data.connectedCharacters = [
  {
    id: "ch_xxx",
    username: "de3602969.sunnykitty",
    alias: "阳光小猫",
    profilePictureUrl: "https://...",
    permalink: "https://...",
  },
  // ... 更多角色
]

// VideoGenerateNode 接收
const [connectedCharacters, setConnectedCharacters] = useState([]);
```

### 光标插入实现（支持双显示）

```javascript
const insertCharacterAtCursor = (username, alias) => {
  const promptElement = promptInputRef.current;
  if (!promptElement) return;

  // 获取光标位置（在显示文本中的位置）
  const start = promptElement.selectionStart;
  const end = promptElement.selectionEnd;
  const displayText = realToDisplay(manualPrompt);
  const refText = `@${alias} `; // 插入别名到显示位置

  // 在光标位置插入到显示文本
  const newDisplayText = displayText.substring(0, start) + refText + displayText.substring(end);

  // 转换回真实ID并存储
  const newRealText = displayToReal(newDisplayText);
  setManualPrompt(newRealText);

  // 移动光标到插入内容之后
  setTimeout(() => {
    promptElement.setSelectionRange(start + refText.length, start + refText.length);
    promptElement.focus();
  }, 0);
};
```

### 关键优势

- ✅ 角色库节点做初筛，避免视频生成节点角色过多
- ✅ 用户完全控制角色引用的位置和数量
- ✅ 完全复刻网页版的灵活交互方式
- ✅ 支持任意复杂的多角色场景（`@user1 和 @user2 在一起，@user3 在旁边观看`）
- ✅ 双显示功能：输入框显示易读别名，API 使用准确 ID（避免混淆）

---

## 节点连接验证机制 ⭐

### 设计目标

- 防止错误的节点连接导致数据混乱
- 确保只有特定类型的源节点才能连接到特定输入端口
- 提供清晰的错误反馈（数据清除而非报错）

### 验证位置

`src/client/src/App.jsx` (useEffect 监听 edges 变化)

### 输入端口到源节点类型的映射

| 目标端口 | 允许的源节点类型 | 用途 |
|---------|----------------|------|
| `prompt-input` | `textNode`, `promptOptimizerNode`, `narratorProcessorNode` | 文本提示词输入和优化 ⭐ 更新 (2026-01-09) |
| `character-input` | `characterLibraryNode` | 角色库数据传递 |
| `images-input` | `referenceImageNode` | 参考图片传递 |
| `task-input` | `videoGenerateNode`, `storyboardNode`, `juxinStoryboardNode`, `zhenzhenStoryboardNode`, `characterCreateNode` | 任务结果监听 |

### 验证机制 (App.jsx useEffect)

```javascript
useEffect(() => {
  setNodes((nds) =>
    nds.map((node) => {
      // 获取所有输入到当前节点的连线
      const incomingEdges = edges.filter((e) => e.target === node.id);

      const newData = { ...node.data };

      // 验证 character-input 连接
      const characterEdge = incomingEdges.find((e) => e.targetHandle === 'character-input');
      if (characterEdge) {
        const sourceNode = nds.find((n) => n.id === characterEdge.source);

        // ✅ 定义允许的源节点类型
        const validCharacterSourceTypes = ['characterLibraryNode'];

        if (sourceNode && validCharacterSourceTypes.includes(sourceNode.type)) {
          // 源节点类型有效，传递数据
          newData.connectedCharacters = sourceNode.data.connectedCharacters;
        } else {
          // ❌ 源节点类型无效，清除数据（静默失败）
          newData.connectedCharacters = undefined;
        }
      }

      // 验证 images-input 连接
      const imagesEdge = incomingEdges.find((e) => e.targetHandle === 'images-input');
      if (imagesEdge) {
        const sourceNode = nds.find((n) => n.id === imagesEdge.source);

        // ✅ 只有 referenceImageNode 可以连接
        if (sourceNode?.type === 'referenceImageNode') {
          newData.connectedImages = sourceNode.data.selectedImages;
        } else {
          // ❌ 源节点类型无效，清除数据
          newData.connectedImages = undefined;
        }
      }

      // 验证 prompt-input 连接 ⭐ 新增 (2026-01-09)
      const promptEdge = incomingEdges.find((e) => e.targetHandle === 'prompt-input');
      if (promptEdge) {
        const sourceNode = nds.find((n) => n.id === promptEdge.source);

        // ✅ 定义允许的源节点类型
        const validPromptSourceTypes = [
          'textNode',
          'promptOptimizerNode',
          'narratorProcessorNode'  // ⭐ 旁白处理器支持
        ];

        if (sourceNode && validPromptSourceTypes.includes(sourceNode.type)) {
          // 源节点类型有效，传递数据
          if (sourceNode.type === 'textNode') {
            newData.connectedPrompt = sourceNode.data.value || '';
          } else if (sourceNode.type === 'promptOptimizerNode') {
            newData.connectedPrompt = sourceNode.data.optimizedPrompt || '';
          } else if (sourceNode.type === 'narratorProcessorNode') {
            // ⭐ 从 NarratorProcessorNode 接收旁白数据
            newData.manualPrompt = sourceNode.data.currentPrompt || '';
            newData.narratorMode = sourceNode.data.narratorMode || false;
            newData.narratorIndex = sourceNode.data.currentIndex || 0;
            newData.narratorTotal = sourceNode.data.total || 0;
            newData.narratorSentences = sourceNode.data.sentences || [];
          }
        } else {
          // ❌ 源节点类型无效，清除数据（静默失败）
          newData.connectedPrompt = undefined;
        }
      }

      // 验证 task-input 连接
      const videoEdge = incomingEdges.find((e) => e.targetHandle === 'task-input');
      if (videoEdge) {
        const sourceNode = nds.find((n) => n.id === videoEdge.source);

        // ✅ 定义允许的源节点类型
        const validVideoSourceTypes = [
          'videoGenerateNode',
          'storyboardNode',
          'juxinStoryboardNode',
          'zhenzhenStoryboardNode',
          'characterCreateNode'
        ];

        if (sourceNode && validVideoSourceTypes.includes(sourceNode.type)) {
          // 源节点类型有效，传递数据
          newData.taskId = sourceNode.data.taskId;
          newData.connectedSourceId = videoEdge.source;
        } else {
          // ❌ 源节点类型无效，清除数据
          newData.taskId = undefined;
          newData.connectedSourceId = undefined;
        }
      }

      // 只有当 data 真正变化时才返回新对象（避免无限循环）
      const dataChanged = /* 比较关键属性 */;
      return dataChanged ? { ...node, data: newData } : node;
    })
  );
}, [edges, setNodes]);
```

### 防止的问题

1. **错误26（节点连接验证缺失）**: 防止错误的节点类型连接导致数据混乱
2. **数据污染**: 防止无效连接传递错误数据
3. **状态不一致**: 防止断开连接后数据残留

### 关键点

1. **类型白名单**: 使用数组定义允许的源节点类型
2. **静默失败**: 无效连接时清除数据，不抛出错误
3. **实时验证**: useEffect 监听 edges 变化，自动验证所有连接
4. **性能优化**: 只在数据真正变化时才更新节点（避免无限循环）

### 新增节点时的注意事项

- 如果新节点有输入端口，必须在 App.jsx 添加对应的验证逻辑
- 定义允许的源节点类型白名单
- 测试无效连接时数据是否正确清除

---

## React Flow 节点管理 ⭐

### 右键菜单功能

- **节点菜单**: 复制节点、删除节点
- **画布菜单**: 粘贴节点、添加所有节点类型
- **点击外部**: 自动关闭菜单

### 节点删除

- **上下文删除**: 删除右键点击的特定节点（使用 `deleteNode(node)`）
- **工具栏删除**: 删除所有选中节点（使用 `deleteSelectedNodes()`）
- **快捷键**: Delete 键删除选中节点

### 节点创建位置

- **右键创建**: 使用 `screenToFlowPosition()` 转换坐标
- **正确用法**: `const position = screenToFlowPosition({ x: clientX, y: clientY })`
- **❌ 错误用法**: 使用 viewport 坐标或 `project()`（已废弃）

### Provider 配置

- **必须使用**: `ReactFlowProvider` 包裹应用
- **入口位置**: `main.jsx`
- **Hook 依赖**: `useReactFlow` 必须在 Provider 内部使用

### 节点大小可调整 ⭐

- **ComfyUI 风格**: 节点右下角显示三角形缩放手柄
- **拖动调整**: 鼠标拖动右下角调整节点大小
- **最小尺寸**: 限制最小宽度和高度（如 260px x 400px）
- **用户选择**: 节点内文本选择不触发节点拖动

### 节点内交互控制 ⭐

- **`nodrag` 类**: React Flow 官方方案，防止元素触发节点拖动
- **应用位置**:
  - `<textarea className="nodrag">` - 文本输入框
  - `<select className="nodrag">` - 下拉选择框
  - `<input className="nodrag">` - 复选框
  - `<button className="nodrag">` - 按钮
  - 缩放手柄: `<div className="nodrag" onMouseDown={handleResize}>`
- **❌ 错误做法**: 使用 `e.stopPropagation()`（React Flow 使用捕获阶段，stopPropagation 无效）

### 无限循环防止 ⭐

- **问题**: useEffect 依赖 `data` 对象导致无限渲染
- **原因**: `data` 对象在每次渲染时都是新引用
- **解决方案**:
  1. **节点内部**: 使用 `useRef` 存储回调，只更新 `data.onSizeChange`
  2. **父组件**: 使用 `useCallback` 创建稳定回调函数
- **关键点**: 移除 `data` 从 useEffect 依赖数组

---

## 节点间数据传递架构 ⭐

### 核心原则

源节点直接更新目标节点，避免依赖父组件中转。

### 数据流

```
源节点 (Source Node)
├─ useState 管理 UI 状态
├─ useEffect 监听状态变化
├─ setNodes() 同步到 node.data
└─ setNodes() 直接更新目标节点.data

目标节点 (Target Node)
├─ useEffect 接收 data.xxx 变化
├─ 更新内部 useState
└─ 渲染 UI
```

### 关键实现

- 使用 `getEdges()` 找到连接的节点
- 一次 `setNodes()` 调用更新多个节点
- 精确的依赖数组避免无限循环

### 错误模式

- **❌ 错误模式**: App.jsx 中转（只监听 edges，节点内部状态变化不传递）
- **✅ 正确模式**: 源节点直接更新（绕过 App.jsx 的数据传递陷阱）

---

## 平台专用故事板节点 ⭐

### 设计目标

- 分离聚鑫和贞贞平台的故事板功能，避免平台差异混淆
- 每个节点内置 API 配置，无需连接 APISettingsNode
- 保留角色和参考图协作功能

### 节点类型

1. **JuxinStoryboardNode** (聚鑫故事板)
2. **ZhenzhenStoryboardNode** (贞贞故事板)

### 核心功能

- **内置 API 配置**: 可折叠的 API 配置区（平台固定为对应平台）
- **镜头管理**: 添加/删除/编辑镜头，每个镜头独立设置时长（1-25秒）
- **总时长显示**: 自动计算所有镜头总时长，超过25秒警告
- **角色协作**: 支持从 CharacterLibraryNode 接收候选角色
- **参考图协作**: 支持全局参考图 + 镜头独立图片
- **双显示功能**: 场景输入框显示别名，API 使用真实 ID

### 聚鑫 vs 贞贞 差异

| 特性 | 聚鑫故事板 | 贞贞故事板 |
|------|-----------|-----------|
| **平台标识** | `juxin` | `zhenzhen` |
| **API 端点** | `/v1/videos` (专用) | `/v2/videos/generations` (常规) |
| **Content-Type** | `multipart/form-data` | `application/json` |
| **提示词格式** | 拼接为字符串数组 | 直接传递多行文本 |
| **时长参数** | `seconds: "15"` | `duration: "15"` |
| **画面方向** | `orientation: 'landscape'/'portrait'` | `aspect_ratio: '16:9'/'9:16'` |
| **高清选项** | 无 | `hd: true/false` |
| **模型选择** | `sora-2-all` (固定) | `sora-2` / `sora-2-pro` (可选) |

### API 调用示例

**聚鑫故事板**:
```javascript
// POST /v1/videos (multipart/form-data)
const formData = new FormData();
formData.append('model', 'sora-2-all');
formData.append('orientation', 'landscape');
formData.append('size', 'large');
formData.append('watermark', 'false');

// 提示词格式: 拼接镜头数组
const prompt = shots.map((shot, index) =>
  `Shot ${index + 1}:\nduration: ${shot.duration}sec\nScene: ${shot.scene}\n`
).join('\n');

formData.append('prompt', prompt);
```

**贞贞故事板**:
```javascript
// POST /v2/videos/generations (application/json)
const body = {
  model: 'sora-2',  // 或 'sora-2-pro'
  prompt: shots.map((shot, index) =>
    `Shot ${index + 1}:\nduration: ${shot.duration}sec\nScene: ${shot.scene}`
  ).join('\n\n'),
  duration: totalDuration.toString(),  // 总时长
  aspect_ratio: '16:9',
  hd: false,
  watermark: false,
};
```

### 提示词格式规范

```
Shot 1:
duration: 5sec
Scene: 老鹰展翅高飞

Shot 2:
duration: 5sec
Scene: 老鹰在空中盘旋

Shot 3:
duration: 5sec
Scene: 老鹰降落在山顶
```

### 关键点

1. **平台隔离**: 两个节点完全分离，避免平台差异混淆
2. **API 配置内置**: 每个节点内部包含 API 配置，默认折叠
3. **镜头时长独立**: 每个镜头独立设置时长，不再自动均分
4. **总时长验证**: 自动计算总时长，超过25秒显示警告
5. **角色引用支持**: 支持从 CharacterLibraryNode 选择角色
6. **参考图支持**: 支持全局参考图 + 镜头独立图片
7. **双显示功能**: 输入框显示易读别名，API 使用真实 ID

### 使用场景

- **简单视频生成**: 使用 VideoGenerateNode（支持平台切换）
- **聚鑫故事板**: 使用 JuxinStoryboardNode（专用优化）
- **贞贞故事板**: 使用 ZhenzhenStoryboardNode（专用优化）

---

## 角色结果节点 ⭐

### 功能描述

- 显示角色创建任务的详细结果
- 通过事件系统从 CharacterCreateNode 接收角色数据
- 提供复制到剪贴板功能（角色 ID、用户名）

### 数据格式

```javascript
{
  id: "ch_69536e7ce60481919c4e9a2a3cf4c6d5",
  username: "de3602969.sunnykitty",
  permalink: "https://sora.chatgpt.com/profile/de3602969.sunnykitty",
  profile_picture_url: "https://...",
  alias: "可选别名"  // 如果设置过
}
```

### 事件系统

- **事件名**: `character-created`
- **事件数据**: `{ sourceNodeId, character }`
- **验证逻辑**: 检查 `data.connectedSourceId === event.detail.sourceNodeId`

### 技术细节

- **输入端口**: `character-input` (左侧)
- **无输出端口**: 纯展示节点
- **剪贴板 API**: 优先使用 `navigator.clipboard`，降级到 `execCommand`
- **复制反馈**: 点击后显示 "✓ 已复制" 2 秒

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
