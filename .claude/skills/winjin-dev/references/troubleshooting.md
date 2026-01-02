# WinJin AIGC 项目故障排查指南

本文档提供 WinJin AIGC 项目开发中常见问题的诊断和解决方案。

## 🔍 目录

1. [API 调用问题](#api-调用问题)
2. [React Flow 节点问题](#react-flow-节点问题)
3. [Sora2 平台问题](#sora2-平台问题)
4. [角色系统问题](#角色系统问题)
5. [文档更新问题](#文档更新问题)

---

## API 调用问题

### 问题 1: API 返回 404 Not Found

**症状**:
```javascript
const response = await fetch(`${API_BASE}/task/${taskId}`);
// 返回 404
```

**诊断**:
- 检查 API 路径是否缺少 `/api/` 前缀
- 检查后端服务器是否正在运行
- 检查端口是否正确（默认 9000）

**解决方案**:
```javascript
// ✅ 添加 /api/ 前缀
const response = await fetch(`${API_BASE}/api/task/${taskId}`);
```

**相关错误**: 错误17 - API 端点路径缺少前缀

---

### 问题 2: API 返回 429 Rate Limit

**症状**:
- 轮询任务状态时频繁返回 429
- 控制台显示 "Too Many Requests"

**诊断**:
- 检查轮询间隔是否太短（< 30 秒）

**解决方案**:
```javascript
// ✅ 使用 30 秒轮询间隔
const POLL_INTERVAL = 30000; // 30秒
setInterval(() => checkStatus(taskId), POLL_INTERVAL);
```

**相关错误**: 错误6 - 轮询间隔太短

---

### 问题 3: 双平台任务ID不兼容

**症状**:
- 贞贞平台的视频未保存到历史记录
- 控制台显示 "taskId is undefined"

**诊断**:
- 检查是否只处理了 `result.data.id`
- 检查是否忽略了 `result.data.task_id`

**解决方案**:
```javascript
// ✅ 兼容双平台
const taskId = result.data.id || result.data.task_id;
if (taskId) {
  historyStorage.addRecord({ taskId, platform, prompt });
}
```

**相关错误**: 错误1 - 双平台任务ID不兼容

---

## React Flow 节点问题

### 问题 4: useEffect 无限循环

**症状**:
- 浏览器卡死
- 控制台显示大量 "Re-render" 日志

**诊断**:
- 检查 useEffect 依赖数组是否包含 `nodes`
- 检查是否在 useEffect 中调用 `setNodes`

**解决方案**:
```javascript
// ❌ 错误：nodes 在依赖中
useEffect(() => {
  setNodes((nds) => nds.map((node) => ({ ...node, data: newData })));
}, [edges, nodes, setNodes]);

// ✅ 正确：移除 nodes
useEffect(() => {
  setNodes((nds) => nds.map((node) => ({ ...node, data: newData })));
}, [edges, setNodes]);
```

**相关错误**: 错误4、16 - React Flow 无限循环

---

### 问题 5: 节点 ID 获取失败

**症状**:
- `data.id` 返回 undefined
- 节点间数据传递失败

**诊断**:
- 检查是否尝试从 `data` 对象获取节点 ID
- React Flow 的 `data` 只包含自定义数据，不包含节点的 `id`

**解决方案**:
```javascript
// ❌ 错误：data.id 是 undefined
function VideoGenerateNode({ data }) {
  const nodeId = data.id; // undefined
}

// ✅ 正确：使用 useNodeId()
import { useNodeId } from 'reactflow';

function VideoGenerateNode({ data }) {
  const nodeId = useNodeId();
}
```

**相关错误**: 错误16 - React Flow 节点间数据传递错误

---

### 问题 6: 节点 Handle 标签显示不完整

**症状**:
- 节点连接点（Handle）旁边的标签文字显示不完整
- 标签文字被连接点图标遮挡
- 标签文字显示到节点外部

**诊断**:
- 检查是否将 Handle 和标签放在同一个 flex 容器中
- 检查标签是否使用了 `position: absolute` 定位
- 检查节点容器是否预留了足够的 padding

**根本原因**:
React Flow 的 Handle 组件会自动定位到节点边缘（`position: absolute, left: 0` 或 `right: 0`），不参与父容器的 CSS 布局（flex/grid）。如果将 Handle 和标签放在同一个容器中，Handle 会覆盖标签。

**解决方案**:
```javascript
// ❌ 错误：Handle 和标签在同一个容器中
<div style={{ display: 'flex', alignItems: 'center' }}>
  <Handle ... />
  <span>API</span>
</div>

// ✅ 正确：Handle 和标签完全分离
{/* Handle - 独立声明 */}
<Handle
  type="target"
  position={Position.Left}
  id="api-config"
  style={{ background: '#3b82f6', width: 10, height: 10, top: '10%' }}
/>

{/* 标签 - 独立定位 */}
<div style={{ position: 'absolute', left: '18px', top: '10%', transform: 'translateY(-50%)', zIndex: 10 }}>
  <span style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 'bold', whiteSpace: 'nowrap' }}>API</span>
</div>
```

**关键点**:
1. Handle 组件使用 `top` 样式控制垂直位置
2. 标签使用 `position: absolute` + `left/right` + `top` 精确定位
3. 节点容器增加 `paddingLeft` 和 `paddingRight`（如 85px）为标签预留空间
4. 标签使用 `zIndex: 10` 确保在节点内容之上
5. Handle 和标签必须完全分离，独立声明

**相关错误**: 错误22 - React Flow Handle 与标签布局冲突

---

### 问题 7: TaskResultNode 收不到 taskId

**症状**:
- 视频生成成功，但 TaskResultNode 显示"未连接"
- 控制台显示 taskId 未定义

**诊断**:
- 检查是否使用了事件系统
- 检查 connectedSourceId 是否正确传递

**解决方案**:
```javascript
// VideoGenerateNode: 派发事件
window.dispatchEvent(new CustomEvent('video-task-created', {
  detail: { sourceNodeId: nodeId, taskId: id }
}));

// TaskResultNode: 监听事件
useEffect(() => {
  const handleVideoCreated = (event) => {
    const { sourceNodeId, taskId } = event.detail;
    if (data.connectedSourceId === sourceNodeId) {
      setTaskId(taskId);
    }
  };
  window.addEventListener('video-task-created', handleVideoCreated);
  return () => window.removeEventListener('video-task-created', handleVideoCreated);
}, [data.connectedSourceId]);
```

**相关错误**: 错误16 - React Flow 节点间数据传递错误

---

## Sora2 平台问题

### 问题 7: 角色创建返回 404

**症状**:
- POST /sora/v1/characters 返回 404
- 控制台显示 "Not Found"

**诊断**:
- 检查请求体是否包含 `model` 参数
- 检查是否使用了 URL 或 from_task 参数

**解决方案**:
```javascript
// ❌ 错误：传递 model 参数
await axios.post('/sora/v1/characters', {
  model: 'sora-2',  // ❌ 删除此行
  url: videoUrl,
  timestamps: '1,3'
});

// ✅ 正确：不传递 model 参数
await axios.post('/sora/v1/characters', {
  url: videoUrl,
  timestamps: '1,3'
});

// ✅ 推荐：使用 from_task 参数
await axios.post('/sora/v1/characters', {
  from_task: taskId,
  timestamps: '1,3'
});
```

**相关错误**: 错误2 - 角色创建返回 404

---

### 问题 8: 角色引用不生效

**症状**:
- 使用 `@{username}` 角色引用不生效
- 视频生成时忽略了角色

**诊断**:
- 检查角色引用格式是否使用了花括号

**解决方案**:
```javascript
// ❌ 错误：使用花括号
const prompt = '@{6f2dbf2b3.zenwhisper} 在工地上干活';

// ✅ 正确：不使用花括号
const prompt = '@6f2dbf2b3.zenwhisper 在工地上干活';
```

**相关错误**: 错误5 - 角色引用格式错误

---

### 问题 12: 聚鑫平台模型名称不匹配 ⭐ 新增 (2026-01-02)

**症状**:
- API 调用返回 400 Bad Request 或 422 Unprocessable Entity
- 错误信息: "Invalid model" 或 "model not supported"
- 聚鑫平台视频生成失败

**诊断**:
1. 检查 API 请求体中的 `model` 字段
2. 确认 `platform` 参数为 `juxin`
3. 验证 `model` 值是否为 `sora-2-all`

**根本原因**:
聚鑫平台的模型名称与贞贞平台不同：
- 聚鑫: `sora-2-all`
- 贞贞: `sora-2`, `sora-2-pro`

**解决方案**:
```javascript
// ❌ 错误示例
{
  platform: 'juxin',
  model: 'sora-2',  // ❌ 聚鑫不支持
  prompt: '...'
}

// ✅ 正确示例
{
  platform: 'juxin',
  model: 'sora-2-all',  // ✅ 聚鑫正确模型
  prompt: '...'
}

// ✅ 后端自动选择（推荐）
const finalModel = model || (this.platformType === 'JUXIN' ? 'sora-2-all' : 'sora-2');
```

**关键点**:
1. 聚鑫平台必须使用 `sora-2-all`
2. 后端已实现平台自动选择逻辑
3. 前端默认值应设置为 `sora-2-all`（聚鑫平台）
4. 用户手动选择时应限制选项

**相关错误**: 错误39 - 聚鑫平台模型名称错误

---

### 问题 13: Windows 特定问题 (nul 文件、端口占用) ⭐ 新增 (2026-01-02)

**症状**:
- `EADDRINUSE: address already in use :::9000`
- Git 提交时报错: `error: short read while indexing nul`
- 后端服务器无法启动

**诊断**:
```bash
# 检查 nul 文件
dir nul

# 检查端口占用
netstat -ano | findstr :9000

# 查找占用端口的进程
tasklist | findstr node
```

**根本原因**:
1. Windows 保留设备名 `nul` 被意外创建为文件
2. Node.js 进程未完全退出,导致端口占用
3. Git 索引损坏 (nul 文件导致)

**解决方案**:
```bash
# 1. 删除 nul 文件
del nul

# 2. 强制结束所有 Node 进程
taskkill /F /IM node.exe

# 3. 或结束特定 PID
netstat -ano | findstr :9000
# 找到 PID (例如: 12345)
taskkill /F /PID 12345

# 4. 如果 Git 索引损坏
git reset
del .git\index
git checkout HEAD -- .
git add -A
```

**预防措施**:
1. 定期清理 `nul` 文件
2. 使用 `Ctrl+C` 正常停止服务器
3. 避免 `taskkill` 强制结束 (除非必要)
4. 修改代码后先停止服务器再重启

**相关错误**: 无 (Windows 特定问题)

---

## 角色系统问题

### 问题 9: 角色插入替换全部内容

**症状**:
- 点击角色卡片后，整个提示词被替换
- 用户已输入的其他内容丢失

**诊断**:
- 检查是否使用了 `promptElement.value = 新内容` 赋值

**解决方案**:
```javascript
// ❌ 错误：替换全部内容
function handleCharacterChange() {
  const promptElement = document.getElementById('video-prompt');
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

  // 在光标位置插入
  promptElement.value = text.substring(0, start) + refText + text.substring(end);
  promptElement.setSelectionRange(start + refText.length, start + refText.length);
  promptElement.focus();
}
```

**相关错误**: 错误7 - 角色插入替换全部内容

---

### 问题 10: 故事板角色插入失败

**症状**:
- 在故事板模式中点击角色卡片后，角色未插入到场景中
- 角色被插入到其他输入框

**诊断**:
- 检查是否记录了最后焦点的场景输入框

**解决方案**:
```javascript
// 记录最后焦点的场景输入框
let lastFocusedSceneInput = null;

// 为场景输入框添加焦点监听
function setupSceneInputListeners() {
  document.querySelectorAll('.shot-scene').forEach(input => {
    input.addEventListener('focus', (e) => {
      lastFocusedSceneInput = e.target;
    });
  });
}

// 在最后焦点的场景中插入角色引用
function updateStoryboardSceneWithCharacter(username) {
  let targetInput = lastFocusedSceneInput;
  if (!targetInput || !document.body.contains(targetInput)) {
    // 如果没有记录的焦点，尝试使用当前焦点
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

**相关错误**: 错误8 - 故事板未管理焦点状态

---

## 文档更新问题

### 问题 11: 技能和文档不同步

**症状**:
- SKILL.md 和 code.md 中的错误编号不一致
- 开发交接书.md 版本号未更新

**诊断**:
- 检查是否按照更新流程更新所有文档
- 检查是否完成了检查清单

**解决方案**:
1. 按照 [UPDATE.md](UPDATE.md) 的更新流程操作
2. 完成所有文档的更新
3. 运行检查清单验证

**相关文档**: [UPDATE.md](UPDATE.md) - Skill 更新指南

---

## 🛠️ 诊断工具

### 浏览器 DevTools

**控制台日志检查**:
```javascript
// 检查 API 调用
console.log('[API Call]', url, params);

// 检查 React Flow 节点
console.log('[Node Data]', node.id, node.data);

// 检查事件
console.log('[Event]', event.type, event.detail);
```

**网络请求检查**:
- 打开 Network 标签
- 筛选 Fetch/XHR 请求
- 检查请求 URL 和响应状态

### Git 诊断

```bash
# 检查文件修改状态
git status

# 检查文档是否已提交
git log --oneline -5

# 检查文档差异
git diff .claude/skills/winjin-dev/SKILL.md
git diff .claude/rules/code.md
```

---

## 📞 获取帮助

如果问题未在本文档中解决：

1. 检查 [SKILL.md](../SKILL.md) 中的错误模式
2. 查看 [UPDATE.md](UPDATE.md) 中的更新流程
3. 查看 `.claude/rules/code.md` 中的详细错误示例
4. 查看 `用户输入文件夹/开发对话/开发交接书.md` 中的完整记录

---

**最后更新**: 2025-12-31
**维护者**: WinJin AIGC 开发团队
