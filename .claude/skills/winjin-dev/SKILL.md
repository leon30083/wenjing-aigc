---
name: winjin-dev
description: WinJin AIGC 项目开发技能 - 胶水编程 + React Flow + Sora2 API。包含三大核心哲学（胶水编程、强约束、血的教训）、6层文档架构、55个错误模式、35条约束规则。每次功能开发或 Bug 修复后必须更新文档。
---

# WinJin AIGC 项目开发技能

## 项目概述

WinJin AIGC 是一个基于 Electron + Express + React Flow 的可视化视频生成工作流编辑器，支持 Sora2 双平台（聚鑫/贞贞）视频生成、角色管理、提示词优化。

**核心理念**:
- **胶水编程**: AI 连接代码，人审连接
- **强约束**: 约束不是限制，而是保护
- **血的教训**: 10 分开发，7 分找资料

**技术栈**:
- 后端: Express.js + Node.js 16.x
- 前端: React 19 + React Flow 11.x + Vite 7.x
- 桌面: Electron 28.x
- 双平台: 聚鑫 (api.jxincm.cn) + 贞贞 (ai.t8star.cn)

---

## 🔄 Skill 更新机制（重要）

此 skill 随着项目开发持续更新。**每次开发新功能或修复 Bug 后**，都必须更新此技能和相关文档。

### 更新流程

1. **开发完成后**，识别需要更新的内容
2. **更新 SKILL.md** - 添加新的错误模式、约束规则
3. **更新相关文档** - 扩展详细文档
4. **提交到 Git** - 将技能变更纳入版本控制

### 必须更新的文档

| 文档 | 何时更新 | 更新内容 |
|------|----------|----------|
| `.claude/skills/winjin-dev/SKILL.md` | 每次开发 | 新增错误模式、约束规则 |
| `.claude/04-error-patterns/errors-by-type.md` | 新错误 | 添加错误模式详情 |
| `.claude/04-error-patterns/glue-constraints.md` | 新约束 | 添加约束映射 |

---

## 三大核心哲学 ⭐

### 1. 胶水编程原理

**核心理念**: "AI 连接代码，人审连接"

**公式**: 胶水代码 = 接口适配 + 数据转换 + 流程编排

**关键原则**:
- ✅ 不实现底层逻辑（使用成熟库）
- ✅ 不修改第三方库（使用官方 API）
- ✅ 只连接成熟模块（避免幻觉）

**文档**: [00-philosophy/glue-programming.md](../../00-philosophy/glue-programming.md)

---

### 2. 28条强约束 + WinJin 扩展 (#29-#35)

**核心理念**: "约束不是限制，而是保护"

**高频约束**:
- #29: 禁止硬编码 API 端点
- #30: 必须处理双平台差异
- #31: 禁止假设任务ID字段名
- #32: 禁止使用过短的轮询间隔（≥30秒）
- #33: 角色引用必须保留
- #34: 禁止直接渲染对象
- #35: 禁止在 useEffect 中依赖 data

**文档**: [00-philosophy/strong-constraints.md](../../00-philosophy/strong-constraints.md)

---

### 3. 血的教训：调研优先

**核心理念**: "10 分开发，7 分找资料"

**时间分配**: 70% 调研 + 20% 编码 + 10% 测试

**调研清单**:
1. 技术调研（官方文档、案例、陷阱）
2. 数据调研（API 端点、响应格式、状态管理）
3. 问题调研（错误模式、已知问题）

**文档**: [00-philosophy/blood-lessons.md](../../00-philosophy/blood-lessons.md)

---

## 6层文档架构

```
.claude/
├── 00-philosophy/         # 哲学层 - 核心理念
├── 01-fundamentals/       # 基础知识层 - 技术基础
├── 02-methodology/        # 方法论层 - 开发流程
├── 03-node-development/    # 节点开发层 - React Flow
├── 04-error-patterns/     # 错误模式层 - 错误管理
└── 05-automation/         # 自动化层 - 系统增强
```

---

## 核心开发规范

### 1. API 端点路径 ⚠️ 重要

**错误示例**:
```javascript
// ❌ 缺少 /api/ 前缀
const response = await fetch(`${API_BASE}/task/${taskId}`);
// 返回 404 Not Found
```

