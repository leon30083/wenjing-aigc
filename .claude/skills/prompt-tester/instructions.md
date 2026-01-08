# Prompt Tester 使用指南

> **版本**: v1.0.0
> **更新日期**: 2026-01-08

---

## 快速开始

### 1. 验证配置

```bash
# 检查技能是否可用
/skills

# 应该看到 prompt-tester 在列表中
```

### 2. 基础测试

```bash
# 测试单个版本
/skills prompt-tester --versions=v1.0

# 测试多个版本
/skills prompt-tester --versions=v1.0,v1.1,v1.2
```

### 3. 查看报告

测试完成后，报告会自动生成在：
```
test-results/
├── report.html          # 可视化报告
├── data.json            # 原始数据
└── summary.md           # Markdown 摘要
```

---

## 测试场景

### 场景 1: 对比两个版本

```bash
/skills prompt-tester --versions=v1.0,v1.1 --baseline=v1.0
```

**输出**:
- 性能对比表
- Token 消耗差异
- 优化质量对比
- 推荐结论

### 场景 2: 导出报告

```bash
/skills prompt-tester --versions=v1.0,v1.1 --export=markdown
```

**导出格式**:
- `markdown` - Markdown 文档
- `json` - JSON 数据
- `csv` - CSV 表格

### 场景 3: 自定义测试

```bash
/skills prompt-tester --versions=v1.0 --input="@test.user 在海边玩耍"
```

---

## 测试指标

### 性能指标

| 指标 | 说明 | 目标 |
|------|------|------|
| **Token 消耗** | 系统提示词 + 用户提示词的 Token 总数 | < 4000 |
| **响应时间** | API 调用耗时 | < 5000ms |
| **优化质量** | 优化后提示词的质量评分 | > 8.0/10 |

### 质量指标

| 指标 | 说明 | 检查方式 |
|------|------|----------|
| **角色引用保留** | 优化后是否保留 `@username` 格式 | 正则匹配 |
| **外观描述** | 是否错误地添加角色外观描述 | 关键词检测 |
| **细节丰富度** | 是否添加足够的视觉细节 | 字数统计 |
| **格式规范** | 是否符合 Sora2 提示词格式 | 格式验证 |

---

## 最佳实践

### 1. 版本管理

```javascript
// ✅ 好的版本管理
const PROMPT_VERSIONS = {
  'v1.0': {
    systemPrompt: '...',
    changelog: '初始版本',
    date: '2026-01-01'
  },
  'v1.1': {
    systemPrompt: '...',
    changelog: '优化 Token 使用 -16%',
    date: '2026-01-08'
  }
};

// ❌ 差的版本管理
const systemPrompt = '...'; // 没有版本信息
```

### 2. 测试频率

- ✅ 修改优化逻辑后立即测试
- ✅ 发布新版本前进行完整测试
- ✅ 定期回归测试（每周一次）
- ❌ 不要在生产环境中测试

### 3. 结果分析

```
测试完成后：
1. 查看性能对比表
2. 分析 Token 消耗趋势
3. 检查优化质量评分
4. 阅读推荐结论
5. 根据建议调整
```

---

## 常见问题

### Q: 如何添加新版本？

A:
1. 在 `PromptOptimizerNode.jsx` 中添加新版本配置
2. 更新版本号和变更日志
3. 运行测试验证效果
4. 更新文档

### Q: 测试失败怎么办？

A:
1. 检查 API 配置是否正确
2. 验证版本号是否存在
3. 查看错误日志
4. 参考故障排查章节

### Q: 如何自定义测试用例？

A:
创建 `test-cases/custom.json` 文件，格式参考：
```json
{
  "testCases": [
    {
      "id": "custom-001",
      "input": "你的测试输入",
      "expected": {
        "hasCharacter": false,
        "hasDetail": true
      }
    }
  ]
}
```

---

## 高级用法

### 1. 性能基准测试

```bash
# 运行性能基准测试
/skills prompt-tester --benchmark

# 输出性能报告
# - 平均 Token 消耗
# - 平均响应时间
# - 性能趋势
```

### 2. 回归测试

```bash
# 运行所有版本的回归测试
/skills prompt-tester --all-versions --regression

# 确保所有版本都能正常工作
```

### 3. A/B 测试

```bash
# 对比两个版本
/skills prompt-tester --versions=v1.0,v1.1 --ab-test

# 自动选择最优版本
```

---

## 集成到 CI/CD

### GitHub Actions 示例

```yaml
name: Prompt Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm install
      - name: Run prompt tests
        run: npm run test:prompt:all
      - name: Upload results
        uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: test-results/
```

---

**最后更新**: 2026-01-08
**维护者**: WinJin AIGC Team
