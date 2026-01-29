---

paths: *

---

# 开发流程规范

> **版本**: v2.0.0
> **更新日期**: 2026-01-18
> **来源**: Vibe-Coding-CN 血的教训 + WinJin 开发实践

---

## 核心原则：血的教训 ⭐

> **10 分开发，7 分找资料**

在动手写代码之前，**必须先完成以下调研**：

### 调研清单

1. **技术调研**
   - [ ] 查阅官方文档（React Flow、Sora2 API）
   - [ ] 搜索类似功能的实现案例
   - [ ] 了解最佳实践和常见陷阱

2. **数据调研**
   - [ ] 确认 API 端点和参数格式
   - [ ] 测试 API 响应格式
   - [ ] 了解数据流和状态管理方式

3. **问题调研**
   - [ ] 搜索错误模式和解决方案
   - [ ] 查看项目错误模式库 (`error-patterns.md`)
   - [ ] 了解已知问题和注意事项

### 调研工具

- **官方文档**: [React Flow](https://reactflow.dev/), [Sora2 API](./api-platforms.md)
- **错误模式**: [错误模式库](../04-error-patterns/errors-by-type.md)
- **开发经验**: 查看已有代码实现

---

## 开发流程：Plan → Code → Update Docs

### 阶段 1: Plan 模式 (Shift+Tab×2)

**目标**: 分析需求，设计方案，等待确认

#### 1.1 需求分析

```
1. 理解用户需求
   ├─ 核心功能是什么？
   ├─ 涉及哪些节点类型？
   └─ 数据流如何设计？

2. 识别技术挑战
   ├─ 需要哪些 API？
   ├─ 有哪些平台差异？
   └─ 可能遇到哪些错误？

3. 查阅相关文档
   ├─ 技术栈规范 (tech-stack.md)
   ├─ API 规范 (api-platforms.md)
   ├─ 错误模式 (error-patterns.md)
   └─ 节点架构 (node-architecture.md)
```

#### 1.2 设计方案

```
1. 节点设计
   ├─ 节点类型 (input/process/output)
   ├─ 输入/输出端口
   ├─ 数据结构
   └─ UI 布局

2. 数据流设计
   ├─ 源节点 → 处理节点 → 输出节点
   ├─ Handle 连接验证
   └─ 状态同步机制

3. API 集成
   ├─ 端点选择（聚鑫 vs 贞贞）
   ├─ 参数格式
   └─ 响应处理
```

#### 1.3 风险评估

```
1. 已知风险
   ├─ 双平台差异 (查询端点、任务ID格式)
   ├─ 角色引用语法 (@username 格式)
   ├─ 轮询间隔 (30秒 vs 5秒)
   └─ 双显示功能 (别名 vs 真实ID)

2. 预防措施
   ├─ 参考 [错误模式库](../04-error-patterns/errors-by-type.md)
   ├─ 使用代码模板
   └─ 编写测试用例
```

---

### 阶段 2: Code 开发

**目标**: 编写代码，自动测试，代码审查

#### 2.1 编写代码

```
1. 使用模板
   ├─ 节点模板 (node-templates.md)
   ├─ API 路由模板
   └─ 错误处理模板

2. 遵循规范
   ├─ 命名约定 (language-layers.md)
   ├─ 代码风格 (2 空格、单引号)
   └─ 错误处理 (try-catch)

3. 平台兼容
   ├─ 双平台端点适配
   ├─ 任务ID格式兼容
   └─ 数据格式转换
```

#### 2.2 自动测试

**✅ 自动化优先**:
```bash
# 使用 MCP Chrome DevTools 测试
1. 启动流式画布
   cd src/client && npm run dev

2. 自动化测试流程
   - 打开页面 (http://localhost:5173)
   - 添加节点
   - 连接节点
   - 测试数据流
   - 验证 API 调用
   - 检查错误处理

3. 测试检查清单
   ✓ 页面加载成功（无 console 错误）
   ✓ 节点显示正常（截图验证）
   ✓ 表单输入响应
   ✓ API 请求正确
   ✓ 数据更新及时
```

**测试场景**:
```
1. 单节点测试
   ├─ 节点渲染
   ├─ 输入处理
   ├─ 输出验证
   └─ 错误处理

2. 连接测试
   ├─ 节点连接
   ├─ 数据传递
   ├─ 连接验证
   └─ 断开连接

3. 工作流测试
   ├─ 简单工作流 (2节点)
   ├─ 复杂工作流 (5+节点)
   ├─ 错误处理
   └─ 状态持久化
```

#### 2.3 代码审查

**审查清单**:
```javascript
// ✅ 命名规范
const getUserData = async (userId) => { };  // camelCase
const MAX_RETRIES = 3;  // UPPER_SNAKE_CASE

// ✅ 错误处理
try {
  const result = await apiCall();
  return { success: true, data: result };
} catch (error) {
  return { success: false, error: error.message };
}

// ✅ 平台兼容
const taskId = result.data.id || result.data.task_id;

// ✅ 轮询配置
const POLL_INTERVAL = 30000;  // 30秒，不是5秒

// ❌ 错误示例
function get_data() { }  // 应该是 camelCase
const taskId = result.data.id;  // 没有兼容 task_id
const POLL_INTERVAL = 5000;  // 太短，会导致429错误
```

---

### 阶段 3: Update Docs 更新文档

**目标**: 更新相关文档，记录新增内容

#### 3.1 必须更新的文档

```
1. 代码规范更新
   ├─ .claude/skills/winjin-dev/SKILL.md
   ├─ .claude/rules/code.md
   └─ .claude/rules/error-patterns.md

2. 技术文档更新
   ├─ .claude/rules/base.md (API 规范)
   ├─ .claude/rules/reactflow.md (节点规范)
   └─ 用户输入文件夹/开发对话/开发交接书.md

3. 版本记录
   ├─ 添加版本号
   ├─ 记录变更说明
   └─ 更新日期
```

#### 3.2 文档更新模板

```markdown
## [功能名称] - v1.0.0

**更新日期**: 2026-01-18

### 新增内容
- 新增 [节点名称] 节点
- 支持 [功能描述]
- 集成 [API 名称]

### 技术实现
- 节点类型: input/process/output
- 输入端口: [端口列表]
- 输出端口: [端口列表]
- API 端点: [端点路径]

### 已知问题
- [问题1]: [解决方案]
- [问题2]: [解决方案]

### 测试结果
- ✅ 单节点测试
- ✅ 连接测试
- ✅ 工作流测试
```

---

## Canvas 白板驱动开发 ⭐

### 核心理念

```
代码 ⇄ Canvas 白板 ⇄ AI ⇄ 人类
```

**单一事实来源**: React Flow 画布是工作流的唯一表示

### 开发流程

```
1. 在 Canvas 上设计工作流
   ├─ 拖拽节点
   ├─ 连接节点
   └─ 配置参数

2. 验证工作流
   ├─ 检查连接合法性
   ├─ 测试数据流
   └─ 识别问题

3. 保存工作流
   ├─ 导出为 JSON
   ├─ 持久化存储
   └─ 版本管理

4. 执行工作流
   ├─ 拓扑排序
   ├─ 依次执行
   └─ 收集结果
```

### Canvas 作为可视化白板

**优势**:
- ✅ 直观展示数据流
- ✅ 快速验证设计
- ✅ 易于调试
- ✅ 便于沟通

**最佳实践**:
1. 先在 Canvas 上设计，再编写代码
2. 使用 Canvas 验证 API 集成
3. 使用 Canvas 测试错误处理
4. 使用 Canvas 演示功能

---

## 错误模式管理

### 错误发现流程

```
1. 发现错误
   ├─ 自动化测试
   ├─ 代码审查
   └─ 用户反馈

2. 记录错误
   ├─ 添加到 error-patterns.md
   ├─ 标记类型标签
   └─ 记录解决方案

3. 分析错误
   ├─ 识别根本原因
   ├─ 找到预防措施
   └─ 生成测试用例

4. 更新文档
   ├─ 更新错误模式库
   ├─ 添加预防规则
   └─ 更新代码模板
```

### 错误模式分类

| 类型 | 错误数量 | 关键词 |
|------|----------|--------|
| [API 相关](../04-error-patterns/errors-by-type.md#api-相关) | 8个 | 双平台、轮询、端点、模型 |
| [React Flow 相关](../04-error-patterns/errors-by-type.md#react-flow-相关) | 6个 | 数据传递、Handle、连接 |
| [角色系统相关](../04-error-patterns/errors-by-type.md#角色系统相关) | 5个 | 引用、显示、插入 |
| [表单/输入相关](../04-error-patterns/errors-by-type.md#表单输入相关) | 2个 | 验证、格式 |
| [存储/持久化相关](../04-error-patterns/errors-by-type.md#存储持久化相关) | 4个 | localStorage、工作流 |
| [UI/渲染相关](../04-error-patterns/errors-by-type.md#ui渲染相关) | 3个 | 布局、样式 |
| [其他](../04-error-patterns/errors-by-type.md#其他) | 20+个 | ... |

### 高频错误（必读）

1. **错误1**: 双平台任务ID不兼容 ⭐⭐⭐
2. **错误6**: 轮询间隔太短（429错误）⭐⭐⭐
3. **错误16**: React Flow 节点间数据传递错误 ⭐⭐⭐
4. **错误17**: API 端点路径缺少前缀 ⭐⭐⭐
5. **错误48**: 优化节点错误使用双显示功能 ⭐⭐⭐

---

## 快速开始指南

### 新手入门

1. **阅读基础文档**
   - [技术栈规范](../01-fundamentals/tech-stack.md)
   - [语言层要素](../01-fundamentals/language-layers.md)
   - [开发流程](../02-methodology/development-flow.md)

2. **搭建开发环境**
   ```bash
   # 安装依赖
   npm install

   # 启动后端服务器
   npm run server

   # 启动流式画布
   cd src/client
   npm install
   npm run dev
   ```

3. **创建第一个节点**
   ```bash
   # 使用技能创建节点
   /skills reactflow-dev --type=input --name=MyFirstNode
   ```

### 节点开发

1. **选择节点类型**
   - `input`: 数据输入（文本、图片、角色）
   - `process`: 业务逻辑（视频生成、提示词优化）
   - `output`: 结果展示（任务结果、角色结果）

2. **使用模板**
   - [节点模板](../03-node-development/node-templates.md)
   - [Handle 连接规范](../03-node-development/handle-connections.md)

3. **测试节点**
   - 单节点功能测试
   - 连接测试
   - 工作流集成测试

### 问题排查

1. **查看错误模式**
   - [错误模式库](../04-error-patterns/errors-by-type.md)

2. **使用预防检查清单**
   - [预防检查清单](../04-error-patterns/prevention-checklist.md)

3. **查看技术文档**
   - [API 规范](../01-fundamentals/api-platforms.md)
   - [节点架构](../03-node-development/node-architecture.md)

---

## 开发命令参考

### 后端命令

| 命令 | 说明 |
|------|------|
| `npm start` | 启动 Electron 应用 |
| `npm run server` | 仅启动 HTTP 服务器（端口 9000） |

### 前端命令（流式画布）

```bash
# 进入前端目录
cd src/client

# 安装依赖（首次运行）
npm install

# 启动开发服务器
npm run dev          # Vite 开发服务器 (http://localhost:5173)
npm run build        # 构建生产版本
npm run preview      # 预览生产构建
npm run lint         # ESLint 检查
```

### Claude Code 命令

| 命令 | 说明 |
|------|------|
| `/context` | 查看项目记忆 |
| `/sandbox` | 查看允许的命令 |
| `/hooks` | 查看生命周期配置 |
| `/skills` | 查看可用技能 |
| `/skills reactflow-dev` | 创建 React Flow 节点 ⭐ |
| `/plan` | 进入计划模式 |

---

## 参考文档

**技术规范**:
- [技术栈约束](../01-fundamentals/tech-stack.md) - 运行时环境、框架版本
- [语言层要素](../01-fundamentals/language-layers.md) - 12层语言要素清单
- [API 规范](../01-fundamentals/api-platforms.md) - Sora2 双平台规范

**开发规范**:
- [节点架构](../03-node-development/node-architecture.md) - 节点架构模式
- [Handle 连接](../03-node-development/handle-connections.md) - Handle 连接规范
- [测试自动化](./testing-automation.md) - MCP Chrome DevTools 测试

**错误管理**:
- [错误模式库](../04-error-patterns/errors-by-type.md) - 所有错误模式
- [预防检查清单](../04-error-patterns/prevention-checklist.md) - 预提交检查

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
