/**
 * React Flow 节点模板
 *
 * 使用方法:
 * 1. 复制此文件到 src/client/src/nodes/[type]/ 目录
 * 2. 重命名文件和组件名
 * 3. 修改节点类型、颜色和业务逻辑
 * 4. 在 App.jsx 中注册节点
 */

import React, { useState, useEffect } from 'react';
import { Handle, Position, useNodeId } from 'reactflow';
import PropTypes from 'prop-types';

/**
 * [节点名称] 组件
 *
 * @param {Object} props
 * @param {Object} props.data - 节点数据
 * @param {string} props.data.id - 节点ID
 * @param {string} props.data.label - 节点显示名称
 * @param {Function} props.data.onUpdate - 数据更新回调
 * @param {boolean} props.selected - 是否选中
 */
const [NodeName] = ({ data, selected }) => {
  const nodeId = useNodeId();

  // ========== 节点内部状态 ==========
  const [localState, setLocalState] = useState(data.value || '');
  const [status, setStatus] = useState('idle');

  // ========== 接收上游数据 ==========
  const connectedData = data.connectedData || null;

  // ========== 生命周期 ==========
  useEffect(() => {
    // 从 data 初始化状态
    if (data.value !== undefined && data.value !== localState) {
      setLocalState(data.value);
    }
  }, [data.value]);

  // ========== 事件处理 ==========
  const handleChange = (newValue) => {
    setLocalState(newValue);

    // 同步到 node.data
    if (data.onUpdate) {
      data.onUpdate(nodeId, { value: newValue });
    }
  };

  const handleAction = async () => {
    try {
      setStatus('loading');

      // TODO: 实现业务逻辑
      const result = await performAction();

      setStatus('success');

      // 更新下游节点数据
      if (data.onUpdate) {
        data.onUpdate(nodeId, { result });
      }
    } catch (error) {
      setStatus('error');
      console.error('[NodeName] 操作失败:', error);
    }
  };

  // ========== 辅助函数 ==========
  const performAction = async () => {
    // TODO: 实现具体的业务逻辑
    return { success: true };
  };

  // ========== 样式配置 ==========
  const nodeStyle = {
    padding: '12px',
    borderRadius: '8px',
    border: `2px solid ${selected ? '#[节点颜色]' : '#334155'}`,
    background: '#1e293b',
    color: '#f8fafc',
    minWidth: '200px',
  };

  const handleStyle = {
    width: '10px',
    height: '10px',
    background: '#[节点颜色]',
  };

  return (
    <div style={nodeStyle}>
      {/* ========== 输入 Handles ========== */}
      <Handle
        type="target"
        position={Position.Left}
        id="[handle-id]-input"
        style={handleStyle}
      />

      {/* ========== 节点头部 ========== */}
      <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
        [图标] {data.label}
      </div>

      {/* ========== 节点内容 ========== */}
      <div>
        {/* TODO: 添加节点内容 */}
      </div>

      {/* ========== 输出 Handles ========== */}
      <Handle
        type="source"
        position={Position.Right}
        id="[handle-id]-output"
        style={handleStyle}
      />

      {/* ========== Handle 标签 ========== */}
      <div
        style={{
          position: 'absolute',
          left: '-[label-width]px',
          top: '[top-position]%',
          transform: 'translateY(-50%)',
          fontSize: '10px',
          color: '#94a3b8',
        }}
      >
        [handle-name]
      </div>
    </div>
  );
};

// ========== PropTypes 类型检查 ==========
[NodeName].propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string.isRequired,
    value: PropTypes.any,
    connectedData: PropTypes.any,
    onUpdate: PropTypes.func,
  }).isRequired,
  selected: PropTypes.bool,
};

export default [NodeName];
