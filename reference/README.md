# WinJin 原项目 - 完整参考目录

> 原版 WinJin AIGC 项目的完整代码和文档，供逆向分析和二次开发参考

## 📁 目录结构（完整）

```
winjin/
├── 文镜AIGC.exe        ← 主程序（原生 C/C++）
├── ffmpeg.exe          ← 视频处理工具
├── aigc.sqlite         ← SQLite 数据库
├── doubao/             ← Chrome 扩展（豆包自动化）
├── tools/              ← PowerShell HTTP 服务器
├── role/               ← 角色图片资源
├── log/                ← 运行日志
├── http/               ← HTTP 请求记录（ComfyUI API）
├── docs/               ← 项目文档
├── 教程/               ← 视频教程
├── 用户输入文件夹/      ← Sora2 API 文档（聚鑫/贞贞工坊）
└── .claude/            ← Claude Code 配置
```

## 🔍 核心功能分析

### 1. 主程序 (文镜AIGC.exe)
- **技术栈**: 原生 C/C++ (Win32)
- **组件**:
  - Media Foundation (媒体处理)
  - D3D11 (GPU 加速)
  - NVML (NVIDIA 管理)
- **功能**: 任务编排、激活验证、媒体合成

### 2. Chrome 扩展 (doubao/)
- **目标网站**: doubao.com, kimi.com
- **功能**: 自动化聊天交互、答案提取
- **通信端口**: localhost:9000

### 3. HTTP 服务器 (tools/mini9000.ps1)
- **端口**: 9000
- **功能**: 桥接扩展与 ComfyUI
- **支持**: RMBG 背景移除、图像处理

### 4. 激活机制
- **验证方式**: QQ 数据库检测 + 硬件 ID 绑定
- **QQ 账号**: 1426002172
- **数据库路径**:
  - `D:\Program Files\QQ\liaotianjilu\Tencent Files/1426002172/nt_qq/nt_db/nt_msg.db`
  - `E:\User\Documents\Tencent Files/1426002172/nt_qq/nt_db/nt_msg.db`

## 📚 重要参考文档

| 目录 | 说明 |
|------|------|
| `用户输入文件夹/聚鑫sora2/` | Sora2 统一格式 API |
| `用户输入文件夹/贞贞工坊/` | 角色系统 API |
| `用户输入文件夹/开发经验/` | 最佳实践（Character 创建避坑） |
| `http/` | ComfyUI API 调用记录 |
| `docs/逆向拆解过程.md` | 原项目逆向分析文档 |

## 🔗 相关资源

- **重构项目**: `../winjin-reborn/`
- **API 文档**: `用户输入文件夹/聚鑫sora2/sora2_links.md`

---

**说明**: 此目录保持完整，代码与文档在同一位置，方便开发时对照参考。
