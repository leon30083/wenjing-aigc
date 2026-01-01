# 快速参考 ⚡ 开发前必读

> **重要性**: 本文件包含开发前必须掌握的基础知识，请确保理解后再开始开发！

---

## 1. 启动开发服务器

### ⭐ 工作流画布开发（当前重点）⭐

**⚠️ 重要**: 这是当前项目的主要开发目标！

```bash
# 步骤1: 启动后端 API 服务器（终端1）
npm run server

# 步骤2: 启动前端 Vite 开发服务器（终端2）
cd src/client
npm run dev

# 步骤3: 浏览器访问工作流画布
http://localhost:5173/
```

**关键点**:
- ✅ **必须同时运行两个服务器**（后端 + 前端）
- ✅ **测试时访问 5173 端口，不是 9000 端口** ⚠️
- ✅ **5173 是工作流画布（React Flow）** ⭐
- ❌ 9000 端口是网页版，不是工作流画布

---

### 网页版开发（非当前重点）

```bash
# 仅启动 HTTP 服务器
npm run server

# 浏览器访问
http://localhost:9000
```

**用途**: 测试 API 接口、网页版功能（非工作流画布）

---

### Electron 桌面应用（打包用）

```bash
# 启动完整的 Electron 桌面应用
npm start
```

**要求**: 需要先安装 electron (`npm install electron --save-dev`)
**用途**: 打包桌面应用、测试桌面功能

---

## 2. 测试目标区分 ⚠️ 易犯错误

| 端口 | 技术 | 用途 | 测试目标 | 当前重点 |
|------|------|------|----------|----------|
| **5173** | React Flow | **工作流画布** | **节点开发、连线测试** | ⭐ **YES** |
| 9000 | 原生 HTML | 网页版 | API 接口测试 | NO |

### ❌ 错误操作

```bash
# 错误1: 只启动后端，访问网页版
npm run server
# 浏览器打开 localhost:9000  ← 测试的是网页版，不是工作流画布！

# 错误2: 只启动 Vite，前端无法连接 API
cd src/client && npm run dev
# 前端运行，但无法调用后端 API（端口 9000 未启动）
```

### ✅ 正确操作

```bash
# 终端1: 后端 API 服务器
npm run server

# 终端2: 前端 Vite 开发服务器
cd src/client && npm run dev

# 浏览器访问
http://localhost:5173/  ← 这才是工作流画布！
```

---

## 3. 常见问题快速排查

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| `electron: command not found` | electron 未安装 | 使用 `npm run server` 代替 `npm start` |
| **测试了网页版而非画布** | ❌ 访问 localhost:9000 | ✅ 访问 localhost:5173 |
| **前端无法连接 API** | 只启动了 Vite，没启动后端 | 同时运行 `npm run server` 和 `npm run dev` |
| 端口被占用 | 9000 端口已被使用 | 修改 `.env` 中的 PORT 配置 |

---

## 4. 自动化测试流程 🤖 ⭐⭐⭐ 基础标准范式

> **重要**: 这是项目开发的**基础标准范式**，必须严格执行！
> - 工欲善其事，必先利其器
> - 优先使用自动化工具测试，减少人工干预
> - 每次开发完成后必须经过浏览器自动化测试验证

### 4.1 测试原则

**✅ 自动化优先**:
- 使用配置的 MCP 工具在浏览器中自动测试
- 不要总是问用户"能否测试"
- 每个任务都应该用自动化方式验证

**❌ 人工协助的边界**:
以下操作需要用户协同完成：
- 连线连接节点（React Flow 拖拽连线）
- 模拟鼠标拖拽（节点位置调整）

**✅ MCP 工具可以完成的操作**:
- 点击按钮、链接、输入框
- 填写表单、输入文本
- 选择下拉选项、勾选复选框
- 截图验证（对比 UI 效果）
- 读取页面内容（快照）
- 执行 JavaScript 代码
- 监听网络请求和控制台日志

### 4.2 标准测试流程

```
开发完成后
├─ 1. 自动启动浏览器并访问 http://localhost:5173/
├─ 2. 获取页面快照（take_snapshot）
├─ 3. 根据任务执行自动化操作
│   ├─ 填写表单（fill/fill_form）
│   ├─ 点击按钮（click）
│   ├─ 输入文本（fill）
│   └─ 执行脚本（evaluate_script）
├─ 4. 截图验证结果（take_screenshot）
├─ 5. 检查控制台错误（list_console_messages）
└─ 6. 检查网络请求（list_network_requests）
```

### 4.3 测试示例

**示例1: 测试角色选择功能**
```javascript
// 自动化测试流程
1. 访问 http://localhost:5173/
2. take_snapshot() - 获取页面快照
3. 点击"角色库节点"
4. 点击角色卡片（click）
5. 检查 VideoGenerateNode 是否显示角色
6. take_screenshot() - 截图验证
7. list_console_messages() - 检查无错误
```

