import { Handle, Position } from 'reactflow';
import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:9000';

function CharacterLibraryNode({ data }) {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, favorites, recent
  const [recentCharacters, setRecentCharacters] = useState([]);

  useEffect(() => {
    loadCharacters();
    loadRecentCharacters();
  }, []);

  const loadCharacters = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/character/list`);
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

  const loadRecentCharacters = () => {
    try {
      const stored = localStorage.getItem('recent_characters');
      if (stored) {
        setRecentCharacters(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load recent characters:', error);
    }
  };

  // Filter characters
  const getFilteredCharacters = () => {
    let filtered = [...characters];

    // Apply filter
    if (filterType === 'favorites') {
      filtered = filtered.filter(c => c.favorite === true);
    } else if (filterType === 'recent') {
      filtered = filtered.filter(c => recentCharacters.includes(c.username));
      // Sort by recent usage
      filtered.sort((a, b) => {
        const indexA = recentCharacters.indexOf(a.username);
        const indexB = recentCharacters.indexOf(b.username);
        return indexA - indexB;
      });
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(c =>
        c.username.toLowerCase().includes(query) ||
        (c.alias && c.alias.toLowerCase().includes(query))
      );
    }

    return filtered;
  };

  const filteredCharacters = getFilteredCharacters();
  const selectedCount = data.selectedCharacters?.length || 0;

  return (
    <div style={{
      padding: '10px 15px',
      borderRadius: '8px',
      borderWidth: '2px',
      borderColor: '#06b6d4',
      borderStyle: 'solid',
      backgroundColor: '#ecfeff',
      minWidth: '280px',
      maxWidth: '320px',
    }}>
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="characters-output"
        style={{ background: '#06b6d4', width: 10, height: 10 }}
      />

      {/* Node Header */}
      <div style={{
        fontWeight: 'bold',
        color: '#0e7490',
        marginBottom: '8px',
        fontSize: '14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>📊 {data.label || '角色库'}</span>
        <button
          onClick={loadCharacters}
          disabled={loading}
          style={{
            padding: '2px 6px',
            backgroundColor: loading ? '#d1d5db' : '#06b6d4',
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

      {/* Search Input */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="搜索角色..."
        style={{
          width: '100%',
          padding: '6px 8px',
          borderRadius: '4px',
          border: '1px solid #67e8f9',
          fontSize: '11px',
          marginBottom: '6px',
        }}
      />

      {/* Filter Dropdown */}
      <select
        value={filterType}
        onChange={(e) => setFilterType(e.target.value)}
        style={{
          width: '100%',
          padding: '6px 8px',
          borderRadius: '4px',
          border: '1px solid #67e8f9',
          fontSize: '11px',
          marginBottom: '8px',
          backgroundColor: 'white',
        }}
      >
        <option value="all">全部角色 ({characters.length})</option>
        <option value="favorites">收藏 ({characters.filter(c => c.favorite).length})</option>
        <option value="recent">最近使用 ({recentCharacters.length})</option>
      </select>

      {/* Character Grid */}
      <div style={{
        maxHeight: '180px',
        overflowY: 'auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '6px',
      }}>
        {filteredCharacters.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            fontSize: '11px',
            color: '#0891b2',
            textAlign: 'center',
            padding: '16px',
            fontStyle: 'italic',
          }}>
            {loading ? '加载中...' : '暂无角色'}
          </div>
        ) : (
          filteredCharacters.map((char) => (
            <div
              key={char.id}
              style={{
                padding: '6px',
                backgroundColor: 'white',
                borderRadius: '4px',
                border: '1px solid #a5f3fc',
                cursor: 'pointer',
                fontSize: '10px',
                textAlign: 'center',
              }}
              title={`@${char.username}`}
            >
              <img
                src={char.profilePictureUrl || '/default-avatar.svg'}
                alt={char.username}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  marginBottom: '4px',
                }}
                onError={(e) => {
                  e.target.src = '/default-avatar.svg';
                }}
              />
              <div style={{
                fontSize: '10px',
                fontWeight: 'bold',
                color: '#0e7490',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {char.alias || char.username}
              </div>
              {char.favorite && (
                <div style={{ color: '#f59e0b' }}>⭐</div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      <div style={{
        marginTop: '8px',
        fontSize: '10px',
        color: '#0e7490',
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>显示: {filteredCharacters.length} / {characters.length}</span>
        <span>角色库 →</span>
      </div>
    </div>
  );
}

export default CharacterLibraryNode;
