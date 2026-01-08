# 提示词优化模块规则

> **路径匹配**: `src/client/src/nodes/process/PromptOptimizerNode.jsx`
> **版本**: v1.0.0
> **更新日期**: 2026-01-08

---

## 模块说明

本规则适用于 **PromptOptimizerNode**（提示词优化节点），该节点负责使用 AI 将简单描述优化成详细的 Sora2 视频生成提示词。

---

## 开发约束

### 1. 版本管理 ⭐ 强制

每次修改提示词优化逻辑时，**必须**：

- ✅ 更新版本号（语义化版本：v1.0.0 → v1.0.1）
- ✅ 记录变更说明（在 CHANGELOG.md 或节点注释中）
- ✅ 更新日期

```javascript
// ✅ 正确：版本信息清晰
const PROMPT_VERSION = 'v1.2.0';
const VERSION_INFO = '添加动画风格支持 - 2026-01-08';

// ❌ 错误：没有版本信息
const systemPrompt = '你是视频提示词专家...';
```

### 2. 性能指标追踪

每次优化必须记录：

```javascript
const metrics = {
  version: 'v1.2.0',
  timestamp: new Date().toISOString(),
  inputLength: prompt.length,
  outputLength: optimizedPrompt.length,
  tokenCount: tokensUsed,
  duration: responseTime,
  style: selectedStyle
};
```

### 3. A/B 测试支持

修改优化逻辑时，**必须**保留旧版本：

```javascript
// ✅ 正确：支持多版本对比
const SYSTEM_PROMPTS = {
  'v1.0': '...旧版本提示词...',
  'v1.1': '...新版本提示词...',
  'v1.2': '...最新版本提示词...'
};

const systemPrompt = SYSTEM_PROMPTS[selectedVersion];

// ❌ 错误：直接覆盖，无法回滚
const systemPrompt = '...新提示词...';
```

---

## 禁止操作

### ❌ 禁止直接修改生产环境提示词

```javascript
// ❌ 错误：直接硬编码
const systemPrompt = `你是专家...`;

// ✅ 正确：从配置读取
const systemPrompt = SYSTEM_PROMPTS[version] || SYSTEM_PROMPTS['default'];
```

### ❌ 禁止跳过版本号和变更日志

```javascript
// ❌ 错误：没有版本信息
function optimizePrompt(prompt) {
  // ... 优化逻辑
}

// ✅ 正确：清晰的版本信息
/**
 * 优化提示词
 * @version v1.2.0
 * @changelog 添加动画风格支持
 */
function optimizePrompt(prompt, version = 'v1.2.0') {
  const systemPrompt = SYSTEM_PROMPTS[version];
  // ... 优化逻辑
}
```

### ❌ 禁止未经测试直接提交

- ✅ 至少测试 2 个版本
- ✅ 生成对比报告
- ✅ 验证 Token 消耗合理
- ✅ 确认优化效果符合预期

---

## 自动化流程

### 检测到提示词修改时自动执行

当修改 `src/client/src/nodes/process/PromptOptimizerNode.jsx` 时，自动：

1. **Token 计数检查**
   ```javascript
   const tokenCount = estimateTokens(systemPrompt);
   if (tokenCount > 4000) {
     console.warn(`⚠️ 系统提示词过长: ${tokenCount} tokens`);
   }
   ```

2. **敏感词过滤**
   ```javascript
   const sensitiveWords = ['API_KEY', 'SECRET', 'PASSWORD'];
   const hasSensitiveWord = sensitiveWords.some(word =>
     systemPrompt.includes(word)
   );
   if (hasSensitiveWord) {
     throw new Error('❌ 提示词包含敏感词！');
   }
   ```

3. **格式规范验证**
   ```javascript
   // 必须包含版本号
   const hasVersion = /v\d+\.\d+\.\d+/.test(version);
   if (!hasVersion) {
     console.error('❌ 缺少版本号！');
   }

   // 必须包含日期
   const hasDate = /\d{4}-\d{2}-\d{2}/test(versionInfo);
   if (!hasDate) {
     console.error('❌ 缺少更新日期！');
   }
   ```

4. **生成测试用例**
   ```javascript
   // 自动生成测试输入
   const testCases = [
     '一只猫在睡觉',
     '海边日落',
     '角色在工地上干活'
   ];

   console.log('📝 建议测试用例：');
   testCases.forEach((input, i) => {
     console.log(`${i + 1}. "${input}"`);
   });
   ```

---

## 角色引用处理规范

### 核心原则 ⭐ 重要

使用角色引用时，Sora2 会使用角色的真实外观，**不需要描述角色长相**。

### ❌ 错误做法

```javascript
// 错误：描述角色外观，丢失角色引用
const prompt = `
卡通风格的绘本动画。

角色设计：
所有角色均采用拟人化设计，拥有大而闪亮的眼睛、友好的微笑表情和可爱的姿态，充满童趣和亲和力。

场景：
一片阳光明媚、沙滩柔软、海水湛蓝的卡通海边。
`;
// 问题：角色引用丢失，AI 不知道使用哪个角色
```

### ✅ 正确做法

```javascript
// 正确：保留角色引用，不描述外观
const prompt = `
卡通风格的绘本动画。

场景：一片阳光明媚、沙滩柔软、海水湛蓝的卡通海边。环境高度简化，背景有几朵棉花。

核心动作：@ebfb9a758.sunnykitte 在海边玩耍，充满好奇和喜悦地探索。

细节与氛围：
- 阳光温柔地洒在海浪和沙滩上
- 整体氛围温暖、友好，充满着纯真的好奇与发现
`;
// ✅ 保留角色引用，不描述长相（Sora2 会使用角色真实外观）
```

### 关键规则

