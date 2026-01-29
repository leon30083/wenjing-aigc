# 05-automation: 自动化层

> **版本**: v2.0.0
> **更新日期**: 2026-01-23
> **定位**: WinJin 项目的自动化工具和持续学习

---

## 核心公式

```
自动化 = MCP工具 + 测试脚本 + 一键安装

持续学习 = 错误监控 + 模式识别 + 规则生成

知识管理 = Memory图谱 + 跨会话记忆
```

---

## MCP 工具概览 ⭐ 核心

### 7个核心工具

| 工具 | 功能 | 优先级 | 使用场景 |
|------|------|--------|----------|
| **Chrome DevTools** | 浏览器自动化 | ⭐⭐⭐⭐⭐ | 测试验证、UI调试、性能分析 |
| **Context7** | 文档查询 | ⭐⭐⭐⭐⭐ | 功能开发、查阅API、代码示例 |
| **Memory** | 知识图谱 | ⭐⭐⭐ | 跨会话记忆、知识管理 |
| **Z-Read** | GitHub 阅读 | ⭐⭐⭐⭐ | 代码阅读、开源项目研究 |
| **Web Search** | 网页搜索 | ⭐⭐⭐ | 资料查找、解决方案搜索 |
| **ZAI MCP** | 图像分析 | ⭐⭐⭐ | 图片/视频分析、UI转代码 |
| **Fetch** | HTTP 请求 | ⭐⭐⭐ | API测试、数据抓取 |

### 任务→工具映射

| 开发任务 | 推荐工具 | 优先级 | 使用示例 |
|---------|---------|--------|----------|
| **功能开发** | Context7 | ⭐⭐⭐⭐⭐ | `query-docs("/react", "useState hook")` |
| **API测试** | Chrome DevTools | ⭐⭐⭐⭐⭐ | `list_network_requests()` + `take_screenshot()` |
| **代码调试** | Chrome DevTools | ⭐⭐⭐⭐⭐ | `list_console_messages()` + `evaluate_script()` |
| **资料查找** | Web Search | ⭐⭐⭐⭐ | `webSearchPrime("React Flow 2026 docs")` |
| **跨会话记忆** | Memory | ⭐⭐⭐ | `create_entities()` + `search_nodes()` |
| **GitHub阅读** | Z-Read | ⭐⭐⭐⭐ | `get_repo_structure("facebook/react")` |
| **图像处理** | ZAI MCP | ⭐⭐⭐ | `analyze_image(url, "describe UI")` |
| **HTTP请求** | Fetch | ⭐⭐⭐ | `fetch("https://api.example.com")` |

---

## Chrome DevTools 核心工具

### 页面操作
- `list_pages()` - 列出所有页面
- `navigate_page({type, url})` - 导航到URL
- `take_snapshot()` - 获取页面快照（返回可交互元素）

### 元素交互
- `click(uid)` - 点击元素
- `fill(uid, value)` - 填写表单
- `fill_form([{uid, value}])` - 批量填写
- `press_key(key)` - 按键（Enter, Tab）

### 信息获取
- `take_screenshot()` - 截图
- `list_console_messages()` - 查看控制台日志
- `list_network_requests()` - 监听网络请求

---

## Context7 核心工具

### 工作流程
```javascript
// Step 1: 解析库ID
resolve-library-id({
  query: "react hooks",
  libraryName: "react"
})
// 返回: { libraryId: "/facebook/react" }

// Step 2: 查询文档
query-docs({
  libraryId: "/facebook/react",
  query: "How to use useState hook?"
})
```

---

## Memory 知识图谱

### 核心概念
- **实体（Entity）**: 具有独立存在的事物
- **关系（Relation）: 实体之间的连接
- **观察（Observation）**: 关于实体的具体信息

### 核心工具
- `create_entities()` - 创建实体
- `search_nodes()` - 搜索节点
- `create_relations()` - 创建关系
- `add_observations()` - 添加观察

---

## 自动化测试流程

