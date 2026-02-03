# 角色系统相关错误模式

> **说明**: 角色引用、显示、插入相关的错误模式

---

## 错误7: 角色插入替换全部内容 `Character` `输入` ⭐⭐

```javascript
// ❌ 错误：替换整个提示词内容
function handleCharacterChange() {
  const promptElement = document.getElementById('video-prompt');
  const selectedUsername = selectElement.value;

  // 移除所有角色引用并在开头添加
  const roleRefRegex = /@[a-z0-9_.]+/gi;
  const cleanPrompt = promptElement.value.replace(roleRefRegex, '').trim();
  promptElement.value = `@${selectedUsername} ${cleanPrompt}`;
}

// ✅ 正确：在光标位置插入
function updatePromptWithCharacter(username) {
  const promptElement = document.getElementById('video-prompt');
  const start = promptElement.selectionStart;
  const end = promptElement.selectionEnd;
  const text = promptElement.value;
  const refText = `@${username} `;

  // 在光标位置插入，不影响其他内容
  promptElement.value = text.substring(0, start) + refText + text.substring(end);
  promptElement.setSelectionRange(start + refText.length, start + refText.length);
  promptElement.focus();
}
```

**问题**: 点击角色时替换整个提示词
**解决方案**: 在光标位置插入，不影响其他内容

---

## 错误8: 故事板未管理焦点状态 `Character` `焦点` ⭐

```javascript
// ❌ 错误：点击角色卡片后丢失焦点
function updateStoryboardScene(username) {
  const activeElement = document.activeElement;
  // activeElement 是角色卡片，不是场景输入框
  if (activeElement && activeElement.classList.contains('shot-scene')) {
    activeElement.value = `@${username} ` + activeElement.value;
  }
}

// ✅ 正确：记录最后焦点的场景输入框
let lastFocusedSceneInput = null;

function setupSceneInputListeners() {
  document.querySelectorAll('.shot-scene').forEach(input => {
    input.addEventListener('focus', (e) => {
      lastFocusedSceneInput = e.target;
    });
  });
}

function updateStoryboardScene(username) {
  let targetInput = lastFocusedSceneInput;
  if (!targetInput || !document.body.contains(targetInput)) {
    const activeElement = document.activeElement;
    if (activeElement && activeElement.classList.contains('shot-scene')) {
      targetInput = activeElement;
    }
  }

  if (targetInput && username) {
    const start = targetInput.selectionStart;
    const end = targetInput.selectionEnd;
    const text = targetInput.value;
    const refText = `@${username} `;

    targetInput.value = text.substring(0, start) + refText + text.substring(end);
    targetInput.setSelectionRange(start + refText.length, start + refText.length);
    targetInput.focus();
  }
}
```

**问题**: 点击角色卡片后丢失焦点，无法插入
**解决方案**: 记录最后焦点的场景输入框

---

## 错误9: 显示平台标签（角色跨平台通用） `Character` `UI` ⭐

```javascript
// ❌ 错误：显示平台标签（误导用户）
const displayName = char.alias ? `${char.alias} (${char.username})` : char.username;
option.textContent = `[${char.platform === 'juxin' ? '聚鑫' : '贞贞'}] ${displayName}`;

// ✅ 正确：不显示平台标签（sora2 角色跨平台通用）
const displayName = char.alias || char.username;
card.innerHTML = `
  <img src={avatarUrl} class="character-card-avatar">
  <div class="character-card-name">{displayName}</div>
  ${char.alias ? `<div class="character-card-username">@${char.username}</div>` : ''}
`;
```

**问题**: 显示平台标签误导用户
**解决方案**: sora2 角色跨平台通用，不显示平台标签

---

## 错误15: 使用 ID 而非 username 更新角色 `Character` `API` ⭐

