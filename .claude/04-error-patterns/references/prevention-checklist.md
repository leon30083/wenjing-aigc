---

paths: *

---

# 预提交检查清单

> **版本**: v2.0.0
> **更新日期**: 2026-01-18
> **用途**: 防止已知错误再次发生

---

## 使用说明

在提交代码之前，**必须**完成以下检查：

- ✅ **已完成**: 该项检查通过
- ⚠️ **需修复**: 该项检查未通过，必须修复后才能提交
- ⏭️ **不适用**: 该项检查不适用于当前改动

---

## 1. API 调用检查

### 1.1 API 端点路径 ⚠️ 关键

- [ ] 所有 API 调用使用完整路径（包含 `/api/` 前缀）
  ```javascript
  // ✅ 正确
  const response = await fetch(`${API_BASE}/api/task/${taskId}`);

  // ❌ 错误
  const response = await fetch(`${API_BASE}/task/${taskId}`);
  ```

- [ ] 不硬编码 API 端点 URL
  ```javascript
  // ✅ 正确
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:9000';

  // ❌ 错误
  const API_URL = 'https://api.jxincm.cn';
  ```

**参考错误**: 错误3, 错误17

---

### 1.2 平台兼容性 ⚠️ 关键

- [ ] API 调用传递 `platform` 参数（`juxin` 或 `zhenzhen`）
- [ ] 任务ID 兼容双平台格式（`id` 和 `task_id`）
  ```javascript
  // ✅ 正确
  const taskId = result.data.id || result.data.task_id;
  ```

- [ ] 模型名称根据平台自动选择
  ```javascript
  // ✅ 正确
  const finalModel = model || (platform === 'juxin' ? 'sora-2-all' : 'sora-2');
  ```

**参考错误**: 错误1, 错误38, 错误39

---

### 1.3 轮询配置 ⚠️ 关键

- [ ] 轮询间隔 ≥ 30 秒（Sora2 生成需 3-5 分钟）
  ```javascript
  // ✅ 正确
  const POLL_INTERVAL = 30000;

  // ❌ 错误
  const POLL_INTERVAL = 5000;  // 太短，会导致 429 错误
  ```

- [ ] 添加 24 小时超时限制
  ```javascript
  // ✅ 正确
  const MAX_POLLING_AGE = 24 * 60 * 60 * 1000; // 24小时
  ```

**参考错误**: 错误6, 错误46

---

## 2. 角色引用检查

### 2.1 角色引用格式 ⚠️ 关键

- [ ] 角色引用使用真实 ID（`@username`），不使用别名（`@alias`）
  ```javascript
  // ✅ 正确
  const prompt = '@ebfb9a758.sunnykitte 在海边玩';

  // ❌ 错误
  const prompt = '@测试小猫 在海边玩';
  ```

- [ ] 优化节点（PromptOptimizerNode）不使用双显示功能
- [ ] 角色引用在优化结果中保留
- [ ] 不描述角色外观（Sora2 会使用角色真实外观）

**参考错误**: 错误48, 错误55

---

### 2.2 双显示功能

- [ ] 优化节点输入框：直接显示真实 ID（`@ebfb9a758.sunnykitte`）
- [ ] 视频生成节点输入框：显示别名（`@测试小猫`），API 使用真实 ID
- [ ] 角色卡片：显示 `别名 (@username)` 格式

**参考错误**: 错误48

---

## 3. React Flow 检查

### 3.1 useEffect 依赖 ⚠️ 关键

- [ ] useEffect 依赖数组不包含 `data` 对象
  ```javascript
  // ❌ 错误
  useEffect(() => {
    // ...
  }, [data]);  // data 对象每次渲染都是新引用

  // ✅ 正确
  useEffect(() => {
    // ...
  }, [data.value, data.onSizeChange]);  // 只依赖真正变化的值
  ```

- [ ] 使用 `useRef` 存储回调函数
  ```javascript
  // ✅ 正确
  const onSizeChangeRef = useRef(data.onSizeChange);
  useEffect(() => {
    onSizeChangeRef.current = data.onSizeChange;
  }, [data.onSizeChange]);
  ```

**参考错误**: 错误4, 错误29, 错误37

---

### 3.2 节点内交互元素

- [ ] 所有交互元素添加 `className="nodrag"`
  ```javascript
  // ✅ 正确
  <textarea className="nodrag" />
  <select className="nodrag">...</select>
  <input className="nodrag" type="checkbox" />
  <button className="nodrag">生成</button>
  ```

- [ ] 不使用 `e.stopPropagation()`（React Flow 使用捕获阶段）

**参考错误**: 错误30

---

### 3.3 Handle 和标签布局

- [ ] Handle 和标签完全分离，各自独立定位
- [ ] Handle 使用 `top` 样式控制垂直位置
- [ ] 标签使用 `position: absolute` + `left/right` + `top` 精确定位
- [ ] 节点容器增加 `paddingLeft` 和 `paddingRight`（如 85px）

**参考错误**: 错误22

---

### 3.4 节点连接验证

- [ ] App.jsx 实现节点连接验证（类型白名单）
- [ ] 输入端口只接受特定类型的源节点
  ```javascript
  // ✅ 正确
  const validCharacterSourceTypes = ['characterLibraryNode'];
  if (sourceNode && validCharacterSourceTypes.includes(sourceNode.type)) {
    newData.connectedCharacters = sourceNode.data.connectedCharacters;
  } else {
    newData.connectedCharacters = undefined;  // 清除数据
  }
  ```

**参考错误**: 错误26

---

## 4. 状态管理检查

### 4.1 useState 同步到 node.data ⚠️ 关键

