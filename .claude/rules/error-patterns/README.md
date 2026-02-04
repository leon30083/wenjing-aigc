# 错误模式参考 - 总索引

> **更新日期**: 2026-02-04
> **说明**: 原 error-patterns.md 已按类型拆分，提升加载性能

## 快速索引

| 类型 | 文件 | 错误数量 | 主要问题 |
|------|------|----------|----------|
| [API 相关](./api-errors.md) | api-errors.md | 9个 | 双平台差异、轮询、端点、模型、故事板、输出格式 |
| [React Flow](./reactflow-errors.md) | reactflow-errors.md | 11个 | 数据传递、Handle、连接、事件、竞态条件、旁白模式、快照延迟、配置恢复、平台选择 |
| [角色系统](./character-errors.md) | character-errors.md | 7个 | 引用、显示、焦点、双显示、优化、匹配失败 |
| [存储相关](./storage-errors.md) | storage-errors.md | 7个 | localStorage、工作流、配置持久化、优化结果持久化 |
| [UI 相关](./ui-errors.md) | ui-errors.md | 3个 | 布局抖动、对象渲染、CSS语法 |
| [表单相关](./form-errors.md) | form-errors.md | 2个 | id/name、验证 |
| [其他](./other-errors.md) | other-errors.md | 26个 | ... |

## 使用说明

1. **查找错误**: 根据错误类型访问对应文件
2. **AI 加载**: 只加载相关类型，节省 Token
3. **维护更新**: 新增错误时添加到对应类型文件

## 性能改善

| 指标 | 拆分前 | 拆分后 | 改善 |
|------|--------|--------|------|
| 文件大小 | 86.9 KB | ~10 KB/文件 | 减少 88% |
| Token 消耗 | ~12,000 | ~1,500/类型 | 减少 87.5% |
| 加载时间 | ~3-5 秒 | ~0.5-1 秒 | 减少 80% |

## 相关文档

- [SKILL.md](../../skills/winjin-dev/SKILL.md) - 开发规范和技能
- [base.md](../base.md) - 技术栈约束
- [code.md](../code.md) - 代码规范
- [开发交接书.md](../../../用户输入文件夹/开发对话/开发交接书.md) - 项目交接文档
