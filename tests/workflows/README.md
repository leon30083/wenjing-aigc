# 测试工作流说明

> **版本**: v1.0.0
> **更新日期**: 2026-01-18
> **维护者**: WinJin AIGC Team

---

## 概述

本目录包含用于 E2E 测试的预配置工作流文件。这些工作流可以手动导入到流式画布中进行功能验证。

**测试目标**:
- 验证节点连接正确性
- 验证数据传递完整性
- 验证工作流执行逻辑
- 验证 Error 55 修复（角色对象传递）

---

## 目录结构

```
tests/workflows/
├── README.md                    # 本文件
└── character/                   # 角色相关测试
    ├── single-video.json        # 单角色视频生成 ⭐
    └── batch-video.json         # 批量角色视频生成 ⭐
```

---

## 工作流文件格式

### 标准 JSON 格式

所有测试工作流遵循以下标准格式：

```json
{
  "name": "测试工作流名称",
  "description": "工作流描述",
  "nodes": [...],
  "edges": [...],
  "viewport": { "x": 0, "y": 0, "zoom": 1 },
  "createdAt": "2026-01-18T00:00:00.000Z",
  "updatedAt": "2026-01-18T00:00:00.000Z"
}
```

### 命名规范

```
{功能}-{场景}-{版本}.json

示例:
- single-video-v1.json
- batch-video-v1.json
- character-creation-v1.json
```

---

## 使用方法

### 方法 1: 通过浏览器控制台加载

```javascript
// 1. 打开 http://localhost:5173/
// 2. 打开开发者工具 (F12)
// 3. 复制粘贴以下代码

(async function loadTestWorkflow() {
  const response = await fetch('/tests/workflows/character/single-video.json');
  const workflow = await response.json();

  // 保存到 localStorage
  const workflows = JSON.parse(localStorage.getItem('winjin-workflows') || '{}');
  workflows[workflow.name] = workflow;
  localStorage.setItem('winjin-workflows', JSON.stringify(workflows));

  // 触发重新加载
  localStorage.setItem('winjin-current-workflow', workflow.name);
  window.location.reload();
})();
```

### 方法 2: 使用加载脚本

```bash
# 在浏览器控制台执行
fetch('/load-test-workflows.js').then(r => r.text()).then(eval);
```

---

## 测试工作流列表

### 1. single-video.json - 单角色视频生成

**测试场景**: 使用角色库中的角色生成单个视频

**验证点**:
- ✅ Error 55 修复验证（角色对象完整传递）
- ✅ 角色引用格式（`@username`，真实ID）
- ✅ 角色传递到 VideoGenerateNode
- ✅ API 调用成功
- ✅ 任务结果正确显示

**工作流结构**:
```
CharacterLibraryNode (id: 1)
  ↓ characters-output
VideoGenerateNode (id: 6)
  - 输入: prompt-input, character-input
  - 配置: platform=juxin, model=sora-2-all
  ↓ video-output
TaskResultNode (id: 10)
```

---

### 2. batch-video.json - 批量角色视频生成

**测试场景**: 使用故事板生成多个场景的视频

**验证点**:
- ✅ 故事板多镜头生成
- ✅ 角色在多个镜头中复用
- ✅ 每个镜头独立提示词
- ✅ 批量任务管理

**工作流结构**:
```
CharacterLibraryNode (id: 1) ──┐
TextNode (id: 2) ───────────────┤
                                ↓
                         StoryboardNode (id: 9)
  - shots: 3个镜头
  - 每个镜头包含角色引用
                                ↓
                         TaskResultNode (id: 10)
```

---

## 验证检查清单

### 视觉验证

- [ ] **节点位置**: 所有节点显示在正确的位置
- [ ] **节点样式**: 每个节点类型有正确的颜色和样式
- [ ] **连接线**: 所有边显示为可点击的SVG线
- [ ] **Handle显示**: 节点的输入/输出Handle可见

### 交互验证

- [ ] **拖拽节点**: 可以自由移动节点
- [ ] **选择节点**: 点击节点可以选中
- [ ] **删除节点**: 选中后按Delete可以删除
- [ ] **删除连接**: 点击连接线后可以删除

### 数据流验证

1. **角色数据传递** ⭐ Error 55
   - 选择角色后，检查 VideoGenerateNode 的 `connectedCharacters`
   - 应该包含完整的角色对象（不是仅ID）
   - 格式：`[{id, username, alias, profilePictureUrl, permalink}, ...]`

2. **角色引用格式**
   - 在输入框插入角色引用
   - 显示：`@测试小猫`（别名）
   - API 使用：`@6f2dbf2b3.zenwhisper`（真实ID）

3. **任务结果显示**
   - 执行视频生成
   - TaskResultNode 显示任务ID
   - 轮询状态更新
   - 视频URL显示

---

## 常见问题

### Q: 工作流加载后没有显示？

**A**: 检查以下几点：
1. 确认 JSON 文件格式正确
2. 清除 localStorage 后重新加载
3. 查看控制台是否有错误

### Q: 节点显示但连接线不显示？

**A**: 这是正常的！
- 手动拖拽的连接会显示连接线
- 通过 JSON 加载的连接可能不显示（React Flow 限制）
- 但数据会正确传递

### Q: 如何验证连接存在？

**A**: 使用控制台 API：
```javascript
window.__REACT_FLOW_TEST_API__.getEdges()
```

---

## 相关文档

### 上层文档
- [节点功能参考手册](../../.claude/03-node-development/node-reference/README.md)
- [E2E 测试反馈](../../.claude/tasks/testing-feedback-2026-01-18.md)

### 并行文档
- [测试规范](../../.claude/rules/testing.md) (待创建)
- [React Flow 规则](../../.claude/rules/code.md)

### 外部参考
- [Playwright 官方文档](https://playwright.dev/)

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
