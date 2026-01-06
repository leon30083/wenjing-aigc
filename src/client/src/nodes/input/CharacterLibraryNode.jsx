import { Handle, Position, useReactFlow, useNodeId } from 'reactflow';
import React, { useState, useEffect, useRef } from 'react';
import { useNodeResize } from '../../hooks/useNodeResize';

const API_BASE = 'http://localhost:9000';

function CharacterLibraryNode({ data }) {
  const nodeId = useNodeId(); // ⭐ 获取当前节点 ID
  const { setNodes, getEdges, edges } = useReactFlow();
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [recentCharacters, setRecentCharacters] = useState([]);

  const { resizeStyles, handleResizeMouseDown, getResizeHandleStyles } = useNodeResize(
    data,
    300, // minWidth
    400, // minHeight
    { width: 320, height: 420 } // initialSize
  );

  // 状态管理
  // selectionMode: 'transfer' = 传送到视频节点（多选）, 'manage' = 角色编辑
  const [selectionMode, setSelectionMode] = useState('transfer');
  // ⭐ 关键修复：从 data.selectedCharacters 恢复选中状态（支持工作流加载）
  const [selectedCharacters, setSelectedCharacters] = useState(() => {
    if (data.selectedCharacters && Array.isArray(data.selectedCharacters)) {
      return new Set(data.selectedCharacters);
    }
    return new Set();
  });
  const [batchMode, setBatchMode] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [editAlias, setEditAlias] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [characterToDelete, setCharacterToDelete] = useState(null);

  // ⭐ 关键修复：使用 ref 存储所有数据，避免依赖数组触发无限循环
  const selectedCharacterObjectsRef = useRef([]);
  const selectedArrayRef = useRef([]);
  const lastUpdateDataRef = useRef(null); // ⭐ 记录上次更新的数据，防止重复更新
  const charactersRef = useRef(characters);
  const selectedCharactersRef = useRef(selectedCharacters); // ⭐ 存储 Set，避免依赖触发
  const setNodesRef = useRef(setNodes); // ⭐ 存储 setNodes，避免依赖触发

  // ⭐ 更新 setNodes ref
  useEffect(() => {
    setNodesRef.current = setNodes;
  }, [setNodes]);

  // ⭐ 更新 ref（不触发主 useEffect）
  useEffect(() => {
    charactersRef.current = characters;
    selectedCharacterObjectsRef.current = characters.filter(c => selectedCharacters.has(c.id));
    selectedArrayRef.current = Array.from(selectedCharacters);
    selectedCharactersRef.current = selectedCharacters;
  }, [characters, selectedCharacters]);

  // ⭐ 关键修复：只在数据真正变化时才更新（使用签名比较，避免依赖触发）
  useEffect(() => {
    if (nodeId) {
      // ⚡ 使用 ref 中的数据，避免依赖 useMemo
      const characterObjects = selectedCharacterObjectsRef.current;
      const selectedArray = selectedArrayRef.current;
      const selectedSet = selectedCharactersRef.current;

      // ⭐ 比较签名，只在变化时才继续
      const currentSetSignature = JSON.stringify(Array.from(selectedSet || []).sort());
      const lastSetSignature = lastUpdateDataRef.current?.setSignature;

      if (currentSetSignature === lastSetSignature) {
        console.log('[CharacterLibraryNode] Skipping - selectedCharacters unchanged');
        return; // ⭐ 没有变化，直接返回
      }

      console.log('[CharacterLibraryNode] selectedCharacters changed, updating...');

      // ⭐ 更新签名记录
      lastUpdateDataRef.current = {
        ...lastUpdateDataRef.current,
        setSignature: currentSetSignature
      };

      // 获取连接的目标节点
      const edges = getEdges();
      const outgoingEdges = edges.filter(e => e.source === nodeId);

      // ⚡ 优化：只在数据真正变化时才更新（使用 ref 中的 setNodes）
      setNodesRef.current((nds) => {
        let needsUpdate = false;
        let skipUpdate = true; // ⭐ 默认跳过，除非发现数据变化

        // 先检查是否需要更新
        const updatedNodes = nds.map((node) => {
          if (node.id === nodeId) {
            // ⭐ 创建当前数据的签名（在 node 可用的作用域内）
            const currentSignature = JSON.stringify({
              selected: node.data.selectedCharacters,
              connected: node.data.connectedCharacters?.map(c => c.id)
            });
            const newSignature = JSON.stringify({
              selected: selectedArray,
              connected: characterObjects.map(c => c.id)
            });

            console.log('[CharacterLibraryNode] Checking self node', {
              nodeId,
              currentSelected: node.data.selectedCharacters,
              newSelected: selectedArray,
              currentConnected: node.data.connectedCharacters?.map(c => c.id),
              newConnected: characterObjects.map(c => c.id),
              currentSignature,
              newSignature,
              shouldUpdate: currentSignature !== newSignature
            });

            // ⭐ 只有当数据真正变化时才更新
            if (currentSignature !== newSignature) {
              skipUpdate = false; // ⭐ 有变化，需要更新

              // 检查数据是否真的变化了
              const currentData = node.data;
              const selectedChanged = !arraysEqual(currentData.selectedCharacters, selectedArray);
              const connectedChanged = !arraysEqual(currentData.connectedCharacters, characterObjects);

              if (selectedChanged || connectedChanged) {
                needsUpdate = true;
                return {
                  ...node,
                  data: {
                    ...node.data,
                    connectedCharacters: characterObjects,
                    selectedCharacters: selectedArray
                  }
                };
              }
            }
          } else {
            const isConnected = outgoingEdges.some(e => e.target === node.id);
            if (isConnected) {
              const currentData = node.data;
              const connectedChanged = !arraysEqual(currentData.connectedCharacters, characterObjects);

              if (connectedChanged) {
                needsUpdate = true;
                return {
                  ...node,
                  data: {
                    ...node.data,
                    connectedCharacters: characterObjects
                  }
                };
              }
            }
          }
          return node;
        });

        // ⚡ 关键：只有在数据真正变化时才更新节点
        console.log('[CharacterLibraryNode] setNodes result', { needsUpdate });
        return needsUpdate ? updatedNodes : nds;
      });
    }
  }, [nodeId, selectedCharacters.size]); // ⭐ 移除 setNodes 依赖，使用 ref 避免循环

  // ⚠️ 辅助函数：深度比较两个数组（按 id 比较）
  function arraysEqual(a, b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    return a.every((item, index) => {
      const aItem = item;
      const bItem = b[index];
      return aItem && bItem && aItem.id === bItem.id;
    });
  }

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

  // 角色编辑功能
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

  // 切换角色选择（用于 transfer 和 manage 模式）
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

  // 根据模式决定点击行为
  const handleCharacterClick = (char) => {
    if (selectionMode === 'transfer') {
      // 传送模式：多选角色
      toggleCharacterSelection(char.id);
    } else if (selectionMode === 'manage' && batchMode) {
      // 管理模式 + 批量模式：多选角色用于删除
      toggleCharacterSelection(char.id);
    }
    // manage 模式非批量状态：单击不处理，等待双击编辑
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

  // 删除选中的角色（编辑模式下）
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

  // 获取卡片背景色（显示选中状态）
  const getCardBackgroundColor = (char) => {
    if (selectionMode === 'transfer') {
      // 传送模式：显示多选状态
      return selectedCharacters.has(char.id) ? '#d1fae5' : 'white';
    } else if (selectionMode === 'manage' && batchMode) {
      // 管理模式 + 批量模式：显示批量选中状态
      return selectedCharacters.has(char.id) ? '#fef3c7' : 'white';
    }
    return 'white';
  };

  // 获取卡片边框（显示选中状态）
  const getCardBorder = (char) => {
    if (selectionMode === 'transfer') {
      // 传送模式：显示多选状态
      return selectedCharacters.has(char.id) ? '2px solid #10b981' : '1px solid #a5f3fc';
    } else if (selectionMode === 'manage' && batchMode) {
      // 管理模式 + 批量模式：显示批量选中状态
      return selectedCharacters.has(char.id) ? '2px solid #f59e0b' : '1px solid #a5f3fc';
    }
    return '1px solid #a5f3fc';
  };

  // Filter characters (使用 useMemo 避免引用变化)
  const filteredCharacters = React.useMemo(() => {
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
  }, [characters, filterType, recentCharacters, searchQuery]);

  return (
    <div style={{
      padding: '10px 15px',
      borderRadius: '8px',
      borderWidth: '2px',
      borderColor: '#06b6d4',
      borderStyle: 'solid',
      backgroundColor: '#ecfeff',
      ...resizeStyles,
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
          className="nodrag"
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
        id="character-search"
        name="searchQuery"
        className="nodrag"
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onWheel={(e) => e.stopPropagation()}
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
        id="character-filter"
        name="filterType"
        className="nodrag"
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

      {/* Mode Toggle Buttons */}
      <div className="nodrag" style={{ marginBottom: '8px', display: 'flex', gap: '4px' }}>
        <button
          className="nodrag"
          onClick={() => {
            setSelectionMode('transfer');
            setBatchMode(false);
            setSelectedCharacters(new Set());
          }}
          style={{
            flex: 1,
            padding: '4px',
            fontSize: '10px',
            backgroundColor: selectionMode === 'transfer' ? '#10b981' : '#e5e7eb',
            color: selectionMode === 'transfer' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          📤 传送到视频节点
        </button>
        <button
          className="nodrag"
          onClick={() => {
            setSelectionMode('manage');
            setSelectedCharacters(new Set());
          }}
          style={{
            flex: 1,
            padding: '4px',
            fontSize: '10px',
            backgroundColor: selectionMode === 'manage' ? '#f59e0b' : '#e5e7eb',
            color: selectionMode === 'manage' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          ✏️ 角色编辑
        </button>
      </div>

      {/* Manage Mode: Batch Toggle */}
      {selectionMode === 'manage' && (
        <div className="nodrag" style={{ marginBottom: '8px', display: 'flex', gap: '4px' }}>
          <button
            className="nodrag"
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
                className="nodrag"
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
                className="nodrag"
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
      )}

      {/* Character Grid */}
      <div className="nodrag" style={{
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
              onClick={() => handleCharacterClick(char)}
              onDoubleClick={() => selectionMode === 'manage' && openEditDialog(char)}
              style={{
                padding: '6px',
                backgroundColor: getCardBackgroundColor(char),
                borderRadius: '4px',
                border: getCardBorder(char),
                cursor: 'pointer',
                fontSize: '10px',
                textAlign: 'center',
                position: 'relative',
              }}
              title={`@${char.username}${char.alias ? ` (${char.alias})` : ''}\n${selectionMode === 'transfer' ? '点击选择/取消选择' : batchMode ? '点击切换选中' : '双击编辑别名'}`}
            >
              {/* 选中标识 */}
              {(selectionMode === 'transfer' || (selectionMode === 'manage' && batchMode)) && selectedCharacters.has(char.id) && (
                <div style={{
                  position: 'absolute',
                  top: '2px',
                  left: '2px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: selectionMode === 'transfer' ? '#10b981' : '#f59e0b',
                  color: 'white',
                  border: '2px solid #ecfdf5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
                title={selectionMode === 'transfer' ? '已选中' : '将删除'}
                >
                  ✓
                </div>
              )}

              {/* Delete button (hover) - only in manage mode without batch */}
              {selectionMode === 'manage' && !batchMode && (
                <button
                  className="nodrag"
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
                  // ⭐ 防止图片加载导致的布局抖动
                  display: 'block',
                  flexShrink: 0,
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
              {char.alias && (
                <div style={{ fontSize: '8px', color: '#6b7280' }}>
                  @{char.username}
                </div>
              )}
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
              id="edit-alias-input"
              name="editAlias"
              className="nodrag"
              type="text"
              value={editAlias}
              onChange={(e) => setEditAlias(e.target.value)}
              onWheel={(e) => e.stopPropagation()}
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
                className="nodrag"
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
                className="nodrag"
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
                className="nodrag"
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
                className="nodrag"
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

      {/* Resize Handle (ComfyUI style) */}
      <div
        className="nodrag"
        onMouseDown={handleResizeMouseDown}
        style={getResizeHandleStyles('#06b6d4')}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
        title="拖动调整节点大小"
      />
    </div>
  );
}

export default React.memo(CharacterLibraryNode);
