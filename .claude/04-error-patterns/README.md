# 04-error-patterns: 错误模式层

> **版本**: v2.0.0
> **更新日期**: 2026-01-23
> **定位**: WinJin 项目的已知错误和约束映射

---

## 核心公式

```
错误预防 = 阅读文档 + 查看错误模式 + 遵循约束

约束映射 = 约束编号 → 错误模式 → 解决方案

持续改进 = 发现新错误 → 添加到错误库 → 更新约束
```

---

## 错误模式库概览

### 错误类型分布

| 类型 | 错误数量 | 关键词 | 查看详情 |
|------|----------|--------|----------|
| **API 相关** | 9个 | 双平台、轮询、端点、模型 | [详细文档](references/errors-by-type.md#api-相关) |
| **React Flow 相关** | 10个 | 数据传递、Handle、连接、事件 | [详细文档](references/errors-by-type.md#react-flow-相关) |
| **角色系统相关** | 7个 | 引用、显示、焦点、双显示 | [详细文档](references/errors-by-type.md#角色系统相关) |
| **表单/输入相关** | 2个 | id/name、验证 | [详细文档](references/errors-by-type.md#表单输入相关) |
| **存储/持久化相关** | 7个 | localStorage、工作流、配置 | [详细文档](references/errors-by-type.md#存储持久化相关) |
| **UI/渲染相关** | 3个 | 布局抖动、对象渲染 | [详细文档](references/errors-by-type.md#ui渲染相关) |
| **其他** | 18个 | ... | [详细文档](references/errors-by-type.md#其他) |

**总计**: 56 个错误模式

---

## 高频错误（Top 10）⭐ 必读

| 错误 | 类型 | 严重程度 | 核心问题 |
|------|------|----------|----------|
| **错误1** | API | ⭐⭐⭐ | 双平台任务ID不兼容 |
| **错误6** | API | ⭐⭐⭐ | 轮询间隔太短（429错误） |
| **错误16** | React Flow | ⭐⭐⭐ | 节点间数据传递错误 |
| **错误26** | React Flow | ⭐⭐ | 节点连接验证缺失 |
| **错误29** | API | ⭐⭐⭐ | useEffect 依赖 `data` 导致无限循环 |
| **错误33** | Storage | ⭐⭐⭐ | 工作流快照持久化时机问题 |
| **错误37** | React Flow | ⭐⭐⭐ | TaskResultNode 任务ID竞态条件 |
| **错误48** | Character | ⭐⭐⭐ | 优化节点错误使用双显示功能 |
| **错误51** | React Flow | ⭐⭐⭐ | TaskResultNode 轮询 interval 竞态条件 |
| **错误56** | React Flow | ⭐⭐⭐ | API 配置节点平台选择刷新后丢失 |

---

## 约束→错误映射

| 约束 | 关联错误 | 预防措施 |
|------|---------|----------|
| #29: 禁止硬编码 API 端点 | 错误17 | 使用完整路径 `/api/{endpoint}` |
| #30: 必须处理双平台差异 | 错误1、错误38 | 兼容 `id` 和 `task_id` |
| #31: 禁止假设任务ID字段名 | 错误1 | 使用 `||` 兼容处理 |
| #32: 禁止使用过短的轮询间隔 | 错误6、错误46 | 使用 30 秒间隔 |
| #33: 角色引用必须保留 | 错误48、错误55 | 优化节点使用真实ID |

---

## 快速查询

### 按错误类型查询
- **API 问题**: [API 相关](references/errors-by-type.md#api-相关)
- **节点连接**: [React Flow 相关](references/errors-by-type.md#react-flow-相关)
- **角色引用**: [角色系统相关](references/errors-by-type.md#角色系统相关)
- **数据持久化**: [存储/持久化相关](references/errors-by-type.md#存储持久化相关)

### 按严重程度查询
- **⭐⭐⭐ 高频错误**: 见上文 Top 10
- **⭐⭐ 中频错误**: 查看详细文档
- **⭐ 低频错误**: 查看详细文档

---

## 详细文档

- [错误模式库（按类型）](references/errors-by-type.md) - 56个错误的完整列表
- [约束→错误映射](references/glue-constraints.md) - 完整的映射表
- [预防检查清单](references/prevention-checklist.md) - 提交前检查清单

---

## 快速开始

### 新手入门（10分钟）
1. 浏览 [高频错误 Top 10](#高频错误top-10-必读) - 了解最常见的错误
2. 阅读 [约束→错误映射](#约束错误映射) - 理解约束和错误的关系
3. 查阅 [预防检查清单](references/prevention-checklist.md) - 学会预防错误

### 进阶开发者（15分钟）
1. 精读 [错误模式库](references/errors-by-type.md) - 熟悉所有错误
2. 深入理解 [约束→错误映射](references/glue-constraints.md) - 掌握约束规则
3. 应用到实际开发 - Code Review 时检查约束合规性

---

## 常见问题

### Q: 如何查找特定错误的解决方案？

**A**:
1. 使用 Ctrl+F 在 [错误模式库](references/errors-by-type.md) 中搜索错误编号
2. 或按类型查找（如 "API 相关"）
3. 查看错误的"解决方案"章节

### Q: 如何预防错误？

**A**: 参考 [预防检查清单](references/prevention-checklist.md)
- 代码提交前运行检查清单
- Code Review 时检查约束合规性
- 使用自动化工具（ESLint、Pre-commit Hook）

### Q: 如何添加新的错误模式？

**A**:
1. 发现新错误后，记录到 [错误模式库](references/errors-by-type.md)
2. 映射到相关约束（如果有）
3. 更新 [预防检查清单](references/prevention-checklist.md)
4. 分享给团队

---

## 相关文档

### 上层文档
- [哲学层](../00-philosophy/) - 核心理念（强约束）
- [基础知识层](../01-fundamentals/) - 技术栈
- [方法论层](../02-methodology/) - 开发流程

### 并行文档
- [节点开发层](../03-node-development/) - React Flow 节点

---

**维护者**: WinJin AIGC Team
**最后更新**: 2026-01-23
**版本**: v2.0.0
