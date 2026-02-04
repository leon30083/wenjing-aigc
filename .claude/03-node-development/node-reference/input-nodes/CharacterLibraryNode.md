# CharacterLibraryNode - 角色库节点

> **节点类型**: 输入节点
> **文件路径**: `src/client/src/nodes/input/CharacterLibraryNode.jsx`
> **版本**: v1.0.0
> **更新日期**: 2026-01-18

---

## 功能概述

角色库节点是 WinJin 工作流中的核心输入节点，用于：

- 📊 **浏览角色**：从后端加载所有已创建的 Sora2 角色
- 🔍 **搜索过滤**：按用户名/别名搜索，或按收藏/最近使用过滤
- 📤 **传送角色**：将选中的角色传送到视频生成节点或旁白输入节点
- ✏️ **管理角色**：编辑角色别名、删除角色、批量操作

**核心价值**：集中管理所有角色，支持快速选择和复用。

---

## 输入/输出 Handles

### 输出 Handle

| Handle ID | 类型 | 数据格式 | 说明 |
|-----------|------|----------|------|
| `characters-output` | 输出 | `Character[]` | 角色对象数组（完整对象）⭐ |

**角色对象格式**:
```javascript
{
  id: "character-id",              // 角色ID
  username: "6f2dbf2b3.zenwhisper", // 真实用户名（用于API）
  alias: "测试小猫",                // 别名（用户友好显示）
  profilePictureUrl: "https://...", // 头像URL
  permalink: "https://...",         // 角色主页链接
  favorite: true,                   // 是否收藏
  platform: "juxin"                 // 来源平台
}
```

⚠️ **重要**：`characters-output` 传递的是**完整角色对象数组**，不是仅ID。

---

## 节点配置

### 1. 选择模式

#### 传送模式 (`transfer`) - 默认
- **用途**: 将角色传送到视频生成节点或旁白输入节点
- **操作**: 点击角色卡片进行多选
- **视觉反馈**:
  - 选中：绿色背景 `#d1fae5` + 绿色边框
  - 选中标识：左上角绿色圆圈 ✓

#### 编辑模式 (`manage`)
- **用途**: 管理角色（编辑别名、删除）
- **操作**:
  - 单击：无操作
  - 双击：打开编辑对话框
  - 悬停：显示删除按钮
- **批量操作**: 可切换批量模式进行多选删除

### 2. 过滤功能

| 过滤类型 | 说明 |
|---------|------|
| `全部角色` | 显示所有角色 |
| `收藏` | 只显示 `favorite: true` 的角色 |
| `最近使用` | 显示最近使用的角色（按 localStorage 记录） |

### 3. 搜索功能

- **搜索字段**: `username` 和 `alias`
- **匹配规则**: 包含匹配（不区分大小写）
- **实时过滤**: 输入即过滤

### 4. 节点大小调整

- **初始大小**: 320px × 420px
- **最小尺寸**: 300px × 400px
- **支持拖动**: 右下角拖动调整大小（ComfyUI 风格）

---

## 数据传递

### 传递机制 ⭐ Error 55 修复

```javascript
// 节点内部状态管理
const [selectedCharacters, setSelectedCharacters] = useState(new Set());

// ✅ 正确：传递完整对象数组
data.connectedCharacters = characters.filter(c => selectedCharacters.has(c.id));

// ❌ 错误：仅传递ID数组（会导致 Error 55）
data.connectedCharacters = Array.from(selectedCharacters);
```

### 连接目标

角色库节点可以连接到以下节点的 `character-input` Handle：

1. **VideoGenerateNode** (视频生成节点)
   - 传递用途：在视频生成时使用角色
   - 角色引用格式：`@username` 提示词内容

2. **NarratorNode** (旁白输入节点)
   - 传递用途：在旁白文本中智能匹配角色
   - 智能匹配：OpenAI 自动识别旁白中的角色并插入引用

### 工作流恢复 ⭐

```javascript
// 从工作流加载时恢复选中状态
const [selectedCharacters, setSelectedCharacters] = useState(() => {
  if (data.selectedCharacters && Array.isArray(data.selectedCharacters)) {
    return new Set(data.selectedCharacters);
  }
  return new Set();
});
```

---

## 使用示例

### 示例 1: 传送角色到视频生成节点

