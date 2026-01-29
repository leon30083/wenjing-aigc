# MCP 测试自动化

> **版本**: v1.0.0
> **更新日期**: 2026-01-18
> **核心理念**: 自动化优先，人工验证辅助

---

## 目录

- [测试优先级](#测试优先级)
- [MCP Chrome DevTools 测试](#mcp-chrome-devtools-测试)
- [测试流程](#测试流程)
- [测试检查清单](#测试检查清单)
- [常见测试场景](#常见测试场景)
- [错误处理](#错误处理)

---

## 测试优先级

### 自动化优先 ⭐⭐⭐

**原则**: 能自动化的就不要手动

```javascript
// ✅ 正确：使用 MCP 自动测试
async function testVideoGenerate() {
  await page.goto('http://localhost:5173');
  await addNode('videoGenerate');
  await fill('textarea', '测试提示词');
  await click('button:has-text("生成")');
  await waitFor('[data-status="success"]');
  await takeScreenshot();
}

// ❌ 错误：每次都问用户"能否测试"
// 这会打断开发流程
```

### 测试层级

```
┌─────────────────────────────────────┐
│  E2E 测试 (MCP Chrome DevTools)    │  ← 完整工作流
├─────────────────────────────────────┤
│  集成测试 (节点连接、数据传递)       │  ← 节点交互
├─────────────────────────────────────┤
│  单元测试 (单个节点功能)            │  ← 独立功能
└─────────────────────────────────────┘
```

---

## MCP Chrome DevTools 测试

### 启动测试环境

```bash
# 终端 1：启动后端服务器
npm run server

# 终端 2：启动流式画布
cd src/client
npm run dev
```

访问 `http://localhost:5173`

### MCP 工具使用

#### 1. 页面操作

```javascript
// 打开页面
await mcp__chrome_devtools__navigate_page({
  type: 'url',
  url: 'http://localhost:5173'
});

// 刷新页面（忽略缓存）
await mcp__chrome_devtools__navigate_page({
  type: 'reload',
  ignoreCache: true
});
```

#### 2. 获取页面快照

```javascript
// 获取页面快照（推荐）
const snapshot = await mcp__chrome_devtools__take_snapshot({
  verbose: false
});

// 分析快照中的元素
const textArea = snapshot.elements.find(e =>
  e.type === 'textbox' && e.label?.includes('提示词')
);
```

#### 3. 交互操作

```javascript
// 填充输入框
await mcp__chrome_devtools__fill({
  uid: textArea.uid,
  value: '一只猫在睡觉'
});

// 点击按钮
await mcp__chrome_devtools__click({
  uid: buttonUid
});

// 悬停元素
await mcp__chrome_devtools__hover({
  uid: elementUid
});
```

#### 4. 截图验证

```javascript
// 整页截图
await mcp__chrome_devtools__take_screenshot({
  format: 'png',
  fullPage: true
});

// 元素截图
await mcp__chrome_devtools__take_screenshot({
  format: 'png',
  uid: nodeUid
});
```

#### 5. 等待条件

```javascript
// 等待文本出现
await mcp__chrome_devtools__wait_for({
  text: '生成成功',
  timeout: 60000
});

// 等待选择器（通过 JavaScript）
await mcp__chrome_devtools__evaluate_script({
  function: `() => {
    return document.querySelector('[data-status="success"]') !== null;
  }`
});
```

#### 6. 控制台检查

```javascript
// 列出控制台消息
const messages = await mcp__chrome_devtools__list_console_messages({
  types: ['error', 'warn']  // 只查看错误和警告
});

// 检查是否有错误
const hasErrors = messages.some(m => m.type === 'error');
if (hasErrors) {
  console.error('发现控制台错误:', messages);
}
```

#### 7. 网络请求检查

```javascript
// 列出网络请求
const requests = await mcp__chrome_devtools__list_network_requests({
  resourceTypes: ['fetch', 'xhr']
});

// 检查 API 请求
const apiRequests = requests.filter(r =>
  r.url.includes('/api/')
);

// 查看请求详情
const request = await mcp__chrome_devtools__get_network_request({
  reqid: apiRequests[0].reqId
});
```

---

## 测试流程

### 完整测试流程

```
1. 启动环境
   ├─ 后端服务器 (9000)
   └─ 流式画布 (5173)

2. 打开页面
   └─ navigate_page → http://localhost:5173

3. 基础验证
   ├─ take_snapshot → 检查页面结构
   ├─ list_console_messages → 检查无错误
   └─ take_screenshot → 记录初始状态

4. 功能测试
   ├─ add_node → 添加节点
   ├─ fill → 填充数据
   ├─ click → 触发操作
   └─ wait_for → 等待结果

5. 结果验证
   ├─ take_screenshot → 视觉验证
   ├─ list_console_messages → 无错误
   ├─ list_network_requests → API 调用正确
   └─ evaluate_script → 数据验证

6. 清理环境
   └─ close_page 或 navigate_page (刷新)
```

### 示例：测试视频生成节点

```javascript
async function testVideoGenerateNode() {
  // 1. 打开页面
  await mcp__chrome_devtools__navigate_page({
    type: 'url',
    url: 'http://localhost:5173'
  });

  // 2. 获取快照
  const snapshot = await mcp__chrome_devtools__take_snapshot();

  // 3. 找到"添加节点"按钮
  const addButton = snapshot.elements.find(e =>
    e.label?.includes('添加') || e.description?.includes('添加')
  );

  // 4. 点击添加节点
  await mcp__chrome_devtools__click({ uid: addButton.uid });

  // 5. 选择视频生成节点
  const videoOption = snapshot.elements.find(e =>
    e.label?.includes('视频生成') || e.name === 'videoGenerateNode'
  );
  await mcp__chrome_devtools__click({ uid: videoOption.uid });

  // 6. 填充提示词
  const promptInput = snapshot.elements.find(e =>
    e.type === 'textbox'
  );
  await mcp__chrome_devtools__fill({
    uid: promptInput.uid,
    value: '一只猫在睡觉'
  });

  // 7. 点击生成按钮
  const generateButton = snapshot.elements.find(e =>
    e.label?.includes('生成') || e.role === 'button'
  );
  await mcp__chrome_devtools__click({ uid: generateButton.uid });

  // 8. 等待生成完成
  await mcp__chrome_devtools__wait_for({
    text: '生成成功',
    timeout: 120000  // 2分钟超时
  });

  // 9. 验证结果
  const finalSnapshot = await mcp__chrome_devtools__take_snapshot();
  const hasResult = finalSnapshot.elements.some(e =>
    e.label?.includes('任务ID') || e.label?.includes('视频URL')
  );

  // 10. 截图记录
  await mcp__chrome_devtools__take_screenshot({
    filePath: 'test-results/video-generate-success.png'
  });

  return hasResult;
}
```

---

## 测试检查清单

### 节点测试

- [ ] 节点正确渲染
- [ ] Handle 正确显示
- [ ] 输入框响应
- [ ] 按钮点击响应
- [ ] 数据更新正确
- [ ] 错误处理正确

### 连接测试

- [ ] 节点可以连接
- [ ] 数据正确传递
- [ ] Handle 类型匹配
- [ ] 断开连接正确

### 工作流测试

- [ ] 单节点执行
- [ ] 两节点连接执行
- [ ] 多节点工作流执行
- [ ] 错误时停止执行
- [ ] 工作流保存/加载

### API 测试

- [ ] API 端点正确（/api/ 前缀）
- [ ] 双平台兼容
- [ ] 错误处理正确
- [ ] 轮询间隔正确（≥30秒）

### UI 测试

- [ ] 页面加载无错误
- [ ] 样式正确显示
- [ ] 响应式布局
- [ ] 交互元素可用

---

## 常见测试场景

### 场景 1: 测试文本节点

```javascript
async function testTextNode() {
  // 1. 打开页面
  await navigateToPage();

  // 2. 添加文本节点
  await addNode('textNode');

  // 3. 填充文本
  const textarea = await findElement('textbox');
  await fillElement(textarea, '测试文本内容');

  // 4. 验证数据更新
  const value = await evaluateScript(`
    () => {
      const nodes = window.getNodes();
      return nodes.find(n => n.type === 'textNode')?.data?.value;
    }
  `);

  console.assert(value === '测试文本内容', '文本更新失败');

  // 5. 截图
  await takeScreenshot('test-results/text-node.png');
}
```

### 场景 2: 测试节点连接

```javascript
async function testNodeConnection() {
  // 1. 添加两个节点
  await addNode('textNode');
  await addNode('videoGenerateNode');

  // 2. 连接节点
  await connectNodes('textNode', 'videoGenerateNode');

  // 3. 验证连接
  const isConnected = await evaluateScript(`
    () => {
      const edges = window.getEdges();
      return edges.some(e =>
        e.source.includes('textNode') &&
        e.target.includes('videoGenerateNode')
      );
    }
  `);

  console.assert(isConnected, '节点连接失败');

  // 4. 验证数据传递
  const targetData = await evaluateScript(`
    () => {
      const nodes = window.getNodes();
      return nodes.find(n => n.type === 'videoGenerateNode')?.data?.connectedData;
    }
  `);

  console.assert(targetData !== undefined, '数据传递失败');

  // 5. 截图
  await takeScreenshot('test-results/node-connection.png');
}
```

### 场景 3: 测试角色选择

```javascript
async function testCharacterSelection() {
  // 1. 添加角色库节点
  await addNode('characterLibraryNode');

  // 2. 等待角色加载
  await waitFor('角色库');

  // 3. 选择角色
  const characterCheckbox = await findElement('[data-character-id="test-id"]');
  await clickElement(characterCheckbox);

  // 4. 验证选中状态
  const selected = await evaluateScript(`
    () => {
      const nodes = window.getNodes();
      return nodes.find(n => n.type === 'characterLibraryNode')?.data?.selectedCharacters;
    }
  `);

  console.assert(selected.length > 0, '角色选择失败');

  // 5. 截图
  await takeScreenshot('test-results/character-selection.png');
}
```

### 场景 4: 测试提示词优化

```javascript
async function testPromptOptimizer() {
  // 1. 添加文本节点和优化节点
  await addNode('textNode');
  await addNode('promptOptimizerNode');
  await connectNodes('textNode', 'promptOptimizerNode');

  // 2. 输入简单提示词
  const textarea = await findElement('textbox');
  await fillElement(textarea, '@test.user 在海边玩耍');

  // 3. 点击优化按钮
  const optimizeButton = await findElement('button:has-text("优化")');
  await clickElement(optimizeButton);

  // 4. 等待优化完成
  await waitFor('优化完成', { timeout: 30000 });

  // 5. 验证角色引用保留
  const optimizedPrompt = await evaluateScript(`
    () => {
      const nodes = window.getNodes();
      return nodes.find(n => n.type === 'promptOptimizerNode')?.data?.optimizedPrompt;
    }
  `);

  console.assert(
    optimizedPrompt.includes('@test.user'),
    '角色引用丢失'
  );

  // 6. 验证无外观描述
  console.assert(
    !optimizedPrompt.includes('大眼睛') &&
    !optimizedPrompt.includes('可爱姿态'),
    '不应该描述角色外观'
  );

  // 7. 截图
  await takeScreenshot('test-results/prompt-optimizer.png');
}
```

### 场景 5: 测试错误处理

```javascript
async function testErrorHandling() {
  // 1. 测试 API 配置缺失
  await addNode('videoGenerateNode');
  await fillElement(await findElement('textbox'), '测试提示词');
  await clickElement(await findElement('button:has-text("生成")'));

  // 2. 等待错误提示
  await waitFor('请先配置 API', { timeout: 5000 });

  // 3. 验证错误样式
  const hasError = await evaluateScript(`
    () => {
      return document.querySelector('[data-status="error"]') !== null;
    }
  `);

  console.assert(hasError, '错误状态未显示');

  // 4. 检查控制台错误
  const consoleErrors = await listConsoleMessages(['error']);
  console.log('控制台错误:', consoleErrors);

  // 5. 截图
  await takeScreenshot('test-results/error-handling.png');
}
```

---

## 错误处理

### 常见错误

#### 错误 1: 元素未找到

```javascript
// ❌ 错误：直接操作
await clickElement(button);

// ✅ 正确：先验证存在
const snapshot = await mcp__chrome_devtools__take_snapshot();
const button = snapshot.elements.find(e => e.label?.includes('生成'));

if (!button) {
  console.error('按钮未找到');
  await takeScreenshot('test-results/button-not-found.png');
  return;
}

await clickElement(button);
```

#### 错误 2: 超时处理

```javascript
// ✅ 正确：设置合理超时
try {
  await mcp__chrome_devtools__wait_for({
    text: '生成成功',
    timeout: 120000  // Sora2 生成需要 3-5 分钟
  });
} catch (error) {
  console.error('等待超时:', error);
  await takeScreenshot('test-results/timeout.png');

  // 检查网络请求
  const requests = await mcp__chrome_devtools__list_network_requests();
  console.log('网络请求:', requests);
}
```

#### 错误 3: 控制台错误

```javascript
// ✅ 正确：定期检查控制台
const messages = await mcp__chrome_devtools__list_console_messages({
  types: ['error']
});

if (messages.length > 0) {
  console.error('发现控制台错误:');
  messages.forEach(msg => console.error(msg));

  // 获取详细错误信息
  for (const msg of messages) {
    const detail = await mcp__chrome_devtools__get_console_message({
      msgid: msg.msgId
    });
    console.error('错误详情:', detail);
  }

  throw new Error('控制台有错误，测试失败');
}
```

#### 错误 4: 页面崩溃

```javascript
// ✅ 正确：检测页面状态
const isPageAlive = await mcp__chrome_devtools__evaluate_script({
  function: `() => {
    return document.readyState === 'complete';
  }`
});

if (!isPageAlive) {
  console.error('页面未正常加载');
  await mcp__chrome_devtools__navigate_page({
    type: 'reload'
  });
}
```

---

## 最佳实践

### 1. 测试独立性

每个测试应该独立运行，不依赖其他测试的状态。

```javascript
// ✅ 正确：每个测试前重置状态
async function testScenario() {
  await mcp__chrome_devtools__navigate_page({
    type: 'reload',
    ignoreCache: true
  });

  // 执行测试...
}
```

### 2. 等待策略

```javascript
// ❌ 错误：固定延迟
await sleep(5000);

// ✅ 正确：等待条件
await waitForElement('[data-status="success"]');
```

### 3. 断言验证

```javascript
// ✅ 正确：明确断言
const result = await getTestData();
console.assert(
  result.success === true,
  `期望成功，实际: ${result.success}`
);
console.assert(
  result.data !== undefined,
  `期望有数据，实际: undefined`
);
```

### 4. 失败截图

```javascript
// ✅ 正确：失败时截图
try {
  await testFunction();
} catch (error) {
  await takeScreenshot(`test-results/failure-${Date.now()}.png`);
  throw error;
}
```

---

## 参考文档

- [MCP Chrome DevTools 文档](https://modelcontextprotocol.io/tools/chrome-devtools)
- [React Flow 测试指南](https://reactflow.dev/learn/troubleshooting)
- [错误模式库](../04-error-patterns/errors-by-type.md)
- [开发流程](./development-flow.md)

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
**版本**: v1.0.0