1. **必须保留角色引用**: 优化后的提示词必须包含 `@ebfb9a758.sunnykitte` 格式的引用
2. **不描述外观**: 不需要描述"大眼睛、微笑表情、可爱姿态"等
3. **只描述活动**: 重点描述角色在场景中的动作、互动、位置、情绪
4. **使用真实ID**: `@ebfb9a758.sunnykitte`（真实ID），而非 `@测试小猫`（别名）

### 双显示功能差异

| 节点类型 | 输入框显示 | API使用 | 说明 |
|---------|----------|---------|------|
| **优化节点** | 真实ID<br/>`@ebfb9a758.sunnykitte` | 真实ID | 发送给AI，必须使用真实ID |
| **视频生成节点** | 别名<br/>`@测试小猫` | 真实ID | 用户友好，API使用真实ID |
| **角色库节点** | 别名+ID<br/>`测试小猫 (@ebfb9a758.sunnykitte)` | 真实ID | 点击插入真实ID |

---

## 风格支持规范

### 当前支持的样式

| 风格 | 状态 | 系统提示词 | 用户提示词 |
|------|------|-----------|-----------|
| `picture-book` | ✅ 完整支持 | 详细实现 | 专用实现 |
| `documentary` | ⚠️ 基础支持 | 通用提示词 | 通用提示词 |
| `animation` | ⚠️ 基础支持 | 通用提示词 | 通用提示词 |
| `cinematic` | ⚠️ 基础支持 | 通用提示词 | 通用提示词 |

### 扩展新风格

添加新风格时，**必须**：

1. 创建详细的系统提示词（参考 `picture-book`）
2. 创建专用的用户提示词模板
3. 添加测试用例
4. 更新版本号
5. 更新文档

```javascript
// ✅ 正确：扩展新风格
const SYSTEM_PROMPTS = {
  'picture-book': `...详细的绘本风格提示词...`,
  'documentary': `...详细的纪录片风格提示词...`,  // 新增
  'default': `...通用提示词...`
};
```

---

## 错误处理

### 必须处理的错误

```javascript
// 1. API 调用失败
try {
  const response = await callOpenAI(prompt);
  return response;
} catch (error) {
  if (error.code === 'rate_limit') {
    // 速率限制处理
    return { success: false, error: 'API 调用过于频繁，请稍后重试' };
  } else if (error.code === 'context_length_exceeded') {
    // Token 超限处理
    return { success: false, error: '提示词过长，请简化后重试' };
  }
  throw error;
}

// 2. 输入验证
if (!prompt || prompt.trim().length === 0) {
  return { success: false, error: '请输入提示词' };
}

if (prompt.length > 500) {
  return { success: false, error: '提示词过长，请保持在 500 字以内' };
}

// 3. 配置验证
if (!openaiConfig || !openaiConfig.apiKey) {
  return { success: false, error: '请先配置 OpenAI API' };
}
```

---

## 性能优化

### Token 使用优化

```javascript
// ✅ 缓存相同输入的结果
const cache = new Map();

async function optimizePrompt(prompt, version) {
  const cacheKey = `${prompt}-${version}`;

  if (cache.has(cacheKey)) {
    console.log('✅ 使用缓存结果');
    return cache.get(cacheKey);
  }

  const result = await callOpenAI(prompt);
  cache.set(cacheKey, result);
  return result;
}
```

### 请求优化

```javascript
// ✅ 添加超时和重试
const response = await axios.post(url, data, {
  timeout: 30000,  // 30 秒超时
  maxRetries: 2,   // 最多重试 2 次
  retryDelay: 1000  // 重试间隔 1 秒
});
```

---

## 测试规范

### 单元测试

```javascript
describe('PromptOptimizer', () => {
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

  test('Token 计数应该合理', () => {
    const prompt = buildSystemPrompt('picture-book');
    const tokens = estimateTokens(prompt);
    expect(tokens).toBeLessThan(4000);
  });
});
```

### 集成测试

```javascript
// 使用 MCP Chrome DevTools 测试
async function testPromptOptimizer() {
  // 1. 打开页面
  await page.goto('http://localhost:5173');

  // 2. 添加 PromptOptimizerNode
  await addNode('promptOptimizer');

  // 3. 连接 TextNode
  await connectNodes('textNode', 'promptOptimizer');

  // 4. 输入测试提示词
  await fill('textarea', '@test.user 在海边玩耍');

  // 5. 点击优化按钮
  await click('button:has-text("优化提示词")');

  // 6. 等待结果
  await waitFor('[data-status="success"]');

  // 7. 验证结果
  const output = await getText('[data-result]');
  expect(output).toContain('@test.user');
}
```

---

## 文档更新

修改此模块后，**必须**更新以下文档：

1. `.claude/skills/winjin-dev/SKILL.md` - 添加新的错误模式
2. `.claude/rules/code.md` - 添加代码示例
3. `.claude/rules/error-patterns.md` - 记录新发现的错误
4. `用户输入文件夹/开发对话/开发交接书.md` - 更新版本号

---

## 常见问题

### Q: 如何添加新的优化风格？

A:
1. 在 `SYSTEM_PROMPTS` 中添加新风格的系统提示词
2. 在 `USER_PROMPTS` 中添加对应的用户提示词模板
3. 更新版本号
4. 添加测试用例
5. 更新文档

### Q: 如何测试优化效果？

A: 使用 `/skills prompt-tester --versions=v1.0,v1.1` 自动测试多个版本

### Q: Token 超限怎么办？

A:
1. 启用 Plan Mode 分析提示词
2. 简化系统提示词
3. 减少示例数量
4. 使用更简洁的表达方式

---

**最后更新**: 2026-01-08
**维护者**: WinJin AIGC Team
**版本**: v1.0.0