**正确示例**:
```javascript
// ✅ 完整的 API 路径
const response = await fetch(`${API_BASE}/api/task/${taskId}`);
// 返回 200 OK
```

**规则**: 所有前端 API 调用必须使用完整路径 `/api/{endpoint}`

**相关错误**: 错误3, 错误17

---

### 2. 双平台差异处理 ⭐⭐⭐

#### 任务ID 格式兼容

```javascript
// ✅ 正确：兼容双平台格式
const taskId = result.data.id || result.data.task_id;
```

**相关错误**: 错误1, 错误38, 错误39

#### 查询端点差异

```javascript
// ✅ 正确：根据平台使用不同端点
async getTaskStatus(taskId) {
  if (this.platformType === 'ZHENZHEN') {
    return await axios.get(`/v2/videos/generations/${taskId}`);
  } else {
    return await axios.get('/v1/video/query', {
      params: { id: taskId }
    });
  }
}
```

**相关约束**: #30, #31

---

### 3. 轮询策略 ⭐⭐⭐

```javascript
// ✅ 正确：30秒间隔
const POLL_INTERVAL = 30000;  // Sora2 生成需 3-5 分钟
const MAX_POLLING_AGE = 24 * 60 * 60 * 1000; // 24小时

// ❌ 错误：5秒间隔会导致 429 错误
const POLL_INTERVAL = 5000;
```

**相关错误**: 错误6, 错误46

**相关约束**: #32

---

### 4. 角色引用语法 ⭐⭐⭐

```javascript
// ✅ 正确：使用 @username 格式（不带花括号）
const prompt = '@6f2dbf2b3.zenwhisper 在工地上干活';

// ❌ 错误：不要使用花括号
const prompt = '@{6f2dbf2b3.zenwhisper} 在工地上干活';
```

**角色引用保留规则**:
- 优化节点必须保留角色引用（@username 格式）
- 不描述角色外观（Sora2 会使用角色真实外观）
- 使用真实 ID（不使用别名）

**相关错误**: 错误48, 错误55

**相关约束**: #33

---

### 5. React Flow 节点开发

#### 使用 useNodeId() Hook

```javascript
// ❌ 错误：data.id 是 undefined
function VideoGenerateNode({ data }) {
  const dispatchEvent = () => {
    window.dispatchEvent(new CustomEvent('video-task-created', {
      detail: { sourceNodeId: data.id } // ❌ undefined
    }));
  };
}

// ✅ 正确：使用 useNodeId()
import { useNodeId } from 'reactflow';

function VideoGenerateNode({ data }) {
  const nodeId = useNodeId(); // ✅ 获取节点 ID
  const dispatchEvent = () => {
    window.dispatchEvent(new CustomEvent('video-task-created', {
      detail: { sourceNodeId: nodeId }
    }));
  };
}
```

**相关错误**: 错误4, 错误37

---

#### useEffect 依赖数组

```javascript
// ❌ 错误：data 在依赖中会导致无限循环
useEffect(() => {
  if (data.onSizeChange) {
    data.onSizeChange(nodeId, width, height);
  }
}, [data]); // ❌ data 对象每次渲染都是新引用

// ✅ 正确：使用 useRef 存储回调
const onSizeChangeRef = useRef(data.onSizeChange);
useEffect(() => {
  onSizeChangeRef.current = data.onSizeChange;
}, [data.onSizeChange]);

useEffect(() => {
  if (onSizeChangeRef.current) {
    onSizeChangeRef.current(nodeId, width, height);
  }
}, [nodeSize.width, nodeSize.height, nodeId]);
```

**相关错误**: 错误4, 错误29, 错误37

**相关约束**: #35

---

#### 节点间数据传递

