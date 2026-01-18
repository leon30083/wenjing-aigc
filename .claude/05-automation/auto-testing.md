# 自动化测试系统

> **版本**: v1.0.0
> **更新日期**: 2026-01-18
> **核心理念**: 测试自动化，验证智能化

---

## 目录

- [测试架构](#测试架构)
- [测试层级](#测试层级)
- [测试执行](#测试执行)
- [CI/CD 集成](#cicd-集成)
- [测试报告](#测试报告)

---

## 测试架构

### 三层测试金字塔

```
            ┌──────────────────┐
            │   E2E 测试        │  ← MCP Chrome DevTools
            │   (完整工作流)     │     10% 数量，高价值
            ├──────────────────┤
            │   集成测试        │  ← 节点连接测试
            │   (节点交互)       │     30% 数量，中价值
            ├──────────────────┤
            │   单元测试        │  ← 函数级测试
            │   (独立功能)       │     60% 数量，基础价值
            └──────────────────┘
```

### 测试工具栈

| 工具 | 用途 | 层级 |
|------|------|------|
| **MCP Chrome DevTools** | E2E 测试 | E2E |
| **React Testing Library** | 组件测试 | 集成 |
| **Jest** | 单元测试 | 单元 |
| **MSW** | API Mock | 集成 |

---

## 测试层级

### Level 1: 单元测试

**目标**: 测试单个函数/组件

**示例**: 测试提示词优化函数

```javascript
// tests/unit/optimizePrompt.test.js
import { optimizePrompt } from '../src/utils/promptOptimizer';

describe('optimizePrompt', () => {
  test('应该保留角色引用', () => {
    const input = '@test.user 在海边玩耍';
    const output = optimizePrompt(input);
    expect(output).toContain('@test.user');
  });

  test('不应该添加角色外观描述', () => {
    const input = '@test.user 在海边玩耍';
    const output = optimizePrompt(input);
    expect(output).not.toContain('大眼睛');
    expect(output).not.toContain('可爱姿态');
  });

  test('应该优化提示词详细度', () => {
    const input = '一只猫';
    const output = optimizePrompt(input);
    expect(output.length).toBeGreaterThan(input.length);
  });
});
```

**运行**:
```bash
npm run test:unit
```

### Level 2: 集成测试

**目标**: 测试节点间数据传递

**示例**: 测试文本节点 → 优化节点连接

```javascript
// tests/integration/node-connection.test.js
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import App from '../../src/client/src/App';

describe('节点连接测试', () => {
  test('文本节点可以连接到优化节点', async () => {
    render(
      <ReactFlowProvider>
        <App />
      </ReactFlowProvider>
    );

    // 添加文本节点
    const addTextNodeBtn = screen.getByText('文本节点');
    addTextNodeBtn.click();

    // 添加优化节点
    const addOptimizerBtn = screen.getByText('优化节点');
    addOptimizerBtn.click();

    // 连接节点（使用 React Flow API）
    // ...

    // 验证数据传递
    const textNode = getNodeById('text-node-1');
    const optimizerNode = getNodeById('optimizer-node-1');

    textNode.data.value = '测试文本';

    // 触发数据更新
    fireEvent.change(textNode.querySelector('textarea'), {
      target: { value: '测试文本' }
    });

    // 验证优化节点接收到数据
    await waitFor(() => {
      expect(optimizerNode.data.connectedData).toBe('测试文本');
    });
  });
});
```

**运行**:
```bash
npm run test:integration
```

### Level 3: E2E 测试

**目标**: 测试完整工作流

**示例**: 测试视频生成完整流程

```javascript
// tests/e2e/video-generation.e2e.js
import { mcp__chrome_devtools__ } from '@modelcontextprotocol/chrome-devtools';

describe('视频生成 E2E 测试', () => {
  test('完整工作流：文本 → 优化 → 生成', async () => {
    // 1. 打开页面
    await mcp__chrome_devtools__navigate_page({
      type: 'url',
      url: 'http://localhost:5173'
    });

    // 2. 添加文本节点
    await addNode('textNode');
    const snapshot = await mcp__chrome_devtools__take_snapshot();
    const textArea = snapshot.elements.find(e => e.type === 'textbox');

    // 3. 输入提示词
    await mcp__chrome_devtools__fill({
      uid: textArea.uid,
      value: '@test.user 在海边玩耍'
    });

    // 4. 添加优化节点
    await addNode('promptOptimizerNode');
    await connectNodes('textNode', 'promptOptimizerNode');

    // 5. 点击优化按钮
    const optimizeBtn = await findButton('优化');
    await mcp__chrome_devtools__click({ uid: optimizeBtn.uid });

    // 6. 等待优化完成
    await mcp__chrome_devtools__wait_for({
      text: '优化完成',
      timeout: 30000
    });

    // 7. 验证角色引用保留
    const optimizedText = await getOptimizedText();
    expect(optimizedText).toContain('@test.user');

    // 8. 添加视频生成节点
    await addNode('videoGenerateNode');
    await connectNodes('promptOptimizerNode', 'videoGenerateNode');

    // 9. 配置 API
    await configureAPI('JUXIN', 'test-api-key');

    // 10. 点击生成按钮
    const generateBtn = await findButton('生成');
    await mcp__chrome_devtools__click({ uid: generateBtn.uid });

    // 11. 等待生成完成
    await mcp__chrome_devtools__wait_for({
      text: '生成成功',
      timeout: 300000  // 5分钟
    });

    // 12. 验证结果
    const result = await getGenerationResult();
    expect(result.success).toBe(true);
    expect(result.data.taskId).toBeDefined();

    // 13. 截图记录
    await mcp__chrome_devtools__take_screenshot({
      filePath: 'test-results/video-generation-success.png'
    });
  });
});
```

**运行**:
```bash
npm run test:e2e
```

---

## 测试执行

### 本地测试

```bash
# 启动测试环境
npm run test:setup

# 运行所有测试
npm run test:all

# 运行特定层级的测试
npm run test:unit
npm run test:integration
npm run test:e2e

# 运行特定文件
npm run test -- video-generation.test.js

# 监听模式（开发时使用）
npm run test:watch
```

### 测试环境配置

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/**/*.spec.{js,jsx}'
  ],
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

### 测试辅助函数

```javascript
// tests/helpers/nodeHelpers.js
export async function addNode(nodeType) {
  const snapshot = await mcp__chrome_devtools__take_snapshot();
  const addBtn = snapshot.elements.find(e =>
    e.label?.includes('添加节点')
  );
  await mcp__chrome_devtools__click({ uid: addBtn.uid });

  const nodeOption = snapshot.elements.find(e =>
    e.label?.includes(nodeType)
  );
  await mcp__chrome_devtools__click({ uid: nodeOption.uid });
}

export async function connectNodes(sourceType, targetType) {
  // 实现节点连接逻辑
}

export async function configureAPI(platform, apiKey) {
  // 实现 API 配置逻辑
}

export async function findButton(text) {
  const snapshot = await mcp__chrome_devtools__take_snapshot();
  return snapshot.elements.find(e =>
    e.label?.includes(text) || e.role === 'button'
  );
}
```

---

## CI/CD 集成

### GitHub Actions 配置

```yaml
# .github/workflows/test.yml
name: 测试

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: 检出代码
        uses: actions/checkout@v3

      - name: 设置 Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'

      - name: 安装依赖
        run: npm ci

      - name: 运行单元测试
        run: npm run test:unit

      - name: 运行集成测试
        run: npm run test:integration

      - name: 启动开发服务器
        run: |
          npm run server &
          cd src/client && npm run dev &
          npx wait-on http://localhost:5173

      - name: 运行 E2E 测试
        run: npm run test:e2e

      - name: 上传覆盖率报告
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

      - name: 上传测试截图
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: test-screenshots
          path: test-results/
```

### Pre-commit Hook

```javascript
// .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# 运行单元测试
npm run test:unit

# 运行代码检查
npm run lint

# 检查文档
npm run docs:check
```

### Pre-push Hook

```javascript
// .husky/pre-push
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# 运行完整测试套件
npm run test:all

# 生成测试报告
npm run test:report
```

---

## 测试报告

### 覆盖率报告

```bash
# 生成覆盖率报告
npm run test:coverage

# 输出:
# ----------------|---------|----------|---------|---------|-------------------
# File            | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
# ----------------|---------|----------|---------|---------|-------------------
# All files       |   78.5  |   72.3   |   81.2  |   78.5  |
#  src/client/src |   85.2  |   80.1   |   88.5  |   85.2  |
#   nodes/        |   90.1  |   85.3   |   92.1  |   90.1  |
# ----------------|---------|----------|---------|---------|-------------------
```

### 测试结果报告

```bash
# 生成 HTML 报告
npm run test:report

# 打开报告
open coverage/lcov-report/index.html
```

### E2E 测试报告

```javascript
// tests/e2e/reporter.js
const fs = require('fs');
const path = require('path');

class E2EReporter {
  constructor() {
    this.results = [];
    this.screenshots = [];
  }

  addTestResult(testName, status, duration) {
    this.results.push({
      testName,
      status,
      duration,
      timestamp: new Date().toISOString()
    });
  }

  addScreenshot(filePath) {
    this.screenshots.push(filePath);
  }

  generateReport() {
    const report = {
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.status === 'passed').length,
        failed: this.results.filter(r => r.status === 'failed').length,
        skipped: this.results.filter(r => r.status === 'skipped').length
      },
      tests: this.results,
      screenshots: this.screenshots
    };

    fs.writeFileSync(
      path.join(__dirname, '../../test-results/e2e-report.json'),
      JSON.stringify(report, null, 2)
    );

    return report;
  }
}

module.exports = E2EReporter;
```

### 测试趋势分析

```javascript
// scripts/test-trends.js
const fs = require('fs');
const path = require('path');

function analyzeTestTrends() {
  const resultsDir = path.join(__dirname, '../test-results');
  const files = fs.readdirSync(resultsDir)
    .filter(f => f.endsWith('.json'))
    .sort();

  const trends = files.map(file => {
    const data = JSON.parse(
      fs.readFileSync(path.join(resultsDir, file), 'utf8')
    );
    return {
      date: file.replace('.json', ''),
      passRate: (data.summary.passed / data.summary.total * 100).toFixed(2),
      duration: data.summary.duration
    };
  });

  console.table(trends);

  return trends;
}

analyzeTestTrends();
```

---

## 最佳实践

### 1. 测试命名

```javascript
// ✅ 正确：清晰的测试名称
test('应该保留角色引用格式', () => {
  // ...
});

test('当缺少 API 配置时应该返回错误', () => {
  // ...
});

// ❌ 错误：模糊的测试名称
test('测试1', () => {
  // ...
});
```

### 2. 测试隔离

```javascript
// ✅ 正确：每个测试独立
test('测试场景 A', async () => {
  await setupTestData();
  // 执行测试
  await cleanupTestData();
});

test('测试场景 B', async () => {
  await setupTestData();
  // 执行测试
  await cleanupTestData();
});

// ❌ 错误：测试相互依赖
let sharedData;

test('测试 A', () => {
  sharedData = 'something';
});

test('测试 B', () => {
  // 依赖 sharedData
});
```

### 3. 等待策略

```javascript
// ✅ 正确：明确的等待
await waitFor(() => {
  expect(screen.getByText('完成')).toBeInTheDocument();
});

// ❌ 错误：固定延迟
await sleep(5000);
```

### 4. Mock 外部依赖

```javascript
// ✅ 正确：Mock API 调用
jest.mock('../src/utils/api', () => ({
  generateVideo: jest.fn(() =>
    Promise.resolve({ success: true, data: { taskId: '123' } })
  )
}));

// ❌ 错误：使用真实 API
const result = await realApiCall();  // 慢且不稳定
```

---

## 参考文档

- [MCP 集成](./mcp-integration.md)
- [测试自动化](../02-methodology/testing-automation.md)
- [持续学习](./continuous-learning.md)
- [自动化架构](./automation-architecture.md)

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
**版本**: v1.0.0
