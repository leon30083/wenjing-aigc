# 02-methodology: 方法论层

> **版本**: v2.0.0
> **更新日期**: 2026-01-23
> **定位**: WinJin 项目的开发流程和测试规范

---

## 核心公式

```
开发流程 = Plan → Code → Update Docs

测试自动化 = MCP工具 + 浏览器测试 + 自动验证

文档更新 = 功能完成 → 同步文档 → 提交Git
```

---

## Plan → Code → Update Docs 流程

### Plan 模式（规划阶段）
- 分析需求范围
- 探索代码库
- 识别影响范围
- 设计实现方案
- 创建详细计划
- 等待用户批准

### Code 模式（实现阶段）
- 按照计划实施
- 使用 TodoWrite 跟踪进度
- 完成开发
- 自动化测试验证
- 提交代码

### Update Docs（更新文档）
- 更新 SKILL.md
- 更新 base.md / code.md
- 更新开发交接书.md
- 提交到 Git

---

## 自动化测试流程 🤖

### 测试原则
**✅ 自动化优先**:
- 使用 MCP 工具在浏览器中自动测试
- 减少人工干预
- 每个任务都应该用自动化方式验证

**❌ 人工协助的边界**:
- 连线连接节点（React Flow 拖拽连线）
- 模拟鼠标拖拽（节点位置调整）

### 标准测试流程
```
开发完成后
├─ 1. 访问 http://localhost:5173/
├─ 2. 获取页面快照（take_snapshot）
├─ 3. 执行自动化操作
│   ├─ fill() - 填写表单
│   ├─ click() - 点击按钮
│   └─ evaluate_script() - 检查状态
├─ 4. 验证结果
│   ├─ take_screenshot() - 截图保存
│   ├─ list_console_messages() - 检查错误
│   └─ list_network_requests() - 检查 API
└─ 5. 用户协作（如需要）
```

---

## MCP 工具概览

### 核心工具（7个）

| 工具 | 功能 | 优先级 |
|------|------|--------|
| **Chrome DevTools** | 浏览器自动化测试 | ⭐⭐⭐⭐⭐ |
| **Context7** | 文档查询 | ⭐⭐⭐⭐⭐ |
| **Memory** | 知识图谱 | ⭐⭐⭐ |
| **Z-Read** | GitHub 阅读 | ⭐⭐⭐⭐ |
| **Web Search** | 网页搜索 | ⭐⭐⭐ |
| **ZAI MCP** | 图像分析 | ⭐⭐⭐ |
| **Fetch** | HTTP 请求 | ⭐⭐⭐ |

### 任务→工具映射

| 开发任务 | 推荐工具 | 优先级 |
|---------|---------|--------|
| 功能开发 | Context7 | ⭐⭐⭐⭐⭐ |
| 测试验证 | Chrome DevTools | ⭐⭐⭐⭐⭐ |
| 跨会话记忆 | Memory | ⭐⭐⭐ |
| 代码阅读 | Z-Read | ⭐⭐⭐⭐ |
| 资料查找 | Web Search | ⭐⭐⭐ |

---

## 白板驱动开发

### React Flow 作为白板
- **可视化流程**: 节点+ 连线 = 可视化工作流
- **实时验证**: 拖拽连线验证数据流
- **快速迭代**: 修改节点配置，立即测试
- **文档同步**: 工作流保存，自动生成文档

### 节点协作规范
| 端口类型 | 源节点类型 | 数据传递 |
|---------|-----------|----------|
| prompt-input | textNode, promptOptimizerNode | connectedPrompt |
| character-input | characterLibraryNode | connectedCharacters |
| images-input | referenceImageNode | connectedImages |
| task-input | videoGenerateNode, storyboardNode | taskId |

---

## 文档更新规范

### 更新时机
- ✅ 功能开发完成
- ✅ 重要问题解决
- ✅ API 变更

### 必须更新的文档
1. ⭐ **SKILL.md** - Claude Code 核心文档
2. **base.md** - 技术规范
3. **code.md** - 代码实现
4. **Sora2_Character_Best_Practices.md** - 开发经验
5. **开发交接书.md** - 版本号更新

---

## 详细文档

- [开发流程](references/development-flow.md) - Plan → Code → Update 详解
- [白板驱动开发](references/canvas-driven-dev.md) - React Flow 白板开发
- [测试自动化](references/testing-automation.md) - MCP 工具测试指南
- [文档规范](references/documentation-standards.md) - 文档更新标准

---

## 快速开始

### 新手入门（15分钟）
1. 阅读 [开发流程](references/development-flow.md) - 理解 Plan-First 流程
2. 阅读 [白板驱动开发](references/canvas-driven-dev.md) - 学习 React Flow 开发
3. 浏览 [测试自动化](references/testing-automation.md) - 了解自动化测试

### 进阶开发者（20分钟）
1. 深入理解 [开发流程](references/development-flow.md) - 掌握完整流程
2. 精读 [测试自动化](references/testing-automation.md) - 熟练使用 MCP 工具
3. 应用到实际开发 - 参考节点开发层文档

---

## 常见问题

### Q: 何时使用 Plan 模式？

**A**:
- ✅ 新功能实现
- ✅ 架构变更
- ✅ 复杂重构
- ❌ 简单 Bug 修复（直接修复）

### Q: 如何使用 MCP 工具测试？

**A**: 参考 [测试自动化](references/testing-automation.md)
1. `take_snapshot()` - 获取页面快照
2. `click(uid)` - 点击元素
3. `fill(uid, value)` - 填写表单
4. `take_screenshot()` - 截图验证

### Q: 文档何时更新？

**A**: 每次功能完成后**必须**更新：
1. ⭐ SKILL.md（优先）
2. base.md / code.md
3. 开发交接书.md

---

## 相关文档

### 上层文档
- [哲学层](../00-philosophy/) - 核心理念
- [基础知识层](../01-fundamentals/) - 技术栈

### 下层文档
- [节点开发层](../03-node-development/) - React Flow 节点
- [错误模式层](../04-error-patterns/) - 错误库

---

**维护者**: WinJin AIGC Team
**最后更新**: 2026-01-23
**版本**: v2.0.0