**✅ 正确模式**: 源节点直接更新目标节点
```javascript
// CharacterLibraryNode.jsx
useEffect(() => {
  if (nodeId) {
    const edges = getEdges();
    const outgoingEdges = edges.filter(e => e.source === nodeId);
    const characterObjects = characters.filter(c => selectedCharacters.has(c.id));

    // ⭐ 一次 setNodes() 调用同时更新自己和目标节点
    setNodes((nds) =>
      nds.map((node) => {
        // 更新自己
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, selectedCharacters: Array.from(selectedCharacters) } };
        }
        // ⭐ 直接更新目标节点（绕过 App.jsx）
        const isConnected = outgoingEdges.some(e => e.target === node.id);
        if (isConnected) {
          return { ...node, data: { ...node.data, connectedCharacters: characterObjects } };
        }
        return node;
      })
    );
  }
}, [selectedCharacters, nodeId, setNodes, characters, getEdges]);
```

**相关错误**: 错误16, 错误52

**相关约束**: #35

---

#### 交互元素添加 className="nodrag"

```javascript
// ✅ 正确：所有交互元素添加 className="nodrag"
<textarea className="nodrag" />
<select className="nodrag">...</select>
<input className="nodrag" type="checkbox" />
<button className="nodrag">生成</button>
```

**相关错误**: 错误30

---

### 6. 代码风格

- **缩进**: 2 空格
- **引号**: 单引号 `'`
- **分号**: 必须使用
- **命名**: camelCase / PascalCase / kebab-case

**相关文档**: [01-fundamentals/language-layers.md](../../01-fundamentals/language-layers.md)

---

### 7. API 设计

- 使用 async/await
- 统一响应格式：`{success, data/error}`
- 所有路由必须有错误处理

---

## 错误模式参考 ⭐

> **重要**: 所有错误模式已统一管理到 `.claude/04-error-patterns/errors-by-type.md`，按类型分类便于查找。

### 快速链接

