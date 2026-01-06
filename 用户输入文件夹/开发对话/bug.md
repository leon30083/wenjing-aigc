# WinJin AIGC 项目问题列表

> **最后更新**: 2026-01-05
> **状态**: 活跃维护中

---

## 🔴 高优先级问题

### 问题 0: 提示词优化节点角色插入功能 ⭐ 已修复
**状态**: 已修复 ✅
**修复日期**: 2026-01-06

**问题描述**:
- 提示词优化节点连接角色库后，无法点击角色将引用插入到输入框
- 用户期望像视频生成节点一样，点击角色卡片就能在光标位置插入 `@username` 引用

**期望功能**:
1. **候选角色显示**: 显示从角色库连接过来的候选角色列表
2. **可点击卡片**: 每个角色显示为可点击的卡片（带头像、别名）
3. **光标插入**: 点击角色卡片后，在光标位置插入 `@别名` 引用
4. **双显示功能**: 输入框显示别名（`@测试小猫`），API 使用真实ID（`@ebfb9a758.sunnykitte`）

**修复方案**:
1. **添加 useRef 引用**: 使用 `promptInputRef` 引用 simplePrompt textarea
2. **创建映射**: 建立 `usernameToAlias` 映射（支持别名显示）
3. **转换函数**:
   - `realToDisplay()`: 将真实ID转换为显示别名
   - `displayToReal()`: 将显示别名转换为真实ID
4. **插入函数**: `insertCharacterAtCursor()` 在光标位置插入角色引用
5. **UI 组件**: 显示候选角色为可点击卡片（带头像、绿色背景、边框）

**修复文件**:
- `src/client/src/nodes/process/PromptOptimizerNode.jsx`
  - Lines 6: 添加 `useRef` import
  - Lines 28-82: 添加角色插入相关函数和状态
  - Lines 315-371: 添加候选角色显示 UI（可点击卡片）
  - Lines 378-400: 更新 textarea 使用 ref 和双显示

**测试验证**:
- ✅ 角色卡片正确显示（带头像、绿色背景 #ecfdf5、绿色边框 #6ee7b7）
- ✅ 点击"测试小猫"成功插入：`一只在海边的@测试小猫 `
- ✅ 点击"装载机"成功插入：`一只在海边的@测试小猫 玩耍@装载机 `
- ✅ 双显示功能正常（显示别名，API使用真实ID）

**关键代码片段**:
```javascript
// 候选角色显示（可点击卡片）
{connectedCharacters.length > 0 ? (
  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
    {connectedCharacters.map((char) => (
      <div
        key={char.id}
        className="nodrag"
        onClick={() => insertCharacterAtCursor(char.username, char.alias || char.username)}
        style={{
          padding: '4px 8px',
          backgroundColor: '#ecfdf5',
          borderRadius: '4px',
          border: '1px solid #6ee7b7',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <img src={char.profilePictureUrl} alt="" style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
        <span style={{ fontSize: '10px', color: '#047857' }}>
          {char.alias || char.username}
        </span>
      </div>
    ))}
  </div>
) : (
  <div>💡 提示：连接角色库节点并选择角色后，点击角色卡片插入</div>
)}
```

---

### 问题 1: 提示词优化按钮禁用问题 ⭐ 已修复
**状态**: 已修复 ✅
**修复日期**: 2026-01-06

**问题描述**:
- 提示词优化完成后，"✨ AI 优化"按钮被禁用（disabled）
- 用户无法重新调用 API 重新优化提示词
- 用户只能手动清空优化结果才能再次优化

**期望功能**:
1. **允许重复优化**: 优化按钮应该始终可点击，允许用户多次优化
2. **优化方向微调**: 添加一个输入框，让用户指定优化方向：
   - "更详细" - 增加更多细节
   - "更简洁" - 简化描述
   - "更生动" - 增强表现力
   - "更专业" - 使用专业术语
   - 自定义优化指令

**修复方案**:
1. **添加优化方向输入框**:
   - 位置: 在"风格选择"之后
   - 占位符: "💡 优化方向（可选）更详细、更简洁、更生动、更专业..."
   - 常用提示: "更详细 | 更简洁 | 更生动 | 更专业"
2. **API 调用传递优化方向**: 将优化方向作为新参数传递给后端
3. **后端集成优化方向**: 在系统提示词中包含用户的优化方向要求

