# 文档编写标准

> **版本**: v1.0.0
> **更新日期**: 2026-01-18
> **核心理念**: 文档是代码的一部分

---

## 目录

- [文档原则](#文档原则)
- [文档结构](#文档结构)
- [编写规范](#编写规范)
- [更新流程](#更新流程)
- [质量检查](#质量检查)

---

## 文档原则

### 1. 文档优先 ⭐

**核心理念**: "代码是暂时的，文档是永久的"

```javascript
// ❌ 错误：先写代码，后补文档
function videoGenerate(prompt) {
  // 实现代码...
  // 几个月后才补文档（可能遗漏细节）
}

// ✅ 正确：先写文档，后写代码
/**
 * @function videoGenerate
 * @description 生成 Sora2 视频
 * @param {string} prompt - 视频提示词
 * @param {Object} options - 生成选项
 * @param {string} options.platform - 平台类型 ('JUXIN' | 'ZHENZHEN')
 * @returns {Promise<Object>} { success, data, error }
 * @throws {Error} API 配置缺失时抛出
 * @example
 * const result = await videoGenerate('一只猫在睡觉', { platform: 'JUXIN' });
 */
async function videoGenerate(prompt, options = {}) {
  // 根据文档实现代码...
}
```

### 2. 单一事实来源

**原则**: 每个概念只在一个地方详细说明，其他地方引用链接。

```
❌ 错误：重复说明
├── base.md (说明双平台差异)
├── code.md (再次说明双平台差异)
└── error-patterns/ (又说明一次)

✅ 正确：单一来源 + 引用
├── 01-fundamentals/api-platforms.md (详细说明) ⭐ 唯一来源
├── 03-node-development/node-architecture.md (引用 api-platforms.md)
└── rules/error-patterns/ (引用 api-platforms.md)
```

### 3. 保持同步

**原则**: 代码和文档必须同步更新

```bash
# 开发流程
1. Plan   → 分析需求，查阅文档
2. Code   → 编写代码，更新文档
3. Update → 同步代码和文档

# ❌ 错误：只更新代码
git commit -m "feat: 添加新功能"
# 忘记更新文档

# ✅ 正确：同时更新
git add .claude/rules/new-feature.md src/new-feature.js
git commit -m "feat: 添加新功能和文档"
```

---

## 文档结构

### 6 层文档架构

```
.claude/
├── 00-philosophy/         # 哲学层 - 核心理念
│   ├── glue-programming.md
│   ├── strong-constraints.md
│   ├── blood-lessons.md
│   └── README.md
│
├── 01-fundamentals/       # 基础知识层 - 技术基础
│   ├── tech-stack.md
│   ├── language-layers.md
│   ├── api-platforms.md
│   └── README.md
│
├── 02-methodology/        # 方法论层 - 开发流程
│   ├── development-flow.md
│   ├── testing-automation.md
│   ├── canvas-driven-dev.md
│   ├── documentation-standards.md
│   └── README.md
│
├── 03-node-development/   # 节点开发层 - React Flow
│   ├── node-architecture.md
│   ├── handle-connections.md
│   ├── node-templates.md
│   └── README.md
│
├── rules/error-patterns/  # 错误模式层（已拆分）- 错误管理
│   ├── README.md           # 总索引
│   ├── api-errors.md       # API 相关错误
│   ├── reactflow-errors.md # React Flow 相关错误
│   ├── character-errors.md # 角色系统错误
│   ├── storage-errors.md   # 存储/持久化错误
│   ├── ui-errors.md        # UI/渲染错误
│   ├── form-errors.md      # 表单/输入错误
│   └── other-errors.md     # 其他错误
│
├── 05-automation/         # 自动化层 - 系统增强
│   ├── mcp-integration.md
│   ├── auto-testing.md
│   ├── continuous-learning.md
│   ├── automation-architecture.md
│   └── README.md
│
├── templates/             # 模板层
│   ├── node-template.jsx
│   ├── api-route-template.js
│   ├── error-report-template.md
│   └── README.md
│
└── skills/                # 技能层
    └── winjin-dev/
        └── SKILL.md
```

### 文件职责

| 层级 | 职责 | 更新频率 |
|------|------|----------|
| 00-philosophy | 核心理念、哲学原则 | 很少更新 |
| 01-fundamentals | 技术栈、API 规范 | 按需更新 |
| 02-methodology | 开发流程、测试方法 | 按需更新 |
| 03-node-development | 节点架构、开发模板 | 频繁更新 |
| 04-error-patterns | 错误模式、预防措施 | 每次错误后更新 |
| 05-automation | 自动化系统、MCP 集成 | 按需更新 |
| templates | 代码模板 | 很少更新 |
| skills | 技能说明 | 每次功能后更新 |

---

## 编写规范

### 1. 文档头部

每个文档必须包含标准头部：

```markdown
# 文档标题

> **版本**: v1.0.0
> **更新日期**: 2026-01-18
> **核心理念**: 简短描述

---

## 目录

- [章节1](#章节1)
- [章节2](#章节2)
---
```

### 2. 标题层级

```markdown
# 一级标题 (文档标题，每个文件只有一个)

## 二级标题 (主要章节)

### 三级标题 (子章节)

#### 四级标题 (细节说明)

##### 五级标题 (很少使用)
```

### 3. 代码示例

**原则**: 所有代码示例必须可运行

````markdown
**✅ 正确：完整的可运行示例**
```javascript
// 完整的上下文
const prompt = '@test.user 在海边玩耍';

async function optimizePrompt(prompt) {
  const response = await fetch('/api/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  return response.json();
}

const result = await optimizePrompt(prompt);
console.log(result);  // 输出结果
```

**❌ 错误：不完整的片段**
```javascript
// 缺少上下文，无法运行
const result = await optimizePrompt(prompt);
```
````

### 4. 表格格式

```markdown
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 数据1 | 数据2 | 数据3 |
```

### 5. 重点标记

```markdown
**重点文本** - 加粗
*斜体文本* - 斜体
`代码` - 行内代码
[链接](url) - 超链接

> **引用块** - 重要提示
> 用于强调关键信息

---

水平线 - 分隔章节
```

### 6. 列表格式

```markdown
无序列表：
- 项目1
- 项目2
  - 子项目2.1
  - 子项目2.2

有序列表：
1. 步骤1
2. 步骤2
3. 步骤3

任务列表：
- [ ] 未完成任务
- [x] 已完成任务
```

### 7. 错误标记

```markdown
// ❌ 错误：不推荐的做法
const data = fetchData();

// ✅ 正确：推荐的做法
const data = await fetchData();
```

### 8. 优先级标记

```markdown
⭐⭐⭐ 最高优先级
⭐⭐ 高优先级
⭐ 中等优先级
无标记 普通优先级

**重要** ⭐⭐⭐
```

---

## 更新流程

### Plan → Code → Update Docs

```
┌─────────────────────────────────────────────────────────┐
│ 1. Plan (计划)                                          │
│    ├─ 阅读相关文档                                      │
│    ├─ 查看错误模式                                      │
│    └─ 设计方案                                          │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Code (编码)                                          │
│    ├─ 编写代码                                          │
│    ├─ 添加注释                                          │
│    └─ 本地测试                                          │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Update Docs (更新文档) ⭐ 重要                        │
│    ├─ 新增错误模式 → rules/error-patterns/[类型].md│
│    ├─ 更新索引 → rules/error-patterns/README.md│
│    ├─ 更新技能文档 → skills/winjin-dev/SKILL.md         │
│    └─ 更新相关文档 → 其他相关文件                       │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Git Commit                                           │
│    └─ 包含代码和文档                                    │
└─────────────────────────────────────────────────────────┘
```

### 更新检查清单

每次开发完成后，检查以下文档是否需要更新：

- [ ] `.claude/rules/error-patterns/[类型].md` - 新增错误模式
- [ ] `.claude/rules/error-patterns/README.md` - 更新索引
- [ ] `.claude/skills/winjin-dev/SKILL.md` - 更新开发提示
- [ ] `.claude/03-node-development/node-templates.md` - 新增节点模板
- [ ] 相关模块文档 - 更新具体说明
- [ ] `CLAUDE.md` - 更新主文档（重大变更时）

---

## 质量检查

### 文档质量标准

#### 1. 完整性

- [ ] 所有公开 API 都有文档
- [ ] 所有参数都有说明
- [ ] 所有返回值都有说明
- [ ] 所有示例都可运行

#### 2. 准确性

- [ ] 代码示例与实际代码一致
- [ ] 版本号正确
- [ ] 日期最新
- [ ] 链接有效

#### 3. 可读性

- [ ] 标题层级清晰
- [ ] 目录完整
- [ ] 代码格式规范
- [ ] 语言简洁明了

#### 4. 可维护性

- [ ] 无重复内容（使用引用）
- [ ] 结构清晰（6层架构）
- [ ] 更新及时（版本追踪）
- [ ] 易于查找（目录、索引）

### 文档审查流程

```bash
# 1. 提交前检查
npm run docs:check  # 检查文档质量

# 2. 自动化检查
- 内部链接有效性
- 代码示例可运行性
- 版本号一致性

# 3. 人工审查
- 内容准确性
- 结构合理性
- 完整性
```

---

## 常见错误模式

### 错误 1: 文档与代码不一致

```javascript
// 文档说：
// @param {string} prompt - 提示词

// 实际代码：
function videoGenerate(prompt, options) {  // ❌ 缺少 options 参数说明
  // ...
}
```

**预防**:
1. 代码变更时同步更新文档
2. 使用 JSDoc 自动生成文档
3. 定期审查文档一致性

### 错误 2: 过时信息

```markdown
## API 端点

> **版本**: v0.9.0  # ❌ 版本过时

Base URL: `https://old-api.example.com`  # ❌ 已废弃
```

**预防**:
1. 每次更新时更新版本号和日期
2. 标记废弃内容
3. 定期审查文档时效性

### 错误 3: 链接失效

```markdown
详见 [错误模式](./non-existent-file.md)  # ❌ 文件不存在
```

**预防**:
1. 使用相对路径
2. 提交前检查链接
3. 使用自动化工具验证

### 错误 4: 示例代码不可运行

```javascript
// ❌ 错误：缺少上下文
const result = await optimizePrompt(prompt);
console.log(result);

// ✅ 正确：完整示例
const prompt = '一只猫在睡觉';

async function optimizePrompt(prompt) {
  const response = await fetch('/api/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  return response.json();
}

const result = await optimizePrompt(prompt);
console.log(result);  // { success: true, data: {...} }
```

---

## 参考文档

- [Markdown 语法指南](https://www.markdownguide.org/)
- [JSDoc 文档生成](https://jsdoc.app/)
- [技术文档最佳实践](https://www.writethedocs.org/)
- [开发流程](./development-flow.md)

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
**版本**: v1.0.0