### 标准测试流程
```
开发完成后
├─ 1. 访问 http://localhost:5173/
├─ 2. take_snapshot() - 获取页面快照
├─ 3. fill() / click() - 执行操作
├─ 4. take_screenshot() - 截图验证
├─ 5. list_console_messages() - 检查错误
└─ 6. list_network_requests() - 检查 API
```

### 测试检查清单
- [ ] 页面加载成功（无 console 错误）
- [ ] 节点显示正常（截图验证）
- [ ] 表单输入响应
- [ ] API 请求正确
- [ ] 数据更新及时

---

## 一键安装脚本 ⭐ 新增

### 安装框架
```bash
# 运行安装脚本
bash scripts/install-framework.sh

# 验证安装
node scripts/validate-install.js
```

### MCP 配置迁移
```bash
# 迁移 MCP 配置
bash scripts/migrate-mcp-config.sh

# 设置环境变量
cp templates/.env.mcp.template .env.mcp
# 编辑 .env.mcp 填入 API 密钥
```

---

## 详细文档

### MCP 工具指南
- [Chrome DevTools 完整指南](references/mcp-browsers.md) - 浏览器自动化详解
- [Context7 使用指南](references/mcp-docs-query.md) - 文档查询详解
- [Memory 知识图谱](references/mcp-memory.md) - 知识管理详解
- [MCP 配置模板](../../templates/mcp_config.base.json) - 基础配置

### 自动化文档
- [自动化测试系统](references/auto-testing.md) - 完整的测试指南
- [自动化架构](references/automation-architecture.md) - 系统架构文档
- [持续学习机制](references/continuous-learning.md) - 错误监控和规则生成

---

## 快速开始

### 新手入门（15分钟）
1. 阅读 [Chrome DevTools 指南](references/mcp-browsers.md) - 学习浏览器自动化
2. 阅读 [Context7 使用指南](references/mcp-docs-query.md) - 学习文档查询
3. 浏览 [自动化测试系统](references/auto-testing.md) - 了解自动化测试

### 进阶开发者（20分钟）
1. 精读 [自动化架构](references/automation-architecture.md) - 理解系统架构
2. 深入理解 [Memory 知识图谱](references/mcp-memory.md) - 掌握知识管理
3. 应用到实际开发 - 使用 MCP 工具提升效率

---

## 常见问题

### Q: 如何使用 Chrome DevTools 测试？

**A**: 参考 [Chrome DevTools 指南](references/mcp-browsers.md)
1. `list_pages()` - 检查页面
2. `navigate_page()` - 导航到 URL
3. `take_snapshot()` - 获取快照
4. `click()` / `fill()` - 执行操作
5. `take_screenshot()` - 截图验证

### Q: 如何查询文档？

**A**: 使用 Context7 两步法
1. `resolve-library-id()` - 解析库ID
2. `query-docs()` - 查询文档

### Q: 如何使用 Memory 知识图谱？

**A**: 参考 [Memory 知识图谱](references/mcp-memory.md)
1. `create_entities()` - 创建实体
2. `search_nodes()` - 搜索节点
3. `create_relations()` - 创建关系

---

## 相关文档

### 上层文档
- [哲学层](../00-philosophy/) - 核心理念
- [基础知识层](../01-fundamentals/) - 技术栈
- [方法论层](../02-methodology/) - 开发流程

### 并行文档
- [节点开发层](../03-node-development/) - React Flow 节点

---

## 配置文件

### MCP 配置
- [基础配置模板](../../templates/mcp_config.base.json) - 7个核心工具
- [完整配置模板](../../templates/mcp_config.full.json) - 包含可选工具
- [环境变量模板](../../templates/.env.mcp.template) - API 密钥模板

### 安装脚本
- [安装框架脚本](../../scripts/install-framework.sh) - 一键安装
- [MCP 迁移脚本](../../scripts/migrate-mcp-config.sh) - 配置迁移

---

**维护者**: WinJin AIGC Team
**最后更新**: 2026-01-23
**版本**: v2.0.0