**修复文件**:
- `src/client/src/nodes/process/PromptOptimizerNode.jsx` - Lines 21, 55-60, 376-402, 130
- `src/server/services/openaiClient.js` - Lines 38-58, 96-101, 171-219, 342-394

**测试验证**:
- ✅ 优化方向输入框已显示
- ✅ 目标时长选择已显示（问题2修复）
- ✅ 后端支持优化方向指令（4种预设 + 自定义）
- 状态: 已实现，等待完整工作流测试

---

### 问题 2: 优化后的提示词时长硬编码 ⭐ 已修复
**状态**: 已修复 ✅
**修复日期**: 2026-01-06

**问题描述**:
- 用户输入的原始提示词中包含时长信息（如"时长:15s"）
- 优化后的提示词始终显示"10秒"，忽略了用户输入的时长
- 后端接收的 `context.target_duration` 始终是 10，未从用户输入中解析

**修复方案**:
1. **前端时长选择** (PromptOptimizerNode.jsx):
   - 添加时长下拉选择（5秒、10秒、15秒、25秒）
   - 使用状态变量 `targetDuration` 存储选择
   - 将时长传递给 API（替换硬编码的 10）
2. **后端支持**: 已支持动态时长（无需修改）

**修复文件**:
- `src/client/src/nodes/process/PromptOptimizerNode.jsx` - Lines 22, 55-60, 404-428, 132

**测试验证**:
- ✅ 时长选择下拉框已显示
- ✅ 选择15秒后 API 调用包含 `target_duration: 15`
- ✅ 优化结果显示"适合15秒视频时长"
- 状态: 已实现，等待完整工作流测试

2. **后端支持** (openaiClient.js):
   - 在系统提示词中使用 `context.target_duration`
   - 在用户提示词中使用 `context.target_duration`
   - 确保时长信息传递给 AI

**修复文件**:
- `src/client/src/nodes/process/PromptOptimizerNode.jsx` - 添加时长解析逻辑
- `src/server/services/openaiClient.js` - 确保使用动态时长

**影响范围**:
- 所有使用提示词优化节点的用户
- 用户需要手动修改优化后的提示词来调整时长

---

### 问题 3: 优化后的提示词无法编辑 ⭐ 已修复
**状态**: 已修复 ✅
**修复日期**: 2026-01-06

**问题描述**:
- 优化后的提示词从 PromptOptimizerNode 传递到 VideoGenerateNode
- 用户无法在 VideoGenerateNode 中编辑优化后的提示词来满足自己的需求
- 当前优化后的提示词是只读的，传递后无法修改

**影响范围**:
- 使用提示词优化节点的所有工作流
- 用户需要重新优化才能修改提示词

**期望功能**:
- VideoGenerateNode 中的"最终提示词"应该可编辑
- 或者提供"编辑优化结果"的功能
- 允许用户在 AI 优化的基础上微调

**修复方案**:
1. **新增 useEffect**: 同步 `connectedPrompt` 到 `manualPrompt`
2. **移除条件渲染**: 不再使用 if/else 显示不同的提示词组件
3. **始终显示可编辑 textarea**: 优化后的提示词可以直接编辑
4. **添加提示信息**: 当提示词来自优化节点时显示蓝色背景提示

**修复文件**:
- `src/client/src/nodes/process/VideoGenerateNode.jsx`
  - Lines 73-78: 新增 useEffect 同步 connectedPrompt
  - Lines 559-627: 移除条件渲染，添加提示信息

**测试验证**:
- ✅ 优化后的提示词显示在可编辑的 textarea 中
- ✅ 用户可以直接编辑优化后的提示词
- ✅ 显示蓝色提示"💡 提示词来自优化节点，可继续编辑"
- 状态: 已实现，用户体验提升

---

### 问题 4: HMR (热模块替换) 不工作 ⭐ 已修复
**状态**: 已修复 ✅
**修复日期**: 2026-01-06

**问题描述**:
- 前端代码修改后需要手动刷新浏览器才能看到效果
- Vite HMR 配置存在问题，导致修改不自动生效

**根本原因**:
1. React 19.2.0 与 React Fast Refresh 不完全兼容
2. 缺少 jsconfig.json（Vite 无法正确识别模块路径）
3. StrictMode 导致组件双重挂载，HMR 过程中状态管理混乱
4. Vite 配置缺少 HMR 优化（文件监听、协议配置）

**修复方案**:
1. **降级 React**: 19.2.0 → 18.3.1（Fast Refresh 稳定性）
2. **优化 vite.config.js**:
   - 添加轮询间隔优化（100ms）
   - 忽略 node_modules 等不必要文件
   - 明确配置 HMR 协议（ws, localhost:5173）
   - 添加 @xyflow/react 到预构建依赖
