import { Handle, Position } from 'reactflow';
import React, { useState, useMemo } from 'react';
import { useNodeResize } from '../../hooks/useNodeResize';
import { useAPIConfig } from '../../contexts/APIConfigContext';
import { useConcurrency } from '../../contexts/ConcurrencyContext';

/**
 * APISettingsNode - API 配置节点
 *
 * ⭐ 重构：使用 Cherry Studio style 动态配置
 * - 支持用户自定义平台和模型
 * - 配置存储在 config.json（通过 API 管理）
 * - 显示所有可用平台和模型
 * - 完整的 CRUD 操作（增删改查）
 * - 测试连接功能
 *
 * 解决问题：错误56 - useState 异步闭包问题导致配置丢失
 */
function APISettingsNode({ data }) {
  // ⭐ 从 Context 获取全局配置和平台列表
  const { config, platforms, textModels, updateConfig, isLoading, reloadConfig } = useAPIConfig();

  // ⭐ 管理面板展开状态
  const [showManagePanel, setShowManagePanel] = useState(false);

  // ⭐ 编辑模态框状态
  const [editModal, setEditModal] = useState({
    show: false,
    type: null, // 'platform' | 'model'
    data: null
  });

  // ⭐ 新增平台表单状态
  const [newPlatform, setNewPlatform] = useState({ key: '', name: '', baseURL: '', enabled: true });
  const [newModel, setNewModel] = useState({ name: '', type: 'sora', apiKey: '' });  // ⭐ 新增：apiKey
  const [selectedPlatformKey, setSelectedPlatformKey] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' }); // type: 'success' | 'error'
  const [testingConnection, setTestingConnection] = useState(false);

  const API_BASE = 'http://localhost:9000';

  // ⭐ 添加新平台
  const handleAddPlatform = async () => {
    if (!newPlatform.key || !newPlatform.name || !newPlatform.baseURL) {
      setMessage({ text: '请填写完整的平台信息', type: 'error' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/config/platforms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlatform),
      });
      const result = await response.json();

      if (result.success) {
        setMessage({ text: `✅ 平台 "${newPlatform.name}" 已添加`, type: 'success' });
        setNewPlatform({ key: '', name: '', baseURL: '', enabled: true });
        await reloadConfig();
      } else {
        setMessage({ text: `❌ 添加失败: ${result.error}`, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: `❌ 网络错误: ${error.message}`, type: 'error' });
    }

    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  // ⭐ 添加模型到平台
  const handleAddModel = async () => {
    if (!selectedPlatformKey || !newModel.name) {
      setMessage({ text: '请选择平台并填写模型名', type: 'error' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      return;
    }

    // 使用 name 作为 id（模型名唯一标识）
    const modelData = {
      id: newModel.name,  // 模型名作为 id
      name: newModel.name, // 模型名
      type: newModel.type, // sora 或 veo
      enabled: true,
      apiKey: newModel.apiKey || ''  // ⭐ 新增：模型 API Key
    };

    try {
      const response = await fetch(`${API_BASE}/api/config/platforms/${selectedPlatformKey}/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modelData),
      });
      const result = await response.json();

      if (result.success) {
        setMessage({ text: `✅ 模型 "${newModel.name}" 已添加到 ${selectedPlatformKey}`, type: 'success' });
        setNewModel({ name: '', type: 'sora', apiKey: '' });  // ⭐ 重置 API Key
        await reloadConfig();
      } else {
        setMessage({ text: `❌ 添加失败: ${result.error}`, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: `❌ 网络错误: ${error.message}`, type: 'error' });
    }

    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  // ⭐ 删除自定义平台
  const handleDeletePlatform = async (platformKey) => {
    if (!confirm(`确定要删除平台 "${platformKey}" 吗？`)) return;

    try {
      const response = await fetch(`${API_BASE}/api/config/platforms/${platformKey}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        setMessage({ text: `✅ 平台 "${platformKey}" 已删除`, type: 'success' });
        await reloadConfig();
      } else {
        setMessage({ text: `❌ 删除失败: ${result.error}`, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: `❌ 网络错误: ${error.message}`, type: 'error' });
    }

    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  // ⭐ 删除模型 ⭐ 新增
  const handleDeleteModel = async (platformKey, modelId, modelName) => {
    if (!confirm(`确定要从 ${platformKey} 删除模型 "${modelName}" 吗？`)) return;

    try {
      const response = await fetch(`${API_BASE}/api/config/platforms/${platformKey}/models/${modelId}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        setMessage({ text: `✅ 模型 "${modelName}" 已删除`, type: 'success' });
        await reloadConfig();
      } else {
        setMessage({ text: `❌ 删除失败: ${result.error}`, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: `❌ 网络错误: ${error.message}`, type: 'error' });
    }

    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  // ⭐ 保存平台设置 ⭐ 新增
  const handleSavePlatformSettings = async (platformKey, settings) => {
    try {
      const response = await fetch(`${API_BASE}/api/config/platforms/${platformKey}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const result = await response.json();

      if (result.success) {
        setMessage({ text: `✅ 平台设置已保存`, type: 'success' });
        setEditModal({ show: false, type: null, data: null });
        await reloadConfig();
      } else {
        setMessage({ text: `❌ 保存失败: ${result.error}`, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: `❌ 网络错误: ${error.message}`, type: 'error' });
    }

    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  // ⭐ 保存模型设置 ⭐ 新增
  const handleSaveModelSettings = async (platformKey, modelId, updates) => {
    try {
      const response = await fetch(`${API_BASE}/api/config/platforms/${platformKey}/models/${modelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const result = await response.json();

      if (result.success) {
        setMessage({ text: `✅ 模型设置已保存`, type: 'success' });
        setEditModal({ show: false, type: null, data: null });
        await reloadConfig();
      } else {
        setMessage({ text: `❌ 保存失败: ${result.error}`, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: `❌ 网络错误: ${error.message}`, type: 'error' });
    }

    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  // ⭐ 测试连接 ⭐ 新增
  const handleTestConnection = async (platformKey, baseURL) => {
    console.log(`[测试连接] 开始测试 平台: ${platformKey}, URL: ${baseURL}`);
    setMessage({ text: `⏳ 正在测试 ${platformKey} 平台连接...`, type: 'success' });
    setTestingConnection(true);

    try {
      const response = await fetch(`${API_BASE}/api/config/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platformKey, baseURL }),
      });

      console.log(`[测试连接] 响应状态: ${response.status}`);
      const result = await response.json();
      console.log(`[测试连接] 响应数据:`, result);

      if (result.success) {
        const { valid, message: msg } = result.data;
        if (valid) {
          setMessage({ text: `✅ ${msg}`, type: 'success' });
        } else {
          setMessage({ text: `⚠️ ${msg}`, type: 'error' });
        }
      } else {
        setMessage({ text: `❌ 测试失败: ${result.error}`, type: 'error' });
      }
    } catch (error) {
      console.log(`[测试连接] 请求错误:`, error);
      setMessage({ text: `❌ 网络错误: ${error.message}`, type: 'error' });
    }

    setTestingConnection(false);
    setTimeout(() => setMessage({ text: '', type: '' }), 8000); // 延长到8秒
  };

  // ⭐ 测试模型 Key ⭐ 新增
  const handleTestModel = async (platformKey, modelId, baseURL) => {
    setMessage({ text: `⏳ 正在测试模型 ${modelId}...`, type: 'success' });
    setTestingConnection(true);

    try {
      const response = await fetch(`${API_BASE}/api/config/test-model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platformKey, modelId, baseURL }),
      });
      const result = await response.json();

      if (result.success) {
        const { valid, message } = result.data;
        setMessage({ text: message, type: valid ? 'success' : 'error' });
      } else {
        setMessage({ text: `❌ 测试失败: ${result.error}`, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: `❌ 网络错误: ${error.message}`, type: 'error' });
    }

    setTestingConnection(false);
    setTimeout(() => setMessage({ text: '', type: '' }), 8000);
  };

  const { resizeStyles, handleResizeMouseDown, getResizeHandleStyles } = useNodeResize(
    data,
    220, // minWidth
    260, // minHeight
    { width: 240, height: showManagePanel ? 650 : 300 } // 增加高度以容纳新功能
  );

  // 当前选中平台的模型列表
  const currentPlatformModels = useMemo(() => {
    const platform = platforms.find(p => p.key === config.platform);
    return platform?.models || [];
  }, [platforms, config.platform]);

  // 获取模型名称
  const getModelName = (modelId) => {
    const model = currentPlatformModels.find(m => m.id === modelId);
    return model?.name || modelId;
  };

  // ⭐ Stage 3: 处理并发限制更新
  const { updateLimits: updateConcurrencyLimits } = useConcurrency();
  const handleConcurrencyLimitChange = async (platform, value) => {
    const newLimits = {
      ...config.concurrencyLimits,
      [platform]: value,
    };

    // 更新本地配置
    updateConfig({ concurrencyLimits: newLimits });

    // 更新后端并发限制
    try {
      await updateConcurrencyLimits({ limits: newLimits });
      console.log('[APISettingsNode] ✅ 并发限制已更新:', newLimits);
    } catch (error) {
      console.error('[APISettingsNode] ❌ 更新并发限制失败:', error);
    }
  };

  return (
    <div style={{
      padding: '10px 15px',
      borderRadius: '8px',
      borderWidth: '2px',
      borderColor: '#3b82f6',
      borderStyle: 'solid',
      backgroundColor: '#eff6ff',
      ...resizeStyles,
    }}>
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="api-config"
        style={{ background: '#3b82f6', width: 10, height: 10 }}
      />

      {/* Node Header */}
      <div style={{
        fontWeight: 'bold',
        color: '#1e40af',
        marginBottom: '10px',
        fontSize: '14px',
        textAlign: 'center',
      }}>
        ⚙️ {data.label || 'API 设置'}
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#64748b',
        }}>
          加载配置中...
        </div>
      ) : (
        <>
          {/* Platform Selection */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', color: '#1e40af', marginBottom: '4px', fontWeight: 'bold' }}>
              平台
            </div>
            <select
              id="api-platform"
              name="platform"
              className="nodrag"
              value={config.platform}
              onChange={(e) => {
                const newPlatform = e.target.value;
                // 获取该平台的第一个可用模型
                const platform = platforms.find(p => p.key === newPlatform);
                const newModel = platform?.models?.[0]?.id || 'sora-2-all';
                updateConfig({ platform: newPlatform, model: newModel });
              }}
              onWheel={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                backgroundColor: 'white',
                color: '#1e293b',
                cursor: 'pointer',
              }}
            >
              {platforms.map((platform) => (
                <option
                  key={platform.key}
                  value={platform.key}
                  style={{ backgroundColor: 'white', color: '#1e293b' }}
                >
                  {platform.name} ({platform.builtIn ? '内置' : '自定义'})
                </option>
              ))}
            </select>
          </div>

          {/* Model Selection */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', color: '#1e40af', marginBottom: '4px', fontWeight: 'bold' }}>
              模型
            </div>
            <select
              id="api-model"
              name="model"
              className="nodrag"
              value={config.model}
              onChange={(e) => updateConfig({ model: e.target.value })}
              onWheel={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                backgroundColor: 'white',
                color: '#1e293b',
                cursor: 'pointer',
              }}
            >
              {currentPlatformModels.map((model) => (
                <option
                  key={model.id}
                  value={model.id}
                  style={{ backgroundColor: 'white', color: '#1e293b' }}
                >
                  {getModelName(model.id)}
                </option>
              ))}
            </select>
          </div>

          {/* Aspect Ratio */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', color: '#1e40af', marginBottom: '4px', fontWeight: 'bold' }}>
              比例
            </div>
            <select
              id="api-aspect"
              name="aspect"
              className="nodrag"
              value={config.aspect}
              onChange={(e) => updateConfig({ aspect: e.target.value })}
              onWheel={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                backgroundColor: 'white',
                color: '#1e293b',
                cursor: 'pointer',
              }}
            >
              <option value="16:9" style={{ backgroundColor: 'white', color: '#1e293b' }}>16:9 (横屏)</option>
              <option value="9:16" style={{ backgroundColor: 'white', color: '#1e293b' }}>9:16 (竖屏)</option>
            </select>
          </div>

          {/* Watermark */}
          <div style={{ marginBottom: '10px' }}>
            <div className="nodrag" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                id="api-watermark"
                name="watermark"
                className="nodrag"
                type="checkbox"
                checked={config.watermark}
                onChange={(e) => updateConfig({ watermark: e.target.checked })}
                onWheel={(e) => e.stopPropagation()}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <label style={{ fontSize: '12px', color: '#1e40af', cursor: 'pointer' }}>
                启用水印
              </label>
            </div>
          </div>

          {/* API Key */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', color: '#1e40af', marginBottom: '4px', fontWeight: 'bold' }}>
              🔑 API Key（可选）
            </div>
            <input
              id="api-key"
              name="apiKey"
              className="nodrag"
              type="password"
              value={config.apiKey || ''}
              onChange={(e) => updateConfig({ apiKey: e.target.value })}
              onWheel={(e) => e.stopPropagation()}
              placeholder="留空使用后端默认密钥"
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                fontSize: '11px',
                backgroundColor: 'white',
                color: '#1e293b',
                fontFamily: 'monospace',
              }}
            />
            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '3px', fontStyle: 'italic' }}>
              💡 留空则使用后端配置的默认密钥
            </div>
          </div>

          {/* ⭐ 并发限制配置 (Stage 3) */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', color: '#1e40af', marginBottom: '4px', fontWeight: 'bold' }}>
              ⚡ 并发限制（同时处理的最大任务数）
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* 聚鑫平台 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', minWidth: '60px' }}>聚鑫:</span>
                <input
                  type="number"
                  className="nodrag"
                  min="1"
                  max="10"
                  value={config.concurrencyLimits?.juxin || 3}
                  onChange={(e) => handleConcurrencyLimitChange('juxin', Number(e.target.value))}
                  onWheel={(e) => e.stopPropagation()}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '11px',
                    backgroundColor: 'white',
                    color: '#1e293b',
                  }}
                />
              </div>

              {/* 贞贞平台 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', minWidth: '60px' }}>贞贞:</span>
                <input
                  type="number"
                  className="nodrag"
                  min="1"
                  max="10"
                  value={config.concurrencyLimits?.zhenzhen || 3}
                  onChange={(e) => handleConcurrencyLimitChange('zhenzhen', Number(e.target.value))}
                  onWheel={(e) => e.stopPropagation()}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '11px',
                    backgroundColor: 'white',
                    color: '#1e293b',
                  }}
                />
              </div>
            </div>
            <div style={{ fontSize: '9px', color: '#64748b', fontStyle: 'italic' }}>
              💡 并发限制过高可能导致 API 限流错误（429）
            </div>
          </div>

          {/* Platform Info */}
          <div style={{
            padding: '8px',
            backgroundColor: '#dbeafe',
            borderRadius: '4px',
            fontSize: '10px',
            color: '#0369a1',
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              📊 可用平台: {platforms.length} 个
            </div>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              📊 可用模型: {currentPlatformModels.length} 个
            </div>
            <button
              className="nodrag"
              onClick={() => setShowManagePanel(!showManagePanel)}
              style={{
                width: '100%',
                padding: '6px',
                marginTop: '4px',
                borderRadius: '4px',
                border: '1px solid #3b82f6',
                backgroundColor: showManagePanel ? '#3b82f6' : 'white',
                color: showManagePanel ? 'white' : '#3b82f6',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              {showManagePanel ? '🔼 收起管理面板' : '🔽 管理平台和模型'}
            </button>
          </div>

          {/* ⭐ 消息提示（独立显示，不受管理面板影响） */}
          {message.text && (
            <div style={{
              marginTop: '8px',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '11px',
              backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: message.type === 'success' ? '#166534' : '#991b1b',
              border: `1px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}`,
            }}>
              {message.text}
            </div>
          )}

          {/* ⭐ 管理面板 */}
          {showManagePanel && (
            <div style={{
              marginTop: '10px',
              padding: '10px',
              backgroundColor: '#f8fafc',
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
              maxHeight: '300px',
              overflowY: 'auto',
            }}>
              {/* 添加新平台 */}
              <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '6px', color: '#1e40af' }}>
                  ➕ 添加新平台
                </div>
                <input
                  className="nodrag"
                  type="text"
                  placeholder="平台标识 (如: myplatform)"
                  value={newPlatform.key}
                  onChange={(e) => setNewPlatform({ ...newPlatform, key: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                  onWheel={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    padding: '4px 6px',
                    marginBottom: '4px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '10px',
                  }}
                />
                <input
                  className="nodrag"
                  type="text"
                  placeholder="平台名称 (如: 我的平台)"
                  value={newPlatform.name}
                  onChange={(e) => setNewPlatform({ ...newPlatform, name: e.target.value })}
                  onWheel={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    padding: '4px 6px',
                    marginBottom: '4px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '10px',
                  }}
                />
                <input
                  className="nodrag"
                  type="text"
                  placeholder="Base URL (如: https://api.example.com)"
                  value={newPlatform.baseURL}
                  onChange={(e) => setNewPlatform({ ...newPlatform, baseURL: e.target.value })}
                  onWheel={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    padding: '4px 6px',
                    marginBottom: '6px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '10px',
                  }}
                />
                <button
                  className="nodrag"
                  onClick={handleAddPlatform}
                  style={{
                    width: '100%',
                    padding: '4px',
                    borderRadius: '4px',
                    border: '1px solid #22c55e',
                    backgroundColor: '#22c55e',
                    color: 'white',
                    fontSize: '10px',
                    cursor: 'pointer',
                  }}
                >
                  ✅ 添加平台
                </button>
              </div>

              {/* 添加模型到平台 */}
              <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '6px', color: '#1e40af' }}>
                  ➕ 添加模型到平台
                </div>
                <select
                  className="nodrag"
                  value={selectedPlatformKey}
                  onChange={(e) => setSelectedPlatformKey(e.target.value)}
                  onWheel={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    padding: '4px 6px',
                    marginBottom: '4px',
                    borderRadius: '4px',
                    border: '1px solid #94a3b8',
                    fontSize: '10px',
                    backgroundColor: 'white',
                    color: '#1e293b',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">-- 选择平台 --</option>
                  {platforms.map((p) => (
                    <option key={p.key} value={p.key}>{p.name}</option>
                  ))}
                </select>

                {/* 模型类型选择 */}
                <select
                  className="nodrag"
                  value={newModel.type}
                  onChange={(e) => setNewModel({ ...newModel, type: e.target.value })}
                  onWheel={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    padding: '4px 6px',
                    marginBottom: '4px',
                    borderRadius: '4px',
                    border: '1px solid #94a3b8',
                    fontSize: '10px',
                    backgroundColor: 'white',
                    color: '#1e293b',
                    cursor: 'pointer',
                  }}
                >
                  <option value="sora">Sora</option>
                  <option value="veo">VEO</option>
                </select>

                {/* 模型名称输入 */}
                <input
                  className="nodrag"
                  type="text"
                  placeholder="模型名 (如: veo3.1-fast, sora-2)"
                  value={newModel.name}
                  onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                  onWheel={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    padding: '4px 6px',
                    marginBottom: '6px',
                    borderRadius: '4px',
                    border: '1px solid #94a3b8',
                    fontSize: '10px',
                  }}
                />

                {/* ⭐ API Key 输入 */}
                <input
                  className="nodrag"
                  type="password"
                  placeholder="模型 API Key (可选)"
                  value={newModel.apiKey}
                  onChange={(e) => setNewModel({ ...newModel, apiKey: e.target.value })}
                  onWheel={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    padding: '4px 6px',
                    marginBottom: '6px',
                    borderRadius: '4px',
                    border: '1px solid #94a3b8',
                    fontSize: '10px',
                  }}
                />
                <button
                  className="nodrag"
                  onClick={handleAddModel}
                  style={{
                    width: '100%',
                    padding: '4px',
                    borderRadius: '4px',
                    border: '1px solid #22c55e',
                    backgroundColor: '#22c55e',
                    color: 'white',
                    fontSize: '10px',
                    cursor: 'pointer',
                  }}
                >
                  ✅ 添加模型
                </button>
              </div>

              {/* ⭐ 平台列表（显示所有平台和模型）⭐ 新增 */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '6px', color: '#1e40af' }}>
                  📋 平台和模型
                </div>
                <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                  {platforms.map((platform) => (
                    <div
                      key={platform.key}
                      style={{
                        marginBottom: '8px',
                        padding: '8px',
                        backgroundColor: 'white',
                        borderRadius: '4px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      {/* 平台头部 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#1e40af' }}>
                            {platform.name} {platform.builtIn && <span style={{ fontSize: '9px', color: '#64748b' }}>(内置)</span>}
                          </div>
                          <div style={{ fontSize: '9px', color: '#64748b', fontFamily: 'monospace' }}>
                            {platform.baseURL}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {/* ⭐ 编辑平台按钮（仅自定义平台） */}
                          {!platform.builtIn && (
                            <button
                              className="nodrag"
                              onClick={() => setEditModal({
                                show: true,
                                type: 'platform',
                                data: platform
                              })}
                              title="编辑平台"
                              style={{
                                padding: '2px 6px',
                                borderRadius: '3px',
                                border: '1px solid #f59e0b',
                                backgroundColor: '#f59e0b',
                                color: 'white',
                                fontSize: '9px',
                                cursor: 'pointer',
                              }}
                            >
                              ✏️ 编辑
                            </button>
                          )}
                          {/* ⭐ 删除平台按钮（仅自定义平台） */}
                          {!platform.builtIn && (
                            <button
                              className="nodrag"
                              onClick={() => handleDeletePlatform(platform.key)}
                              title="删除平台"
                              style={{
                                padding: '2px 6px',
                                borderRadius: '3px',
                                border: '1px solid #ef4444',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                fontSize: '9px',
                                cursor: 'pointer',
                              }}
                            >
                              🗑️ 删除
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 模型列表 */}
                      <div>
                        <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '4px' }}>
                          模型 ({platform.models.length}):
                        </div>
                        {platform.models.map((model) => (
                          <div
                            key={model.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '2px 0',
                              fontSize: '9px',
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <span style={{ color: '#1e40af' }}>{model.name}</span>
                              <span style={{ color: '#64748b', marginLeft: '4px' }}>[{model.type}]</span>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {/* ⭐ 测试模型按钮 */}
                              <button
                                className="nodrag"
                                onClick={() => handleTestModel(platform.key, model.id, platform.baseURL)}
                                disabled={testingConnection}
                                title="测试模型 Key"
                                style={{
                                  padding: '1px 4px',
                                  borderRadius: '3px',
                                  border: '1px solid #3b82f6',
                                  backgroundColor: testingConnection ? '#94a3b8' : '#3b82f6',
                                  color: 'white',
                                  fontSize: '8px',
                                  cursor: testingConnection ? 'wait' : 'pointer',
                                }}
                              >
                                🔗
                              </button>
                              {/* ⭐ 编辑模型按钮 */}
                              <button
                                className="nodrag"
                                onClick={() => setEditModal({
                                  show: true,
                                  type: 'model',
                                  data: { platform, model }
                                })}
                                title="编辑模型"
                                style={{
                                  padding: '1px 4px',
                                  borderRadius: '3px',
                                  border: '1px solid #f59e0b',
                                  backgroundColor: '#f59e0b',
                                  color: 'white',
                                  fontSize: '8px',
                                  cursor: 'pointer',
                                }}
                              >
                                ✏️
                              </button>
                              {/* ⭐ 删除模型按钮 */}
                              <button
                                className="nodrag"
                                onClick={() => handleDeleteModel(platform.key, model.id, model.name)}
                                title="删除模型"
                                style={{
                                  padding: '1px 4px',
                                  borderRadius: '3px',
                                  border: '1px solid #ef4444',
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  fontSize: '8px',
                                  cursor: 'pointer',
                                }}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ⭐ 编辑模态框 */}
      {editModal.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            minWidth: '300px',
            maxWidth: '400px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}>
            {/* 标题 */}
            <div style={{
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '16px',
              color: '#1e40af',
            }}>
              {editModal.type === 'platform' ? '✏️ 编辑平台' : '✏️ 编辑模型'}
            </div>

            {/* 平台编辑表单 */}
            {editModal.type === 'platform' && (
              <>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', display: 'block' }}>
                    平台名称
                  </label>
                  <input
                    className="nodrag"
                    type="text"
                    defaultValue={editModal.data.name}
                    id="edit-platform-name"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                    }}
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', display: 'block' }}>
                    Base URL
                  </label>
                  <input
                    className="nodrag"
                    type="text"
                    defaultValue={editModal.data.baseURL}
                    id="edit-platform-baseurl"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    className="nodrag"
                    onClick={() => setEditModal({ show: false, type: null, data: null })}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: 'white',
                      color: '#64748b',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    取消
                  </button>
                  <button
                    className="nodrag"
                    onClick={() => {
                      const name = document.getElementById('edit-platform-name').value.trim();
                      const baseURL = document.getElementById('edit-platform-baseurl').value.trim();
                      if (name && baseURL) {
                        handleSavePlatformSettings(editModal.data.key, { name, baseURL });
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      border: '1px solid #22c55e',
                      backgroundColor: '#22c55e',
                      color: 'white',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    保存
                  </button>
                </div>
              </>
            )}

            {/* 模型编辑表单 */}
            {editModal.type === 'model' && (
              <>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', display: 'block' }}>
                    模型名称
                  </label>
                  <input
                    className="nodrag"
                    type="text"
                    defaultValue={editModal.data.model.name}
                    id="edit-model-name"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                    }}
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', display: 'block' }}>
                    模型类型
                  </label>
                  <select
                    className="nodrag"
                    defaultValue={editModal.data.model.type}
                    id="edit-model-type"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                    }}
                  >
                    <option value="sora">Sora</option>
                    <option value="veo">VEO</option>
                  </select>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', display: 'block' }}>
                    🔑 API Key (可选)
                  </label>
                  <input
                    className="nodrag"
                    type="password"
                    defaultValue={editModal.data.model.apiKey || ''}
                    id="edit-model-apikey"
                    placeholder="留空则使用平台 Key"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                    }}
                  />
                  <div style={{ fontSize: '9px', color: '#64748b', marginTop: '3px' }}>
                    💡 模型专属 Key，优先级高于平台 Key
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    className="nodrag"
                    onClick={() => setEditModal({ show: false, type: null, data: null })}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: 'white',
                      color: '#64748b',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    取消
                  </button>
                  <button
                    className="nodrag"
                    onClick={() => {
                      const name = document.getElementById('edit-model-name').value.trim();
                      const type = document.getElementById('edit-model-type').value;
                      const apiKey = document.getElementById('edit-model-apikey').value.trim();
                      if (name) {
                        handleSaveModelSettings(editModal.data.platform.key, editModal.data.model.id, { name, type, apiKey });
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      border: '1px solid #22c55e',
                      backgroundColor: '#22c55e',
                      color: 'white',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    保存
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Resize Handle */}
      <div
        className="nodrag"
        onMouseDown={handleResizeMouseDown}
        style={getResizeHandleStyles()}
      />
    </div>
  );
}

export default APISettingsNode;
