---

path: *

---

# 血的教训：调研优先原则

> **版本**: v1.0.0
> **更新日期**: 2026-01-18
> **来源**: Vibe-Coding-CN "血的教训" + WinJin 开发实践

---

## 核心原则

**10 分开发，7 分找资料**

> 这是 WinJin 项目用无数次错误换来的经验。

---

## 什么是"血的教训"？

### 定义

"血的教训"指那些：
- ❌ 因为不了解 API 规范而导致的错误
- ❌ 因为不熟悉框架机制而导致的错误
- ❌ 因为不知道已知问题而重复犯的错误

### 核心原则

**调研优先 = 效率提升**

```
传统开发流程:
30% 编码 → 70% 调试错误 → 反悔重写

胶水编程流程:
70% 调研 → 20% 编码 → 10% 测试验证
```

---

## 10分开发，7分找资料

### 时间分配

| 阶段 | 时间占比 | 活动内容 |
|------|---------|---------|
| **调研** | 70% | 查阅文档、搜索案例、了解陷阱 |
| **编码** | 20% | 编写胶水代码（连接成熟模块） |
| **测试** | 10% | 验证集成、检查错误 |

### 调研清单

#### 1. 技术调研

- [ ] 查阅官方文档
  - React Flow: https://reactflow.dev/
  - Sora2 API: `.claude/01-fundamentals/api-platforms.md`
  - Node.js/Express: 官方文档

- [ ] 搜索类似功能的实现案例
  - GitHub 搜索相关项目
  - Stack Overflow 搜索相关问题
  - React Flow 官方示例

- [ ] 了解最佳实践和常见陷阱
  - 阅读错误模式库
  - 查看已知问题列表
  - 了解框架限制

#### 2. 数据调研

- [ ] 确认 API 端点和参数格式
  - 聚鑫平台: `/v1/video/create`, `/v1/video/query?id=xxx`
  - 贞贞平台: `/v1/video/create`, `/v2/videos/generations/{taskId}`

- [ ] 测试 API 响应格式
  - 使用 Postman 或 curl 测试
  - 检查响应字段（id vs task_id）
  - 确认错误码格式

- [ ] 了解数据流和状态管理方式
  - React state 更新机制
  - React Flow 节点间数据传递
  - localStorage 持久化

#### 3. 问题调研

- [ ] 搜索错误模式和解决方案
  - 查阅错误模式库（55个错误）
  - 搜索 Stack Overflow
  - 查看 GitHub Issues

- [ ] 查看项目错误模式库
  - `.claude/04-error-patterns/errors-by-type.md`
  - 识别相关错误类型
  - 了解预防措施

- [ ] 了解已知问题和注意事项
  - 双平台差异
  - 角色引用语法
  - 轮询间隔限制

---

## 调研工具

### 官方文档

| 技术 | 文档链接 | 用途 |
|------|---------|------|
| React Flow | https://reactflow.dev/ | 节点编辑器 |
| React | https://react.dev/ | UI 框架 |
| Express | https://expressjs.com/ | Web 服务器 |
| Sora2 API | `.claude/01-fundamentals/api-platforms.md` | 视频生成 API |

### 错误模式

| 文档 | 路径 | 内容 |
|------|------|------|
| 错误模式库 | `.claude/04-error-patterns/errors-by-type.md` | 55个错误 |
| 约束映射 | `.claude/04-error-patterns/glue-constraints.md` | 约束→错误 |
| 预防清单 | `.claude/04-error-patterns/prevention-checklist.md` | 预提交检查 |

### 开发经验

| 文档 | 路径 | 内容 |
|------|------|------|
| 节点架构 | `.claude/03-node-development/node-architecture.md` | 节点开发模式 |
| Handle 连接 | `.claude/03-node-development/handle-connections.md` | 连接规范 |
| 开发流程 | `.claude/02-methodology/development-flow.md` | Plan → Code → Update |

---

## "血的教训"案例分析

### 案例 1: 双平台任务ID不兼容（错误1）

**问题**:
```javascript
// ❌ 只检查 id 字段
const taskId = result.data.id;
if (!taskId) {
  console.error('任务ID缺失');
}
```

**后果**:
- 贞贞平台返回 `task_id`，不是 `id`
- 历史记录保存失败
- 任务无法查询

**血的教训**:
> **调研前**: 不知道双平台响应格式不同
> **调研后**: 使用 `const taskId = result.data.id || result.data.task_id`

**调研来源**:
- 错误模式库: 错误1
- API 规范: `api-platforms.md`

---

### 案例 2: 轮询间隔太短（错误6）

**问题**:
```javascript
// ❌ 5秒轮询
const POLL_INTERVAL = 5000;
setInterval(() => checkStatus(taskId), POLL_INTERVAL);
```

**后果**:
- 429 错误（请求过于频繁）
- API 配额浪费
- 可能被封禁

**血的教训**:
> **调研前**: 不知道 Sora2 生成需要 3-5 分钟
> **调研后**: 使用 `const POLL_INTERVAL = 30000` (30秒)

**调研来源**:
- 错误模式库: 错误6
- API 规范: `api-platforms.md` 轮询策略章节

---

### 案例 3: 优化节点丢失角色引用（错误48）

**问题**:
```javascript
// ❌ 优化后丢失角色引用
// 输入: "@测试小猫 在海边玩"
// 输出: "一只可爱的猫咪在海边玩耍"
```

**后果**:
- Sora2 不知道使用哪个角色
- 生成的视频没有角色
- 用户困惑

**血的教训**:
> **调研前**: 不知道角色引用语法和保留规则
> **调研后**: 使用真实 ID，AI 提示词明确要求保留 `@username`

