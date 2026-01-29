/**
 * OpenAI 配置节点
 * 用于配置 OpenAI 格式 API (DeepSeek, GLM 等)
 */

import React, { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow, useNodeId } from 'reactflow';

// 预设配置常量
const PRESETS = {
  deepseek: {
    name: 'DeepSeek',
    base_url: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    color: '#6366f1',
  },
  glm_coding: {
    name: 'GLM 编程',
    base_url: 'https://open.bigmodel.cn/api/coding/paas/v4',
    model: 'GLM-4.7',
    color: '#ec4899',
  },
  ge25: {
    name: '[ge2.5]',
    base_url: 'http://170.106.152.118:2999',
    model: 'gemini-2.5-pro-maxthinking',
    color: '#8b5cf6',
  },
  empty: {
    name: '空配置',
    base_url: '',
    api_key: '',
    model: '',
    color: '#6b7280',
  },
};

function OpenAIConfigNode({ data }) {
  const nodeId = useNodeId();
  const { setNodes, getEdges, edges } = useReactFlow();

  // 预设选择状态
  const [selectedPreset, setSelectedPreset] = useState(null);

  // 从 node.data 或 localStorage 初始化（优先级调整）
  const [config, setConfig] = useState(() => {
    // ✅ 优先使用 node.data.openaiConfig（工作流专属配置）
    if (data.openaiConfig) {
      console.log('[OpenAIConfigNode] 使用 node.data 配置:', data.openaiConfig);
      return data.openaiConfig;
    }

    // ⚠️ 降级到 localStorage（全局配置，仅作为备份）
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

    // ⚠️ 最后降级到空配置（不使用硬编码测试数据）
    console.log('[OpenAIConfigNode] 使用默认空配置');
    return {
      base_url: '',
      api_key: '',
      model: '',
    };
  });

  // 保存配置到 localStorage
  const saveConfig = (newConfig) => {
    localStorage.setItem('winjin-openai-config', JSON.stringify(newConfig));
  };

  // 获取所有保存的 API Key
  const getSavedApiKeys = () => {
    try {
      const saved = localStorage.getItem('winjin-openai-api-keys');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('[OpenAIConfigNode] 读取 API Keys 失败:', error);
      return {};
    }
  };

  // 保存当前服务的 API Key
  const saveApiKeyForService = (presetKey, apiKey) => {
    const keys = getSavedApiKeys();
    keys[presetKey] = apiKey;
    localStorage.setItem('winjin-openai-api-keys', JSON.stringify(keys));
    console.log(`[OpenAIConfigNode] 保存 ${presetKey} 的 API Key`);
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
    const { base_url, api_key, model } = config;

    if (!base_url || !api_key || !model) {
      alert('⚠️ 请先填写完整的 API 配置');
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
        alert(`✅ 连接成功\n\n模型: ${result.data.model}\n响应: ${result.data.message}`);
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

    // ⭐ 如果修改的是 api_key，保存到当前对应的服务
    if (field === 'api_key' && selectedPreset) {
      saveApiKeyForService(selectedPreset, value);
    }

    // 更新预设选择状态
    updateSelectedPreset(newConfig);
  };

  // 应用预设配置
  const applyPreset = (presetKey) => {
    const preset = PRESETS[presetKey];
    if (!preset) return;

    setSelectedPreset(presetKey);

    // ⭐ 自动加载对应服务已保存的 API Key
    const savedKeys = getSavedApiKeys();
    const savedApiKey = savedKeys[presetKey] || '';

    const newConfig = {
      base_url: preset.base_url || '',
      model: preset.model || '',
      api_key: savedApiKey,  // ✅ 使用该服务之前保存的 key
    };

    setConfig(newConfig);
    saveConfig(newConfig);
    syncToData(newConfig);

    console.log(`[OpenAIConfigNode] 应用预设: ${preset.name}`, {
      ...newConfig,
      hasApiKey: !!savedApiKey,
    });
  };

  // 更新预设选择状态
  const updateSelectedPreset = (currentConfig) => {
    if (!currentConfig.base_url && !currentConfig.model) {
      setSelectedPreset('empty');
    } else if (currentConfig.base_url === 'https://api.deepseek.com' || currentConfig.model === 'deepseek-chat') {
      setSelectedPreset('deepseek');
    } else if (currentConfig.base_url?.includes('bigmodel.cn/api/coding') || currentConfig.model === 'GLM-4.7') {
      setSelectedPreset('glm_coding');
    } else if (currentConfig.base_url?.includes('170.106.152.118') || currentConfig.model === 'gemini-2.5-pro-maxthinking') {
      setSelectedPreset('ge25');
    } else {
      setSelectedPreset(null);  // 自定义配置
    }
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

  // 初始化预设选择状态
  useEffect(() => {
    // 检测当前配置匹配哪个预设
    if (config.base_url === 'https://api.deepseek.com' || config.model === 'deepseek-chat') {
      setSelectedPreset('deepseek');
    } else if (config.base_url?.includes('bigmodel.cn/api/coding') || config.model === 'GLM-4.7') {
      setSelectedPreset('glm_coding');
    } else if (config.base_url?.includes('170.106.152.118') || config.model === 'gemini-2.5-pro-maxthinking') {
      setSelectedPreset('ge25');
    } else if (!config.base_url && !config.model) {
      setSelectedPreset('empty');
    } else {
      setSelectedPreset(null);  // 自定义配置
    }
  }, []);  // 只在挂载时运行一次

  // 传递配置到下游节点
  useEffect(() => {
    if (nodeId) {
      const edges = getEdges();
      const outgoingEdges = edges.filter(e => e.source === nodeId);

      if (outgoingEdges.length > 0) {
        console.log('[OpenAIConfigNode] 推送配置到下游节点:', {
          config: { base_url: config.base_url, model: config.model },
          targetNodes: outgoingEdges.map(e => e.target),
        });

        setNodes((nds) =>
          nds.map((node) => {
            const isConnected = outgoingEdges.some(e => e.target === node.id);
            if (isConnected) {
              console.log('[OpenAIConfigNode] 更新节点:', node.id, '配置:', config);
              return {
                ...node,
                data: {
                  ...node.data,
                  openaiConfig: config,
                  openaiConfigSourceId: nodeId,
                  openaiConfigSourceLabel: data.label || 'OpenAI 配置'
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
        ⚙️ OpenAI 配置
      </div>

      {/* 快速预设 */}
      <div style={{
        marginBottom: '10px',
      }}>
        <div style={{
          fontSize: '10px',
          color: '#1e40af',
          fontWeight: 'bold',
          marginBottom: '4px',
        }}>
          ⚡ 快速预设
        </div>
        <div style={{
          display: 'flex',
          gap: '4px',
          justifyContent: 'space-between'
        }}>
          <button
            className="nodrag"
            onClick={() => applyPreset('deepseek')}
            style={{
              flex: 1,
              padding: '4px 2px',
              backgroundColor: selectedPreset === 'deepseek' ? '#6366f1' : '#e0e7ff',
              color: selectedPreset === 'deepseek' ? 'white' : '#1e40af',
              border: `1px solid ${selectedPreset === 'deepseek' ? '#6366f1' : '#c7d2fe'}`,
              borderRadius: '4px',
              fontSize: '9px',
              cursor: 'pointer',
              fontWeight: 'bold',
              textAlign: 'center',
            }}
            title="DeepSeek API"
          >
            DeepSeek
          </button>

          <button
            className="nodrag"
            onClick={() => applyPreset('glm_coding')}
            style={{
              flex: 1,
              padding: '4px 2px',
              backgroundColor: selectedPreset === 'glm_coding' ? '#ec4899' : '#fce7f3',
              color: selectedPreset === 'glm_coding' ? 'white' : '#9f1239',
              border: `1px solid ${selectedPreset === 'glm_coding' ? '#ec4899' : '#fbcfe8'}`,
              borderRadius: '4px',
              fontSize: '9px',
              cursor: 'pointer',
              fontWeight: 'bold',
              textAlign: 'center',
            }}
            title="GLM 编程套餐（OpenAI Compatible）"
          >
            GLM 编程
          </button>

          <button
            className="nodrag"
            onClick={() => applyPreset('ge25')}
            style={{
              flex: 1,
              padding: '4px 2px',
              backgroundColor: selectedPreset === 'ge25' ? '#8b5cf6' : '#ede9fe',
              color: selectedPreset === 'ge25' ? 'white' : '#5b21b6',
              border: `1px solid ${selectedPreset === 'ge25' ? '#8b5cf6' : '#ddd6fe'}`,
              borderRadius: '4px',
              fontSize: '9px',
              cursor: 'pointer',
              fontWeight: 'bold',
              textAlign: 'center',
            }}
            title="ge2.5"
          >
            [ge2.5]
          </button>

          <button
            className="nodrag"
            onClick={() => applyPreset('empty')}
            style={{
              flex: 1,
              padding: '4px 2px',
              backgroundColor: selectedPreset === 'empty' ? '#6b7280' : '#f3f4f6',
              color: selectedPreset === 'empty' ? 'white' : '#374151',
              border: `1px solid ${selectedPreset === 'empty' ? '#6b7280' : '#d1d5db'}`,
              borderRadius: '4px',
              fontSize: '9px',
              cursor: 'pointer',
              fontWeight: 'bold',
              textAlign: 'center',
            }}
            title="空配置"
          >
            空配置
          </button>
        </div>
      </div>

      {/* API 配置表单 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {/* Base URL */}
        <div className="nodrag">
          <label style={{ fontSize: '10px', color: '#1e40af', fontWeight: 'bold' }}>
            Base URL
          </label>
          <input
            className="nodrag"
            type="text"
            name="base_url"
            value={config.base_url}
            onChange={(e) => handleConfigChange('base_url', e.target.value)}
            onWheel={(e) => e.stopPropagation()}
            placeholder="https://api.deepseek.com"
            style={{
              width: '100%',
              padding: '4px 6px',
              borderRadius: '3px',
              border: '1px solid #93c5fd',
              fontSize: '10px',
              marginTop: '2px',
            }}
          />
        </div>

        {/* API Key */}
        <div className="nodrag">
          <label style={{ fontSize: '10px', color: '#1e40af', fontWeight: 'bold' }}>
            API Key
          </label>
          <input
            className="nodrag"
            type="password"
            name="api_key"
            value={config.api_key}
            onChange={(e) => handleConfigChange('api_key', e.target.value)}
            onWheel={(e) => e.stopPropagation()}
            placeholder="sk-xxxxx..."
            style={{
              width: '100%',
              padding: '4px 6px',
              borderRadius: '3px',
              border: '1px solid #93c5fd',
              fontSize: '10px',
              marginTop: '2px',
            }}
          />
        </div>

        {/* Model */}
        <div className="nodrag">
          <label style={{ fontSize: '10px', color: '#1e40af', fontWeight: 'bold' }}>
            Model
          </label>
          <input
            className="nodrag"
            type="text"
            name="model"
            value={config.model}
            onChange={(e) => handleConfigChange('model', e.target.value)}
            onWheel={(e) => e.stopPropagation()}
            placeholder="deepseek-chat"
            style={{
              width: '100%',
              padding: '4px 6px',
              borderRadius: '3px',
              border: '1px solid #93c5fd',
              fontSize: '10px',
              marginTop: '2px',
            }}
          />
        </div>

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
            onClick={() => applyPreset('deepseek')}
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
