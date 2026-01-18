# E2E 测试系统反馈与改进计划

> **日期**: 2026-01-18
> **来源**: 用户手动测试反馈
> **状态**: 待处理

---

## 用户反馈问题

### 1. ⚠️ 新的测试系统待验证

**问题描述**:
- Playwright E2E 测试系统已建立，但需要进一步验证
- 23/26 测试通过 (88%)
- 连接测试和数据流测试全部通过
- 部分 UI 测试失败（与核心功能无关）

**待验证项**:
- [ ] 实际工作流执行是否正常
- [ ] 角色视频生成工作流
- [ ] 角色批量视频生成工作流

**相关文件**:
- `src/client/playwright.config.ts`
- `src/client/tests/e2e/`
- `src/client/tests/fixtures/reactflow.fixture.ts`

---

### 2. ❌ 工作流逻辑不清晰，节点功能不明确

**问题描述**:
- 测试工作流中的连接不正确
- 某些节点配置不完整
- AI 对各节点的功能了解不足
- **项目缺少节点功能文档**

**影响**:
- AI 生成的工作流可能不实用
- 用户难以理解各节点的用途
- 测试工作流不能真实反映使用场景

**需要补充的文档**:
```markdown
# 节点功能文档 (待创建)

## 输入节点
- **TextNode**: 文本输入节点，用于输入提示词
  - 输出: text-output (提示词文本)
  - 用途: 提供视频生成的文字描述

- **CharacterLibraryNode**: 角色库节点，用于选择已创建的角色
  - 输出: characters-output (角色对象数组)
  - 用途: 选择要使用的角色

- **ReferenceImageNode**: 参考图片节点
  - 输出: images-output (图片URL数组)
  - 用途: 提供视频参考图片

- **APISettingsNode**: API配置节点
  - 输出: api-output (API配置)
  - 用途: 配置平台、密钥、模型

## 处理节点
- **VideoGenerateNode**: 视频生成节点（核心）
  - 输入: prompt-input, character-input, images-input, api-input
  - 输出: video-output (任务ID)
  - 用途: 调用 Sora2 API 生成视频

- **PromptOptimizerNode**: 提示词优化节点
  - 输入: prompt-input (原始提示词)
  - 输出: optimized-output (优化后提示词)
  - 用途: 使用 AI 优化提示词质量

- **CharacterCreateNode**: 角色创建节点
  - 输入: video-input (视频URL)
  - 输出: character-output (角色对象)
  - 用途: 从视频创建角色

- **StoryboardNode**: 故事板节点
  - 输入: video-input, character-input
  - 输出: storyboard-output (批量任务)
  - 用途: 批量生成多个场景视频

## 输出节点
- **TaskResultNode**: 任务结果节点
  - 输入: task-input (任务ID)
  - 用途: 显示视频生成结果

- **CharacterResultNode**: 角色结果节点
  - 输入: character-input (角色对象)
  - 用途: 显示创建的角色信息
```

**文档位置**: `.claude/docs/nodes-guide.md` (待创建)

---

### 3. 🎯 测试重点：角色视频生成工作流

**优先级**: ⭐⭐⭐ 最高

**待测试工作流**:

#### A. 角色单视频生成
```
角色库 → 视频生成 → 任务结果
文本节点 ↗
```

**验证点**:
- [ ] 角色对象正确传递（完整对象，非ID）
- [ ] 提示词包含角色引用 `@username`
- [ ] API 调用成功
- [ ] 视频生成完成

#### B. 角色批量视频生成（故事板）
```
角色库 ──┐
         ├─→ 故事板 → 任务结果
文本节点 ─┘
```

**验证点**:
- [ ] 多个场景依次生成
- [ ] 每个场景都使用相同角色
- [ ] 批量任务管理正确

---

### 4. ✅ AI 编写工作流 + 用户手动导入（标准化测试方法）

**优势**:
- AI 可以生成完整的、可复现的测试工作流
- 用户可以在真实环境中验证
- 发现 AI 对节点功能的理解偏差

**需要标准化**:
1. **工作流文件命名规范**
   ```
   test-workflow-{功能}-{版本}.json
   示例:
   - test-workflow-character-video-v1.json
   - test-workflow-storyboard-batch-v1.json
   ```

