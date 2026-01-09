# WinJin AIGC 项目开发规范

## 项目概述

WinJin AIGC 开源重构版本，基于原版项目移除激活验证，使用现代技术栈重新实现。

**核心功能：**
- Sora2 视频生成（角色参考、首尾帧过渡、文生视频）
- ComfyUI 集成（图像处理、背景移除）
- Chrome 扩展（豆包/Kimi 自动化）
- 本地 HTTP 服务（API 网关）

---

## 时间获取

- 使用命令：`date +"%Y-%m-%d %H:%M:%S"`
- 时区：Asia/Shanghai

---

## 技术文档

**官方文档：**
- [Electron 官方文档](https://electronjs.org/docs/latest)
- [Express.js 官方文档](https://expressjs.com/)
- [Node.js 官方文档](https://nodejs.org/docs)

---

## 开发规范

### 1. 代码风格

- **缩进**: 2 空格
- **引号**: 单引号 `'`
- **分号**: 必须使用
- **命名**: camelCase / PascalCase / kebab-case

### 2. API 设计

- 使用 async/await
- 统一响应格式：`{success, data/error}`
- 所有路由必须有错误处理

### 3. Sora2 API 注意事项

- **角色创建不传 `model` 参数**
- **Authorization**: `Bearer <sk-key>`
- **禁止使用 child_process.spawn**

### 4. 参考文档位置

原项目代码和文档位于 `reference/` 目录：
- `reference/用户输入文件夹/聚鑫sora2/` - Sora2 API
- `reference/用户输入文件夹/贞贞工坊/` - 角色系统
- `reference/用户输入文件夹/开发经验/` - 最佳实践
- `reference/doubao/` - Chrome 扩展参考
- `reference/tools/` - PowerShell 服务器参考

---

## 命令规范

| 命令 | 说明 |
|------|------|
| `npm start` | 启动 Electron 应用 |
| `npm run server` | 仅启动 HTTP 服务器 |
| `npm run dev` | 开发模式 |

### 验证系统 ⭐ Phase 3

| 命令 | 说明 |
|------|------|
| `npm run validate:all` | 运行所有验证 |
| `npm run fix:scan` | 扫描可修复问题 |
| `npm run metrics:trend` | 查看质量趋势 |

详细文档：[验证系统使用指南](docs/validation-guide.md)

---

## 安全规范

- 不硬编码 API Key（使用环境变量）
- 不使用 child_process 调用 API
- 不直接修改数据库文件