```
工作流结构：
CharacterLibraryNode (id: 1)
  ↓ characters-output
VideoGenerateNode (id: 6)
  - 输入: character-input
  - 提示词: @6f2dbf2b3.zenwhisper 在海边玩耍
  ↓ video-output
TaskResultNode (id: 10)
```

**操作步骤**:
1. 在角色库节点切换到"📤 传送到视频节点"模式
2. 点击选择一个或多个角色
3. 角色对象自动传递到 `VideoGenerateNode.connectedCharacters`
4. 在视频生成节点点击角色卡片，插入角色引用到提示词
5. 点击"生成视频"

### 示例 2: 传送角色到旁白输入节点

```
工作流结构：
CharacterLibraryNode (id: 1) ──┐
OpenAIConfigNode (id: 13) ─────┤
                                ↓
                         NarratorNode (id: 12)
  - 旁白文本：
    - @装载机 在工地上干活
    - @阳光小猫 在海边玩耍
```

**操作步骤**:
1. 连接 `CharacterLibraryNode.characters-output` → `NarratorNode.character-input`
2. 连接 `OpenAIConfigNode.openai-config` → `NarratorNode.openai-config`
3. 在旁白输入节点输入每行一个句子（可以包含角色名）
4. 点击"🪄 智能匹配角色"（需要连接 OpenAI 配置）
5. OpenAI 自动识别句子中的角色并插入 `@username` 引用

### 示例 3: 管理角色（编辑别名）

**操作步骤**:
1. 切换到"✏️ 角色编辑"模式
2. 双击角色卡片
3. 在弹出的对话框中输入别名（如"测试小猫"）
4. 点击"保存"
5. 别名更新成功，下次显示时优先显示别名

---

## 常见问题

### Q1: 为什么选中角色后，视频生成节点没有接收到数据？

**A**: 检查以下几点：
1. 确认已创建连接：`CharacterLibraryNode.characters-output` → `VideoGenerateNode.character-input`
2. 确认处于"📤 传送到视频节点"模式
3. 查看浏览器控制台，检查是否有 `[CharacterLibraryNode] selectedCharacters changed` 日志
4. 在视频生成节点查看 `data.connectedCharacters` 字段是否包含角色对象

### Q2: 工作流加载后，之前选中的角色没有恢复？

**A**: 检查工作流 JSON 文件：
```json
{
  "nodes": [
    {
      "id": "1",
      "type": "characterLibraryNode",
      "data": {
        "selectedCharacters": ["char-id-1", "char-id-2"]  // ⭐ 必须包含此字段
      }
    }
  ]
}
```

### Q3: 角色引用格式错误，API调用失败？

**A**: 确认角色引用格式：
- ✅ 正确：`@6f2dbf2b3.zenwhisper 在海边玩耍`（真实ID，不带花括号）
- ❌ 错误：`@{6f2dbf2b3.zenwhisper} 在海边玩耍`（带花括号）
- ❌ 错误：`@测试小猫 在海边玩耍`（别名，不是真实ID）

### Q4: 如何批量删除角色？

**A**:
1. 切换到"✏️ 角色编辑"模式
2. 点击"批量操作"按钮
3. 点击"全选"或手动选择要删除的角色
4. 点击"删除 (N)"按钮
5. 确认删除

### Q5: 为什么刷新后角色没有更新？

**A**: 点击节点右上角的"🔄 刷新"按钮重新加载角色列表。

---

## API 依赖

### 后端 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/character/list` | GET | 获取所有角色列表 |
| `/api/character/:id` | DELETE | 删除单个角色 |
| `/api/character/:id/alias` | PUT | 更新角色别名 |

### localStorage

| 键名 | 用途 |
|------|------|
| `recent_characters` | 存储最近使用的角色ID列表 |

---

## 相关节点

- **VideoGenerateNode**: 视频生成节点（接收角色数据）
- **NarratorNode**: 旁白输入节点（接收角色数据）
- **CharacterCreateNode**: 角色创建节点（创建新角色）

---

## 相关文档

- [节点功能参考手册](../README.md)
- [VideoGenerateNode 文档](../process-nodes/VideoGenerateNode.md)
- [错误模式参考 - Error 55](../../../rules/error-patterns/character-errors.md)

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
