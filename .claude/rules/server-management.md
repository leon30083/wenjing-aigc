# 服务器管理规范

> **版本**: v2.0.0
> **更新日期**: 2026-01-23
> **维护者**: WinJin AIGC Team
> **模式**: 手动管理（用户操作，AI 仅提供建议）⭐ 重要变更

---

## 概述

本规范定义了 WinJin AIGC 项目的前后端服务器管理方式，明确 AI 和用户的职责边界。

**核心原则**: **用户手动管理服务器，AI 只负责提供建议和解答问题** ⭐ 重要变更 (2026-01-23)

**为什么采用手动管理？**:
- AI 通过脚本管理服务不够智能，容易出问题
- 用户手动控制更可靠、更灵活
- 避免意外的服务中断或数据丢失

---

## 0. 快速开始 ⭐ 推荐方式

> **重要**: 使用自动化脚本可以避免手动操作的遗漏和错误

### Windows 用户

```bash
# 启动开发环境
start-dev.bat

# 停止开发环境
stop-dev.bat
```

**自动完成**:
- ✅ 检查环境（Node.js、npm、.env）
- ✅ 检查端口占用（9000、5173）
- ✅ 清理占用端口（需确认）
- ✅ 启动后端和前端服务器
- ✅ 打开浏览器到 http://localhost:5173/

### Linux/Mac 用户

```bash
# 启动开发环境
./start-dev.sh

# 停止开发环境
./stop-dev.sh
```

**功能同Windows版本**，自动完成相同的步骤。

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

**提供建议和指导**:
- 解释服务器管理的最佳实践
- 说明脚本的使用方法和功能
- 解读错误信息并提供解决方案
- 回答用户关于服务器的问题

**提供参考信息**:
```bash
# 查找进程命令（供用户参考）
netstat -ano | findstr ":9000"   # Windows
lsof -i :9000                   # Linux/Mac

# 停止特定进程命令（供用户参考）
taskkill /F /PID <进程ID>        # Windows
kill -9 <进程ID>                 # Linux/Mac
```

### 2.2 ❌ AI 不做的事

**🚨 绝对禁止的命令（会导致 Claude Code 崩溃）**:
```bash
# ❌ 危险：会杀掉所有 Node.js 进程，包括 Claude Code 自身！
taskkill /F /IM node.exe          # Windows
killall node                       # Linux/Mac
pkill -9 node                      # Linux/Mac
```

**真实案例** (2026-01-23):
```
用户请求: "停止当前服务"
AI 执行: taskkill /F /IM node.exe
结果: Claude Code 立即崩溃，用户需要重新进入
```

**原因**:
- 这些命令会杀掉**所有** Node.js 进程
- Claude Code 本身是用 Node.js 构建的
- 执行后会导致 Claude Code 立即崩溃退出

**✅ 正确的停止方式**:
```bash
# 方案1: 使用脚本（推荐）⭐
Windows: stop-dev.bat
Linux/Mac: ./stop-dev.sh

# 方案2: 只停止特定端口的进程
Windows:
  1. netstat -ano | findstr ":9000"
  2. taskkill /F /PID <进程ID>
Linux/Mac:
  kill -9 $(lsof -ti :9000)
```

**其他禁止的操作** ⭐ 重要变更:
- ❌ 不运行服务器管理脚本（用户手动操作）
- ❌ 不执行启动/停止/重启命令
- ❌ 不主动检查服务器状态（用户自行检查）
- ❌ 不执行 service/systemctl 命令
- ❌ 不修改系统服务配置
- ❌ 不执行影响 Claude Code 自身的命令

**原因**:
- 用户需要完全控制服务器生命周期
- AI 通过脚本管理服务不够智能，容易出问题
- 避免意外的服务中断或数据丢失
- 防止 Claude Code 崩溃

**AI 行为规范**:
- ✅ **主动检查服务器状态**（端口占用、进程运行）
- ✅ **询问用户是否需要操作**（"检测到端口被占用，是否清理？"）
- ✅ **运行脚本前明确告知**（"即将运行 start-dev.bat，继续？"）
- ✅ **执行后验证结果**（检查服务器是否正常启动）
- ❌ **不偷偷执行命令**（所有操作需用户知晓）