2. **工作流元数据格式**
   ```json
   {
     "name": "测试工作流名称",
     "description": "详细描述测试场景",
     "category": "character-video | storyboard | basic",
     "version": "1.0.0",
     "author": "AI | Human",
     "tags": ["角色", "视频生成", "E2E"],
     "nodes": [...],
     "edges": [...],
     "testPlan": [
       "步骤1: 描述",
       "步骤2: 描述"
     ]
   }
   ```

3. **测试工作流存放位置**
   ```
   tests/workflows/
   ├── character/
   │   ├── single-video.json
   │   └── batch-video.json
   ├── storyboard/
   │   └── basic-storyboard.json
   └── basic/
       ├── simple-connection.json
       └── complete-nodes.json
   ```

4. **开发流程集成**
   - AI 创建功能时，同步创建测试工作流
   - PR 中包含测试工作流文件
   - 用户手动验证后合并

**实施位置**:
- `.claude/rules/testing.md` (更新测试规范)
- `tests/workflows/` (创建测试工作流目录)

---

### 5. 🔧 前后端服务器管理方式

**当前策略**: 用户手动管理

**用户明确要求**:
> "算了，我现在手动管前后端服务，需要重启时你告诉我"

**AI 行为规范**:
```markdown
## 服务器管理规范

### ✅ AI 可以做的事
- 检查服务器状态（netstat 检查端口）
- 读取服务器日志
- 分析错误信息
- **告知用户需要重启**

### ❌ AI 不做的事
- 不自动启动/停止服务器
- 不自动重启服务器
- 不执行 service/systemctl 命令

### 📢 通知模板
当需要重启时，AI 应说：
"❌ 检测到错误，需要重启服务。请执行：
```bash
# 终端 1: 重启后端
npm run server

# 终端 2: 重启前端
cd src/client && npm run dev
```
重启完成后告诉我继续。"
```

**相关文档**: `.claude/rules/server-management.md` (待创建)

---

## 行动计划

### 立即执行 (P0)

1. **创建节点功能文档**
   - 文件: `.claude/docs/nodes-guide.md`
   - 内容: 每个节点的输入、输出、用途说明
   - 目的: 让 AI 和用户理解节点功能

2. **创建角色视频生成测试工作流**
   - 文件: `tests/workflows/character/single-video.json`
   - 场景: 使用角色生成单个视频
   - 验证: Error 55 修复、角色引用、API 调用

3. **创建批量视频生成测试工作流**
   - 文件: `tests/workflows/character/batch-video.json`
   - 场景: 使用角色生成多个场景视频
   - 验证: 故事板功能、批量任务管理

### 短期执行 (P1)

4. **更新测试规范**
   - 文件: `.claude/rules/testing.md`
   - 添加: 工作流文件规范、命名规范、测试流程

5. **创建服务器管理规范**
   - 文件: `.claude/rules/server-management.md`
   - 明确: AI 不自动管理服务器，只通知用户

### 中期执行 (P2)

6. **完善测试工作流目录结构**
   - 创建: `tests/workflows/` 分类目录
   - 移动: 现有测试工作流到对应目录

7. **补充节点使用示例**
   - 为每个节点创建实际使用案例
   - 包含完整的工作流配置

---

## Git 提交计划

### Commit 1: 添加 E2E 测试系统和测试工作流
```
feat: 添加 Playwright E2E 测试系统

- 完整的 Playwright 配置和测试套件
- ReactFlowHelper 测试辅助类
- Test API 暴露 (window.__REACT_FLOW_TEST_API__)
- 连接测试 (7/7 通过)
- 数据流测试 (4/4 通过，验证 Error 55)
- 测试工作流文件和加载脚本

相关文件:
- src/client/playwright.config.ts
- src/client/tests/
- src/client/test-workflow-*.json
- src/client/src/App.jsx (Test API)
```

### Commit 2: 添加测试反馈和改进计划
```
docs: 记录 E2E 测试反馈和改进计划

- 用户反馈问题记录
- 节点功能文档需求
- 测试工作流标准化规范
- 服务器管理策略

相关文件:
- .claude/tasks/testing-feedback-2026-01-18.md
```

---

## 相关链接

- **Playwright 计划**: `C:\Users\leon3\.claude\plans\stateful-gathering-sutton.md`
- **测试工作流**: `src/client/test-workflow-*.json`
- **使用指南**: `src/client/test-workflow-guide.md`
- **React Flow 规则**: `.claude/rules/reactflow.md`

---

**创建者**: AI (Claude)
**状态**: 待处理
**优先级**: P0 (立即执行)
