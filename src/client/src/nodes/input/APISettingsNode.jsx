import { Handle, Position, useReactFlow, useNodeId } from 'reactflow';
import React, { useState, useEffect, useRef } from 'react';
import { useNodeResize } from '../../hooks/useNodeResize';

function APISettingsNode({ data }) {
  const nodeId = useNodeId();
  const { setNodes, getEdges, edges, getNodes } = useReactFlow();

  // ⭐ 从 data.apiConfig 初始化状态（支持工作流恢复），否则使用默认值
  const [config, setConfig] = useState(() => {
    if (data.apiConfig && typeof data.apiConfig === 'object') {
      return {
        platform: data.apiConfig.platform || 'juxin',
        model: data.apiConfig.model || 'sora-2-all',
        aspect: data.apiConfig.aspect || '16:9',
        watermark: data.apiConfig.watermark || false,
        apiKey: data.apiConfig.apiKey || '',
      };
    }
    return {
      platform: 'juxin',         // 'juxin' | 'zhenzhen'
      model: 'sora-2-all',     // 'sora-2-all' | 'sora-2' | 'sora-2-pro'
      aspect: '16:9',         // '16:9' | '9:16'
      watermark: false,       // true | false
      apiKey: '',            // API Key（用户自定义）
    };
  });

  const onSizeChangeRef = useRef(data.onSizeChange);

  useEffect(() => {
    onSizeChangeRef.current = data.onSizeChange;
  }, [data.onSizeChange]);

  // ⭐ 同步 config 到 node.data（让 App.jsx 和下游节点能够读取）
  const isInitialSyncRef = useRef(true);
  const isRecoveryDoneRef = useRef(false); // ⭐ 新增：跟踪恢复是否完成

  // ⭐ 新增：早期恢复机制 - 在初始同步之前运行
  useEffect(() => {
    if (nodeId && !isRecoveryDoneRef.current) {
      const edges = getEdges();
      const outgoingEdges = edges.filter(e => e.source === nodeId);

      // 查找下游节点是否有更新的 apiConfig
      for (const edge of outgoingEdges) {
        const targetNode = getNodes().find(n => n.id === edge.target);
        if (targetNode?.data?.apiConfig && targetNode.data.apiConfig.platform) {
          // ⭐ 比较配置：如果下游节点的平台与本地初始化的不同，则恢复
          const needsRecovery = targetNode.data.apiConfig.platform !== config.platform;

          if (needsRecovery) {
            const recoveredConfig = targetNode.data.apiConfig;
            console.log('[APISettingsNode] 🔄 早期恢复：从下游节点恢复配置:', recoveredConfig);
            console.log('[APISettingsNode] 🔄 当前本地配置（旧）:', config);

            // ⭐ 关键修复：直接更新本地状态和下游节点（绕过异步问题）
            setConfig(recoveredConfig);

            // ⭐ 同时立即更新自己 node.data 和下游节点（确保数据一致性）
            setNodes((nds) =>
              nds.map((node) => {
                // 更新自己
                if (node.id === nodeId) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      apiConfig: recoveredConfig
                    }
                  };
                }
                // 更新下游节点
                const isConnected = outgoingEdges.some(e => e.target === node.id);
                if (isConnected) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      apiConfig: recoveredConfig,
                      apiConfigSourceId: nodeId,
                      apiConfigSourceLabel: data.label || 'API 设置'
                    }
                  };
                }
                return node;
              })
            );

            isRecoveryDoneRef.current = true;
            break;
          }
        }
      }
      // 即使没有恢复，也标记为已完成
      isRecoveryDoneRef.current = true;
    }
  }, [nodeId, getEdges, getNodes]); // ⭐ 不依赖 config，避免无限循环

  useEffect(() => {
    // ⭐ 等待恢复完成后再进行同步（避免旧配置被推送到下游）
    if (!isRecoveryDoneRef.current) {
      console.log('[APISettingsNode] ⏸️ 等待恢复完成，跳过同步');
      return;
    }

    if (nodeId) {
      // ⭐ 深度比较，避免无限循环
      const currentApiConfig = data.apiConfig;
      const needsUpdate = !currentApiConfig ||
        currentApiConfig.platform !== config.platform ||
        currentApiConfig.model !== config.model ||
        currentApiConfig.aspect !== config.aspect ||
        currentApiConfig.watermark !== config.watermark ||
        currentApiConfig.apiKey !== config.apiKey;

      if (needsUpdate) {
        setNodes((nds) =>
          nds.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    apiConfig: config
                  }
                }
              : node
          )
        );
        console.log('[APISettingsNode] ✅ 配置已同步到 node.data:', config);
      }

      isInitialSyncRef.current = false;
    }
  }, [config, nodeId, setNodes]); // ⭐ 移除 data.apiConfig 依赖，只监听 config 变化

  // ⭐ 恢复机制：如果 data.apiConfig 为 undefined 或与下游节点不一致，尝试恢复
  useEffect(() => {
    if (isInitialSyncRef.current === false && nodeId) { // ⭐ 修复：改为 false 才运行（初始同步完成后）
      const edges = getEdges();
      const outgoingEdges = edges.filter(e => e.source === nodeId);

      // 查找下游节点是否有 apiConfig
      for (const edge of outgoingEdges) {
        const targetNode = getNodes().find(n => n.id === edge.target);
        if (targetNode?.data?.apiConfig && targetNode.data.apiConfig.platform) {
          // ⭐ 比较配置，如果不同才恢复
          const needsRecovery = !data.apiConfig ||
            data.apiConfig.platform !== targetNode.data.apiConfig.platform ||
            data.apiConfig.model !== targetNode.data.apiConfig.model ||
            data.apiConfig.aspect !== targetNode.data.apiConfig.aspect ||
            data.apiConfig.watermark !== targetNode.data.apiConfig.watermark ||
            data.apiConfig.apiKey !== targetNode.data.apiConfig.apiKey;

          if (needsRecovery) {
            console.log('[APISettingsNode] 🔄 从下游节点恢复配置:', targetNode.data.apiConfig);
            setConfig(targetNode.data.apiConfig);
            break;
          }
        }
      }
    }
  }, [data.apiConfig, nodeId, getEdges, getNodes]);

  // 传递配置到下游节点
  useEffect(() => {
    if (nodeId) {
      const edges = getEdges();
      const outgoingEdges = edges.filter(e => e.source === nodeId);

      setNodes((nds) =>
        nds.map((node) => {
          const isConnected = outgoingEdges.some(e => e.target === node.id);
          if (isConnected) {
            return {
              ...node,
              data: {
                ...node.data,
                apiConfig: config,
                apiConfigSourceId: nodeId,
                apiConfigSourceLabel: data.label || 'API 设置'
              }
            };
          }
          return node;
        })
      );
    }
  }, [config, nodeId, getEdges, setNodes, data.label, edges]); // ⭐ 添加 edges

  const { resizeStyles, handleResizeMouseDown, getResizeHandleStyles } = useNodeResize(
    data,
    220, // minWidth
    260, // minHeight
    { width: 240, height: 300 } // initialSize
  );

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
            // ⭐ 根据平台自动切换默认模型
            const newModel = newPlatform === 'juxin' ? 'sora-2-all' : 'sora-2';
            setConfig({ ...config, platform: newPlatform, model: newModel });
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
          <option value="juxin" style={{ backgroundColor: 'white', color: '#1e293b' }}>聚鑫 (api.jxincm.cn)</option>
          <option value="zhenzhen" style={{ backgroundColor: 'white', color: '#1e293b' }}>贞贞 (ai.t8star.cn)</option>
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
          onChange={(e) => setConfig({ ...config, model: e.target.value })}
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
          <option value="sora-2-all" style={{ backgroundColor: 'white', color: '#1e293b' }}>Sora-2-all</option>
          <option value="sora-2" style={{ backgroundColor: 'white', color: '#1e293b' }}>Sora-2</option>
          <option value="sora-2-pro" style={{ backgroundColor: 'white', color: '#1e293b' }}>Sora-2 Pro</option>
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
          onChange={(e) => setConfig({ ...config, aspect: e.target.value })}
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
            onChange={(e) => setConfig({ ...config, watermark: e.target.checked })}
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
          value={config.apiKey}
          onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
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

      {/* Info Display */}
      <div style={{
        marginTop: '10px',
        padding: '8px',
        backgroundColor: '#dbeafe',
        borderRadius: '4px',
        fontSize: '11px',
        color: '#1e40af',
        textAlign: 'center',
        fontWeight: 'bold',
      }}>
        {config.platform === 'juxin' ? '聚鑫' : '贞贞'} | {config.model.toUpperCase()} | {config.aspect}
      </div>

      {/* Output Label */}
      <div style={{
        marginTop: '10px',
        fontSize: '10px',
        color: '#64748b',
        textAlign: 'right',
      }}>
        配置 →
      </div>

      {/* Resize Handle */}
      <div
        className="nodrag"
        onMouseDown={handleResizeMouseDown}
        style={getResizeHandleStyles('#3b82f6')}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
        title="拖动调整节点大小"
      />
    </div>
  );
}

export default APISettingsNode;
