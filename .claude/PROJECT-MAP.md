# WinJin 项目地图手册

> **版本**: v1.0.0
> **更新日期**: 2026-02-04
> **目的**: 让 AI 助手快速定位代码位置，避免猜测

---

## 🗺️ 快速查找指南

### 我想找...

| 我想找... | 目录 | 文件 | 说明 |
|---------|------|------|------|
| **后端 API 路由** | src/server | index.js | Express 路由定义 |
| **Sora2 API 客户端** | src/server | sora2-client.js | 聚鑫/贞贞 API 调用 |
| **前端节点定义** | src/client/src/nodes | *.jsx | React Flow 节点 |
| **配置文件** | src/data | config.json | 模型和平台配置 |
| **错误模式** | .claude/rules/error-patterns | *.md | 按类型分类的错误 |
| **开发规范** | .claude/rules | *.md | 代码规范和约束 |
| **测试文件** | tests/ | *.js, *.json | 验证和测试脚本 |
| **节点参考文档** | .claude/03-node-development/node-reference | *.md | 节点功能文档 |

---

## 📁 目录结构详解

### 后端架构 (src/server/)
```
src/server/
├── index.js                  # Express 服务器主文件 ⭐
├── sora2-client.js           # Sora2 API 客户端封装 ⭐
├── config-manager.js         # 配置管理
├── character-storage.js     # 角色库存储
├── history-storage.js        # 历史记录存储
├── batch-queue.js            # 批量任务队列
└── concurrency-manager.js   # 并发管理
```

### 前端架构 (src/client/)
```
src/client/                      # React 前端 (工作流编辑器) ⭐
├── src/
│   ├── App.jsx              # 主应用组件 (React Flow) ⭐
│   ├── main.jsx             # React 入口
│   ├── nodes/               # 自定义节点 ⭐
│   │   ├── input/           # 输入节点
│   │   │   ├── TextNode.jsx                    # 文本输入
│   │   │   ├── ReferenceImageNode.jsx          # 参考图片
│   │   │   ├── CharacterLibraryNode.jsx        # 角色库选择
│   │   │   ├── APISettingsNode.jsx             # API 配置
│   │   │   ├── NarratorNode.jsx                # 旁白输入
│   │   │   └── OpenAIConfigNode.jsx             # OpenAI 配置
│   │   ├── process/         # 处理节点 ⭐
│   │   │   ├── VideoNode.jsx                    # 视频生成 (旧)
│   │   │   ├── VideoGenerateNode.jsx           # 视频生成 (新)
│   │   │   ├── Sora2GenerateNode.jsx            # Sora2 视频生成
│   │   │   ├── VEOGenerateNode.jsx              # VEO 视频生成
│   │   │   ├── CharacterCreateNode.jsx          # 角色创建
│   │   │   ├── StoryboardNode.jsx               # 故事板 (旧)
│   │   │   ├── JuxinStoryboardNode.jsx           # 聚鑫故事板
│   │   │   ├── ZhenzhenStoryboardNode.jsx        # 贞贞故事板
│   │   │   ├── PromptOptimizerNode.jsx           # 提示词优化
│   │   │   ├── NarratorProcessorNode.jsx         # 故事板优化
│   │   │   └── BatchVideoGenerateNode.jsx        # 批量视频生成
│   │   └── output/          # 输出节点
│   │       ├── TaskResultNode.jsx              # 任务结果
│   │       ├── CharacterResultNode.jsx         # 角色结果
│   │       └── BatchResultNode.jsx             # 批量任务结果
│   ├── components/          # UI 组件
│   │   ├── TextModelConfigPanel.jsx           # 文本模型配置
│   │   └── ...
│   ├── contexts/            # React Context
│   │   ├── APIConfigContext.jsx               # API 配置管理 ⭐
│   │   └── ...
│   ├── hooks/               # 自定义 Hooks
│   │   ├── useWorkflowExecution.js            # 工作流执行
│   │   └── ...
│   └── utils/               # 工具函数
│       └── workflowStorage.js              # 工作流存储管理
└── package.json
```

### 配置文件 (src/data/)
```
src/data/
├── config.json              # 用户配置（主配置）⭐
└── config-templates.json   # 配置模板（只读）
```

### 规则文档 (.claude/rules/)
```
.claude/rules/
├── quick-reference.md       # 快速参考 ⭐ 开发前必读
├── base.md                  # 技术栈和 API 规范
├── code.md                  # 代码规范
├── automation-rules.md      # 自动化编程规则
├── server-management.md     # 服务器管理规范
├── testing.md              # 测试规范
├── docs.md                  # 文档更新规范
├── architecture-comparison.md # 文档架构分析
├── auto-trigger.md         # 自动化触发规则
└── error-patterns/         # 错误模式（已拆分）⭐
    ├── README.md            # 总索引
    ├── api-errors.md        # API 相关错误
    ├── reactflow-errors.md  # React Flow 相关错误
    ├── character-errors.md  # 角色系统错误
    ├── storage-errors.md    # 存储/持久化错误
    ├── ui-errors.md         # UI/渲染错误
    ├── form-errors.md       # 表单/输入错误
    └── other-errors.md      # 其他错误
```

