# 服务器管理规范

> **版本**: v1.0.0
> **更新日期**: 2026-01-18
> **维护者**: WinJin AIGC Team

---

## 概述

本规范定义了 WinJin AIGC 项目的前后端服务器管理方式，明确 AI 和用户的职责边界。

**核心原则**: **用户手动管理服务器，AI 只负责告知和提醒**

---

## 1. 服务器架构

### 1.1 后端服务器 (Express)

**端口**: 9000

**启动命令**:
```bash
npm run server
```

**职责**:
- 提供 Sora2 API 代理
- 处理视频生成请求
- 管理角色库
- 存储历史记录

**日志示例**:
```
[Sora2Client] 初始化 Sora2 客户端
[Server] Express 服务器运行在端口 9000
[Video] 创建视频任务: task-123
```

### 1.2 前端服务器 (Vite)

**端口**: 5173

**启动命令**:
```bash
cd src/client
npm run dev
```

**职责**:
- 提供工作流画布 (React Flow)
- 开发服务器热重载
- 静态资源服务

**日志示例**:
```
VITE v7.2.4  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

## 2. AI 行为规范

### 2.1 ✅ AI 可以做的事

**检查服务器状态**:
```bash
netstat -ano | findstr :9000   # Windows
lsof -i :9000                   # Linux/Mac
```

**读取服务器日志**:
- 查看终端输出
- 分析日志文件

**分析错误信息**:
- 识别错误类型
- 提供解决方案

**告知用户需要重启**:
- 检测到代码修改需要重启时
- 发现端口被占用时
- 发现服务器异常退出时

### 2.2 ❌ AI 不做的事

**禁止的操作**:
- ❌ 不自动启动服务器
- ❌ 不自动停止服务器
- ❌ 不自动重启服务器
- ❌ 不执行 service/systemctl 命令
- ❌ 不修改系统服务配置

**原因**:
- 用户需要完全控制服务器生命周期
- 避免意外的服务中断
- 防止数据丢失

---

## 3. 用户职责

### 3.1 启动服务器

**首次启动**:
```bash
# 终端 1: 启动后端
npm run server

# 终端 2: 启动前端
cd src/client
npm run dev
```

**验证启动成功**:
1. 后端：终端显示 `[Server] Express 服务器运行在端口 9000`
2. 前端：终端显示 `➜  Local:   http://localhost:5173/`
3. 浏览器：访问 http://localhost:5173/ 查看工作流画布

### 3.2 停止服务器

**方法 1: Ctrl+C**
- 在对应终端按 `Ctrl+C`
- 等待进程退出

**方法 2: 强制结束**（如果 Ctrl+C 无效）
```bash
# Windows
taskkill /F /IM node.exe

# Linux/Mac
killall node
```

### 3.3 重启服务器

**后端代码修改后**:
```bash
# 终端 1
# 1. 停止服务器（Ctrl+C）
# 2. 重新启动
npm run server
```

**前端代码修改后**:
- ✅ Vite 自动热重载（无需重启）
- ❌ 如果热重载失败，手动刷新浏览器

---

## 4. 通知模板

### 4.1 需要重启时

**AI 应说**:
```
❌ 检测到后端代码修改，需要重启服务。

请执行以下步骤：

1. 停止后端服务器（终端1 按 Ctrl+C）
2. 重新启动后端：
   npm run server

3. 确认日志显示调试信息，证明新代码已加载

重启完成后告诉我继续。
```

### 4.2 端口被占用时

**AI 应说**:
```
❌ 检测到端口 9000 被占用。

请执行以下步骤：

Windows:
1. 查找占用进程：
   netstat -ano | findstr :9000

2. 强制结束进程：
   taskkill /F /PID <进程ID>

3. 重新启动：
   npm run server

Linux/Mac:
1. 查找占用进程：
   lsof -i :9000

2. 强制结束进程：
   kill -9 <进程ID>

3. 重新启动：
   npm run server

解决问题后告诉我继续。
```

### 4.3 服务器异常退出时

**AI 应说**:
```
⚠️ 检测到后端服务器异常退出。

可能的原因：
- 代码语法错误
- 依赖包未安装
- 端口被占用

请执行以下步骤：

1. 检查终端错误信息
2. 根据错误信息修复问题
3. 重新启动：
   npm run server

如果问题持续，请告诉我具体的错误信息。
```

