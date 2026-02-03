/**
 * PlatformManagePanel - 平台和模型管理面板
 *
 * 功能：
 * - 从 APISettingsNode 提取管理逻辑
 * - 添加/编辑/删除平台和模型
 * - 配置模型专属 API Key
 * - 支持视频平台（platformType="video"）和文本平台（platformType="text"）
 */

import { useState } from 'react';
import { useAPIConfig } from '../contexts/APIConfigContext';

const API_BASE = 'http://localhost:9000';

const PlatformManagePanel = ({ platformType = 'video', onClose }) => {
  const { platforms, textModels, reloadConfig } = useAPIConfig();

  // 根据 platformType 选择正确的平台列表
  const currentPlatforms = platformType === 'text' ? textModels : platforms;

  const [newPlatform, setNewPlatform] = useState({ name: '', baseURL: '', enabled: true });
  const [newModel, setNewModel] = useState({ name: '', type: platformType === 'text' ? 'text' : 'sora', apiKey: '' });
  const [selectedPlatformKey, setSelectedPlatformKey] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [testingConnection, setTestingConnection] = useState(false);
  const [editingModel, setEditingModel] = useState(null); // { platformKey, modelId, modelData }

  // 模型类型选项（根据平台类型）
  const modelTypeOptions = platformType === 'text'
    ? [
        { value: 'text', label: 'Text' },
        { value: 'gemini', label: 'Gemini' },
        { value: 'deepseek', label: 'DeepSeek' },
      ]
    : [
        { value: 'sora', label: 'Sora' },
        { value: 'veo', label: 'VEO' },
      ];

  // ⭐ 添加新平台
  const handleAddPlatform = async () => {
    if (!newPlatform.name || !newPlatform.baseURL) {
      setMessage({ text: '请填写完整的平台信息', type: 'error' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      return;
    }

    // 自动生成平台标识：从平台名称转换（小写、移除空格、只保留字母数字）
    let autoKey = newPlatform.name
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '');

    // ⭐ 如果 key 为空（如全中文名称），使用时间戳生成唯一 key
    if (!autoKey) {
      const timestamp = Date.now().toString(36);
      autoKey = `platform-${timestamp}`;
      console.log('[PlatformManagePanel] 中文名称生成自动key:', autoKey);
    }

    // ⭐ 文本平台：自动补全 OpenAI 格式后缀
    let finalBaseURL = newPlatform.baseURL;
    if (platformType === 'text') {
      // 移除末尾斜杠
      finalBaseURL = finalBaseURL.replace(/\/+$/, '');
      // 如果没有 /v1 后缀，自动添加
      if (!finalBaseURL.endsWith('/v1')) {
        finalBaseURL += '/v1';
      }
    }

    const platformData = {
      key: autoKey,
      name: newPlatform.name,
      baseURL: finalBaseURL,
      enabled: true,
      type: platformType === 'text' ? 'text' : 'video'
    };

    try {
      // ⭐ 文本平台使用不同的端点
      const endpoint = platformType === 'text'
        ? `${API_BASE}/api/config/text-platforms`
        : `${API_BASE}/api/config/platforms`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(platformData),
      });
      const result = await response.json();

      if (result.success) {
        const baseURLDisplay = platformType === 'text'
          ? `${newPlatform.baseURL} → ${finalBaseURL}`
          : finalBaseURL;
        setMessage({ text: `✅ 平台 "${newPlatform.name}" 已添加\n${baseURLDisplay}`, type: 'success' });
        setNewPlatform({ name: '', baseURL: '', enabled: true });
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

    const modelData = {
      id: newModel.name,
      name: newModel.name,
      type: newModel.type,
      enabled: true,
      apiKey: newModel.apiKey || ''
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
        setNewModel({ name: '', type: 'sora', apiKey: '' });
        await reloadConfig();
      } else {
        setMessage({ text: `❌ 添加失败: ${result.error}`, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: `❌ 网络错误: ${error.message}`, type: 'error' });
    }

    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  // ⭐ 删除平台
  const handleDeletePlatform = async (platformKey) => {
    if (!confirm(`确定要删除平台 "${platformKey}" 吗？`)) return;

    try {
      // ⭐ 根据平台类型使用不同的端点
      const endpoint = platformType === 'text'
        ? `${API_BASE}/api/config/text-platforms/${platformKey}`
        : `${API_BASE}/api/config/platforms/${platformKey}`;

      const response = await fetch(endpoint, {
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

  // ⭐ 删除模型
  const handleDeleteModel = async (platformKey, modelId, modelName) => {
    if (!confirm(`确定要从 ${platformKey} 删除模型 "${modelName}" 吗？`)) return;

    try {
      // ⭐ 根据平台类型使用不同的端点
      const endpoint = platformType === 'text'
        ? `${API_BASE}/api/config/text-platforms/${platformKey}/models/${modelId}`
        : `${API_BASE}/api/config/platforms/${platformKey}/models/${modelId}`;

      const response = await fetch(endpoint, {
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

  // ⭐ 测试模型 Key
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
        const { valid, message: msg } = result.data;
        setMessage({ text: msg, type: valid ? 'success' : 'error' });
      } else {
        setMessage({ text: `❌ 测试失败: ${result.error}`, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: `❌ 网络错误: ${error.message}`, type: 'error' });
    }

    setTestingConnection(false);
    setTimeout(() => setMessage({ text: '', type: '' }), 8000);
  };

  // ⭐ 编辑模型
  const handleEditModel = (platformKey, model) => {
    setEditingModel({
      platformKey,
      modelId: model.id,
      modelData: {
        name: model.name,
        type: model.type,
        apiKey: model.apiKey || ''
      }
    });
  };

  // ⭐ 保存编辑的模型
  const handleSaveEditModel = async () => {
    if (!editingModel) return;

    try {
      // ⭐ 使用统一的端点（updateModelInPlatform 现在支持所有平台类型）
      const endpoint = `${API_BASE}/api/config/platforms/${editingModel.platformKey}/models/${editingModel.modelId}`;

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingModel.modelData),
      });
      const result = await response.json();

      if (result.success) {
        setMessage({ text: `✅ 模型 "${editingModel.modelData.name}" 已更新`, type: 'success' });
        setEditingModel(null);
        await reloadConfig();
      } else {
        setMessage({ text: `❌ 更新失败: ${result.error}`, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: `❌ 网络错误: ${error.message}`, type: 'error' });
    }

    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  // ⭐ 取消编辑
  const handleCancelEdit = () => {
    setEditingModel(null);
  };

  return (
    <div className="manage-panel">
      {/* 消息提示 */}
      {message.text && (
        <div style={{
          padding: '8px',
          borderRadius: '4px',
          fontSize: '11px',
          backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: message.type === 'success' ? '#166534' : '#991b1b',
          border: `1px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}`,
          marginBottom: '12px',
        }}>
          {message.text}
        </div>
      )}

      {/* 添加新平台 */}
      <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#1e40af' }}>
          ➕ 添加新{platformType === 'text' ? '文本' : '视频'}平台
        </div>
        <input
          className="nodrag"
          type="text"
          placeholder="平台名称 (如: 我的平台)"
          value={newPlatform.name}
          onChange={(e) => setNewPlatform({ ...newPlatform, name: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            marginBottom: '6px',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
            fontSize: '14px',
          }}
        />
        <input
          className="nodrag"
          type="text"
          placeholder={platformType === 'text' ? "Base URL (如: https://api.jxincm.cn)" : "Base URL (如: https://api.example.com)"}
          value={newPlatform.baseURL}
          onChange={(e) => setNewPlatform({ ...newPlatform, baseURL: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            marginBottom: '6px',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
            fontSize: '14px',
          }}
        />
        {platformType === 'text' && (
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '-4px', marginBottom: '6px' }}>
            💡 文本平台会自动添加 /v1 后缀（OpenAI 格式）
          </div>
        )}
        <button
          className="nodrag"
          onClick={handleAddPlatform}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #22c55e',
            backgroundColor: '#22c55e',
            color: 'white',
            fontSize: '14px',
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
          {currentPlatforms.map((p) => (
            <option key={p.key} value={p.key}>{p.name}</option>
          ))}
        </select>

        <select
          className="nodrag"
          value={newModel.type}
          onChange={(e) => setNewModel({ ...newModel, type: e.target.value })}
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
          {modelTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <input
          className="nodrag"
          type="text"
          placeholder="模型名 (如: veo3.1-fast, sora-2)"
          value={newModel.name}
          onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
          style={{
            width: '100%',
            padding: '4px 6px',
            marginBottom: '4px',
            borderRadius: '4px',
            border: '1px solid #94a3b8',
            fontSize: '10px',
          }}
        />

        <input
          className="nodrag"
          type="password"
          placeholder="模型 API Key (可选)"
          value={newModel.apiKey}
          onChange={(e) => setNewModel({ ...newModel, apiKey: e.target.value })}
          style={{
            width: '100%',
            padding: '4px 6px',
            marginBottom: '4px',
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

      {/* 平台列表 */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '6px', color: '#1e40af' }}>
          📋 平台和模型
        </div>
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {currentPlatforms.map((platform) => (
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
                      <button
                        className="nodrag"
                        onClick={() => handleEditModel(platform.key, model)}
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

      {/* 编辑模型模态框 */}
      {editingModel && (
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
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            width: '320px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '14px', color: '#1e40af' }}>
              ✏️ 编辑模型
            </h3>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                模型名称
              </label>
              <input
                className="nodrag"
                type="text"
                value={editingModel.modelData.name}
                onChange={(e) => setEditingModel({
                  ...editingModel,
                  modelData: { ...editingModel.modelData, name: e.target.value }
                })}
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
              <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                API Key
              </label>
              <input
                className="nodrag"
                type="password"
                value={editingModel.modelData.apiKey}
                onChange={(e) => setEditingModel({
                  ...editingModel,
                  modelData: { ...editingModel.modelData, apiKey: e.target.value }
                })}
                placeholder="输入模型的 API Key"
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
                onClick={handleCancelEdit}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid #94a3b8',
                  backgroundColor: 'white',
                  color: '#64748b',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                className="nodrag"
                onClick={handleSaveEditModel}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid #22c55e',
                  backgroundColor: '#22c55e',
                  color: 'white',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformManagePanel;
