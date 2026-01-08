# 修复计划：OpenAI 配置持久化问题

## 📋 问题描述

**现象**: 服务重启后，OpenAI 配置节点连接丢失，PromptOptimizerNode 显示"⚠️ 未连接配置节点"

**根本原因**: OpenAIConfigNode 初始化时，localStorage 全局配置优先级高于 node.data 工作流配置

## 🔍 问题分析

### 数据流追踪

**期望流程**（正确）:
```
1. App.jsx 从 localStorage 加载工作流
2. node.data.openaiConfig 恢复正确值
3. OpenAIConfigNode 使用 node.data.openaiConfig 初始化
4. PromptOptimizerNode 从源节点读取配置
5. 显示"✅ OpenAI 配置已连接"
```

**实际流程**（错误）:
```
1. App.jsx 从 localStorage 加载工作流
2. node.data.openaiConfig 恢复正确值 ✅
3. OpenAIConfigNode 初始化 ❌
   ├─ 读取 localStorage.getItem('winjin-openai-config')
   ├─ 发现全局配置（可能是旧数据）
   └─ 覆盖了 node.data.openaiConfig ❌
4. PromptOptimizerNode 读取源节点配置
5. 得到错误的配置 ❌
6. 显示"⚠️ 未连接配置节点"
```

### 代码位置

**问题代码**: `src/client/src/nodes/input/OpenAIConfigNode.jsx` (Lines 14-32)

```javascript
const [config, setConfig] = useState(() => {
  // ❌ 问题：localStorage 优先级高于 node.data
  try {
    const local = localStorage.getItem('winjin-openai-config');
    if (local) {
      return JSON.parse(local);  // ⚠️ 覆盖了 node.data.openaiConfig
    }
  } catch (error) {
    console.error('[OpenAIConfigNode] 读取 localStorage 失败:', error);
  }

  // 降级到 node.data 初始化
  const saved = data.savedConfig || {};
  return {
    base_url: saved.base_url || 'http://170.106.152.118:2999',  // ❌ 硬编码测试数据
    api_key: saved.api_key || 'sk-PdoHKdR3XKgiLzYRk3mxfgiYpJbC24JTLmwP0hv07nOE4QaE',
    model: saved.model || 'gemini-2.5-pro-maxthinking',
  };
});
```

## ✅ 修复方案

### 方案：调整初始化优先级

**修改位置**: `src/client/src/nodes/input/OpenAIConfigNode.jsx` (Lines 14-32)

**修改前**（错误）:
```javascript
const [config, setConfig] = useState(() => {
  // 1. ❌ 优先 localStorage（全局配置）
  try {
    const local = localStorage.getItem('winjin-openai-config');
    if (local) {
      return JSON.parse(local);
    }
  } catch (error) {
    console.error('[OpenAIConfigNode] 读取 localStorage 失败:', error);
  }

  // 2. 降级到 node.data
  const saved = data.savedConfig || {};
  return {
    base_url: saved.base_url || 'http://170.106.152.118:2999',
    api_key: saved.api_key || 'sk-PdoHKdR3XKgiLzYRk3mxfgiYpJbC24JTLmwP0hv07nOE4QaE',
    model: saved.model || 'gemini-2.5-pro-maxthinking',
  };
});
```

**修改后**（正确）:
```javascript
const [config, setConfig] = useState(() => {
  // 1. ✅ 优先 node.data.openaiConfig（工作流专属配置）
  if (data.openaiConfig) {
    console.log('[OpenAIConfigNode] 使用 node.data 配置:', data.openaiConfig);
    return data.openaiConfig;
  }

  // 2. ⚠️ 降级到 localStorage（全局配置，仅作为备份）
  try {
    const local = localStorage.getItem('winjin-openai-config');
    if (local) {
      const parsed = JSON.parse(local);
      console.log('[OpenAIConfigNode] 降级到 localStorage 配置:', parsed);
      return parsed;
    }
  } catch (error) {
    console.error('[OpenAIConfigNode] 读取 localStorage 失败:', error);
  }

  // 3. ⚠️ 最后降级到空配置（不使用硬编码测试数据）
  console.log('[OpenAIConfigNode] 使用默认空配置');
  return {
    base_url: '',
    api_key: '',
    model: '',
  };
});
```

### 关键修改点

1. **优先级调整**:
   - ❌ 修改前: `localStorage` → `node.data` → 硬编码默认值
   - ✅ 修改后: `node.data.openaiConfig` → `localStorage` → 空配置

2. **移除硬编码测试数据**:
   - ❌ 修改前: 硬编码 `base_url`, `api_key`, `model`
   - ✅ 修改后: 返回空配置 `{base_url: '', api_key: '', model: ''}`

3. **添加调试日志**:
   - 记录配置来源（node.data / localStorage / 默认）
   - 便于排查问题

## 📝 修改步骤

1. **修改 OpenAIConfigNode.jsx** (Lines 14-32)
   - 调整初始化优先级
   - 添加调试日志
   - 移除硬编码测试数据

2. **清理旧配置**（可选）
   ```javascript
   // 浏览器控制台执行
   localStorage.removeItem('winjin-openai-config');
   ```

3. **重新填写配置**
   - 在 OpenAIConfigNode 填写正确的配置
   - 保存工作流

4. **重启服务验证**
   - 停止前端服务
   - 重新启动 `cd src/client && npm run dev`
   - 刷新浏览器
   - 验证配置是否保持

## ✅ 验证清单

- [ ] 服务重启后，OpenAIConfigNode 显示正确配置
- [ ] PromptOptimizerNode 显示"✅ OpenAI 配置已连接"
- [ ] 控制台日志显示: `[OpenAIConfigNode] 使用 node.data 配置:`
- [ ] 不应该显示: `[OpenAIConfigNode] 降级到 localStorage 配置:`
- [ ] 配置在多次重启后仍然保持

## 🎯 预期结果

**修复前**:
- 重启后显示硬编码的测试数据
- PromptOptimizerNode 显示"⚠️ 未连接配置节点"

**修复后**:
- 重启后显示工作流中保存的配置
- PromptOptimizerNode 显示"✅ OpenAI 配置已连接"
- 配置持久化正常工作

## 📊 影响范围

**修改文件**: `src/client/src/nodes/input/OpenAIConfigNode.jsx`

**影响功能**:
- OpenAI 配置节点的初始化逻辑
- 不影响其他节点
- 向后兼容（支持 localStorage 备份）

**风险评估**: 低
- 只调整配置读取优先级
- 不改变数据存储逻辑
- 保留 localStorage 作为备份
