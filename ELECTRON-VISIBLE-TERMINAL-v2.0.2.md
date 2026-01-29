# WinJin AIGC Electron 可见终端窗口版本

> **更新日期**: 2026-01-29
> **版本**: 2.0.2 (新增功能)

---

## 🎯 本次更新内容

### 新增功能 ⭐

**后端服务可见终端窗口**：
- 打包后运行时，后端服务（Express 服务器）将在独立的终端窗口中运行
- 方便用户监控后端日志、调试问题
- 实时查看服务器请求和错误信息

### 打包方式变更

**从 electron-builder 改为 electron-packager**：
- 原因：electron-builder 的 winCodeSign 工具需要创建符号链接，Windows 权限不足导致失败
- 解决方案：使用 electron-packager 直接打包，避免符号链接问题
- 输出位置：`release/WinJinAIGC-win32-x64/`
- 主程序：`WinJinAIGC.exe`

---

## 🚀 使用方法

### 运行打包后的应用

1. **找到应用目录**
   ```
   release/WinJinAIGC-win32-x64/
   ```

2. **双击启动**
   ```
   WinJin AIGC.exe
   ```

3. **窗口说明**
   - **主窗口**：React Flow 工作流画布（前端界面）
   - **终端窗口**：Express 后端服务器日志（新增）

---

## 🖥️ 终端窗口说明

### 终端窗口显示内容

后端服务器的所有输出都会显示在终端窗口中：

```
[Server] Express 服务器运行在端口 9000
[Server] GET /api/character/list - 200
[Server] POST /api/video/create - 200
[Server Error] 错误信息...
```

### 终端窗口行为

- **自动打开**：启动应用时自动打开
- **自动关闭**：关闭主窗口时自动关闭
- **独立运行**：终端窗口独立于主窗口

---

## 📂 打包目录结构

```
release/WinJinAIGC-win32-x64/
├── WinJin AIGC.exe                    # 主程序
├── chrome_100_percent.pak
├── chrome_200_percent.pak
├── d3dcompiler_47.dll
├── ffmpeg.dll
├── ... (Electron 运行时文件)
└── resources/
    └── app/                           # 应用代码（未使用 asar）
        ├── src/
        │   ├── main/
        │   │   └── index.js           # 主进程（启动后端）
        │   ├── server/                # Express 服务器
        │   │   ├── index.js
        │   │   ├── sora2-client.js
        │   │   └── ...
        │   └── client/
        │       └── dist/             # React 前端构建
        ├── node_modules/             # 后端依赖
        ├── .env                      # 环境变量
        └── data/                     # 数据目录
            ├── characters.json
            └── history.json
```

---

## 🔧 开发模式

开发模式下，后端服务**不在独立终端窗口运行**，输出会显示在开发终端中：

```bash
# 终端 1：启动后端
npm run server

# 终端 2：启动 Electron
npm start
```

---

## ⚠️ 注意事项

### 与之前版本的区别

| 项目 | electron-builder 版本 | electron-packager 版本 (当前) |
|------|------------------------|-------------------------------|
| **打包工具** | electron-builder | electron-packager |
| **输出目录** | `release/win-unpacked/` | `release/WinJinAIGC-win32-x64/` |
| **打包方式** | asar + asarUnpack | 直接解包（未使用 asar） |
| **后端日志** | 隐藏（stdio: pipe） | 独立终端窗口可见 |
| **代码签名** | 需要（可能失败） | 无 |

### 常见问题

**Q: 为什么有两个窗口？**
- A: 主窗口是 React Flow 前端界面，终端窗口是后端服务器日志

**Q: 可以关闭终端窗口吗？**
- A: 不建议。关闭终端窗口会停止后端服务，前端无法调用 API

**Q: 如何查看后端日志？**
- A: 直接查看终端窗口中的输出

**Q: 打包失败怎么办？**
- A: 确保前端已构建 (`cd src/client && npm run build`)

---

## 📝 技术细节

### 代码变更

**src/main/index.js**：
- 添加打包方式检测（asar 或 electron-packager）
- 打包模式使用 `detached: true` 和 `windowsHide: false`
- 开发模式保持 `stdio: 'pipe'`

### 关键代码

```javascript
const spawnOptions = {
  cwd: serverCwd,
  env: env,
  shell: true,
};

if (app.isPackaged) {
  // 打包模式：可见终端窗口
  spawnOptions.detached = true;     // 独立进程
  spawnOptions.windowsHide = false;  // 显示窗口
  spawnOptions.stdio = 'ignore';     // 忽略 IO
} else {
  // 开发模式：隐藏窗口，捕获输出
  spawnOptions.stdio = 'pipe';
}

serverProcess = spawn('node', [serverPath], spawnOptions);
```

---

## ✅ 测试清单

运行打包后的应用后，请检查：

- [ ] 应用窗口正常打开
- [ ] 终端窗口自动打开
- [ ] 终端窗口显示 "[Server] Express 服务器运行在端口 9000"
- [ ] 可以访问 http://localhost:9000
- [ ] API 配置功能正常
- [ ] 角色库功能正常
- [ ] 视频生成功能正常
- [ ] 关闭主窗口时终端窗口也关闭

---

**维护者**: WinJin AIGC Team
**版本**: 2.0.2 (新增功能)
**最后更新**: 2026-01-29
