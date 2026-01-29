# E2E测试工作流手动加载指南

> **创建日期**: 2026-01-18
> **用途**: 提供预配置的测试工作流，用于手动验证可视化界面和功能

---

## 测试工作流文件

### 1. 完整功能测试 (`test-workflow-complete.json`)

**包含节点**:
- 文本节点 (id: 1)
- 参考图片节点 (id: 2)
- 角色库节点 (id: 4)
- API配置节点 (id: 5)
- 视频生成节点 (id: 6)
- 提示词优化节点 (id: 7)
- 角色创建节点 (id: 8)
- 故事板节点 (id: 9)
- 任务结果节点 (id: 10)
- 角色结果节点 (id: 11)

**包含连接** (9条):
1. 文本节点 → 视频生成 (prompt)
2. 角色库 → 视频生成 (character)
3. 参考图片 → 视频生成 (images)
4. API配置 → 视频生成 (api)
5. 文本节点 → 提示词优化
6. 提示词优化 → 视频生成
7. 视频生成 → 任务结果
8. 角色创建 → 角色结果
9. 视频生成 → 故事板

**验证点**:
- ✅ 所有节点类型正确渲染
- ✅ 所有Handle位置正确
- ✅ 连接线正确显示
- ✅ 数据流向可视化

---

### 2. 基础连接测试 (`test-workflow-simple.json`)

**包含节点**:
- 文本节点 (id: 1)
- 角色库节点 (id: 4)
- 视频生成节点 (id: 6)
- 任务结果节点 (id: 10)

**包含连接** (3条):
1. 文本节点 → 视频生成
2. 角色库 → 视频生成
3. 视频生成 → 任务结果

**验证点**:
- ✅ Error 55 修复验证（角色数据流）
- ✅ 文本提示词传递
- ✅ 任务结果接收

---

## 加载步骤

### 方法 1: 通过浏览器控制台加载

1. **打开应用**
   ```
   http://localhost:5173
   ```

2. **打开浏览器开发者工具**
   - 按 `F12` 或 `Ctrl+Shift+I`

3. **切换到 Console 标签**

4. **复制粘贴以下代码**

   ```javascript
   // 加载完整测试工作流
   async function loadTestWorkflow() {
     const response = await fetch('/test-workflow-complete.json');
     const workflow = await response.json();

     // 保存到 localStorage
     const workflows = JSON.parse(localStorage.getItem('winjin-workflows') || '{}');
     workflows[workflow.name] = workflow;
     localStorage.setItem('winjin-workflows', JSON.stringify(workflows));

     // 触发重新加载
     window.location.reload();
   }

   loadTestWorkflow();
   ```

5. **刷新页面** - 工作流会自动加载

---

### 方法 2: 通过应用UI导入

如果应用有"导入工作流"功能：

1. 打开应用
2. 点击"导入工作流"按钮
3. 选择 `test-workflow-complete.json` 或 `test-workflow-simple.json`
4. 点击"加载"

---

### 方法 3: 直接通过 localStorage

1. 打开应用 (http://localhost:5173)
2. 打开开发者工具 (F12)
3. 切换到 Console
4. 运行以下命令：

   ```javascript
   // 读取工作流文件内容（需要提前复制文件内容）
   const workflowData = {
     // 粘贴 test-workflow-complete.json 的内容
   };

   // 保存到 localStorage
   const workflows = {};
   workflows[workflowData.name] = workflowData;
   localStorage.setItem('winjin-workflows', JSON.stringify(workflows));

   // 刷新页面
   window.location.reload();
   ```

---

## 验证检查清单

加载工作流后，验证以下内容：

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

1. **文本节点 → 视频生成**
   - 在文本节点输入："测试提示词"
   - 检查视频生成节点的 prompt 字段是否更新

2. **角色库 → 视频生成 (Error 55)**
   - 在角色库选择角色
   - 检查视频生成节点的 connectedCharacters 字段
   - 应该包含完整的角色对象（不是仅ID）

3. **视频生成 → 任务结果**
   - 执行视频生成
   - 检查任务结果节点是否显示结果

---

## 手动连接测试

如果需要测试手动拖拽连接：

1. **清空画布**（如果已有节点）
2. **添加节点**:
   - 点击"添加节点"按钮
   - 选择"文本节点"
   - 重复添加"角色库"、"视频生成"、"任务结果"

3. **创建连接**:
   - 找到文本节点的右侧Handle（蓝色圆点）
   - 拖拽到视频生成节点的左侧Handle
   - 应该看到一条连接线出现

4. **验证连接**:
   - 打开控制台，运行:
     ```javascript
     window.__REACT_FLOW_TEST_API__.getEdges()
     ```
   - 应该看到刚才创建的连接

---

## 故障排查

### 问题: 工作流加载后没有显示

**解决方法**:
1. 检查浏览器控制台是否有错误
2. 确认 JSON 文件格式正确
3. 清除 localStorage 后重新加载:
   ```javascript
   localStorage.clear();
   window.location.reload();
   ```

### 问题: 节点显示但连接线不显示

**这是正常的**！
- 手动拖拽的连接会显示连接线
- 通过 Test API 或 JSON 加载的连接可能不显示（React Flow 限制）
- 但数据会正确传递

验证连接存在：
```javascript
window.__REACT_FLOW_TEST_API__.getEdges()
```

### 问题: 数据没有在节点间传递

**检查步骤**:
1. 打开控制台
2. 检查节点数据:
   ```javascript
   window.__REACT_FLOW_TEST_API__.getNodes()
   ```
3. 查看 App.jsx 中的 useEffect 是否正确监听 edges 变化

---

## 自动化测试 vs 手动测试

| 测试类型 | 验证内容 | 优点 | 缺点 |
|---------|---------|------|------|
| **Playwright自动化** | 状态正确性 | 快速、可重复 | 看不到可视化效果 |
| **手动测试** | 用户体验、视觉效果 | 真实用户场景 | 耗时、不可重复 |

**建议**: 两者结合使用
- 开发阶段：使用自动化测试快速验证
- 发布前：使用手动测试确认用户体验

---

## 附加：生成自定义工作流

如果需要生成自定义测试工作流：

1. 打开应用并手动创建工作流
2. 打开控制台运行:
   ```javascript
   const nodes = window.__REACT_FLOW_TEST_API__.getNodes();
   const edges = window.__REACT_FLOW_TEST_API__.getEdges();
   const workflow = {
     name: "我的测试工作流",
     description: "自定义测试场景",
     nodes,
     edges,
     createdAt: new Date().toISOString(),
     updatedAt: new Date().toISOString()
   };
   console.log(JSON.stringify(workflow, null, 2));
   ```
3. 复制输出的 JSON 并保存为文件

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
