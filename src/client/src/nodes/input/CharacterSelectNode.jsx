import { Handle, Position } from 'reactflow';
import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:9000';

function CharacterSelectNode({ data }) {
  const [characters, setCharacters] = useState([]);
  const [selectedUsername, setSelectedUsername] = useState(data.selectedUsername || null);
  const [loading, setLoading] = useState(false);

  // Load characters on mount
  useEffect(() => {
    loadCharacters();
  }, []);

  const loadCharacters = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/character/list`);
      const result = await response.json();
      if (result.success && result.data) {
        setCharacters(result.data);
      }
    } catch (error) {
      console.error('Failed to load characters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (username) => {
    setSelectedUsername(username);
    if (data.onCharacterChange) {
      const character = characters.find(c => c.username === username);
      data.onCharacterChange(character);
    }
  };

  const selectedCharacter = characters.find(c => c.username === selectedUsername);

  return (
    <div style={{
      padding: '10px 15px',
      borderRadius: '8px',
      borderWidth: '2px',
      borderColor: '#f59e0b',
      borderStyle: 'solid',
      backgroundColor: '#fef3c7',
      minWidth: '220px',
    }}>
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="character-output"
        style={{ background: '#f59e0b', width: 10, height: 10 }}
      />

      {/* Node Header */}
      <div style={{
        fontWeight: 'bold',
        color: '#b45309',
        marginBottom: '8px',
        fontSize: '14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>🐱 {data.label || '角色选择'}</span>
        <button
          onClick={loadCharacters}
          disabled={loading}
          style={{
            padding: '2px 6px',
            backgroundColor: loading ? '#d1d5db' : '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '10px',
          }}
        >
          {loading ? '...' : '刷新'}
        </button>
      </div>

      {/* Selected Character Display */}
      {selectedCharacter ? (
        <div style={{
          padding: '8px',
          backgroundColor: '#fde68a',
          borderRadius: '4px',
          marginBottom: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img
              src={selectedCharacter.profilePictureUrl || '/default-avatar.svg'}
              alt="avatar"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                objectFit: 'cover',
              }}
              onError={(e) => {
                e.target.src = '/default-avatar.svg';
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#92400e',
              }}>
                {selectedCharacter.alias || selectedCharacter.username}
              </div>
              <div style={{
                fontSize: '10px',
                color: '#b45309',
              }}>
                @{selectedCharacter.username}
              </div>
            </div>
            <button
              onClick={() => handleSelect(null)}
              style={{
                padding: '2px 6px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '10px',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          fontSize: '11px',
          color: '#b45309',
          textAlign: 'center',
          padding: '12px',
          backgroundColor: '#fef9c3',
          borderRadius: '4px',
          marginBottom: '8px',
          fontStyle: 'italic',
        }}>
          请选择角色
        </div>
      )}

      {/* Character Dropdown */}
      <select
        value={selectedUsername || ''}
        onChange={(e) => e.target.value && handleSelect(e.target.value)}
        disabled={loading}
        style={{
          width: '100%',
          padding: '6px 8px',
          borderRadius: '4px',
          border: '1px solid #fcd34d',
          fontSize: '11px',
          backgroundColor: 'white',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        <option value="">-- 选择角色 --</option>
        {characters.map((char) => (
          <option key={char.id} value={char.username}>
            {char.alias ? `${char.alias} (@${char.username})` : `@${char.username}`}
          </option>
        ))}
      </select>

      {/* Output Label */}
      <div style={{
        marginTop: '8px',
        fontSize: '10px',
        color: '#64748b',
        textAlign: 'right',
      }}>
        角色 →
      </div>
    </div>
  );
}

export default CharacterSelectNode;
