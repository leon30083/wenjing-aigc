# prompt-tester instructions.md

```markdown
# Prompt Tester Skill

自动化测试提示词的性能和质量。

## 功能

- 批量测试多个提示词版本
- 对比Token消耗
- 评估响应质量
- 生成可视化报告

## 使用方式

```

# 在Claude Code中调用

/skills prompt-tester --versions v1.0,v1.1,v1.2

```

## 输出

生成 `test-results/` 目录，包含：
- 性能对比表
- Token使用统计
- 推荐的最优版本

## 参数说明

- `--versions`: 要测试的版本号列表，用逗号分隔
- `--baseline`: 指定基准版本用于对比
- `--export`: 导出格式（json/csv/markdown）

## 示例

```

# 测试多个版本并对比

/skills prompt-tester --versions v2.0,v2.1,v2.2 --baseline v1.5

# 导出为CSV格式

/skills prompt-tester --versions v2.0,v2.1 --export csv

```

```

## 文件位置

`wenjing-aigc/.claude/skills/prompt-tester/[instructions.md](http://instructions.md)`