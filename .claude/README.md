# WinJin 编程规范体系

> 基于 Vibe-Coding-CN 框架与 WinJin 项目最佳实践的融合规范

---

## 📚 文档结构

本规范体系采用 6 层架构，从哲学理念到自动化实践，层层递进。

### 00-philosophy/ - 哲学层
核心理念和约束原则
- **胶水编程**: AI 连接代码，人审连接
- **强约束原则**: 28条胶水开发约束 + WinJin 扩展
- **血的教训**: 调研优先原则

### 01-fundamentals/ - 基础知识层
技术栈和语言要素
- **技术栈**: 运行时环境、框架版本
- **语言层要素**: 12层语言要素清单
- **API 规范**: Sora2 双平台详细规范

### 02-methodology/ - 方法论层
开发流程和最佳实践
- **开发流程**: Plan → Code → Update
- **测试自动化**: MCP Chrome DevTools 测试
- **Canvas 白板**: React Flow 作为可视化白板

### 03-node-development/ - 节点开发层
React Flow 节点开发规范
- **节点架构**: 输入/处理/输出节点模式
- **Handle 连接**: 数据流连接规范
- **节点模板**: 快速开发模板

### 04-error-patterns/ - 错误模式层
错误管理和预防
- **错误分类**: 55个已文档化错误
- **约束映射**: 约束→错误映射表
- **预防检查**: 预提交检查清单

### 05-automation/ - 自动化层
自动化系统和工具
- **MCP 集成**: MCP 工具集成指南
- **自动测试**: 自动化测试流程
- **持续学习**: 持续学习机制

---

## 🚀 快速开始

### 新手入门
1. 阅读 [00-philosophy/references/glue-programming.md](00-philosophy/references/glue-programming.md) - 理解胶水编程
2. 阅读 [01-fundamentals/references/tech-stack.md](01-fundamentals/references/tech-stack.md) - 了解技术栈
3. 阅读 [02-methodology/references/development-flow.md](02-methodology/references/development-flow.md) - 掌握开发流程

### 节点开发
1. 阅读 [03-node-development/references/node-architecture.md](03-node-development/references/node-architecture.md) - 节点架构
2. 使用 `/skills node-dev` - React Flow 节点开发技能 ⭐ v2.0 更新
3. 参考 [03-node-development/references/node-templates.md](03-node-development/references/node-templates.md) - 节点模板

### 问题排查
1. 查看 [04-error-patterns/references/errors-by-type.md](04-error-patterns/references/errors-by-type.md) - 错误模式库
2. 使用 [04-error-patterns/references/prevention-checklist.md](04-error-patterns/references/prevention-checklist.md) - 预防检查

---

## 🧬 核心理念

### 胶水编程 (Glue Coding)

```
传统编程: 人写代码
Vibe Coding: AI 写代码，人审代码
胶水编程: AI 连接代码，人审连接
```

**在 WinJin 中的体现**:
```
TextNode → PromptOptimizer → VideoGenerate → TaskResult
              ↓                      ↓
          OpenAI API            Sora2 API
       (成熟模块)            (成熟模块)
```

- **输入节点** = 成熟模块（数据源）
- **处理节点** = 胶水代码（数据转换）
- **输出节点** = 结果接收（显示、导出）

### 12层语言要素

完整的编程理解框架，从基础语法到工程实践：

- L1: 基础控制语法
- L2: 数据与内存模型
- L3: 类型系统
- L4: 执行模型 ⭐ 最关键
- L5: 错误处理
- L6: 元语法
- L7: 语言范式
- L8: 工程实践

详见 [01-fundamentals/language-layers.md](01-fundamentals/language-layers.md)

### 28条约束原则

胶水开发的铁律：
- 不得自行实现底层逻辑
- 不得裁剪或重写依赖库
- 必须复用成熟仓库

详见 [00-philosophy/strong-constraints.md](00-philosophy/strong-constraints.md)

---

## 📊 与 Vibe-Coding-CN 对应

| Vibe-Coding 元素 | WinJin 实现 | 文件位置 |
|-----------------|-----------|---------|
| 胶水编程 | React Flow 节点 | `03-node-development/` |
| 12层语言要素 | 代码审查清单 | `01-fundamentals/language-layers.md` |
| 28条约束 | 错误预防规则 | `04-error-patterns/glue-constraints.md` |
| Canvas 白板 | React Flow 画布 | `02-methodology/canvas-driven-dev.md` |
| 血的教训 | 错误模式系统 | `04-error-patterns/errors-by-type.md` |

---

## 🔧 相关资源

### 项目文档
- **项目主文档**: [CLAUDE.md](../CLAUDE.md)
- **开发技能**: [skills/winjin-dev/SKILL.md](../skills/winjin-dev/SKILL.md)

### 外部参考
- **Vibe-Coding-CN**: `../AI-codeing框架资料/` - 完整的 Vibe Coding 指南
- **React Flow**: https://reactflow.dev/ - 官方文档

---

## 📝 更新日志

- **v2.0.0** (2026-01-18): 融合 Vibe-Coding-CN 框架，重构文档体系
- **v1.0.0** (2025-12-xx): 初始版本，基于 WinJin 项目实践

---

**维护者**: WinJin AIGC Team
**最后更新**: 2026-01-18