```javascript
// ❌ 错误：API 使用 username 作为参数，但存储用 ID 查找
app.put('/api/character/:username/favorite', (req, res) => {
  const { username } = req.params;
  // 使用 updateCharacter 按 ID 查找会失败
  const updated = characterStorage.updateCharacter(username, { favorite: true });
  // username 不等于 id，返回 null
});

// ✅ 正确：添加 updateByUsername 方法
// character-storage.js
updateByUsername(username, updates) {
  const index = this.characters.findIndex(c => c.username === username);
  if (index === -1) return null;

  Object.assign(this.characters[index], updates);
  this._save();
  return this.characters[index];
}

// index.js
app.put('/api/character/:username/favorite', (req, res) => {
  const { username } = req.params;
  const updated = characterStorage.updateByUsername(username, { favorite: true });
  // ✅ 按 username 查找，正确更新
});
```

**问题**: API 使用 username 参数，存储用 ID 查找，导致更新失败
**解决方案**: 添加 `updateByUsername` 方法

---

## 错误48: 优化节点错误使用双显示功能导致角色引用丢失 `Character` `优化` ⭐⭐⭐ 2026-01-06 新增

**现象**: AI 优化后的提示词丢失了角色引用，替换成通用的"所有角色均采用拟人化设计"
**用户反馈**: "优化结果又回到原点了，丢失了角色信息，使用了外观描述，这是非常错误的"

**根本原因**:
- 优化节点（PromptOptimizerNode）错误地使用了"双显示功能"（realToDisplay/displayToReal）
- 输入框显示别名：`@测试小猫` 而非真实ID `@ebfb9a758.sunnykitte`
- AI 接收到别名，无法识别为角色引用，当作普通文本处理
- 优化结果丢失角色引用，替换成通用外观描述

```javascript
// ❌ 错误：优化节点使用双显示功能
const usernameToAlias = React.useMemo(() => {
  const map = {};
  connectedCharacters.forEach(char => {
    map[char.username] = char.alias || char.username;
  });
  return map;
}, [connectedCharacters]);

const realToDisplay = (text) => {
  // 转换真实ID为别名显示
  let result = text;
  Object.entries(usernameToAlias).forEach(([username, alias]) => {
    const regex = new RegExp(`@${username}(?=\\s|$|@)`, 'g');
    result = result.replace(regex, `@${alias}`);
  });
  return result;
};

<textarea
  value={realToDisplay(simplePrompt)}  // ❌ AI接收到别名
  onChange={(e) => {
    const realText = displayToReal(e.target.value);
    setSimplePrompt(realText);
  }}
/>

// ✅ 正确：优化节点始终使用真实ID
<textarea
  value={simplePrompt}  // ✅ AI接收到真实ID @ebfb9a758.sunnykitte
  onChange={(e) => {
    setSimplePrompt(e.target.value);
  }}
/>

// ✅ 正确：角色卡片显示别名+ID，点击插入真实ID
<div onClick={() => insertCharacterAtCursor(char.username, char.alias)}>
  <span>{char.alias || char.username}</span>
  <span style={{ fontSize: '8px', color: '#6b7280' }}>
    (@{char.username})
  </span>
</div>

// ⭐ 关键：直接插入真实ID
const insertCharacterAtCursor = (username, alias) => {
  const refText = `@${username} `;  // ✅ 插入真实ID，而非别名
};
```

**关键点**:
1. **优化节点输入**: 始终使用真实ID（`@ebfb9a758.sunnykitte`），不使用别名
2. **优化节点输出**: 优化结果也包含真实ID，传递给视频生成节点
3. **视频生成节点**: 使用双显示功能（输入框显示别名，API使用真实ID）
4. **角色卡片**: 显示别名+ID格式（`测试小猫 (@ebfb9a758.sunnykitte)`），点击插入真实ID
5. **AI识别**: 只有真实ID才能被AI识别为角色引用并保留

