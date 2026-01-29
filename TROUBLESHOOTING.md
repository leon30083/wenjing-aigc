# WinJin AIGC 诊断工具

## 快速诊断步骤

### 1. 检查后端服务是否运行

打开浏览器访问：
```
http://localhost:9000
```

**如果看到 "Cannot GET /"** → 后端正在运行 ✅

**如果看到 "无法访问此网站"** → 后端未启动 ❌

### 2. 检查端口占用

在 PowerShell 或命令提示符中运行：
```bash
netstat -ano | findstr :9000
```

**如果有输出** → 端口被占用，记录 PID 并检查是否是 Node.js 进程

### 3. 查看 Electron 日志

由于打包后的应用无法直接看到控制台输出，请：

1. 按 `Ctrl+Shift+I` 打开开发者工具（如果可用）
2. 查看 Console 标签页的日志
3. 查找 `[Main]` 和 `[Server]` 开头的日志

### 4. 常见问题排查

#### 问题 A: 后端服务启动失败

**症状**：
- API 调用失败
- 配置 API 时显示连接错误
- 控制台显示 "ECONNREFUSED"

**可能原因**：
1. 端口 9000 被占用
2. .env 文件缺失或配置错误
3. node_modules 缺失

**解决方案**：
```bash
# 1. 检查端口占用
netstat -ano | findstr :9000

# 2. 如果被占用，终止进程（替换 <PID>）
taskkill /F /PID <PID>

# 3. 重新启动应用
```

#### 问题 B: .env 文件缺失

**症状**：
- 控制台显示 "SORA2_API_KEY is not defined"
- 后端服务启动后立即退出

**解决方案**：
确保 `.env` 文件存在并包含：
```bash
SORA2_API_KEY=sk-xxxxx
ZHENZHEN_API_KEY=sk-xxxxx
PORT=9000
```

#### 问题 C: 数据文件缺失

**症状**：
- 角色库无法加载
- 历史记录无法加载

**解决方案**：
确保 `data/` 目录包含：
- `characters.json` (角色库)
- `history.json` (历史记录)

### 5. 手动测试后端服务

在命令提示符中进入应用目录并手动启动后端：

```bash
cd "release\win-unpacked\resources\app.asar.unpacked"
node src/server/index.js
```

**预期输出**：
```
[Server] Express 服务器运行在端口 9000
```

**如果看到错误**：
- 记录错误信息
- 检查是否缺少依赖文件
- 检查 .env 文件是否存在

## 需要提供的信息

如果问题仍未解决，请提供以下信息：

1. **控制台日志**（开发者工具 Console 标签页）
2. **网络请求**（开发者工具 Network 标签页，失败的请求标红）
3. **是否看到 "Express 服务器运行在端口 9000" 日志**
4. **是否有任何错误对话框弹出**

## 调试模式

如果你是开发者，可以使用开发模式启动：

```bash
# 终端 1：启动后端
npm run server

# 终端 2：启动 Electron
npm start
```

这样可以看到完整的控制台输出。
