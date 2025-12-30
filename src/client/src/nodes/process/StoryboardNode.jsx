import { Handle, Position, useNodeId } from 'reactflow';
import React, { useState, useEffect, useRef } from 'react';
import { useNodeResize } from '../../hooks/useNodeResize';

const API_BASE = 'http://localhost:9000';

function StoryboardNode({ data }) {
  const nodeId = useNodeId();

  const [config, setConfig] = useState({
    model: 'Sora-2',
    duration: 10,
    aspect: '16:9',
    watermark: false,
  });

  const [shots, setShots] = useState([
    { id: '1', scene: '', duration: 5, image: '' },
  ]);

  const [status, setStatus] = useState('idle'); // idle, generating, success, error

  // ⭐ Phase 1: 角色引用相关状态
  const connectedCharacters = data.connectedCharacters || [];
  const sceneRefs = useRef([]);
  const lastFocusedSceneIndex = useRef(null);

  const { resizeStyles, handleResizeMouseDown, getResizeHandleStyles } = useNodeResize(
    data,
    340, // minWidth
    400, // minHeight
    { width: 360, height: 420 } // initialSize
  );

  // ⭐ 双显示功能：创建用户名到别名的映射
  const usernameToAlias = React.useMemo(() => {
    const map = {};
    connectedCharacters.forEach(char => {
      map[char.username] = char.alias || char.username;
    });
    return map;
  }, [connectedCharacters]);

  // ⭐ 双显示功能：将真实提示词转换为显示提示词（用户看：别名）
  const realToDisplay = (text) => {
    if (!text) return '';
    let result = text;
    Object.entries(usernameToAlias).forEach(([username, alias]) => {
      const regex = new RegExp(`@${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      result = result.replace(regex, `@${alias}`);
    });
    return result;
  };

  // ⭐ 双显示功能：将显示提示词转换为真实提示词（API用：真实ID）
  const displayToReal = (text) => {
    if (!text) return '';
    let result = text;
    const sortedAliases = Object.entries(usernameToAlias)
      .sort((a, b) => b[1].length - a[1].length); // 长别名优先

    sortedAliases.forEach(([username, alias]) => {
      const regex = new RegExp(`@${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|@)`, 'g');
      result = result.replace(regex, `@${username}`);
    });
    return result;
  };

  // Add a new shot
  const addShot = () => {
    const newShot = {
      id: Date.now().toString(),
      scene: '',
      duration: 5,
      image: '',
    };
    setShots([...shots, newShot]);
  };

  // Remove a shot
  const removeShot = (shotId) => {
    if (shots.length > 1) {
      setShots(shots.filter(s => s.id !== shotId));
    }
  };

  // Update shot data
  const updateShot = (shotId, field, value) => {
    setShots(shots.map(s =>
      s.id === shotId ? { ...s, [field]: value } : s
    ));
  };

  // ⭐ Phase 1: 场景输入框获取焦点时记录索引
  const handleSceneFocus = (index) => {
    lastFocusedSceneIndex.current = index;
  };

  // ⭐ 双显示功能：在焦点场景插入角色引用
  const insertCharacterToFocusedScene = (username, alias) => {
    const targetIndex = lastFocusedSceneIndex.current;
    if (targetIndex === null) {
      alert('请先点击一个场景输入框');
      return;
    }

    const sceneInput = sceneRefs.current[targetIndex];
    if (!sceneInput) return;

    // 获取当前场景的真实值
    const realText = shots[targetIndex].scene;
    // 转换为显示文本（用户看别名）
    const displayText = realToDisplay(realText);

    const start = sceneInput.selectionStart;
    const end = sceneInput.selectionEnd;
    const refText = `@${alias} `; // 插入别名到显示位置

    // 在光标位置插入到显示文本
    const newDisplayText = displayText.substring(0, start) + refText + displayText.substring(end);
    // 转换回真实ID并存储
    const newRealText = displayToReal(newDisplayText);

    // 更新场景描述（存储真实ID）
    updateShot(shots[targetIndex].id, 'scene', newRealText);

    // 移动光标
    setTimeout(() => {
      sceneInput.setSelectionRange(start + refText.length, start + refText.length);
      sceneInput.focus();
    }, 0);
  };

  // ⭐ Phase 2: 修正 API 调用逻辑（移除循环，调用一次）
  const handleGenerate = async () => {
    // Validation
    const validShots = shots.filter(s => s.scene.trim());
    if (validShots.length === 0) {
      alert('请至少填写一个分镜头场景');
      return;
    }

    setStatus('generating');

    try {
      // ✅ 收集所有图片
      const allImages = [];

      // 全局图片（从 ReferenceImageNode 连接）
      if (data.connectedImages && data.connectedImages.length > 0) {
        allImages.push(...data.connectedImages);
      }

      // 每个镜头的图片
      validShots.forEach(shot => {
        if (shot.image && shot.image.trim()) {
          allImages.push(shot.image.trim());
        }
      });

      // ✅ 调用后端故事板 API
      const response = await fetch(`${API_BASE}/api/video/storyboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'juxin',
          model: config.model.toLowerCase(),
          shots: validShots.map(s => ({
            duration: s.duration,
            scene: s.scene,
            image: s.image,
          })),
          images: allImages,
          aspect_ratio: config.aspect,
          watermark: config.watermark,
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const taskId = result.data.id || result.data.task_id;

        setStatus('success');

        // ✅ 派发事件到 TaskResultNode
        window.dispatchEvent(new CustomEvent('video-task-created', {
          detail: { sourceNodeId: nodeId, taskId }
        }));

        // Notify parent (for backward compatibility)
        if (data.onStoryboardGenerated) {
          data.onStoryboardGenerated([{ taskId, scene: '故事板视频' }]);
        }
      } else {
        setStatus('error');
        alert(result.error || '生成失败');
      }
    } catch (err) {
      setStatus('error');
      console.error('Storyboard generation error:', err);
      alert(`网络错误: ${err.message}`);
    }
  };

  return (
    <div style={{
      padding: '10px 15px',
      borderRadius: '8px',
      borderWidth: '2px',
      borderColor: '#6366f1',
      borderStyle: 'solid',
      backgroundColor: '#eef2ff',
      ...resizeStyles,
    }}>
      {/* Input Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="character-input"
        style={{ background: '#f59e0b', width: 10, height: 10, top: '35%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="images-input"
        style={{ background: '#8b5cf6', width: 10, height: 10, top: '65%' }}
      />

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="video-output"
        style={{ background: '#6366f1', width: 10, height: 10 }}
      />

      {/* Node Header */}
      <div style={{
        fontWeight: 'bold',
        color: '#4338ca',
        marginBottom: '8px',
        fontSize: '14px',
      }}>
        🎞️ {data.label || '故事板'}
      </div>

      {/* ⭐ Phase 1: 候选角色显示 */}
      <div className="nodrag" style={{ marginBottom: '8px' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 'bold',
          color: '#4338ca',
          marginBottom: '4px',
        }}>
          📊 候选角色 (点击插入到焦点场景)
        </div>

        {connectedCharacters.length > 0 ? (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {connectedCharacters.map((char) => (
              <div
                key={char.id}
                className="nodrag"
                onClick={() => insertCharacterToFocusedScene(char.username, char.alias || char.username)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#e0e7ff',
                  borderRadius: '4px',
                  border: '1px solid #a5b4fc',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'background 0.2s',
                }}
                title="点击插入到焦点场景"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c7d2fe'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e0e7ff'}
              >
                <img
                  src={char.profilePictureUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%239ca3af"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E'}
                  alt=""
                  style={{ width: '20px', height: '20px', borderRadius: '50%' }}
                />
                <span style={{ fontSize: '10px', color: '#4338ca' }}>
                  {char.alias || char.username}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            padding: '6px',
            backgroundColor: '#fef3c7',
            borderRadius: '4px',
            fontSize: '10px',
            color: '#92400e',
            textAlign: 'center'
          }}>
            💡 提示：连接角色库节点并选择角色后，点击角色卡片插入到焦点场景
          </div>
        )}
      </div>

      {/* ⭐ Connected Images Display with thumbnails */}
      {data.connectedImages && data.connectedImages.length > 0 ? (
        <div style={{
          padding: '6px',
          backgroundColor: '#f3e8ff',
          borderRadius: '4px',
          marginBottom: '8px',
          fontSize: '10px',
          color: '#6b21a8',
        }}>
          <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
            🖼️ 全局参考图 ({data.connectedImages.length} 张)
          </div>
          {/* Thumbnail grid */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {data.connectedImages.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`global-ref-${index}`}
                style={{
                  width: '36px',
                  height: '36px',
                  objectFit: 'cover',
                  borderRadius: '3px',
                  border: '1px solid #c4b5fd',
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div style={{
          padding: '6px',
          backgroundColor: '#fef3c7',
          borderRadius: '4px',
          marginBottom: '8px',
          fontSize: '10px',
          color: '#92400e',
          textAlign: 'center'
        }}>
          💡 提示：连接参考图节点添加全局图片
        </div>
      )}

      {/* Global Config */}
      <div style={{
        padding: '6px',
        backgroundColor: '#e0e7ff',
        borderRadius: '4px',
        marginBottom: '8px',
        fontSize: '10px',
      }}>
        <div className="nodrag" style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
          <select
            className="nodrag"
            value={config.model}
            onChange={(e) => setConfig({ ...config, model: e.target.value })}
            disabled={status === 'generating'}
            style={{
              flex: 1,
              padding: '4px',
              borderRadius: '3px',
              border: '1px solid #a5b4fc',
              fontSize: '10px',
            }}
          >
            <option value="Sora-2">Sora-2</option>
          </select>
          {/* ⭐ Phase 3: 移除 1:1 比例选项（Sora2 不支持） */}
          <select
            className="nodrag"
            value={config.aspect}
            onChange={(e) => setConfig({ ...config, aspect: e.target.value })}
            disabled={status === 'generating'}
            style={{
              flex: 1,
              padding: '4px',
              borderRadius: '3px',
              border: '1px solid #a5b4fc',
              fontSize: '10px',
            }}
          >
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
          </select>
        </div>
        <div className="nodrag" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <label style={{ fontSize: '10px', color: '#4338ca' }}>水印:</label>
          <input
            className="nodrag"
            type="checkbox"
            checked={config.watermark}
            onChange={(e) => setConfig({ ...config, watermark: e.target.checked })}
            disabled={status === 'generating'}
          />
        </div>
      </div>

      {/* Shots List */}
      <div className="nodrag" style={{
        maxHeight: '200px',
        overflowY: 'auto',
        marginBottom: '8px',
      }}>
        {shots.map((shot, index) => (
          <div
            key={shot.id}
            style={{
              padding: '6px',
              backgroundColor: 'white',
              borderRadius: '4px',
              border: '1px solid #c7d2fe',
              marginBottom: '4px',
            }}
          >
            {/* Shot Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '4px',
            }}>
              <span style={{
                fontSize: '10px',
                fontWeight: 'bold',
                color: '#4338ca',
              }}>
                镜头 {index + 1}
              </span>
              {shots.length > 1 && (
                <button
                  className="nodrag"
                  onClick={() => removeShot(shot.id)}
                  disabled={status === 'generating'}
                  style={{
                    padding: '2px 6px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: status === 'generating' ? 'not-allowed' : 'pointer',
                    fontSize: '9px',
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* ⭐ 双显示功能：Scene Input 显示别名，内部存储真实ID */}
            <input
              className="nodrag"
              ref={(el) => sceneRefs.current[index] = el}
              type="text"
              value={realToDisplay(shot.scene)}
              onChange={(e) => {
                const realText = displayToReal(e.target.value);
                updateShot(shot.id, 'scene', realText);
              }}
              onFocus={() => handleSceneFocus(index)}
              placeholder="场景描述..."
              disabled={status === 'generating'}
              style={{
                width: '100%',
                padding: '4px',
                borderRadius: '3px',
                border: '1px solid #c7d2fe',
                fontSize: '10px',
                marginBottom: '4px',
              }}
            />

            {/* Duration & Image */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <input
                className="nodrag"
                type="number"
                value={shot.duration}
                onChange={(e) => updateShot(shot.id, 'duration', Number(e.target.value))}
                min="5"
                max="30"
                disabled={status === 'generating'}
                style={{
                  width: '50px',
                  padding: '4px',
                  borderRadius: '3px',
                  border: '1px solid #c7d2fe',
                  fontSize: '10px',
                }}
              />
              <input
                className="nodrag"
                type="text"
                value={shot.image}
                onChange={(e) => updateShot(shot.id, 'image', e.target.value)}
                placeholder="图片URL (可选)"
                disabled={status === 'generating'}
                style={{
                  flex: 1,
                  padding: '4px',
                  borderRadius: '3px',
                  border: '1px solid #c7d2fe',
                  fontSize: '10px',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Add Shot Button */}
      <button
        className="nodrag"
        onClick={addShot}
        disabled={status === 'generating'}
        style={{
          width: '100%',
          padding: '6px',
          backgroundColor: '#6366f1',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: status === 'generating' ? 'not-allowed' : 'pointer',
          fontSize: '11px',
          marginBottom: '8px',
        }}
      >
        + 添加镜头
      </button>

      {/* ⭐ Phase 3: 修改按钮文本和状态 */}
      <button
        className="nodrag"
        onClick={handleGenerate}
        disabled={status === 'generating'}
        style={{
          width: '100%',
          padding: '8px',
          backgroundColor: status === 'generating'
            ? '#9ca3af'
            : status === 'success'
            ? '#059669'
            : status === 'error'
            ? '#dc2626'
            : '#6366f1',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: status === 'generating' ? 'not-allowed' : 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
        }}
      >
        {status === 'idle' && '生成故事板视频'}
        {status === 'generating' && '生成中...'}
        {status === 'success' && '✓ 已提交'}
        {status === 'error' && '✗ 失败'}
      </button>

      {/* ⭐ 双显示功能：预览区域 - 显示最终传递给API的真实ID */}
      {shots.some(s => s.scene.trim()) && (
        <div style={{
          marginTop: '8px',
          padding: '6px 8px',
          backgroundColor: '#f0fdf4',
          borderRadius: '4px',
          fontSize: '10px',
          color: '#166534',
          fontFamily: 'monospace',
          border: '1px dashed #6ee7b7',
          maxHeight: '100px',
          overflowY: 'auto',
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            📤 最终提示词 (API):
            {connectedCharacters.length > 0 && (
              <span style={{ fontWeight: 'normal', marginLeft: '8px', color: '#059669' }}>
                ({connectedCharacters.length} 个角色)
              </span>
            )}
          </div>
          {shots.filter(s => s.scene.trim()).map((shot, index) => (
            <div key={shot.id} style={{ marginBottom: '2px' }}>
              镜头{index + 1}: {shot.scene}
            </div>
          ))}
        </div>
      )}

      {/* Labels */}
      <div style={{
        marginTop: '8px',
        fontSize: '10px',
        color: '#64748b',
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>↑ 角色 / 图片</span>
        <span>视频 →</span>
      </div>

      {/* Resize Handle (ComfyUI style) */}
      <div
        className="nodrag"
        onMouseDown={handleResizeMouseDown}
        style={getResizeHandleStyles('#6366f1')}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
        title="拖动调整节点大小"
      />
    </div>
  );
}

export default StoryboardNode;
