# 代码模板

> **版本**: v1.0.0
> **更新日期**: 2026-01-18

---

## 目录

- [节点模板](#节点模板)
- [API 路由模板](#api-路由模板)
- [错误报告模板](#错误报告模板)

---

## 节点模板

### [node-template.jsx](./node-template.jsx)

React Flow 节点开发模板，包含完整的节点结构。

**使用方法**:
```bash
# 1. 复制模板到目标目录
cp .claude/templates/node-template.jsx src/client/src/nodes/[type]/MyNode.jsx

# 2. 修改节点名称
# 替换 [NodeName] 为实际节点名
# 替换 [节点颜色] 为实际颜色
# 替换 [handle-id] 为实际 Handle ID

# 3. 注册节点
# 在 src/client/src/App.jsx 中添加:
import MyNode from './nodes/[type]/MyNode';

const nodeTypes = {
  myNode: MyNode,
  // ...
};
```

**模板特性**:
- ✅ 完整的 PropTypes 类型检查
- ✅ 输入/输出 Handle
- ✅ 状态管理
- ✅ 上游数据接收
- ✅ 数据同步机制
- ✅ 错误处理

---

## API 路由模板

### [api-route-template.js](./api-route-template.js)

Express API 路由开发模板，包含标准的 CRUD 操作。

**使用方法**:
```bash
# 1. 复制模板到目标目录
cp .claude/templates/api-route-template.js src/server/routes/myResource.js

# 2. 修改路由名称
# 替换 [resource-name] 为实际资源名
# 替换 [功能名称] 为实际功能名

# 3. 注册路由
# 在 src/server/index.js 中添加:
const myResourceRoutes = require('./routes/myResource');
app.use('/api/[resource-name]', myResourceRoutes);
```

**模板特性**:
- ✅ POST 创建
- ✅ GET 查询
- ✅ PUT 更新
- ✅ DELETE 删除
- ✅ 统一响应格式
- ✅ 错误处理
- ✅ 参数验证

---

## 错误报告模板

### [error-report-template.md](./error-report-template.md)

错误报告文档模板，标准化错误报告格式。

**使用方法**:
```bash
# 1. 复制模板
cp .claude/templates/error-report-template.md reports/error-[number].md

# 2. 填写错误信息
# 按照模板格式填写错误描述、根本原因、解决方案等

# 3. 提交报告
# 将报告添加到错误模式库或提交 PR
```

**模板特性**:
- ✅ 错误编号
- ✅ 问题描述
- ✅ 根本原因分析
- ✅ 解决方案
- ✅ 预防措施
- ✅ 相关错误链接

---

## 快速开始

### 创建新节点

```bash
# 使用技能命令创建
/skills reactflow-dev --type=input|process|output --name=MyNode

# 或手动使用模板
cp .claude/templates/node-template.jsx src/client/src/nodes/input/MyNode.jsx
```

### 创建新 API 路由

```bash
# 复制模板
cp .claude/templates/api-route-template.js src/server/routes/myResource.js
```

### 报告新错误

```bash
# 复制模板
cp .claude/templates/error-report-template.md reports/error-new.md
```

---

## 最佳实践

### 1. 保持模板更新

当发现新的通用模式时，及时更新模板。

### 2. 自定义模板

根据项目特点，自定义专用模板。

### 3. 文档同步

更新模板时，同步更新相关文档。

---

## 参考文档

- [节点架构](../03-node-development/node-architecture.md)
- [Handle 连接](../03-node-development/handle-connections.md)
- [API 规范](../01-fundamentals/api-platforms.md)
- [错误模式](../04-error-patterns/errors-by-type.md)

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
