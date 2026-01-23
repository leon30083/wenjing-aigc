# Memory 知识图谱使用指南

## 核心概念

Memory MCP 使用知识图谱存储信息：

- **实体（Entity）**: 具有独立存在的事物
- **关系（Relation）**: 实体之间的连接
- **观察（Observation）**: 关于实体的具体信息

## 工具列表

### 创建和更新

- `create_entities([{name, entityType, observations}])` - 创建实体
- `create_relations([{from, to, relationType}])` - 创建关系
- `add_observations([{entityName, observations}])` - 添加观察

### 查询

- `search_nodes(query)` - 搜索节点
- `open_nodes([name1, name2])` - 打开特定节点
- `read_graph()` - 读取整个知识图谱

### 删除

- `delete_entities([entityName])` - 删除实体
- `delete_relations([{from, to, relationType}])` - 删除关系
- `delete_observations([{entityName, observations}])` - 删除观察

## 使用场景

### 跨会话记忆

```javascript
// 第一天：记录项目信息
create_entities([{
  name: "WinJin",
  entityType: "项目",
  observations: ["Sora2视频生成", "React Flow工作流", "Node.js后端"]
}])

// N天后：查询项目信息
search_nodes("WinJin")
// 返回: 完整的项目信息
```

### 错误知识库

```javascript
// 记录错误
create_entities([{
  name: "错误51",
  entityType: "错误模式",
  observations: ["TaskResultNode轮询竞态条件", "2026-01-07修复"]
}])

// 查询相关错误
search_nodes("竞态条件")
// 返回: 所有包含"竞态条件"的节点
```

## 最佳实践

1. **实体命名**: 使用清晰、唯一的名称（如"VideoGenerateNode"而非"节点"）
2. **观察精简**: 每个观察应该是独立的事实（便于搜索）
3. **关系维护**: 及时更新实体之间的关系（保持图谱准确）
4. **定期清理**: 删除过时的实体和观察（避免知识图谱膨胀）

## 数据结构示例

```json
{
  "entities": [
    {
      "name": "WinJin",
      "entityType": "项目",
      "observations": [
        "Sora2视频生成",
        "React Flow工作流",
        "Node.js后端"
      ]
    }
  ],
  "relations": [
    {
      "from": "VideoGenerateNode",
      "to": "TaskResultNode",
      "relationType": "generates"
    }
  ]
}
```

## 常见问题

### Q: 如何查找特定实体？

A: 使用 `search_nodes("实体名称")` 搜索，支持模糊匹配。

### Q: 如何更新实体信息？

A: 使用 `add_observations()` 添加新的观察，或使用 `delete_entities()` + `create_entities()` 重建实体。

### Q: 关系类型有限制吗？

A: 没有，关系类型可以是任意字符串。建议使用动词形式（如"generates", "depends_on"）。

---

**最后更新**: 2026-01-23
**相关**: [05-automation/README.md](../README.md)
