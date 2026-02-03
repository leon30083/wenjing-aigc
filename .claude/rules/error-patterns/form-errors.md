# 表单/输入相关错误模式

> **说明**: 表单字段、输入验证相关的错误模式

---

## 错误31: 表单字段缺少 id/name 属性 `Form` `可访问性` ⭐

```javascript
// ❌ 错误：表单字段缺少 id 和 name 属性
<input
  type="text"
  value={videoUrl}
  onChange={(e) => setVideoUrl(e.target.value)}
  placeholder="视频 URL"
/>

// ✅ 正确：添加 id 和 name 属性
<input
  id="video-url-input"
  name="videoUrl"
  type="text"
  value={videoUrl}
  onChange={(e) => setVideoUrl(e.target.value)}
  placeholder="视频 URL"
/>
```

**问题**: 浏览器控制台显示警告，表单字段无法被正确识别
**解决方案**: 为所有表单字段添加 `id` 和 `name` 属性

**命名规范**:
- `id`: 使用 kebab-case，描述元素用途，如 `video-url-input`
- `name`: 使用 camelCase，对应变量名，如 `videoUrl`

**修复日期**: 2025-12-31

---

## 错误21: 节点变量重复声明 `Form` `编译` ⭐

```javascript
// ❌ 错误：同一作用域内重复声明 characterEdge
useEffect(() => {
  setNodes((nds) =>
    nds.map((node) => {
      const incomingEdges = edges.filter((e) => e.target === node.id);

      // 第一次声明
      const characterEdge = incomingEdges.find((e) => e.targetHandle === 'character-input');
      if (characterEdge) {
        newData.connectedCharacter = sourceNode.data.selectedCharacter;
      }

      // ... 其他代码 ...

      // 第二次声明 ❌ 导致编译错误
      const characterEdge = incomingEdges.find((e) => e.targetHandle === 'character-input');
      if (characterEdge) {
        newData.connectedSourceId = characterEdge.source;
      }

      return { ...node, data: newData };
    })
  );
}, [edges, setNodes]);

// ✅ 正确：合并逻辑，只声明一次
useEffect(() => {
  setNodes((nds) =>
    nds.map((node) => {
      const incomingEdges = edges.filter((e) => e.target === node.id);

      // 只声明一次，处理所有逻辑
      const characterEdge = incomingEdges.find((e) => e.targetHandle === 'character-input');
      if (characterEdge) {
        const sourceNode = nds.find((n) => n.id === characterEdge.source);

        // 视频生成节点: 获取角色
        if (sourceNode?.data?.selectedCharacter) {
          newData.connectedCharacter = sourceNode.data.selectedCharacter;
        }

        // 角色结果节点: 存储连接源 ID
        if (node.type === 'characterResultNode') {
          newData.connectedSourceId = characterEdge.source;
        }
      }

      return { ...node, data: newData };
    })
  );
}, [edges, setNodes]);
```

**问题**: 同一变量在同一作用域内重复声明导致 Babel 编译错误
**解决方案**: 合并相关逻辑，使用条件分支处理不同场景
