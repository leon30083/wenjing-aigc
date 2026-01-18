# 方法论层 - 开发流程

> **版本**: v1.0.0
> **更新日期**: 2026-01-18

---

## 概述

方法论层包含 WinJin 项目的开发流程、测试方法、文档标准和自动化规范。这些文档指导开发者如何高效地完成开发任务。

---

## 文档导航

### 1. [开发流程](./development-flow.md)

**核心理念**: Plan → Code → Update Docs

**主要内容**:
- 开发流程三阶段
- 自动化测试流程
- 错误模式管理
- 版本管理规范

**适合读者**: 所有开发者
**阅读时间**: 15 分钟

---

### 2. [测试自动化](./testing-automation.md)

**核心理念**: 自动化优先，人工验证辅助

**主要内容**:
- MCP Chrome DevTools 测试
- 测试流程和场景
- 错误处理
- 最佳实践

**适合读者**: 所有开发者，测试工程师
**阅读时间**: 25 分钟

**关键工具**:
- Chrome DevTools - 浏览器自动化
- Context7 - 文档查询
- Web Search - 搜索解决方案
- Memory - 知识管理

---

### 3. [Canvas 白板驱动开发](./canvas-driven-dev.md)

**核心理念**: 代码 ⇄ Canvas 白板 ⇄ AI ⇄ 人类

**主要内容**:
- React Flow 作为白板
- 工作流可视化
- 最佳实践和模式

**适合读者**: React Flow 开发者
**阅读时间**: 15 分钟

---

### 4. [文档编写标准](./documentation-standards.md)

**核心理念**: 文档是代码的一部分

**主要内容**:
- 文档原则（文档优先、单一事实来源、保持同步）
- 文档结构（6 层架构）
- 编写规范
- 更新流程
- 质量检查

**适合读者**: 所有开发者，文档维护者
**阅读时间**: 20 分钟

---

## 快速开始

### 标准开发流程

```
┌─────────────────────────────────────────────────────────┐
│  1. Plan (计划)                                         │
│     ├─ 阅读相关文档                                     │
│     ├─ 查看错误模式                                     │
│     ├─ 搜索最佳实践                                     │
│     └─ 设计方案                                         │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  2. Code (编码)                                         │
│     ├─ 编写代码                                         │
│     ├─ 添加注释                                         │
│     ├─ 自动化测试                                       │
│     └─ 代码审查                                         │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  3. Update Docs (更新文档) ⭐ 重要                       │
│     ├─ 新增错误模式 → 04-error-patterns/               │
│     ├─ 更新约束映射 → 04-error-patterns/glue-constraints.md│
│     ├─ 更新技能文档 → skills/winjin-dev/SKILL.md        │
│     └─ 更新相关文档 → 其他相关文件                      │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  4. Git Commit                                          │
│     └─ 包含代码和文档                                   │
└─────────────────────────────────────────────────────────┘
```

### 测试驱动开发

```
┌─────────────────────────────────────────────────────────┐
│  1. 自动化测试 ⭐ 优先                                   │
│     ├─ 使用 MCP Chrome DevTools                         │
│     ├─ 不需要频繁询问用户"能否测试"                      │
│     └─ 每个功能都应该自动化验证                          │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  2. 测试检查清单                                        │
│     ├─ 页面加载成功（无 console 错误）                    │
│     ├─ 节点显示正常（截图验证）                          │
│     ├─ 表单输入响应                                      │
│     ├─ API 请求正确                                      │
│     └─ 数据更新及时                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 核心流程

### Plan → Code → Update

#### Plan 阶段

**目标**: 充分调研，设计解决方案

**检查清单**:
- [ ] 阅读相关文档
- [ ] 查看错误模式库
- [ ] 搜索最佳实践（使用 Web Search MCP）
- [ ] 查询最新文档（使用 Context7 MCP）
- [ ] 设计方案

**时间分配**: 70% 调研 + 20% 编码 + 10% 测试

#### Code 阶段

**目标**: 编写高质量代码

**检查清单**:
- [ ] 使用代码模板
- [ ] 遵循约束规则
- [ ] 添加错误处理
- [ ] 编写自动化测试
- [ ] 本地验证功能

#### Update 阶段

**目标**: 更新文档，记录知识

**检查清单**:
- [ ] 新增错误模式（如有）
- [ ] 更新约束映射
- [ ] 更新技能文档
- [ ] 更新相关文档
- [ ] 提交到 Git

---

## 测试自动化

### MCP Chrome DevTools

**核心工具**: 自动化浏览器测试

```javascript
// 基础操作
await mcp__chrome_devtools__navigate_page({
  type: 'url',
  url: 'http://localhost:5173'
});

const snapshot = await mcp__chrome_devtools__take_snapshot();

await mcp__chrome_devtools__click({ uid: button.uid });

await mcp__chrome_devtools__fill({
  uid: input.uid,
  value: '测试文本'
});

