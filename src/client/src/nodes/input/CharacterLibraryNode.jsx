import { Handle, Position } from 'reactflow';
import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:9000';

function CharacterLibraryNode({ data }) {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [recentCharacters, setRecentCharacters] = useState([]);

  // 新增状态
  const [batchMode, setBatchMode] = useState(false);
  const [selectedCharacters, setSelectedCharacters] = useState(new Set());
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [editAlias, setEditAlias] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [characterToDelete, setCharacterToDelete] = useState(null);

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

  // 删除单个角色
  const deleteCharacter = async (characterId) => {
    try {
      const response = await fetch(`${API_BASE}/api/character/${characterId}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (result.success) {
        await loadCharacters();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete character:', error);
      return false;
    }
  };

  // 批量删除角色
  const deleteBatchCharacters = async (characterIds) => {
    try {
      const promises = characterIds.map(id =>
        fetch(`${API_BASE}/api/character/${id}`, { method: 'DELETE' })
      );
      await Promise.all(promises);
      await loadCharacters();
      return true;
    } catch (error) {
      console.error('Failed to delete characters:', error);
      return false;
    }
  };

  // 更新别名
  const updateAlias = async (characterId, newAlias) => {
    try {
      const response = await fetch(`${API_BASE}/api/character/${characterId}/alias`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias: newAlias })
      });
      const result = await response.json();
      if (result.success) {
        await loadCharacters();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update alias:', error);
      return false;
    }
  };

  // 切换批量选择模式
  const toggleBatchMode = () => {
    setBatchMode(!batchMode);
    setSelectedCharacters(new Set());
  };

  // 切换角色选择
  const toggleCharacterSelection = (characterId) => {
    const newSelected = new Set(selectedCharacters);
    if (newSelected.has(characterId)) {
      newSelected.delete(characterId);
    } else {
      newSelected.add(characterId);
    }
    setSelectedCharacters(newSelected);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedCharacters.size === filteredCharacters.length) {
      setSelectedCharacters(new Set());
    } else {
      setSelectedCharacters(new Set(filteredCharacters.map(c => c.id)));
    }
  };

  // 打开编辑对话框
  const openEditDialog = (character) => {
    setEditingCharacter(character);
    setEditAlias(character.alias || '');
  };

  // 关闭编辑对话框
  const closeEditDialog = () => {
    setEditingCharacter(null);
    setEditAlias('');
  };

  // 保存别名
  const saveAlias = async () => {
    if (editingCharacter) {
      const success = await updateAlias(editingCharacter.id, editAlias);
      if (success) {
        closeEditDialog();
        alert('✅ 别名已更新');
      } else {
        alert('❌ 更新失败');
      }
    }
  };

  // 确认删除
  const confirmDelete = (character) => {
    setCharacterToDelete(character);
    setShowConfirmDialog(true);
  };

  // 执行删除
  const executeDelete = async () => {
    if (characterToDelete) {
      const success = await deleteCharacter(characterToDelete.id);
      if (success) {
        alert('✅ 角色已删除');
        setShowConfirmDialog(false);
        setCharacterToDelete(null);
      } else {
        alert('❌ 删除失败');
      }
    }
  };

  // 批量删除选中的角色
  const deleteSelected = async () => {
    if (selectedCharacters.size === 0) {
      alert('请先选择要删除的角色');
      return;
    }

    if (!confirm(`确定要删除选中的 ${selectedCharacters.size} 个角色吗？`)) {
      return;
    }

    const success = await deleteBatchCharacters(Array.from(selectedCharacters));
    if (success) {
      alert(`✅ 已删除 ${selectedCharacters.size} 个角色`);
      setSelectedCharacters(new Set());
      setBatchMode(false);
    } else {
      alert('❌ 删除失败');
    }
  };

  // Filter characters
  const getFilteredCharacters = () => {
    let filtered = [...characters];

    if (filterType === 'favorites') {
      filtered = filtered.filter(c => c.favorite === true);
    } else if (filterType === 'recent') {
      filtered = filtered.filter(c => recentCharacters.includes(c.username));
      filtered.sort((a, b) => {
        const indexA = recentCharacters.indexOf(a.username);
        const indexB = recentCharacters.indexOf(b.username);
        return indexA - indexB;
      });
    }

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
          color: '#0e7490',
          cursor: 'pointer',
        }}
      >
        <option value="all">全部角色 ({characters.length})</option>
        <option value="favorites">收藏 ({characters.filter(c => c.favorite).length})</option>
        <option value="recent">最近使用 ({recentCharacters.length})</option>
      </select>

      {/* Batch Mode Toggle */}
      <div style={{ marginBottom: '8px', display: 'flex', gap: '4px' }}>
        <button
          onClick={toggleBatchMode}
          style={{
            flex: 1,
            padding: '4px',
            fontSize: '10px',
            backgroundColor: batchMode ? '#f59e0b' : '#e5e7eb',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          {batchMode ? '✓ 批量模式' : '批量操作'}
        </button>
        {batchMode && (
          <>
            <button
              onClick={toggleSelectAll}
              style={{
                flex: 1,
                padding: '4px',
                fontSize: '10px',
                backgroundColor: '#06b6d4',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
            >
              {selectedCharacters.size === filteredCharacters.length ? '取消全选' : '全选'}
            </button>
            <button
              onClick={deleteSelected}
              style={{
                flex: 1,
                padding: '4px',
                fontSize: '10px',
                backgroundColor: selectedCharacters.size > 0 ? '#dc2626' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: selectedCharacters.size > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              删除 ({selectedCharacters.size})
            </button>
          </>
        )}
      </div>

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
              onClick={() => batchMode ? toggleCharacterSelection(char.id) : openEditDialog(char)}
              style={{
                padding: '6px',
                backgroundColor: batchMode && selectedCharacters.has(char.id) ? '#fef3c7' : 'white',
                borderRadius: '4px',
                border: batchMode && selectedCharacters.has(char.id) ? '2px solid #f59e0b' : '1px solid #a5f3fc',
                cursor: 'pointer',
                fontSize: '10px',
                textAlign: 'center',
                position: 'relative',
              }}
              title={`@${char.username}${char.alias ? ` (${char.alias})` : ''}`}
            >
              {/* Checkbox in batch mode */}
              {batchMode && (
                <div style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '14px',
                  height: '14px',
                  borderRadius: '2px',
                  border: '1px solid #d1d5db',
                  backgroundColor: selectedCharacters.has(char.id) ? '#f59e0b' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  color: selectedCharacters.has(char.id) ? 'white' : '#9ca3af',
                }}>
                  {selectedCharacters.has(char.id) ? '✓' : ''}
                </div>
              )}

              {/* Delete button (hover) */}
              {!batchMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmDelete(char);
                  }}
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '10px',
                    padding: '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: '0',
                    transition: 'opacity 0.2s',
                  }}
                  title="删除角色"
                  onMouseEnter={(e) => e.target.style.opacity = '1'}
                  onMouseLeave={(e) => e.target.style.opacity = '0'}
                >
                  ✕
                </button>
              )}

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

      {/* Edit Alias Dialog */}
      {editingCharacter && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            minWidth: '300px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#0e7490', fontSize: '16px' }}>
              编辑角色别名
            </h3>
            <div style={{ marginBottom: '15px' }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                用户名: @{editingCharacter.username}
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                角色ID: {editingCharacter.id}
              </div>
            </div>
            <input
              type="text"
              value={editAlias}
              onChange={(e) => setEditAlias(e.target.value)}
              placeholder="输入别名（可选）"
              maxLength={50}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                fontSize: '12px',
                marginBottom: '15px',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={closeEditDialog}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                取消
              </button>
              <button
                onClick={saveAlias}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#06b6d4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showConfirmDialog && characterToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            minWidth: '300px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#dc2626', fontSize: '16px' }}>
              ⚠️ 确认删除
            </h3>
            <div style={{ marginBottom: '15px', fontSize: '13px', color: '#374151' }}>
              确定要删除角色 <strong>@{characterToDelete.username}</strong> 吗？
              {characterToDelete.alias && (
                <span style={{ color: '#6b7280' }}> ({characterToDelete.alias})</span>
              )}
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#dc2626' }}>
                此操作不可恢复！
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setCharacterToDelete(null);
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                取消
              </button>
              <button
                onClick={executeDelete}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CharacterLibraryNode;
