/**
 * OpenAI 配置节点
 * 用于配置 OpenAI 格式 API (DeepSeek, GLM 等)
 */

import React, { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow, useNodeId } from 'reactflow';

function OpenAIConfigNode({ data }) {
  const nodeId = useNodeId();
  const { setNodes } = useReactFlow();

  // 从 localStorage 或 data 初始化
  const [config, setConfig] = useState(() => {
    // 优先从 localStorage 读取（持久化存储）
    try {
      const local = localStorage.getItem('winjin-openai-config');
      if (local) {
        return JSON.parse(local);
      }
    } catch (error) {
      console.error('[OpenAIConfigNode] 读取 localStorage 失败:', error);
    }

    // 降级到 node.data 初始化
    const saved = data.savedConfig || {};
    return {
      base_url: saved.base_url || 'http://170.106.152.118:2999',
      api_key: saved.api_key || 'sk-PdoHKdR3XKgiLzYRk3mxfgiYpJbC24JTLmwP0hv07nOE4QaE',
      model: saved.model || 'gemini-2.5-pro-maxthinking',
    };
  });

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
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, openaiConfig: config } }
          : node
      )
    );
  };

  // 处理配置变更
  const handleConfigChange = (field, value) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    saveConfig(newConfig);
    syncToData(newConfig);
  };

  // 同步配置到 node.data（初始化时同步一次）
  useEffect(() => {
    syncToData(config);
  }, []); // ⭐ 空依赖数组，只在挂载时运行一次

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
            onClick={() => {
              const emptyConfig = {
                base_url: 'https://api.deepseek.com',
                api_key: '',
                model: 'deepseek-chat',
              };
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
