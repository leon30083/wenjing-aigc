# Prompt Tester Skill

> **版本**: v1.0.0
> **更新日期**: 2026-01-08
> **作者**: WinJin AIGC Team

---

## 技能描述

自动化测试提示词的性能和质量，支持批量测试多个版本并生成对比报告。

---

## 核心功能

### 1. 批量测试

同时测试多个提示词版本，对比：
- Token 消耗
- 优化效果
- 响应时间
- 输出质量

### 2. 性能对比

生成详细的性能对比报告：
- Token 使用统计
- 优化前后对比
- 性能指标趋势

### 3. 质量评估

自动评估提示词质量：
- 角色引用是否保留
- 描述是否详细
- 格式是否规范

### 4. 推荐系统

基于测试结果，推荐最优版本。

---

## 使用方式

### 基本用法

```bash
/skills prompt-tester --versions=v1.0,v1.1,v1.2
```

### 高级用法

```bash
# 指定基准版本
/skills prompt-tester --versions=v1.0,v1.1 --baseline=v1.0

# 导出报告
/skills prompt-tester --versions=v1.0,v1.1 --export=markdown

# 自定义测试输入
/skills prompt-tester --versions=v1.0 --input="一只猫在睡觉"
```

---

## 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--versions` | string | 是 | 要测试的版本号列表（逗号分隔） |
| `--baseline` | string | 否 | 指定基准版本用于对比 |
| `--export` | string | 否 | 导出格式（json/csv/markdown） |
| `--input` | string | 否 | 自定义测试输入 |

---

## 测试流程

```
1. 准备阶段
   ├─ 读取版本配置
   ├─ 验证版本存在
   └─ 准备测试用例

2. 执行阶段
   ├─ 并行测试所有版本
   ├─ 记录性能指标
   └─ 保存测试结果

3. 分析阶段
   ├─ Token 消耗对比
   ├─ 优化效果评估
   ├─ 质量评分
   └─ 生成推荐

4. 报告阶段
   ├─ 生成对比报告
   ├─ 导出数据
   └─ 显示推荐
```

---

## 测试用例

### 默认测试用例

```javascript
const defaultTestCases = [
  {
    id: 'test-001',
    input: '一只可爱的猫咪在睡觉',
    expected: {
      hasCharacter: false,
      hasDetail: true,
      hasStyle: true
    }
  },
  {
    id: 'test-002',
    input: '@test.user 在海边玩耍',
    expected: {
      hasCharacter: true,
      hasCharacterRef: true,
      noAppearanceDescription: true
    }
  },
  {
    id: 'test-003',
    input: '老鹰在山上飞翔',
    expected: {
      hasDetail: true,
      hasCinematography: true
    }
  }
];
```

---

## 报告格式

### Markdown 报告

```markdown
# 提示词测试报告

**测试时间**: 2026-01-08 10:00:00
**测试版本**: v1.0, v1.1, v1.2
**基准版本**: v1.0

---

## 性能对比

| 版本 | Token 消耗 | 响应时间 | 优化质量 | 综合评分 |
|------|-----------|---------|---------|---------|
| v1.0 | 778 | 3.2s | ⭐⭐⭐⭐ | 8.5/10 |
| v1.1 | 650 | 2.8s | ⭐⭐⭐⭐⭐ | 9.2/10 |
| v1.2 | 820 | 3.5s | ⭐⭐⭐ | 7.8/10 |

---

## 详细分析

### v1.0（基准版本）

**优点**:
- Token 消耗适中
- 优化质量稳定

**缺点**:
- 响应时间较长
- 缺少动画风格支持

### v1.1（推荐版本）⭐

**优点**:
- Token 消耗最低（-16%）
- 响应时间最快（-13%）
- 优化质量最高

**缺点**:
- 无明显缺点

**推荐理由**: v1.1 在所有指标上表现最优

### v1.2

**优点**:
- 支持更多风格

**缺点**:
- Token 消耗增加（+5%）
- 响应时间变慢（+9%）
- 优化质量下降

---

## 推荐

**最优版本**: v1.1

**建议**:
- ✅ 使用 v1.1 作为生产环境版本
- ✅ 继续优化 v1.2 的 Token 消耗
- ✅ 添加更多测试用例验证稳定性
```

---

## 集成方式

### 与项目集成

1. **版本配置存储**
   ```javascript
   // src/client/src/nodes/process/PromptOptimizerNode.jsx
   const PROMPT_VERSIONS = {
     'v1.0': {
       systemPrompt: '...',
       userPrompt: '...',
       changelog: '初始版本'
     },
     'v1.1': {
       systemPrompt: '...',
       userPrompt: '...',
       changelog: '优化 Token 使用'
     }
   };
   ```

2. **测试脚本调用**
   ```bash
   # package.json
   {
     "scripts": {
       "test:prompt": "node scripts/test-prompt.js",
       "test:prompt:all": "node scripts/test-prompt.js --all"
     }
   }
   ```

3. **报告生成**
   ```bash
   npm run generate:report
   # 生成 test-results/report.html
   ```

---

## 注意事项

1. **API 消耗**: 测试会消耗 API 调用次数，注意控制测试频率
2. **版本管理**: 确保版本号清晰，便于追踪
3. **基准选择**: 选择稳定的版本作为基准
4. **测试覆盖**: 使用多样化的测试用例
5. **结果验证**: 自动测试后需要人工验证结果

---

## 故障排查

### 问题 1: 找不到版本

**原因**: 版本号不存在或配置错误

**解决方案**:
```bash
# 检查可用版本
/skills prompt-tester --list-versions

# 验证版本配置
cat src/client/src/nodes/process/PromptOptimizerNode.jsx | grep "PROMPT_VERSIONS"
```

### 问题 2: API 调用失败

**原因**: API Key 未配置或已过期

**解决方案**:
```bash
# 检查环境变量
echo $OPENAI_API_KEY

# 重新配置
# 在 .env 文件中添加正确的 API Key
```

### 问题 3: Token 计数不准确

**原因**: Token 计算器版本不匹配

**解决方案**:
```bash
# 更新 Token 计数器
npm install tiktoken --save-dev
```

---

## 扩展功能

### 自定义测试用例

```javascript
// test-cases/custom.json
{
  "testCases": [
    {
      "id": "custom-001",
      "input": "自定义测试输入",
      "expected": {
        "hasCharacter": false,
        "hasDetail": true
      }
    }
  ]
}
```

### 性能基准

```javascript
// performance/benchmark.json
{
  "benchmarks": {
    "tokenLimit": 4000,
    "maxResponseTime": 5000,
    "minQualityScore": 8.0
  }
}
```

---

**最后更新**: 2026-01-08
**维护者**: WinJin AIGC Team
**版本**: v1.0.0
