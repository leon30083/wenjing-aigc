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
  const { textModels } = useAPIConfig();

  // 当前选中文本平台
  const [currentTextPlatform, setCurrentTextPlatform] = useState(null);

  // 当前选中文本平台的模型列表
  const currentPlatformModels = textModels.find(tm => tm.key === currentTextPlatform)?.models || [];

  // 获取当前配置（从 node.data 或全局配置）
  const [config, setConfig] = useState(() => {
    // ✅ 优先使用 node.data.openaiConfig（工作流专属配置）
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

  // 保存配置到 localStorage
  const saveConfig = (newConfig) => {
    localStorage.setItem('winjin-openai-config', JSON.stringify(newConfig));
  };

  // 加载配置
  const loadConfig = () => {
    try {
      const saved = localStorage.getItem('winjin-openai-config');
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
        saveConfig(parsed);
        syncToData(parsed);
        alert('✅ 配置已加载');
      } else {
        alert('⚠️ 没有找到已保存的配置');
      }
    } catch (error) {
      console.error('加载配置失败:', error);
      alert('❌ 加载配置失败');
    }
  };

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

  // 同步配置到 node.data
  const syncToData = (config) => {
    console.log('[OpenAIConfigNode] syncToData 调用:', {
      nodeId,
      configKeys: config ? Object.keys(config) : [],
      hasConfig: !!config,
    });
    setNodes((nds) => {
      const updated = nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, openaiConfig: config } }
          : node
      );
      const updatedNode = updated.find(n => n.id === nodeId);
      console.log('[OpenAIConfigNode] syncToData 更新后:', {
        nodeId,
        hasOpenaiConfig: !!updatedNode?.data?.openaiConfig,
      });
      return updated;
    });
  };

  // 处理配置变更
  const handleConfigChange = (field, value) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    saveConfig(newConfig);
    syncToData(newConfig);

    // ⭐ 如果切换了文本平台，自动选择该平台的第一个模型
    if (field === 'textPlatform') {
      const platform = textModels.find(tm => tm.key === value);
      if (platform && platform.models.length > 0) {
        newConfig.textModel = platform.models[0].id;
        setConfig(newConfig);
      }
    }
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

  // 同步配置到 node.data（初始化时同步一次，延迟执行确保工作流已加载）
  useEffect(() => {
    // ⭐ 延迟 100ms 执行，确保 App.jsx 已完成工作流加载
    const timer = setTimeout(() => {
      console.log('[OpenAIConfigNode] 延迟同步配置到 node.data:', {
        nodeId,
        configKeys: Object.keys(config),
        hasConfig: !!config,
      });
      syncToData(config);
    }, 100);

    return () => clearTimeout(timer);
  }, []); // ⭐ 空依赖数组，只在挂载时运行一次

  // ⭐ 获取下游节点兼容的配置格式
  // 内部使用新格式 { textPlatform, textModel, api_key }
  // 下游节点期望旧格式 { base_url, api_key, model }
  const getDownstreamConfig = () => {
    const platform = getCurrentTextPlatform();
    if (!platform) return null;

    return {
      base_url: platform.baseURL,
      api_key: config.api_key || '',
      model: config.textModel || platform.models[0]?.id || ''
    };
  };

  // 传递配置到下游节点
  useEffect(() => {
    if (nodeId) {
      const edges = getEdges();
      const outgoingEdges = edges.filter(e => e.source === nodeId);

      if (outgoingEdges.length > 0) {
        // ⭐ 转换配置格式为下游节点兼容的格式
        const downstreamConfig = getDownstreamConfig();

        console.log('[OpenAIConfigNode] 推送配置到下游节点:', {
          originalConfig: { textPlatform: config.textPlatform, textModel: config.textModel },
          downstreamConfig,
          targetNodes: outgoingEdges.map(e => e.target),
        });

        setNodes((nds) =>
          nds.map((node) => {
            const isConnected = outgoingEdges.some(e => e.target === node.id);
            if (isConnected) {
              console.log('[OpenAIConfigNode] 更新节点:', node.id, 'downstreamConfig:', downstreamConfig);
              return {
                ...node,
                data: {
                  ...node.data,
                  openaiConfig: downstreamConfig,  // ⭐ 使用转换后的格式
                  openaiConfigSourceId: nodeId,
                  openaiConfigSourceLabel: data.label || '文本处理配置'
                }
              };
            }
            return node;
          })
        );
      }
    }
  }, [config, nodeId, getEdges, setNodes, data.label, edges]);

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
          onClick={loadConfig}
          style={{
            flex: 1,
            padding: '6px',
            backgroundColor: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            fontSize: '10px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          📂 加载
        </button>
        <button
          className="nodrag"
          onClick={() => {
            const emptyConfig = { textPlatform: '', textModel: '', api_key: '' };
            setConfig(emptyConfig);
            saveConfig(emptyConfig);
            syncToData(emptyConfig);
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
