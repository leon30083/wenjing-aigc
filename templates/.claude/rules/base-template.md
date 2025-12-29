---

paths: *

---

# 技术栈约束

## 运行时环境

- **Node.js**: 18.x 或更高
- **npm**: 9.x 或更高
- **操作系统**: Windows 10/11 / macOS / Linux

## 核心框架版本

| 框架/库 | 版本要求 | 说明 |
|---------|----------|------|
| [填写框架名] | ^1.0.0 | [用途说明] |
| [填写框架名] | ^2.0.0 | [用途说明] |

## API 规范

### 统一响应格式
```javascript
// 成功
{ success: true, data: {...} }

// 失败
{ success: false, error: "错误信息" }
```

### 状态码
- `200` - 成功
- `400` - 请求参数错误
- `401` - 未授权
- `404` - 资源不存在
- `500` - 服务器错误

## 环境变量

项目使用 `.env` 文件管理敏感信息：

```bash
# 服务器配置
PORT=3000
NODE_ENV=development

# API Keys
API_KEY=sk-xxxxxxxxxxxx

# 数据库
DATABASE_URL=postgresql://...
```

## 禁止模式

- ❌ 不在代码中硬编码敏感信息
- ❌ 不提交 `.env` 文件到 Git
- ❌ 不使用已废弃的库
- ❌ 不忽略错误处理

## 参考文档

- **官方文档**: [链接]
- **API 文档**: [链接]
- **最佳实践**: `docs/BEST_PRACTICES.md`
