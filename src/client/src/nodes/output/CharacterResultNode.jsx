import { Handle, Position } from 'reactflow';
import { useState, useEffect } from 'react';
import { useNodeResize } from '../../hooks/useNodeResize';

const API_BASE = 'http://localhost:9000';

function CharacterResultNode({ data }) {
  const [character, setCharacter] = useState(data.character || null);
  const [copySuccess, setCopySuccess] = useState(null);

  const { resizeStyles, handleResizeMouseDown, getResizeHandleStyles } = useNodeResize(
    data,
    300, // minWidth
    150, // minHeight
    { width: 320, height: 180 } // initialSize
  );

  // Copy to clipboard function
  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(null), 2000);
    }
  };

  // Update character when data.character changes
  useEffect(() => {
    if (data.character) {
      setCharacter(data.character);
    }
  }, [data.character]);

  // Listen for character creation events
  useEffect(() => {
    // ⭐ 关键修复：只有当连接到源节点时才监听事件
    // 如果 connectedSourceId 为 undefined，说明节点未连接任何源节点，不应该响应
    if (!data.connectedSourceId) {
      return;
    }

    const handleCharacterCreated = (event) => {
      const { sourceNodeId, character: newCharacter } = event.detail;

      // ⭐ 新增：验证源节点类型
      // 只有从 CharacterCreateNode 派发的事件才应该响应
      // 这里我们无法直接获取节点类型，但 connectedSourceId 是由 App.jsx 设置的
      // App.jsx 会验证只有 CharacterLibraryNode 连接到 CharacterResultNode 时才设置 connectedSourceId
      // 而 CharacterCreateNode 派发事件时，源节点就是 CharacterCreateNode 本身
      // 所以这个检查实际上在 App.jsx 中已经完成了

      // Check if this node is connected to the character creation node
      if (data.connectedSourceId === sourceNodeId && newCharacter) {
        setCharacter(newCharacter);
      }
    };

    window.addEventListener('character-created', handleCharacterCreated);
    return () => window.removeEventListener('character-created', handleCharacterCreated);
  }, [data.connectedSourceId]);

  if (!character) {
    return (
      <div style={{
        padding: '10px 15px',
        borderRadius: '8px',
        borderWidth: '2px',
        borderColor: '#a855f7',
        borderStyle: 'solid',
        backgroundColor: '#faf5ff',
        ...resizeStyles,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Input Handle */}
        <Handle
          type="target"
          position={Position.Left}
          id="character-input"
          style={{ background: '#a855f7', width: 10, height: 10 }}
        />

        <div style={{ textAlign: 'center', color: '#7e22ce', fontSize: '12px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>📊 角色结果</div>
          <div>连接角色生成节点以查看结果</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '10px 15px',
      borderRadius: '8px',
      borderWidth: '2px',
      borderColor: '#a855f7',
      borderStyle: 'solid',
      backgroundColor: '#faf5ff',
      ...resizeStyles,
    }}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="character-input"
        style={{ background: '#a855f7', width: 10, height: 10 }}
      />

      {/* Node Header */}
      <div style={{
        fontWeight: 'bold',
        color: '#7e22ce',
        marginBottom: '8px',
        fontSize: '14px',
      }}>
        📊 {data.label || '角色结果'}
      </div>

      {/* Character Info */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '4px',
        padding: '8px',
        marginBottom: '8px',
        fontSize: '11px',
      }}>
        {/* Character ID */}
        <div style={{ marginBottom: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontWeight: 'bold', color: '#581c87' }}>角色 ID:</span>
            <button
              className="nodrag"
              onClick={() => copyToClipboard(character.id, 'id')}
              style={{
                padding: '2px 6px',
                fontSize: '9px',
                backgroundColor: copySuccess === 'id' ? '#059669' : '#a855f7',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
            >
              {copySuccess === 'id' ? '✓ 已复制' : '📋 复制'}
            </button>
          </div>
          <div style={{ wordBreak: 'break-all', color: '#6b7280', fontSize: '10px' }}>
            {character.id}
          </div>
        </div>

        {/* Username */}
        <div style={{ marginBottom: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontWeight: 'bold', color: '#581c87' }}>用户名:</span>
            <button
              className="nodrag"
              onClick={() => copyToClipboard(`@${character.username}`, 'username')}
              style={{
                padding: '2px 6px',
                fontSize: '9px',
                backgroundColor: copySuccess === 'username' ? '#059669' : '#a855f7',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
            >
              {copySuccess === 'username' ? '✓ 已复制' : '📋 复制'}
            </button>
          </div>
          <div style={{ color: '#6b7280' }}>@{character.username}</div>
        </div>

        {/* Alias (if exists) */}
        {character.alias && (
          <div style={{ marginBottom: '6px' }}>
            <span style={{ fontWeight: 'bold', color: '#581c87' }}>别名:</span>
            <div style={{ color: '#6b7280' }}>{character.alias}</div>
          </div>
        )}

        {/* Profile Picture (if exists) */}
        {character.profile_picture_url && (
          <div style={{ marginTop: '8px', textAlign: 'center' }}>
            <img
              src={character.profile_picture_url}
              alt="Character"
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #a855f7',
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}
      </div>

      {/* Success Message */}
      <div style={{
        marginTop: '8px',
        padding: '6px',
        backgroundColor: '#d1fae5',
        borderRadius: '4px',
        fontSize: '10px',
        color: '#065f46',
        textAlign: 'center',
        fontWeight: 'bold',
      }}>
        ✓ 角色已保存到角色库
      </div>

      {/* Label */}
      <div style={{
        marginTop: '8px',
        fontSize: '10px',
        color: '#64748b',
        textAlign: 'center',
      }}>
        ← 角色
      </div>

      {/* Resize Handle (ComfyUI style) */}
      <div
        className="nodrag"
        onMouseDown={handleResizeMouseDown}
        style={getResizeHandleStyles('#a855f7')}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
        title="拖动调整节点大小"
      />
    </div>
  );
}

export default CharacterResultNode;