**调研来源**:
- 错误模式库: 错误48
- API 规范: `api-platforms.md` 角色引用语法

---

### 案例 4: useEffect 无限循环（错误29）

**问题**:
```javascript
// ❌ 依赖 data 导致无限循环
useEffect(() => {
  if (data.onSizeChange) {
    data.onSizeChange(nodeId, width, height);
  }
}, [data]);
```

**后果**:
- 页面卡死
- 浏览器崩溃
- 系统不稳定

**血的教训**:
> **调研前**: 不理解 React 执行模型
> **调研后**: 使用 useRef 存储回调函数

**调研来源**:
- 错误模式库: 错误29
- 语言层要素: `language-layers.md` L9 时间维度模型

---

## 调研流程规范

### 阶段 1: 快速扫描（5分钟）

**目标**: 快速了解问题域

**步骤**:
1. 搜索关键词（Google/Stack Overflow）
2. 查看错误模式库
3. 阅读相关文档摘要

**输出**:
- 初步理解
- 已知问题列表
- 关键文档链接

---

### 阶段 2: 深度调研（15分钟）

**目标**: 掌握技术细节

**步骤**:
1. 阅读官方文档
2. 查看代码示例
3. 理解最佳实践

**输出**:
- 技术方案
- 代码模板
- 注意事项

---

### 阶段 3: 验证假设（10分钟）

**目标**: 确认方案可行性

**步骤**:
1. 创建测试用例
2. 验证 API 调用
3. 检查边界情况

**输出**:
- 可行性报告
- 风险评估
- 实施计划

---

## 调研检查清单

### 开始编码前

- [ ] 我已阅读官方文档
- [ ] 我已搜索相关案例
- [ ] 我已查看错误模式库
- [ ] 我已了解双平台差异
- [ ] 我已确认 API 端点
- [ ] 我已测试响应格式
- [ ] 我已了解已知陷阱

### 编码过程中

- [ ] 我正在使用代码模板
- [ ] 我正在遵循约束规则
- [ ] 我正在添加错误处理
- [ ] 我正在编写注释

### 编码完成后

- [ ] 我已运行预提交检查清单
- [ ] 我已通过自动化测试
- [ ] 我已更新相关文档

---

## 调研资源库

### 内部资源

```
.claude/
├── 00-philosophy/
│   ├── glue-programming.md      # 胶水编程原理
│   ├── strong-constraints.md    # 28条约束
│   └── blood-lessons.md         # 本文档
├── 01-fundamentals/
│   ├── tech-stack.md            # 技术栈
│   ├── language-layers.md       # 12层语言要素
│   └── api-platforms.md         # API 规范 ⭐
├── 02-methodology/
│   └── development-flow.md      # 开发流程
├── 03-node-development/
│   ├── node-architecture.md     # 节点架构
│   └── handle-connections.md    # Handle 连接
└── 04-error-patterns/
    ├── errors-by-type.md        # 错误模式库 ⭐
    ├── glue-constraints.md      # 约束映射
    └── prevention-checklist.md  # 预防清单
```

### 外部资源

| 资源 | 链接 | 用途 |
|------|------|------|
| React Flow 文档 | https://reactflow.dev/ | 节点编辑器 |
| React 文档 | https://react.dev/ | UI 框架 |
| MDN Web Docs | https://developer.mozilla.org/ | Web 标准 |
| Stack Overflow | https://stackoverflow.com/ | 问题解答 |
| GitHub | https://github.com/ | 代码案例 |

---

## 避免重复犯错

### 错误分类系统

**按类型分类**:
- API 相关（8个错误）
- React Flow 相关（6个错误）
- 角色系统相关（5个错误）
- 表单/输入相关（2个错误）
- 存储/持久化相关（4个错误）
- UI/渲染相关（3个错误）

**按频率分类**:
- 高频错误（Top 5）⭐⭐⭐
- 中频错误
- 低频错误

### 错误预防措施

1. **阅读错误模式库**
   - 开发前先查看相关错误类型
   - 了解常见陷阱

2. **使用预防清单**
   - 提交前运行检查清单
   - 代码审查重点检查

3. **遵循强约束**
   - 35条约束规则
   - ESLint 自动检测

---

## 时间对比

### 传统开发流程

```
第1小时: 编码
  ├─ 30分钟: 写代码
  └─ 30分钟: 调试错误

第2小时: 继续调试
  ├─ 发现新的错误
  └─ 修改代码

第3小时: 反悔重写
  ├─ 发现架构问题
  └─ 推倒重来

总计: 3小时（含返工）
```

### 调研优先流程

```
第1小时: 调研（70%）
  ├─ 20分钟: 阅读文档
  ├─ 20分钟: 查看案例
  ├─ 20分钟: 理解陷阱
  └─ 20分钟: 设计方案

第2小时: 编码（20%）
  ├─ 10分钟: 编写胶水代码
  └─ 10分钟: 测试验证

总计: 2小时（无返工）
```

**效率提升**: 33% (3小时 → 2小时)

---

## 总结

**血的教训 = 时间就是金钱**

- ✅ 调研优先 = 减少返工
- ✅ 了解错误 = 避免重复犯错
- ✅ 使用模板 = 提高效率

**核心理念**:
> **"磨刀不误砍柴工"**
> 10 分开发，7 分找资料

**实践方法**:
1. 开发前：阅读文档、查看错误模式
2. 开发中：使用模板、遵循约束
3. 开发后：更新文档、记录新错误

---

**相关文档**:
- [胶水编程原理](./glue-programming.md) - 理解胶水编程
- [28条强约束](./strong-constraints.md) - 开发约束规则
- [错误模式库](../04-error-patterns/errors-by-type.md) - 55个错误

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
