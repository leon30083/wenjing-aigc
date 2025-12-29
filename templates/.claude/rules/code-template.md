---

paths: src/*

---

# 代码规范

## 命名约定

- **文件名**: `kebab-case`
- **变量/函数**: `camelCase`
- **类名**: `PascalCase`
- **常量**: `UPPER_SNAKE_CASE`
- **私有成员**: 前缀下划线 `_`

## 代码风格

- **缩进**: 2 空格
- **引号**: 单引号 `'`
- **分号**: 必须
- **注释**: JSDoc 格式

## 错误处理

- 异步函数必须 try-catch
- API 路由必须有错误处理
- 不要吞没错误

## API 路由规范

### 统一错误处理
```javascript
// ✅ 正确：完整的错误处理
app.get('/api/resource', async (req, res) => {
  try {
    const result = await getResource();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error:', error);
    res.json({ success: false, error: error.message });
  }
});

// ❌ 错误：没有错误处理
app.get('/api/resource', async (req, res) => {
  const result = await getResource();
  res.json({ success: true, data: result });
});
```

## 常见错误模式

### 错误1: 未验证输入参数
```javascript
// ❌ 错误：直接使用用户输入
app.get('/api/user/:id', async (req, res) => {
  const user = await getUser(req.params.id);
  res.json(user);
});

// ✅ 正确：验证参数
app.get('/api/user/:id', async (req, res) => {
  const { id } = req.params;

  if (!id || !isValidId(id)) {
    return res.json({ success: false, error: 'Invalid user ID' });
  }

  const user = await getUser(id);
  res.json({ success: true, data: user });
});
```

### 错误2: 忽略异步错误
```javascript
// ❌ 错误：没有 await
async function processData() {
  fetchData().then(data => {
    processData(data);
  });
}

// ✅ 正确：使用 async/await
async function processData() {
  try {
    const data = await fetchData();
    return processData(data);
  } catch (error) {
    console.error('Processing failed:', error);
    throw error;
  }
}
```

### 错误3: 硬编码配置
```javascript
// ❌ 错误：硬编码
const API_URL = 'https://api.example.com';
const TIMEOUT = 5000;

// ✅ 正确：使用环境变量
const API_URL = process.env.API_URL || 'https://api.example.com';
const TIMEOUT = parseInt(process.env.TIMEOUT) || 5000;
```

## 代码组织

### 文件结构
```
src/
├── server/           # 后端代码
│   ├── routes/       # 路由
│   ├── services/     # 业务逻辑
│   └── utils/        # 工具函数
├── client/           # 前端代码
│   ├── components/   # 组件
│   ├── services/     # API 服务
│   └── utils/        # 工具函数
└── shared/           # 共享代码
    └── types/        # 类型定义
```

### 模块导出
```javascript
// ✅ 推荐：命名导出
export const helperFunction = () => {};
export const CONSTANT_VALUE = 'value';

// ✅ 推荐：默认导出（仅用于主要功能）
export default class MainService {};

// ❌ 避免：混用导出
export const func1 = () => {};
export default class Service {};
```

## 开发参考

原项目代码位于 `reference/` 目录，开发时可参考：
- `reference/api/` - API 文档
- `reference/examples/` - 代码示例
- `docs/` - 项目文档