| 类型 | 链接 | 错误数量 |
|------|------|----------|
| [API 相关](../../04-error-patterns/errors-by-type.md#api-相关) | [errors-by-type.md](../../04-error-patterns/errors-by-type.md) | 8个 |
| [React Flow 相关](../../04-error-patterns/errors-by-type.md#react-flow-相关) | [errors-by-type.md](../../04-error-patterns/errors-by-type.md) | 6个 |
| [角色系统相关](../../04-error-patterns/errors-by-type.md#角色系统相关) | [errors-by-type.md](../../04-error-patterns/errors-by-type.md) | 5个 |
| [表单/输入相关](../../04-error-patterns/errors-by-type.md#表单输入相关) | [errors-by-type.md](../../04-error-patterns/errors-by-type.md) | 2个 |
| [存储/持久化相关](../../04-error-patterns/errors-by-type.md#存储持久化相关) | [errors-by-type.md](../../04-error-patterns/errors-by-type.md) | 4个 |
| [UI/渲染相关](../../04-error-patterns/errors-by-type.md#ui渲染相关) | [errors-by-type.md](../../04-error-patterns/errors-by-type.md) | 3个 |

### 高频错误（必读）

| 编号 | 描述 | 严重程度 | 相关约束 |
|------|------|----------|----------|
| **错误1** | 双平台任务ID不兼容 | ⭐⭐⭐ | #31 |
| **错误6** | 轮询间隔太短（429错误） | ⭐⭐⭐ | #32 |
| **错误16** | React Flow 节点间数据传递错误 | ⭐⭐⭐ | #35 |
| **错误17** | API 端点路径缺少前缀 | ⭐⭐⭐ | #29 |
| **错误48** | 优化节点错误使用双显示功能 | ⭐⭐⭐ | #33 |

**查看完整错误模式**: [`.claude/04-error-patterns/errors-by-type.md`](../../04-error-patterns/errors-by-type.md)

**查看约束映射**: [`.claude/04-error-patterns/glue-constraints.md`](../../04-error-patterns/glue-constraints.md)

---

## 开发提示（精选）⭐

### 1. 节点开发优先级 ⭐⭐⭐

1. **使用 useNodeId()**: 不要依赖 `data.id`（undefined）
2. **useEffect 依赖**: 避免依赖 `data` 对象（会导致无限循环）
3. **节点间数据传递**: 源节点直接更新目标节点（不要依赖 App.jsx）
4. **事件系统**: 用于异步数据传递（taskId 等）
5. **getEdges 解构**: `useReactFlow()` 必须包含 `getEdges`
6. **交互元素**: 添加 `className="nodrag"`

### 2. API 调用优先级 ⭐⭐⭐

1. **API 路径**: 前端必须使用完整路径 `/api/{endpoint}`
2. **双平台兼容**: 使用 `const taskId = result.data.id || result.data.task_id`
3. **轮询间隔**: 使用 30 秒（避免 429 错误）
4. **角色创建**: 不传 `model` 参数，优先使用 `from_task`

### 3. 角色引用优先级 ⭐⭐⭐

1. **格式**: 使用 `@username`（不带花括号）
2. **优化节点**: 始终使用真实 ID（`@ebfb9a758.sunnykitte`）
3. **视频生成节点**: 双显示（输入框显示别名，API 使用真实 ID）
4. **不描述外观**: Sora2 会使用角色真实外观

### 4. 测试优先级 ⭐⭐⭐

1. **自动化测试**: 使用 MCP 工具在浏览器中自动测试
2. **后端重启**: 修改后端代码后必须重启服务器
3. **测试端口**: 工作流画布使用 5173 端口，不是 9000

---

## 文档更新流程 ⭐ 必读

每次功能开发或 Bug 修复后，**必须**更新文档。

### 更新检查清单

- [ ] `.claude/04-error-patterns/errors-by-type.md` - 新增错误模式
- [ ] `.claude/04-error-patterns/glue-constraints.md` - 添加约束映射
- [ ] `.claude/skills/winjin-dev/SKILL.md` - 更新开发提示
- [ ] `.claude/00-philosophy/` - 哲学层文档（如有新理念）

---

## 验证系统 ⭐

WinJin 项目拥有完整的自动化验证系统，包括基础验证、数据流验证和自动修复能力。

### 快速命令

```bash
# 运行所有验证
npm run validate:all

# 扫描可修复问题
npm run fix:scan

# 查看质量趋势
npm run metrics:trend
```

### 开发流程集成

```
开发代码
    ↓
npm run validate:all  ← 快速验证
    ↓
npm run fix:scan      ← 如有问题，扫描可修复项
    ↓
git commit -m "..."    ← Git hook 自动验证
```

**相关文档**: [验证系统使用指南](../../../docs/validation-guide.md)

---

## 参考文档

### 哲学层

| 文档 | 用途 |
|------|------|
| [胶水编程原理](../../00-philosophy/glue-programming.md) | 核心理念 |
| [28条强约束](../../00-philosophy/strong-constraints.md) | 开发约束 |
| [血的教训](../../00-philosophy/blood-lessons.md) | 调研优先 |

### 基础知识层

| 文档 | 用途 |
|------|------|
| [技术栈约束](../../01-fundamentals/tech-stack.md) | 技术栈、框架版本 |
| [语言层要素](../../01-fundamentals/language-layers.md) | 12层语言要素 + 代码规范 |
| [API 规范](../../01-fundamentals/api-platforms.md) | Sora2 双平台规范 |

### 方法论层

| 文档 | 用途 |
|------|------|
| [开发流程](../../02-methodology/development-flow.md) | Plan → Code → Update |
| [Canvas 白板驱动](../../02-methodology/canvas-driven-dev.md) | React Flow 作为白板 |

### 节点开发层

| 文档 | 用途 |
|------|------|
| [节点架构](../../03-node-development/node-architecture.md) | 节点架构模式 |
| [Handle 连接](../../03-node-development/handle-connections.md) | 连接规范 |
| [节点模板](../../03-node-development/node-templates.md) | 节点代码模板 |

### 错误模式层

| 文档 | 用途 |
|------|------|
| [错误模式库](../../04-error-patterns/errors-by-type.md) | 55个错误（按类型）⭐ |
| [约束映射表](../../04-error-patterns/glue-constraints.md) | 约束→错误映射 |
| [预防清单](../../04-error-patterns/prevention-checklist.md) | 预提交检查 |

### 模板层

| 文档 | 用途 |
|------|------|
| [节点模板](../../templates/node-template.jsx) | React Flow 节点模板 |
| [API 路由模板](../../templates/api-route-template.js) | Express API 路由模板 |
| [错误报告模板](../../templates/error-report-template.md) | 错误报告格式 |

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
**版本**: v2.0.0