await mcp__chrome_devtools__take_screenshot({
  filePath: 'test-results/screenshot.png'
});
```

**详细文档**: [testing-automation.md](./testing-automation.md)

---

## 文档更新流程

### 更新检查清单

每次开发完成后，检查以下文档是否需要更新：

- [ ] `.claude/04-error-patterns/errors-by-type.md` - 新增错误模式
- [ ] `.claude/04-error-patterns/glue-constraints.md` - 添加约束映射
- [ ] `.claude/skills/winjin-dev/SKILL.md` - 更新开发提示
- [ ] `.claude/03-node-development/node-templates.md` - 新增节点模板
- [ ] 相关模块文档 - 更新具体说明
- [ ] `CLAUDE.md` - 更新主文档（重大变更时）

### 文档原则

**文档优先**:
```javascript
// ✅ 正确：先写文档，后写代码
/**
 * @function videoGenerate
 * @description 生成 Sora2 视频
 * @param {string} prompt - 视频提示词
 * @returns {Promise<Object>} { success, data, error }
 */
async function videoGenerate(prompt) {
  // 实现代码...
}

// ❌ 错误：先写代码，后补文档
async function videoGenerate(prompt) {
  // 实现代码...
  // 几个月后才补文档（可能遗漏细节）
}
```

**单一事实来源**:
```
✅ 正确：单一来源 + 引用
├── 01-fundamentals/api-platforms.md (详细说明) ⭐ 唯一来源
├── 03-node-development/node-architecture.md (引用 api-platforms.md)
└── 04-error-patterns/errors-by-type.md (引用 api-platforms.md)

❌ 错误：重复说明
├── base.md (说明双平台差异)
├── code.md (再次说明双平台差异)
└── error-patterns.md (又说明一次)
```

---

## Canvas 白板驱动开发

### 核心理念

```
代码 ⇄ Canvas 白板 ⇄ AI ⇄ 人类
```

**在 WinJin 中的体现**:
- **Canvas 白板** = React Flow 工作流编辑器
- **代码** = 节点实现
- **AI** = Claude Code + MCP 工具
- **人类** = 开发者

### 可视化工作流

```
TextNode → PromptOptimizer → VideoGenerate → TaskResult
              ↓                      ↓
          OpenAI API            Sora2 API
       (成熟模块)            (成熟模块)
```

**优势**:
- 单一事实来源（工作流即文档）
- 可视化架构
- 快速迭代

**详细文档**: [canvas-driven-dev.md](./canvas-driven-dev.md)

---

## 开发命令

### 开发命令

| 命令 | 说明 |
|------|------|
| `npm start` | 启动 Electron 应用 |
| `npm run server` | 仅启动 HTTP 服务器（端口 9000） |
| `cd src/client && npm run dev` | 启动流式画布（端口 5173） |

### 验证命令

| 命令 | 说明 |
|------|------|
| `npm run validate:all` | 运行所有验证 |
| `npm run fix:scan` | 扫描可修复问题 |
| `npm run metrics:trend` | 查看质量趋势 |

### 测试命令

| 命令 | 说明 |
|------|------|
| `npm run test:all` | 运行所有测试 |
| `npm run test:unit` | 单元测试 |
| `npm run test:e2e` | E2E 测试 |
| `npm run test:coverage` | 生成覆盖率报告 |

---

## 相关文档

### 上层文档

- [哲学层](../00-philosophy/) - 核心理念
- [基础知识层](../01-fundamentals/) - 技术栈

### 下层文档

- [节点开发层](../03-node-development/) - React Flow 节点
- [错误模式层](../04-error-patterns/) - 错误库
- [自动化层](../05-automation/) - MCP 集成

---

## 常见问题

### Q1: 如何使用 MCP 工具测试？

**A**: 参阅 [测试自动化](./testing-automation.md)：
```javascript
// 1. 打开页面
await mcp__chrome_devtools__navigate_page({
  type: 'url',
  url: 'http://localhost:5173'
});

// 2. 获取快照
const snapshot = await mcp__chrome_devtools__take_snapshot();

// 3. 交互操作
await mcp__chrome_devtools__click({ uid: button.uid });

// 4. 截图验证
await mcp__chrome_devtools__take_screenshot({
  filePath: 'test-results/screenshot.png'
});
```

### Q2: 什么时候更新文档？

**A**: 每次开发完成后：
1. 新增错误模式时
2. 修改 API 接口时
3. 添加新功能时
4. 修复 Bug 后

### Q3: 如何进入 Plan 模式？

**A**: 使用 `/plan` 命令或按 `Shift+Tab×2`

### Q4: 测试失败怎么办？

**A**:
1. 检查控制台错误
2. 查看网络请求
3. 截图记录
4. 分析错误模式
5. 查阅相关文档

---

## 更新日志

| 日期 | 版本 | 变更说明 |
|------|------|---------|
| 2026-01-18 | v1.0.0 | 初始版本 - 创建方法论层文档 |

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
**版本**: v1.0.0