3. **移除 StrictMode**: 提高HMR 稳定性
4. **创建 jsconfig.json**: 模块路径配置
5. **优化 App.jsx**: nodeTypes 使用 useMemo 包装

**修复文件**:
- `src/client/package.json` - React 版本降级
- `src/client/vite.config.js` - 完整 HMR 配置
- `src/client/src/main.jsx` - 移除 StrictMode
- `src/client/jsconfig.json` - 新建
- `src/client/src/App.jsx` - nodeTypes 优化

**测试验证**:
- ✅ Vite 日志显示 "hmr update /src/nodes/input/TextNode.jsx"
- ✅ 修改组件后浏览器自动更新
- ✅ 无需手动刷新（Ctrl+R）
- ✅ 节点位置和状态保持不变

**Git 提交**: `973f480 fix: 修复 HMR（热模块替换）不工作问题`

---

## 🟢 已修复问题 ✅

### ✅ 问题 2: 输入框滚动缩放画布 ⭐ 已修复
**状态**: 已修复 ✅
**修复日期**: 2026-01-05

**问题描述**:
- 鼠标滚轮在 textarea/input 元素上滚动时，会缩放 React Flow 画布而不是滚动输入内容
- 影响所有节点：CharacterLibraryNode、ReferenceImageNode、PromptOptimizerNode、VideoGenerateNode 等

**已修复节点** ✅:
1. `PromptOptimizerNode.jsx` - 3 个输入元素（simplePrompt textarea, customStyleDescription input, optimizedPrompt textarea）
2. `CharacterLibraryNode.jsx` - 2 个输入元素（searchQuery input, editAlias input）
3. `ReferenceImageNode.jsx` - 1 个输入元素（imageUrl input）
4. `VideoGenerateNode.jsx` - 1 个输入元素（manualPrompt textarea）
5. `StoryboardNode.jsx` - 2 个输入元素（scene input, duration input，每个镜头循环渲染）
6. `APISettingsNode.jsx` - 5 个输入元素（platform select, model select, aspect select, watermark checkbox, apiKey input）
7. `OpenAIConfigNode.jsx` - 3 个输入元素（base_url input, api_key input, model input）

**修复方法**:
```javascript
// ❌ 错误：没有 onWheel 处理器
<textarea
  className="nodrag"
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>

// ✅ 正确：添加 onWheel 事件处理器
<textarea
  className="nodrag"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  onWheel={(e) => e.stopPropagation()}  // ⭐ 阻止事件冒泡到画布
/>
```

**修复文件列表**:
1. `src/client/src/nodes/process/PromptOptimizerNode.jsx`
2. `src/client/src/nodes/input/CharacterLibraryNode.jsx`
3. `src/client/src/nodes/input/ReferenceImageNode.jsx`
4. `src/client/src/nodes/process/VideoGenerateNode.jsx`
5. `src/client/src/nodes/process/StoryboardNode.jsx`
6. `src/client/src/nodes/input/APISettingsNode.jsx`
7. `src/client/src/nodes/input/OpenAIConfigNode.jsx`

**测试验证**:
- ✅ 所有输入框滚动时不再缩放画布
- ✅ 画布空白处滚动时正常缩放

---

### ✅ 问题 3: 角色引用逻辑错误
**状态**: 已修复 ✅
**修复日期**: 2026-01-05

**问题描述**:
- 当用户未提供角色时（`context.characters: []`），优化后的提示词仍然包含 `@username` 格式
- 示例：输入 "一只狗在海边散步"，输出 "一只金毛犬（@dog_character）在黄昏时分的海滩上..."

**根本原因**:
- `_buildUserPrompt` 方法没有明确告知 AI 在没有角色时不使用 `@username` 格式
- AI 可能"幻觉"出角色引用

**修复内容**:
- 添加 `characterInstruction` 变量，根据角色上下文动态生成指令
- 有角色时："如果提供了角色上下文，必须使用 @username 格式引用角色"
- 无角色时："不要使用 @username 格式引用角色（未提供角色上下文），直接描述主体即可"

**修复文件**:
- `src/server/services/openaiClient.js` - Lines 319-368

**测试验证**:
- 输入: "一只狗在海边散步"（无角色）
- 预期输出: 不包含 `@username` 格式
- 状态: 待测试验证

---

