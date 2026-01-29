# WinJin AIGC Electron 打包完成

> **打包日期**: 2026-01-29
> **版本**: 2.0.0
> **状态**: ✅ 打包成功

---

## 📦 打包输出

### 绿色版位置

```
release/win-unpacked/
```

### 主程序

```
WinJin AIGC.exe (169 MB)
```

### 目录结构

```
release/win-unpacked/
├── WinJin AIGC.exe                    # 主程序
├── chrome_100_percent.pak
├── chrome_200_percent.pak
├── d3dcompiler_47.dll
├── ffmpeg.dll
├── icudtl.dat
├── libEGL.dll
├── libGLESv2.dll
├── resources.pak
├── snapshot_blob.bin
├── v8_context_snapshot.bin
├── vk_swiftshader.dll
├── vulkan-1.dll
├── LICENSE.electron.txt
├── LICENSES.chromium.html
├── locales/                           # 语言包
└── resources/
    ├── app.asar                        # 应用代码（打包）
    └── app.asar.unpacked/              # 服务器代码（解包）
        └── src/
            └── server/                 # Express 服务器文件
                ├── index.js
                ├── sora2-client.js
                ├── batch-queue.js
                ├── character-storage.js
                ├── history-storage.js
                ├── routes/
                └── services/
```

---

## 🚀 使用方法

### 用户操作流程

| 操作 | 说明 |
|------|------|
| **获取应用** | 复制整个 `release/win-unpacked/` 文件夹 |
| **安装** | 无需安装，绿色版（解压即用） |
| **启动** | 双击 `WinJin AIGC.exe` |
| **使用** | 自动打开应用窗口，后端服务自动启动 |
| **退出** | 关闭窗口，自动清理进程 |

### 自动化功能

- ✅ 自动启动 Express 后端服务器（端口 9000）
- ✅ 自动加载 React 前端界面
- ✅ 关闭窗口时自动清理服务器进程
- ✅ 支持角色库、历史记录数据持久化

---

## ⚙️ 技术架构

### 进程架构

```
┌─────────────────────────────────────────────┐
│         Electron 主进程                      │
│  (src/main/index.js)                        │
│  - 启动 Express 后端服务器 (端口 9000)      │
│  - 创建 BrowserWindow                       │
│  - 加载前端构建文件                          │
│  - 处理应用退出（关闭服务器）                │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│      渲染进程 (React + Vite)                │
│  (生产环境: file:// 协议)                   │
│  - 加载 dist/index.html                     │
│  - 调用 Express API (http://localhost:9000) │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│      Express 后端服务器                     │
│  (src/server/index.js)                      │
│  - 端口 9000                                │
│  - Sora2 API 代理                           │
│  - 角色库管理                               │
│  - 历史记录存储                             │
└─────────────────────────────────────────────┘
```

### 安全配置

- ✅ 禁用 nodeIntegration（防止渲染进程访问 Node.js API）
- ✅ 启用 contextIsolation（隔离上下文）
- ✅ 使用 preload 脚本安全地暴露 API

---

## 📋 待完善事项

### 必须完成

| 任务 | 优先级 | 说明 |
|------|--------|------|
| **准备应用图标** | ⭐⭐⭐ 高 | 需要 256x256 .ico 格式图标 |
| | | 位置: `build/icon.ico` |
| | | 准备后取消注释 electron-builder.yml 和主进程中的 icon 配置 |

### 可选优化

| 任务 | 优先级 | 说明 |
|------|--------|------|
| 添加应用签名 | 中 | 避免 Windows SmartScreen 警告 |
| 减小包体积 | 中 | 排除不必要的 node_modules |
| 添加自动更新 | 低 | 添加应用内更新检查功能 |
| 添加系统托盘 | 低 | 最小化到系统托盘 |

---

## 🔧 开发者信息

### 构建命令

```bash
# 开发模式（热重载）
npm run dev

# 构建 Windows 绿色版
npm run build:dir

# 构建 Windows 安装包（可选）
npm run build:win
```

### 环境要求

- **Node.js**: 16.x 或更高
- **npm**: 8.x 或更高
- **操作系统**: Windows 10/11

### 镜像配置（已配置）

项目已配置 `.npmrc` 使用国内镜像：

```ini
electron_mirror=https://cdn.npmmirror.com/binaries/electron/
electron_builder_binaries_mirror=https://cdn.npmmirror.com/binaries/electron-builder-binaries/
```

---

## 🐛 已知问题

### 打包警告（可忽略）

- **winCodeSign 符号链接错误**:
  - 症状：`ERROR: Cannot create symbolic link`
  - 原因：Windows 权限问题（需要管理员权限创建符号链接）
  - 影响：仅影响代码签名功能，不影响绿色版打包
  - 解决：忽略即可，或以管理员身份运行构建

### 常见问题

| 问题 | 解决方案 |
|------|----------|
| 启动后白屏 | 检查控制台是否有错误，确保前端构建文件存在 |
| API 调用失败 | 检查后端服务器是否正常启动（端口 9000） |
| 角色库数据丢失 | 确保 `data/` 目录包含 `characters.json` |

---

## 📄 相关文档

- [技术栈规范](.claude/rules/base.md)
- [代码规范](.claude/rules/code.md)
- [错误模式参考](.claude/rules/error-patterns.md)
- [快速参考](.claude/rules/quick-reference.md)

---

**维护者**: WinJin AIGC Team
**版本**: 2.0.0
**最后更新**: 2026-01-29