**示例2: 测试参考图选择**
```javascript
// 自动化测试流程
1. 访问 http://localhost:5173/
2. 点击"参考图节点"
3. 点击图片卡片切换到"选择模式"
4. 点击多张图片（绿色边框验证）
5. take_screenshot() - 截图验证
6. evaluate_script() - 检查 selectedImages 状态
```

**示例3: 测试视频生成**
```javascript
// 自动化测试流程
1. 访问 http://localhost:5173/
2. fill() - 填写提示词
3. click() - 点击"生成视频"按钮
4. list_network_requests() - 检查 API 请求
5. wait_for() - 等待任务完成
6. take_screenshot() - 验证结果显示
```

### 4.4 用户协作场景

**场景1: 需要连线节点**
```
Claude: 我需要在浏览器中测试节点连线功能。
      ⚠️ MCP 工具无法模拟拖拽连线，请协助完成：
      1. 将 CharacterLibraryNode 连接到 VideoGenerateNode
      2. 点击角色库中的"阳光小猫"
      3. 观察视频生成节点是否显示角色

User: [手动完成连线]

Claude: ✅ 连线完成，现在继续自动化测试...
      take_snapshot() → 验证角色显示
      take_screenshot() → 截图保存
```

**场景2: 需要调整节点位置**
```
Claude: 我需要验证节点拖拽功能。
      ⚠️ MCP 工具无法模拟拖拽，请协助完成：
      1. 拖动 VideoGenerateNode 到新位置
      2. 观察节点位置是否正确更新

User: [手动拖动节点]

Claude: ✅ 拖拽完成，现在验证节点位置保存...
      evaluate_script() → 检查节点坐标
      take_screenshot() → 截图验证
```

### 4.5 测试检查清单

**功能测试**（自动化）:
- [ ] 页面加载成功（无 console 错误）
- [ ] 节点显示正常（截图验证）
- [ ] 表单输入响应（fill + click）
- [ ] API 请求正确（list_network_requests）
- [ ] 数据更新及时（evaluate_script 检查状态）

**用户协作测试**:
- [ ] 节点连线功能（用户协助）
- [ ] 节点拖拽功能（用户协助）
- [ ] 节点删除功能（用户协助）

### 4.6 测试失败处理

```
测试失败时
├─ 1. 记录错误信息（console_messages）
├─ 2. 截图保存现场（take_screenshot）
├─ 3. 分析根本原因
├─ 4. 修复代码
└─ 5. 重新测试直到通过
```

---

## 5. 开发流程推荐 ⭐

**完整开发流程**:
```bash
# 1. 启动后端（终端1）
npm run server

# 2. 启动前端（终端2）
cd src/client && npm run dev

# 3. 浏览器访问工作流画布
http://localhost:5173/

# 4. ⭐ 开发完成后，使用 MCP 工具自动化测试
#    - 访问页面 → 获取快照 → 执行操作 → 验证结果
#    - 检查 console 错误和网络请求
#    - 截图保存测试结果

# 5. 提交代码
git add .
git commit -m "feat: description"
```

---

## 6. 项目结构速查

```
winjin/
├── src/
│   ├── server/              # Express 后端 API
│   └── client/              # React 前端（工作流画布）⭐
│       ├── src/
│       │   ├── nodes/       # 自定义节点
│       │   ├── components/  # UI 组件
│       │   └── hooks/       # 业务逻辑
│       └── package.json     # 前端依赖
├── .claude/rules/           # 开发规范
│   ├── quick-reference.md   # 本文件（快速参考）⭐
│   ├── base.md              # 技术栈规范
│   └── code.md              # 代码规范
└── 用户输入文件夹/开发对话/  # 项目文档
    └── 开发交接书.md         # 主要交接文档
```

---

## 7. 关键文档位置

| 文档 | 位置 | 用途 |
|------|------|------|
| **快速参考** | `.claude/rules/quick-reference.md` | **本文件，开发前必读** ⭐ |
| 技术规范 | `.claude/rules/base.md` | 技术栈、API 规范 |
| 代码规范 | `.claude/rules/code.md` | 代码示例、错误模式 |
| 开发经验 | `用户输入文件夹/开发经验/Sora2_Character_Best_Practices.md` | Sora2 最佳实践 |
| 交接书 | `用户输入文件夹/开发对话/开发交接书.md` | 项目交接文档 |

---

## 8. 技术栈速记

| 类别 | 技术 | 版本 |
|------|------|------|
| 后端 | Node.js + Express | 16.x / 4.18.2 |
| 前端 | React + React Flow | 19.x / 11.x |
| 构建 | Vite | 5.x |
| 桌面 | Electron | 28.x（可选） |

---

**最后更新**: 2026-01-01
**维护者**: Claude Code 开发团队