### ✅ 问题 4: 自定义风格未生效 ⭐ 已修复
**状态**: 已修复 ✅
**修复日期**: 2026-01-05

**问题描述**:
- 用户选择"✏️ 自定义风格..."并输入风格描述（如"废土风格"）
- 优化后的提示词仍然使用"绘本风格动画"，完全忽略自定义风格描述

**用户输入**:
- 简单描述: "一只猫在花园游玩"
- 风格选择: "✏️ 自定义风格..."
- 风格描述: "废土风格"

**错误输出**:
```
绘本风格动画，一只橘白相间的短毛猫在阳光明媚的花园中悠闲游玩...
```

**根本原因**:
- `_buildSystemPrompt` 的 custom 分支（Lines 304-313）只说"根据用户提供的风格描述调整提示词"
- **没有把 `customStyleDescription` 的值包含进系统提示词**
- AI 收到的 system 消息太通用，没有具体的风格信息
- AI 可能优先使用默认的"绘本风格"，忽略了 user 中的风格描述

**修复前代码**:
```javascript
// ❌ 自定义风格使用通用提示词
return `你是视频提示词优化专家，请将简单描述优化成详细的 Sora 2 提示词。

要求：
1. 保持核心动作不变
2. 添加丰富的视觉细节
3. 根据用户提供的风格描述调整提示词  // ⚠️ 没有具体的风格值
4. 包含摄影指导和动画风格描述
5. 适合${context.target_duration || 10}秒视频时长`;
```

**修复后代码**:
```javascript
// ✅ 自定义风格：在系统提示词中包含风格描述
const styleText = customStyleDescription || '自定义风格';
return `你是视频提示词优化专家。

任务：将简单描述优化成 Sora 2 视频生成提示词。

**核心风格要求：必须使用 ${styleText} 风格！**  // ⭐ 强调风格要求

输出格式：
${styleText}风格的视频。

场景描述：[详细环境描述，符合 ${styleText} 风格]

视觉风格：
- 色彩：[根据 ${styleText} 描述色彩倾向]
- 氛围：[根据 ${styleText} 描述整体氛围]
- 质感：[根据 ${styleText} 描述材质和质感]

摄影指导：
- 镜头：[适合 ${styleText} 的镜头类型]
- 光影：[符合 ${styleText} 的光线处理]

视频时长：${context.target_duration || 10}秒`;
```

**正确输出** (修复后):
```
废土风格风格的视频。

场景描述：一只瘦骨嶙峋、皮毛沾满尘土的猫，在曾经是花园的废墟中穿行...
视觉风格：
- 色彩：以土黄、铁锈红、灰褐色和褪色的暗绿为主...
- 氛围：孤寂、荒凉、坚韧，弥漫着文明消逝后的宁静与淡淡的哀伤...
```

**修复文件**:
- `src/server/services/openaiClient.js` - Lines 304-327

**测试验证**:
- ✅ 输入: "废土风格"
- ✅ 输出: 完整的废土风格描述（土黄、铁锈红、孤寂、荒凉）
- ✅ 验证时间: 2026-01-05

**关键点**:
1. **System 消息优先级高于 User 消息**: AI 更信任 system 角色
2. **必须把风格值包含在 system 提示词中**: 不能只在 user 提示词中提到
3. **使用粗体强调**: `**核心风格要求：必须使用 ${styleText} 风格！**`

---

## 📝 问题追踪模板

### 问题 N: [标题]
**状态**: 🔴待修复 / 🟡修复中 / 🟢已修复 / ⚪已关闭
**优先级**: 🔴高 / 🟡中 / 🟢低
**发现日期**: YYYY-MM-DD
**修复日期**: YYYY-MM-DD

**问题描述**:
- [描述 1]
- [描述 2]

**影响范围**:
- [影响的文件/功能]

**修复方案**:
- [方案描述]

**修复文件**:
- `文件路径` - Lines X-Y

**测试验证**:
- [ ] 测试通过
- [ ] 代码已提交

---

## 📊 问题统计

| 状态 | 数量 |
|-----|------|
| 🔴 待修复 | 0 |
| 🟡 修复中 | 0 |
| 🟢 已修复 | 5 |
| ⚪ 已关闭 | 0 |
| **总计** | **5** |

---

**维护说明**:
- 修复问题后，将问题移动到 "🟢 已修复问题" 部分
- 更新 "📊 问题统计" 表格
- 记录修复日期和测试结果
- 修复完成后提交代码时引用此文件