- [ ] useState 从 `data` 属性初始化
  ```javascript
  // ✅ 正确
  const [manualPrompt, setManualPrompt] = useState(data.manualPrompt || '');
  ```

- [ ] useState 变化时同步到 `node.data`
  ```javascript
  // ✅ 正确
  useEffect(() => {
    if (manualPrompt !== data.manualPrompt) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, manualPrompt } }
            : node
        )
      );
    }
  }, [manualPrompt, nodeId, setNodes, data.manualPrompt]);
  ```

- [ ] 在 `getNodes()` 之前手动调用 `setNodes()` 确保数据同步

**参考错误**: 错误16, 错误33, 错误53

---

### 4.2 节点间数据传递

- [ ] 源节点直接更新目标节点（绕过 App.jsx）
  ```javascript
  // ✅ 正确
  setNodes((nds) =>
    nds.map((node) => {
      // 更新自己
      if (node.id === nodeId) {
        return { ...node, data: { ...node.data, selectedCharacters } };
      }
      // 直接更新目标节点
      const isConnected = outgoingEdges.some(e => e.target === node.id);
      if (isConnected) {
        return { ...node, data: { ...node.data, connectedCharacters } };
      }
      return node;
    })
  );
  ```

**参考错误**: 错误16, 错误52

---

## 5. 表单和输入检查

### 5.1 表单字段属性

- [ ] 所有表单字段添加 `id` 和 `name` 属性
  ```javascript
  // ✅ 正确
  <input
    id="video-url-input"
    name="videoUrl"
    type="text"
    value={videoUrl}
    onChange={(e) => setVideoUrl(e.target.value)}
  />
  ```

**参考错误**: 错误31

---

### 5.2 变量声明顺序

- [ ] 函数必须在 Hook 调用之前声明
  ```javascript
  // ✅ 正确
  const updateShot = (shotId, field, value) => {
    setShots((prevShots) =>
      prevShots.map((shot) =>
        shot.id === shotId ? { ...shot, [field]: value } : shot
      )
    );
  };

  const insertCharacterToScene = useSceneCharacterInsertion(
    realToDisplay,
    displayToReal,
    updateShot  // ✅ updateShot 已声明
  );
  ```

**参考错误**: 错误21, 错误43

---

## 6. UI 渲染检查

### 6.1 React 子元素规则

- [ ] 不直接渲染 JavaScript 对象
  ```javascript
  // ❌ 错误
  {error && <div>{error}</div>}

  // ✅ 正确
  {error && (
    <div>
      {typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}
    </div>
  )}
  ```

**参考错误**: 错误44

---

### 6.2 CSS 语法

- [ ] border 颜色值不加引号
  ```javascript
  // ✅ 正确
  border: '1px solid #fcd34d'

  // ❌ 错误
  border: '1px solid \'#fcd34d\''
  ```

**参考错误**: 错误42

---

### 6.3 图片加载

- [ ] 图片添加 `display: block` 和 `flexShrink: 0` 防止布局抖动
  ```javascript
  // ✅ 正确
  <img
    src={url}
    style={{
      width: '32px',
      height: '32px',
      display: 'block',
      flexShrink: 0,
    }}
  />
  ```

**参考错误**: 错误47

---

## 7. 持久化检查

### 7.1 localStorage 数据验证

- [ ] 使用 try-catch 捕获 JSON.parse 错误
- [ ] 验证数据格式（Array.isArray 等）
- [ ] 提供安全的默认值

**参考错误**: 错误18, 错误19

---

### 7.2 工作流自动保存

- [ ] 优化完成后派发事件自动保存工作流
  ```javascript
  // ✅ 正确
  window.dispatchEvent(new CustomEvent('narrator-optimization-complete', {
    detail: { nodeId, sentencesCount: results.length }
  }));
  ```

**参考错误**: 错误53

---

## 8. 高频错误专项检查

### Top 5 错误（必查）

- [ ] **错误1**: 双平台任务ID兼容 `const taskId = result.data.id || result.data.task_id`
- [ ] **错误6**: 轮询间隔 ≥ 30 秒
- [ ] **错误17**: API 端点包含 `/api/` 前缀
- [ ] **错误48**: 优化节点使用真实 ID（不使用双显示）
- [ ] **错误29**: useEffect 依赖数组不包含 `data`

---

## 9. 自动化检查工具

### ESLint 规则

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    // 禁止 child_process
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['child_process', 'request'],
        message: '使用 axios 而非 child_process 或 request（约束 #5）'
      }]
    }],

    // 禁止硬编码 URL
    'no-restricted-properties': ['error', {
      object: 'fetch',
      property: 'url',
      message: '使用相对路径或环境变量（约束 #29）'
    }]
  }
};
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "🔍 运行预提交检查..."

# 1. ESLint 检查
echo "📋 ESLint 检查..."
npm run lint || exit 1

# 2. 类型检查
echo "🔬 TypeScript 类型检查..."
npx tsc --noEmit || exit 1

# 3. 测试
echo "🧪 运行测试..."
npm test || exit 1

echo "✅ 预提交检查通过！"
```

---

## 10. 提交前最终检查

- [ ] 所有代码已通过 ESLint 检查
- [ ] 所有测试已通过
- [ ] 文档已更新（SKILL.md、error-patterns.md）
- [ ] 版本号已更新
- [ ] 变更说明已记录
- [ ] 冲突已解决
- [ ] 不包含调试代码（console.log、debugger）
- [ ] 不包含硬编码敏感信息（API Key、密码）

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team

**使用流程**:
1. 开发功能 → 2. 运行测试 → 3. 完成检查清单 → 4. 提交代码