### 文档架构 (.claude/)
```
.claude/
├── 00-philosophy/              # 哲学层 - 核心理念
├── 01-fundamentals/            # 基础知识层 - 技术基础
├── 02-methodology/             # 方法论层 - 开发流程
├── 03-node-development/        # 节点开发层 - React Flow ⭐
│   ├── node-reference/       # 节点功能参考 ⭐
│   └── references/          # 节点开发参考
├── 04-error-patterns/          # 错误模式层
├── 05-automation/             # 自动化层
├── skills/                    # 技能层
│   └── winjin-dev/
│       ├── SKILL.md          # 主技能文档
│       └── references/
│           └── UPDATE.md      # 更新流程
└── templates/                 # 模板层
```

---

## 🔍 代码定位指南

### API 相关

**问题**: "我要找视频创建的 API 端点"
**位置**: `src/server/index.js` - 搜索 `POST /api/video/create`

**问题**: "我要找 Sora2 客户端代码"
**位置**: `src/server/sora2-client.js` - Sora2Client 类

**问题**: "我要找角色库 API"
**位置**: `src/server/index.js` - 搜索 `/api/character`

**问题**: "我要找批量任务 API"
**位置**: `src/server/index.js` - 搜索 `/api/batch`

---

### 前端节点相关

**问题**: "我要找视频生成节点"
**位置**: `src/client/src/nodes/process/VideoGenerateNode.jsx`
- 新节点: Sora2GenerateNode.jsx, VEOGenerateNode.jsx
- 旧节点: VideoNode.jsx (保留兼容)

**问题**: "我要找任务结果节点"
**位置**: `src/client/src/nodes/output/TaskResultNode.jsx`

**问题**: "我要找 API 设置节点"
**位置**: `src/client/src/nodes/input/APISettingsNode.jsx`

**问题**: "我要找提示词优化节点"
**位置**: `src/client/src/nodes/process/PromptOptimizerNode.jsx`

**问题**: "我要找批量视频生成节点"
**位置**: `src/client/src/nodes/process/BatchVideoGenerateNode.jsx`

**问题**: "我要找旁白优化节点"
**位置**: `src/client/src/nodes/process/NarratorProcessorNode.jsx`

**问题**: "我要找故事板节点"
**位置**: `src/client/src/nodes/process/JuxinStoryboardNode.jsx` (聚鑫)
        `src/client/src/nodes/process/ZhenzhenStoryboardNode.jsx` (贞贞)

**问题**: "我要找角色库选择节点"
**位置**: `src/client/src/nodes/input/CharacterLibraryNode.jsx`

---

### 配置相关

**问题**: "我要找模型配置"
**位置**: `src/data/config.json` - platforms, userDefaults

**问题**: "我要找配置管理 Context"
**位置**: `src/client/src/contexts/APIConfigContext.jsx`

**问题**: "我要找 OpenAI 配置"
**位置**: `src/client/src/nodes/input/OpenAIConfigNode.jsx`

---

### 错误排查

**问题**: "我要找 API 相关错误"
**位置**: `.claude/rules/error-patterns/api-errors.md`

**问题**: "我要找 React Flow 错误"
**位置**: `.claude/rules/error-patterns/reactflow-errors.md`

**问题**: "我要找配置相关错误"
**位置**: `.claude/rules/error-patterns/storage-errors.md`

**问题**: "我要找角色系统错误"
**位置**: `.claude/rules/error-patterns/character-errors.md`

---

## 📚 关键文件索引

| 文件 | 用途 | 关键内容 |
|------|------|----------|
| `quick-reference.md` | 快速参考 | 启动命令、测试流程、常见问题 |
| `config.json` | 主配置 | 平台、模型、默认值 |
| `sora2-client.js` | API 客户端 | 聚鑫/贞贞 API 调用 |
| `APIConfigContext.jsx` | 配置管理 | API 配置的全局状态 |
| `api-errors.md` | API 错误 | 双平台差异、端点配置 |
| `automation-rules.md` | 自动化规则 | 触发、测试、质量、协作 |
| `PROJECT-MAP.md` | **本文件** | 项目地图手册 ⭐ |

---

## 🎯 使用示例

### 示例 1: 修复 API 调用问题

**问题**: "贞贞平台视频生成失败"

**查找路径**:
1. PROJECT-MAP.md → 找"API 相关"章节
2. 定位到: `src/server/sora2-client.js`
3. 参考: `.claude/rules/error-patterns/api-errors.md` (错误41)
4. 参考: `.claude/skills/winjin-dev/references/` 中的平台差异文档

**相关错误**:
- 错误1: 双平台任务ID不兼容
- 错误39: 聚鑫平台模型名称错误
- 错误41: 贞贞故事板端点配置错误

---

### 示例 2: 修改节点行为

**问题**: "修改视频生成节点的提示词输入"

