# Context7 MCP 使用指南

## 工作流程

Context7 需要两步操作：

### Step 1: 解析库ID

```
resolve-library-id({
  query: "react",
  libraryName: "react"
})
```

返回结果：
```json
{
  "libraryId": "/facebook/react",
  "name": "React",
  "description": "A JavaScript library for building user interfaces",
  "repository": "https://github.com/facebook/react"
}
```

### Step 2: 查询文档

```
query-docs({
  libraryId: "/facebook/react",
  query: "How to use useState hook?"
})
```

返回结果：
```javascript
// useState example
const [count, setCount] = useState(0);
```

## 常用库ID

| 库名 | libraryId |
|------|-----------|
| React | /facebook/react |
| Vue | /vuejs/core |
| Express | /expressjs/express |
| Vite | /vitejs/vite |

## 使用场景

- 查阅API文档
- 查找代码示例
- 理解库的工作原理
- 获取最新版本信息

## 最佳实践

1. **先解析再查询**: 始终先使用 `resolve-library-id` 获取准确的 libraryId
2. **具体问题**: 在 query 中提供具体问题，而非宽泛的问题
3. **查看示例**: 查询结果通常包含代码示例，可以参考

## 错误处理

**libraryId 未找到**:
- 检查库名称拼写
- 尝试使用更通用的名称

**查询无结果**:
- 重新表述问题
- 检查是否是该库的正确版本

---

**最后更新**: 2026-01-23
**相关**: [05-automation/README.md](../README.md)