**示例对话**:
```
AI: [检查端口] 未检测到服务运行
    检测到端口 9000 和 5173 可用，是否启动开发服务器？
    即将运行 start-dev.bat，继续？(yes/no)

User: yes

AI: [运行 start-dev.bat]
    ✓ 后端服务器启动成功（端口 9000）
    ✓ 前端服务器启动成功（端口 5173）
    ✓ 浏览器已打开
    开发环境已就绪！
```

---

## 3. 用户职责

### 3.1 启动服务器

**⭐ 推荐方式：使用自动化脚本**

```bash
# Windows 用户
start-dev.bat

# Linux/Mac 用户
./start-dev.sh
```

**脚本自动完成**:
- 检查环境（Node.js、npm、.env）
- 检查端口占用（9000、5173）
- 清理占用端口（需确认）
- 启动后端和前端服务器
- 打开浏览器

**手动方式（降级方案）**:

⚠️ **注意**: 优先使用脚本，以下命令仅在脚本不可用时使用

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

**⭐ 推荐方式：使用自动化脚本**

```bash
# Windows 用户
stop-dev.bat

# Linux/Mac 用户
./stop-dev.sh
```

**手动方式（降级方案）**:

⚠️ **注意**: 优先使用脚本，以下命令仅在脚本不可用时使用

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

**⭐ 推荐方式：使用自动化脚本**

```bash
# Windows 用户
stop-dev.bat && start-dev.bat

# Linux/Mac 用户
./stop-dev.sh && ./start-dev.sh
```

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

推荐方式：
1. 运行 stop-dev.bat 停止服务
2. 运行 start-dev.bat 重新启动
3. 确认日志显示调试信息，证明新代码已加载

或手动方式：
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

推荐方式：
运行 stop-dev.bat 清理端口

或手动方式：

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

推荐方式：
运行 start-dev.bat 自动检查环境并启动

或手动方式：
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

## 10. 脚本管理 ⭐ 新增

### 10.1 脚本列表

| 脚本 | 平台 | 功能 | 状态 |
|------|------|------|------|
| `start-dev.bat` | Windows | 启动开发环境 | ✅ 已存在 |
| `stop-dev.bat` | Windows | 停止开发环境 | ✅ 已存在 |
| `start-dev.sh` | Linux/Mac | 启动开发环境 | ✅ 新增 (2026-01-23) |
| `stop-dev.sh` | Linux/Mac | 停止开发环境 | ✅ 新增 (2026-01-23) |

### 10.2 脚本功能对比

**Windows 脚本** (`start-dev.bat`):
- 160 行代码
- 环境检查（Node.js、npm、.env）
- 端口检查与清理（9000、5173）
- 启动后端和前端服务器（新窗口）
- 等待服务启动
- 打开浏览器

**Linux/Mac 脚本** (`start-dev.sh`):
- 功能与 Windows 版本相同
- 使用 `lsof` 代替 `netstat`
- 使用 `osascript` (macOS) 或 `gnome-terminal`/`xterm` (Linux) 打开新终端
- 使用 `open` (macOS) 或 `xdg-open` (Linux) 打开浏览器

### 10.3 脚本执行权限

Linux/Mac 用户首次使用前需要添加执行权限：

```bash
chmod +x start-dev.sh stop-dev.sh
```

**一次性设置**，之后可以直接运行 `./start-dev.sh`。

### 10.4 脚本优先级原则

**优先级**: 脚本 > 手动命令

**原因**:
- ✅ 自动化处理复杂操作（环境检查、端口清理）
- ✅ 避免手动操作的遗漏和错误
- ✅ 提供友好的交互提示
- ✅ 统一的开发体验

**何时使用手动命令**:
- 脚本不存在或不可用
- 需要自定义启动参数
- 调试脚本本身的问题

### 10.5 脚本维护

**更新检查清单**:
- [ ] 新增环境变量时更新脚本
- [ ] 端口变更时更新脚本
- [ ] 启动命令变更时更新脚本
- [ ] 测试 Windows 脚本功能
- [ ] 测试 Linux/Mac 脚本功能
- [ ] 更新文档说明

---

## 11. 相关文档

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