**角色引用原则** ⭐ 核心原则:
- **Sora2 API**: 使用真实ID调用角色（`@ebfb9a758.sunnykitte`）
- **不需要描述外观**: 角色引用后，AI不需要描述角色长相、眼睛、表情等（Sora2会使用角色真实外观）
- **只描述活动**: 重点描述角色在场景中的动作、互动、位置
- **优化节点**: 始终使用真实ID（发送给AI）
- **视频生成节点**: 使用双显示（用户友好的别名显示，API使用真实ID）

**修复文件**:
- `src/client/src/nodes/process/PromptOptimizerNode.jsx` - Lines 28-48（移除双显示功能，直接使用真实ID）
- `src/client/src/nodes/process/PromptOptimizerNode.jsx` - Lines 310-325（角色卡片显示别名+ID）
- `src/client/src/nodes/process/PromptOptimizerNode.jsx` - Lines 348-350（textarea直接使用simplePrompt）
- `src/server/services/openaiClient.js` - Lines 356-358（后端系统提示词添加空格要求）

**验证结果**: ✅ 2026-01-06 验证通过 - 优化节点使用真实ID，AI成功保留角色引用并添加空格

**修复日期**: 2026-01-06

---

## 错误55: NarratorProcessorNode 角色引用丢失（匹配失败） `Character` `React Flow` ⭐⭐⭐ 2026-01-08 新增

**现象**:
- 旁白优化后丢失了角色引用
- 输入: "没错，它就是我们建筑工地上的装载机！ @783316a1d.diggyloade"
- 输出: "一只拟人化的卡通装载机..." ❌ **没有 @username**

**用户反馈**: "角色优化保留昨天都是正常的"

**根本原因**:
控制台日志显示角色匹配失败：
```javascript
{
  "sentence":"没错，它就是我们建筑工地上的装载机！ @783316a1d.diggyloade",
  "referencedUsernames":["783316a1d.diggyloade"],  // ✅ 识别到
  "totalConnected":1,                              // ✅ 有1个连接
  "matchedReferences":0                            // ❌ 匹配0个
}
```

虽然识别到 `@783316a1d.diggyloade`，也有1个连接的角色，但 `matchedReferences: 0` 说明 `latestConnectedCharacters[0].username` !== `"783316a1d.diggyloade"`

**问题代码** (NarratorProcessorNode.jsx Lines 272-274):
```javascript
// ❌ 问题：latestConnectedCharacters 中的角色 username 字段不匹配
const referencedCharacters = latestConnectedCharacters.filter(char =>
  referencedUsernames.includes(char.username)
);

// ✅ 正确：添加调试日志确认数据结构
console.log('[NarratorProcessorNode] 🔍 调试角色匹配:', {
  referencedUsernames,
  latestConnectedCharacters: latestConnectedCharacters.map(c => ({
    id: c.id,
    username: c.username,
    hasUsername: 'username' in c,
    allKeys: Object.keys(c)
  })),
  totalConnected: latestConnectedCharacters.length
});

const referencedCharacters = latestConnectedCharacters.filter(char =>
  referencedUsernames.includes(char.username)
);
```

**关键点**:
1. **数据源头验证**: characters.json 中角色 `username` 是 `"783316a1d.diggyloade"` ✅
2. **引用格式验证**: 用户输入 `@783316a1d.diggyloade` ✅
3. **识别验证**: `referencedUsernames: ["783316a1d.diggyloade"]` ✅
4. **问题定位**: `latestConnectedCharacters[0].username` 与预期不匹配 ❌

**调试步骤**:
1. 添加详细日志打印 `latestConnectedCharacters` 的实际内容
2. 检查 `username` 字段是否存在、值是否正确
3. 追溯数据流：CharacterLibraryNode → NarratorNode → NarratorProcessorNode
4. 根据日志结果修复对应环节

**修复文件**:
- `src/client/src/nodes/process/NarratorProcessorNode.jsx` - Lines 267-281（添加调试日志）

**相关错误**:
- 错误48 - 优化节点错误使用双显示功能导致角色引用丢失
- 错误16 - React Flow 节点间数据传递错误

**修复日期**: 2026-01-08