---

## 5. 常见问题排查

### 5.1 后端代码修改不生效

**问题**: 修改后端代码后，刷新浏览器看到的是旧代码

**原因**: Node.js 模块缓存，服务器未重启

**解决**:
1. 停止后端服务器（Ctrl+C）
2. 重新启动 `npm run server`
3. 确认日志显示调试信息（新代码已加载）

### 5.2 端口被占用

**问题**: 启动服务器时提示 `EADDRINUSE`

**原因**: 端口被其他进程占用

**解决**:
```bash
# Windows
netstat -ano | findstr :9000
taskkill /F /PID <PID>

# Linux/Mac
lsof -i :9000
kill -9 <PID>
```

### 5.3 Vite 热重载失败

**问题**: 修改前端代码后，浏览器没有自动刷新

**原因**: Vite 热重载偶发失败

**解决**:
1. 手动刷新浏览器（F5）
2. 如果仍然失败，重启前端服务器：
```bash
# 停止 Vite（Ctrl+C）
# 重新启动
cd src/client && npm run dev
```

---

## 6. 开发流程建议

### 6.1 推荐的开发环境

```
┌─────────────────────────────────────┐
│  终端 1: 后端服务器                   │
│  $ npm run server                   │
│  [日志输出...]                      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  终端 2: 前端服务器                   │
│  $ cd src/client                   │
│  $ npm run dev                     │
│  [日志输出...]                      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  浏览器: 工作流画布                   │
│  http://localhost:5173/             │
└─────────────────────────────────────┘
```

### 6.2 开发时注意事项

**后端代码修改**:
1. 保存代码文件
2. ⚠️ **必须重启后端服务器**
3. 等待服务器启动完成
4. 刷新浏览器验证

**前端代码修改**:
1. 保存代码文件
2. ✅ Vite 自动热重载（通常无需刷新）
3. 如果热重载失败，手动刷新浏览器

**同时修改前后端**:
1. 先修改后端代码，重启后端
2. 再修改前端代码，等待热重载
3. 刷新浏览器验证

---

## 7. 生产环境部署

### 7.1 Electron 打包

**打包命令**:
```bash
npm run build
npm run package
```

**注意**: 打包后的应用包含内置服务器，无需手动启动。

### 7.2 Docker 部署（可选）

**Dockerfile 示例**:
```dockerfile
FROM node:16

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 9000 5173

CMD ["npm", "start"]
```

---

## 8. 监控和日志

### 8.1 后端日志级别

| 级别 | 用途 | 示例 |
|------|------|------|
| `info` | 正常操作 | `[Server] 服务器启动` |
| `debug` | 调试信息 | `[Sora2Client] API 调用` |
| `error` | 错误信息 | `[Error] API 调用失败` |

### 8.2 前端日志级别

| 级别 | 用途 | 示例 |
|------|------|------|
| `log` | 正常信息 | `console.log('节点已加载')` |
| `warn` | 警告信息 | `console.warn('连接断开')` |
| `error` | 错误信息 | `console.error('API 失败')` |

---

## 9. 备份和恢复

### 9.1 数据备份

**备份位置**:
```bash
data/
├── characters.json    # 角色库
├── history.json       # 历史记录
└── workflows.json     # 工作流数据
```

**备份命令**:
```bash
# 手动备份
cp -r data/ data-backup-$(date +%Y%m%d)/

# 或使用备份 API
curl http://localhost:9000/api/backup/export -o backup-$(date +%Y%m%d).json
```

### 9.2 数据恢复

**恢复命令**:
```bash
# 手动恢复
cp -r data-backup-20260118/* data/

# 或使用备份 API
curl -X POST http://localhost:9000/api/backup/import -H "Content-Type: application/json" -d @backup.json
```

---

## 10. 相关文档

### 上层文档
- [技术栈规范](./base.md)
- [代码规范](./code.md)
- [测试规范](./testing.md)

### 并行文档
- [错误模式参考](./error-patterns.md)
- [快速参考](./quick-reference.md)

### 外部参考
- [Express 官方文档](https://expressjs.com/)
- [Vite 官方文档](https://vitejs.dev/)
- [Node.js 官方文档](https://nodejs.org/docs)

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
**版本**: v1.0.0
