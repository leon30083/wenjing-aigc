# APISettingsNode - API 设置节点

> **节点类型**: 输入节点
> **文件路径**: `src/client/src/nodes/input/APISettingsNode.jsx`
> **版本**: v1.0.0
> **更新日期**: 2026-01-18

---

## 功能概述

API 设置节点用于配置 Sora2 视频生成 API 的参数，包括平台选择、模型选择、视频比例、水印设置和自定义 API Key。

**核心功能**：
- 🌐 **平台选择**：聚鑫平台 (api.jxincm.cn) 或 贞贞平台 (ai.t8star.cn)
- 🎬 **模型选择**：Sora-2-all、Sora-2、Sora-2 Pro
- 📐 **比例设置**：16:9 (横屏) 或 9:16 (竖屏)
- 💧 **水印设置**：启用或禁用水印
- 🔑 **自定义 API Key**：可选，留空则使用后端默认密钥

**典型用途**：为视频生成节点和故事板节点提供统一的 API 配置。

---

## 输入/输出 Handles

### 输出 Handle

| Handle ID | 类型 | 数据格式 | 说明 |
|-----------|------|----------|------|
| `api-config` | 输出 | `APIConfig` | API 配置对象 ⭐ |

**API 配置格式**:
```javascript
{
  platform: "juxin",           // 平台: 'juxin' | 'zhenzhen'
  model: "sora-2-all",         // 模型: 'sora-2-all' | 'sora-2' | 'sora-2-pro'
  aspect: "16:9",              // 比例: '16:9' | '9:16'
  watermark: false,            // 水印: true | false
  apiKey: "sk-xxxxx..."        // API Key（可选）
}
```

---

## 节点配置

### 1. 平台选择

| 平台 | 说明 | API Base URL |
|------|------|-------------|
| `juxin` | 聚鑫平台 | `https://api.jxincm.cn` |
| `zhenzhen` | 贞贞平台 | `https://ai.t8star.cn` |

**自动切换**：切换平台时，自动切换到推荐的默认模型：
- 切换到聚鑫 → 自动切换到 `sora-2-all`
- 切换到贞贞 → 自动切换到 `sora-2`

### 2. 模型选择

| 模型 | 说明 | 推荐场景 |
|------|------|----------|
| `sora-2-all` | Sora 2 全能模型 | 通用场景，支持多种视频风格 |
| `sora-2` | Sora 2 基础模型 | 标准视频生成 |
| `sora-2-pro` | Sora 2 专业模型 | 高质量视频生成 |

**⚠️ 重要**：
- 模型选择受平台限制，贞贞平台推荐使用 `sora-2`
- 切换平台时会自动调整模型，避免不兼容

### 3. 比例设置

| 比例 | 说明 | 适用场景 |
|------|------|----------|
| `16:9` | 横屏 | 电脑、电视观看 |
| `9:16` | 竖屏 | 手机竖屏观看、短视频 |

### 4. 水印设置

- **启用水印**：生成的视频会添加平台水印
- **禁用水印**：生成的视频无水印（推荐）

### 5. API Key（可选）

- **留空**：使用后端配置的默认 API Key（推荐）
- **自定义**：使用用户自己的 API Key
- **用途**：支持不同用户使用不同的 API 配额

---

## 数据传递

### 传递机制

```javascript
// 节点内部状态管理
const [config, setConfig] = useState({
  platform: 'juxin',
  model: 'sora-2-all',
  aspect: '16:9',
  watermark: false,
  apiKey: ''
});

// 自动传递到下游节点
useEffect(() => {
  const outgoingEdges = edges.filter(e => e.source === nodeId);

  setNodes((nds) =>
    nds.map((node) => {
      const isConnected = outgoingEdges.some(e => e.target === node.id);
      if (isConnected) {
        return {
          ...node,
          data: {
            ...node.data,
            apiConfig: config,                    // ⭐ 配置对象
            apiConfigSourceId: nodeId,            // 源节点 ID
            apiConfigSourceLabel: data.label      // 源节点标签
          }
        };
      }
      return node;
    })
  );
}, [config, edges]);
```

### 配置优先级

下游节点接收配置时的优先级：
1. **直接连接**：从 APISettingsNode 直接连接的配置
2. **节点内置配置**：节点自己的默认配置（如果没有连接）
3. **后端默认**：后端的默认 API 配置

---

## 使用示例

### 示例 1: 为视频生成节点提供配置

```
工作流结构：
APISettingsNode (id: 11)
  ↓ api-config
VideoGenerateNode (id: 6)
  - 自动应用 API 配置
  ↓ video-output
TaskResultNode (id: 10)
```

**操作步骤**：
1. 拖拽 APISettingsNode 到画布
2. 配置平台、模型、比例、水印
3. 连接 `api-config` → VideoGenerateNode 的 `api-config` Handle
4. 视频生成节点自动应用配置
5. 点击"生成视频"

### 示例 2: 为故事板节点提供配置

```
工作流结构：
APISettingsNode (id: 11) ──┐
CharacterLibraryNode (id: 1) ──┤
TextNode (id: 2) ──────────────┤
                                ↓
                         StoryboardNode (id: 9)
  - 自动应用 API 配置到所有镜头
```

**操作步骤**：
1. 配置 APISettingsNode（平台、模型等）
2. 连接到故事板节点
3. 故事板的每个镜头都会使用相同的 API 配置
4. 批量生成视频

### 示例 3: 贞贞平台配置

```
平台配置：
- 平台: 贞贞 (ai.t8star.cn)
- 模型: Sora-2
- 比例: 16:9 (横屏)
- 水印: 禁用
- API Key: 留空（使用后端默认）
```

---

## 常见问题

### Q1: 切换平台后模型自动改变？

**A**: 这是正常的！
- 切换到聚鑫 → 自动切换到 `sora-2-all`
- 切换到贞贞 → 自动切换到 `sora-2`

这是为了避免模型与平台不兼容。

### Q2: 何时需要自定义 API Key？

**A**: 以下情况需要自定义：
- 你有自己的 API 配额
- 后端默认密钥配额不足
- 需要使用不同的 API 账户

**注意**：自定义 Key 会覆盖后端默认配置。

### Q3: 水印有什么影响？

**A**:
- **启用水印**：视频会带有平台水印，可能影响观看体验
- **禁用水印**：视频无水印，推荐用于正式内容

### Q4: 配置没有传递到下游节点？

**A**: 检查以下几点：
1. 确认已创建连接：`APISettingsNode.api-config` → `TargetNode.api-config`
2. 查看目标节点的 `data.apiConfig` 字段是否包含配置
3. 查看浏览器控制台，检查是否有 `[APISettingsNode]` 相关日志

### Q5: 如何验证配置正确？

**A**:
1. 检查节点底部的信息显示：`平台 | 模型 | 比例`
2. 点击下游节点，查看 `data.apiConfig` 字段
3. 执行视频生成，确认 API 调用成功

---

## 相关节点

- **VideoGenerateNode**: 视频生成节点（接收配置）⭐
- **StoryboardNode**: 故事板节点（接收配置）⭐
- **CharacterCreateNode**: 角色创建节点（接收配置）

---

## 相关文档

- [节点功能参考手册](../README.md)
- [VideoGenerateNode 文档](../process-nodes/VideoGenerateNode.md)
- [StoryboardNode 文档](../process-nodes/StoryboardNode.md)
- [技术规范 - Sora2 API](../../../rules/base.md)

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
