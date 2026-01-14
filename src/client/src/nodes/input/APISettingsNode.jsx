import { Handle, Position } from 'reactflow';
import React from 'react';
import { useNodeResize } from '../../hooks/useNodeResize';
import { useAPIConfig } from '../../contexts/APIConfigContext';

/**
 * APISettingsNode - API 配置节点
 *
 * ⭐ 重构：使用 APIConfigContext 统一管理配置状态
 * - 移除本地 useState 管理的 config
 * - 使用 useAPIConfig Hook 获取全局配置
 * - 移除所有 useEffect 同步逻辑（Context 自动处理）
 * - 移除早期恢复机制（Context 自动处理）
 *
 * 解决问题：错误56 - useState 异步闭包问题导致配置丢失
 */
function APISettingsNode({ data }) {
  // ⭐ 从 Context 获取全局配置（单一数据源）
  const { config, updateConfig } = useAPIConfig();

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
          {/* ⭐ 根据平台显示支持的模型选项 */}
          {config.platform === 'juxin' ? (
            <>
              <option value="sora-2-all" style={{ backgroundColor: 'white', color: '#1e293b' }}>Sora-2-all</option>
            </>
          ) : (
            <>
              <option value="sora-2" style={{ backgroundColor: 'white', color: '#1e293b' }}>Sora-2</option>
              <option value="sora-2-pro" style={{ backgroundColor: 'white', color: '#1e293b' }}>Sora-2 Pro</option>
            </>
          )}
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
          value={config.apiKey}
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