**查找路径**:
1. PROJECT-MAP.md → 找"前端节点"章节
2. 定位到: `src/client/src/nodes/process/VideoGenerateNode.jsx`
3. 参考: `.claude/03-node-development/node-reference/process-nodes/VideoGenerateNode.md`
4. 参考: `.claude/rules/error-patterns/reactflow-errors.md` (错误16)

**相关错误**:
- 错误16: React Flow 节点间数据传递错误
- 错误33: 工作流快照持久化时机问题

---

### 示例 3: 修复配置问题

**问题**: "刷新后配置丢失"

**查找路径**:
1. PROJECT-MAP.md → 找"配置相关"章节
2. 定位到: `src/client/src/contexts/APIConfigContext.jsx`
3. 参考: `.claude/rules/error-patterns/storage-errors.md` (错误50、53、56)

**相关错误**:
- 错误50: OpenAI 配置持久化丢失
- 错误53: NarratorProcessorNode 优化结果刷新后丢失
- 错误56: API 配置节点平台选择刷新后丢失

---

## 🔧 关键技术点

### 1. 双平台差异 ⚠️ 重要

| 特性 | 聚鑫平台 | 贞贞平台 |
|------|---------|---------|
| **Base URL** | api.jxincm.cn | ai.t8star.cn |
| **视频端点** | `/v1/video/create` | `/v2/videos/generations` |
| **模型名称** | `sora-2-all` | `sora-2`, `sora-2-pro` |
| **查询参数** | `?id={taskId}` | `/{taskId}` 路径参数 |
| **任务ID字段** | `id` | `task_id` |
| **故事板端点** | `/v1/videos` | `/v2/videos/generations` |

**位置**: `.claude/01-fundamentals/references/api-platforms.md`

### 2. React Flow 数据传递

**原则**: 源节点直接更新目标节点（绕过 App.jsx）

**错误模式**: 错误16 - React Flow 节点间数据传递错误

**位置**: `.claude/rules/error-patterns/reactflow-errors.md`

### 3. 配置优先级

**正确优先级**:
1. Context (最新, 已同步)
2. localStorage (降级, 离线时)
3. 默认值 (最后降级)

**错误模式**: 错误56 - API 配置节点平台选择刷新后丢失

**位置**: `src/client/src/contexts/APIConfigContext.jsx`

### 4. 工作流持久化

**关键点**: useState 必须同步到 node.data

**错误模式**: 错误33 - 工作流快照持久化时机问题

**位置**: `.claude/rules/error-patterns/storage-errors.md`

---

## 📊 节点类型总览

### 输入节点 (input/)
- `textNode` - 文本输入
- `referenceImageNode` - 参考图片
- `characterLibraryNode` - 角色库
- `apiSettingsNode` - API 配置
- `narratorNode` - 旁白输入
- `openAIConfigNode` - OpenAI 配置

### 处理节点 (process/)
- `videoGenerateNode` - 视频生成 (新)
- `sora2GenerateNode` - Sora2 视频生成
- `veoGenerateNode` - VEO 视频生成
- `videoNode` - 视频生成 (旧)
- `characterCreateNode` - 角色创建
- `promptOptimizerNode` - 提示词优化
- `narratorProcessorNode` - 故事板优化
- `batchVideoGenerateNode` - 批量视频生成
- `juxinStoryboardNode` - 聚鑫故事板
- `zhenzhenStoryboardNode` - 贞贞故事板

### 输出节点 (output/)
- `taskResultNode` - 任务结果
- `characterResultNode` - 角色结果
- `batchResultNode` - 批量任务结果

---

## 🚀 开发前必读

1. **快速参考**: `.claude/rules/quick-reference.md` ⭐
   - 启动命令
   - 测试目标区分 (5173 vs 9000)
   - 常见问题排查

2. **节点参考**: `.claude/03-node-development/node-reference/README.md` ⭐
   - 节点功能文档
   - Handles 连接规范
   - 数据传递规则

3. **错误模式**: `.claude/rules/error-patterns/README.md` ⭐
   - 57个错误模式 (7种类型)
   - 快速索引表
   - 按类型分类

---

## 📝 维护说明

**维护者**: WinJin AIGC 开发团队

**更新机制**:
- 每次添加新功能或重构代码后，更新此地图手册
- 参考: `.claude/skills/winjin-dev/references/UPDATE.md`

**更新触发条件**:
- [ ] 新增目录 → 更新"目录结构详解"章节
- [ ] 删除目录 → 更新"目录结构详解"章节
- [ ] 移动文件 → 更新"代码定位指南"章节
- [ ] 新增节点 → 添加到"节点类型总览"
- [ ] 重构代码 → 更新"代码定位指南"

---

## 🔄 相关文档

- [CLAUDE.md](../CLAUDE.md) - 项目入口文档
- [quick-reference.md](./quick-reference.md) - 快速参考 ⭐
- [SKILL.md](../skills/winjin-dev/SKILL.md) - 开发规范和技能
- [开发交接书.md](../../用户输入文件夹/开发对话/开发交接书.md) - 项目交接文档

---

**最后更新**: 2026-02-04
**维护者**: WinJin AIGC 开发团队
**版本**: v1.0.0
