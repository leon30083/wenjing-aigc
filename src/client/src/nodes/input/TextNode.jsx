import { Handle, Position } from 'reactflow';
import React from 'react';

function TextNode({ data }) {
  return (
    <div style={{
      padding: '10px 15px',
      borderRadius: '8px',
      borderWidth: '2px',
      borderColor: '#3b82f6',
      borderStyle: 'solid',
      backgroundColor: '#eff6ff',
      minWidth: '200px',
    }}>
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="text-output"
        style={{ background: '#3b82f6', width: 10, height: 10 }}
      />

      {/* Node Header */}
      <div style={{
        fontWeight: 'bold',
        color: '#1e40af',
        marginBottom: '8px',
        fontSize: '14px',
      }}>
        📝 {data.label}
      </div>

      {/* Text Area */}
      <textarea
        id="text-node-input"
        name="text-input"
        value={data.value || ''}
        placeholder="输入提示词..."
        style={{
          width: '100%',
          minHeight: '60px',
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid #cbd5e1',
          fontSize: '12px',
          resize: 'vertical',
          fontFamily: 'inherit',
        }}
        onChange={(e) => {
          if (data.onChange) {
            data.onChange(e.target.value);
          }
        }}
      />

      {/* Output Label */}
      <div style={{
        marginTop: '8px',
        fontSize: '10px',
        color: '#64748b',
        textAlign: 'right',
      }}>
        提示词 →
      </div>
    </div>
  );
}

export default TextNode;
