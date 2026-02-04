/**
 * OpenAI 配置节点
 * 用于配置 OpenAI 格式 API (DeepSeek, GLM, Gemini 等)
 *
 * ⭐ Stage 5 更新：使用 Cherry Studio style 动态配置
 * - 从 APIConfigContext 获取文本模型列表
 * - 支持用户自定义文本平台和模型
 * - 配置存储在 config.json（通过 API 管理）
 */

import React, { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow, useNodeId } from 'reactflow';
import { useAPIConfig } from '../../contexts/APIConfigContext';

function OpenAIConfigNode({ data }) {
  const nodeId = useNodeId();
  const { setNodes, getEdges, edges } = useReactFlow();

  // ⭐ 从 Context 获取文本模型配置
  const { textModels, textConfig, updateTextConfig } = useAPIConfig();

  // 当前选中文本平台
  const [currentTextPlatform, setCurrentTextPlatform] = useState(null);

  // 当前选中文本平台的模型列表
  const currentPlatformModels = textModels.find(tm => tm.key === currentTextPlatform)?.models || [];

  // 获取当前配置（从 Context 优先，其次 node.data，最后 localStorage）
  const [config, setConfig] = useState(() => {
    // ⭐ 优先使用 Context textConfig（全局配置）
    if (textConfig && textConfig.platform) {
      return {
        textPlatform: textConfig.platform,
        textModel: textConfig.model,
        api_key: textConfig.apiKey,
        base_url: textConfig.baseURL || '',
      };
    }

    // ⚠️ 降级到 node.data.openaiConfig（向后兼容）
    if (data.openaiConfig) {
      return data.openaiConfig;
    }

    // ⚠️ 降级到 localStorage（全局配置，仅作为备份）
    try {
      const local = localStorage.getItem('winjin-openai-config');
      if (local) {
        return JSON.parse(local);
      }
    } catch (error) {
      console.error('[OpenAIConfigNode] 读取 localStorage 失败:', error);
    }

    // ⚠️ 默认空配置
    return {
      textPlatform: '',
      textModel: '',
      api_key: '',
      base_url: '',
    };
  });

  // ⭐ 根据配置推断当前文本平台
  useEffect(() => {
    if (textModels.length > 0 && config.textPlatform) {
      setCurrentTextPlatform(config.textPlatform);
    } else if (textModels.length > 0) {
      // 默认选择第一个文本平台
      setCurrentTextPlatform(textModels[0].key);
    }
  }, [textModels, config.textPlatform]);

  // 测试连接
  const testConnection = async () => {
    const platform = getCurrentTextPlatform();

    if (!platform) {
      alert('⚠️ 请先选择文本平台');
      return;
    }

    const { api_key } = config;
    const base_url = platform.baseURL;
    const model = config.textModel || platform.models[0]?.id;

    if (!api_key) {
      alert('⚠️ 请先填写 API Key');
      return;
    }

    try {
      const response = await fetch('http://localhost:9000/api/openai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_url, api_key, model }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ 连接成功\n\n平台: ${platform.name}\n模型: ${result.data.model}\n响应: ${result.data.message}`);
      } else {
        alert(`❌ 连接失败\n\n${result.error}`);
      }
    } catch (error) {
      alert(`❌ 网络错误: ${error.message}`);
    }
  };

  // 处理配置变更
  const handleConfigChange = (field, value) => {
    // ⭐ 字段名映射：节点字段 → Context 字段
    const contextField = field === 'textPlatform' ? 'platform' :
                         field === 'textModel' ? 'model' :
                         field === 'api_key' ? 'apiKey' :
                         field === 'base_url' ? 'baseURL' : field;

    // ⭐ 调用 Context 的 updateTextConfig（自动同步 localStorage 和服务器）
    updateTextConfig({ [contextField]: value });

    // ⭐ 同时更新本地 config 状态（保持 UI 响应）
    setConfig((prevConfig) => {
      const newConfig = { ...prevConfig, [field]: value };

      // ⭐ 如果切换了文本平台，自动选择该平台的第一个模型
      if (field === 'textPlatform') {
        const platform = textModels.find(tm => tm.key === value);
        if (platform && platform.models.length > 0) {
          newConfig.textModel = platform.models[0].id;
        }
      }

      return newConfig;
    });
  };

  // 获取当前文本平台的配置
  const getCurrentTextPlatform = () => {
    return textModels.find(tm => tm.key === currentTextPlatform);
  };

  // 获取模型名称
  const getModelName = (modelId) => {
    const model = currentPlatformModels.find(m => m.id === modelId);
    return model?.name || modelId;
  };

  // ⭐ 配置管理迁移到 Context 后，不再需要同步到 node.data
  // 配置现在统一存储在：
  // 1. config.json (后端)
  // 2. APIConfigContext (前端)
  // 3. localStorage (离线备份)
  // 节点不再存储 openaiConfig 到 node.data

  // ⭐ 配置管理迁移到 Context 后，不再需要同步到 node.data
  // 配置现在统一存储在：
  // 1. config.json (后端)
  // 2. APIConfigContext (前端)
  // 3. localStorage (离线备份)
  // 节点不再存储 openaiConfig 到 node.data
  //
  // 下游节点（NarratorProcessorNode, PromptOptimizerNode）应通过 useAPIConfig() Hook 读取配置

  return (
    <div style={{
      padding: '10px 15px',
      borderRadius: '8px',
      borderWidth: '2px',
      borderColor: '#3b82f6',
      borderStyle: 'solid',
      backgroundColor: '#eff6ff',
      width: '280px',
    }}>
      {/* 输入端口 */}
      <Handle
        type="target"
        position={Position.Left}
        id="config-input"
        style={{ background: '#3b82f6', width: 10, height: 10, top: '50%' }}
      />
      <div style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
        <span style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 'bold', whiteSpace: 'nowrap' }}>配置</span>
      </div>

      {/* 标题 */}
      <div style={{
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#1e40af',
        marginBottom: '8px',
        textAlign: 'center',
      }}>
        ⚙️ 文本处理配置
      </div>

      {/* ⭐ 加载状态 */}
      {textModels.length === 0 ? (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          fontSize: '10px',
          color: '#64748b',
        }}>
          加载文本平台中...
        </div>
      ) : (
        <>
          {/* 文本平台选择 */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '10px', color: '#1e40af', marginBottom: '4px', fontWeight: 'bold' }}>
              文本平台
            </div>
            <select
              className="nodrag"
              value={currentTextPlatform || ''}
              onChange={(e) => {
                const newPlatform = e.target.value;
                setCurrentTextPlatform(newPlatform);

                // 获取该平台的第一个可用模型
                const platform = textModels.find(tm => tm.key === newPlatform);
                const newModel = platform?.models?.[0]?.id || '';

                handleConfigChange('textPlatform', newPlatform);
                handleConfigChange('textModel', newModel);
              }}
              onWheel={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '4px 6px',
                borderRadius: '3px',
                border: '1px solid #93c5fd',
                fontSize: '10px',
                backgroundColor: 'white',
                color: '#1e293b',
                cursor: 'pointer',
              }}
            >
              {textModels.map((platform) => (
                <option
                  key={platform.key}
                  value={platform.key}
                  style={{ backgroundColor: 'white', color: '#1e293b' }}
                >
                  {platform.name}
                </option>
              ))}
            </select>
          </div>

          {/* 模型选择 */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '10px', color: '#1e40af', marginBottom: '4px', fontWeight: 'bold' }}>
              模型 ({currentPlatformModels.length} 个)
            </div>
            <select
              className="nodrag"
              value={config.textModel || ''}
              onChange={(e) => handleConfigChange('textModel', e.target.value)}
              onWheel={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '4px 6px',
                borderRadius: '3px',
                border: '1px solid #93c5fd',
                fontSize: '10px',
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

          {/* API Key */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '10px', color: '#1e40af', marginBottom: '4px', fontWeight: 'bold' }}>
              🔑 API Key
            </div>
            <input
              className="nodrag"
              type="password"
              name="apiKey"
              value={config.api_key || ''}
              onChange={(e) => handleConfigChange('api_key', e.target.value)}
              onWheel={(e) => e.stopPropagation()}
              placeholder="输入 API Key..."
              style={{
                width: '100%',
                padding: '4px 6px',
                borderRadius: '3px',
                border: '1px solid #93c5fd',
                fontSize: '10px',
                backgroundColor: 'white',
                color: '#1e293b',
                fontFamily: 'monospace',
              }}
            />
            <div style={{ fontSize: '8px', color: '#64748b', marginTop: '2px', fontStyle: 'italic' }}>
              💡 {getCurrentTextPlatform()?.name || '请选择平台'}
            </div>
          </div>

          {/* ⭐ 平台信息 */}
          {getCurrentTextPlatform() && (
            <div style={{
              padding: '6px',
              backgroundColor: '#dbeafe',
              borderRadius: '3px',
              fontSize: '9px',
              color: '#0369a1',
              marginBottom: '8px',
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                📊 {getCurrentTextPlatform().name}
              </div>
              <div style={{ fontSize: '8px' }}>
                Base URL: {getCurrentTextPlatform().baseURL}
              </div>
            </div>
          )}
        </>
      )}

      {/* 操作按钮 */}
      <div className="nodrag" style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
        <button
          className="nodrag"
          onClick={testConnection}
          style={{
            flex: 1,
            padding: '6px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            fontSize: '10px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          🧪 测试
        </button>
        <button
          className="nodrag"
          onClick={() => {
            // ⭐ 清除配置: 通过 updateTextConfig 清空所有字段
            updateTextConfig({
              platform: '',
              model: '',
              apiKey: '',
              baseURL: '',
            });

            // 同时更新本地 config 状态（保持 UI 响应）
            setConfig({
              textPlatform: '',
              textModel: '',
              api_key: '',
              base_url: '',
            });
          }}
          style={{
            flex: 1,
            padding: '6px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            fontSize: '10px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          🗑️ 清除
        </button>
      </div>

      {/* 输出端口 */}
      <Handle
        type="source"
        position={Position.Right}
        id="openai-config"
        style={{ background: '#3b82f6', width: 10, height: 10, top: '50%' }}
      />
      <div style={{ position: 'absolute', right: '18px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
        <span style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 'bold', whiteSpace: 'nowrap' }}>配置</span>
      </div>
    </div>
  );
}

export default OpenAIConfigNode;
