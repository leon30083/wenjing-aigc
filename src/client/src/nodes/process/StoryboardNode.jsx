import { Handle, Position, useNodeId, useReactFlow } from 'reactflow';
import React, { useState, useEffect, useRef } from 'react';
import { useNodeResize } from '../../hooks/useNodeResize';

const API_BASE = 'http://localhost:9000';

function StoryboardNode({ data }) {
  const nodeId = useNodeId();
  const { getNodes, getEdges, setNodes } = useReactFlow(); // ⭐ 添加 setNodes 用于更新节点 data

  // ⭐ 接收外部 API 配置（来自 APISettingsNode）
  const externalApiConfig = data.apiConfig || null;
  const apiConfigSourceLabel = data.apiConfigSourceLabel || null;

  // 默认 API 配置（未连接时使用）
  const defaultApiConfig = {
    platform: 'juxin',
    model: 'sora-2',
    aspect: '16:9',
    watermark: false,
  };

  // 合并配置：外部配置优先，否则使用默认配置
  const apiConfig = externalApiConfig || defaultApiConfig;

  const [shots, setShots] = useState(
    data.shots || [{ id: '1', scene: '', duration: 5, image: '' }] // ⭐ 从 data.shots 初始化（支持工作流恢复）
  );

  const [status, setStatus] = useState(data.taskId ? 'success' : 'idle'); // ⭐ 如果有 taskId 则设置为成功状态

  // ⭐ Phase 1: 角色引用相关状态
  // ⭐ 关键修复：使用 useState 触发重新渲染，但不同步回 data（避免循环）
  const [connectedCharacters, setConnectedCharacters] = useState(data.connectedCharacters || []);
  const [connectedImages, setConnectedImages] = useState(data.connectedImages || []);
  const sceneRefs = useRef([]);
  const lastFocusedSceneIndex = useRef(null);

  // ⭐ 只从 data 同步到 state（单向），不同步回 data（避免循环）
  useEffect(() => {
    setConnectedCharacters(data.connectedCharacters || []);
  }, [data.connectedCharacters]);

  useEffect(() => {
    setConnectedImages(data.connectedImages || []);
  }, [data.connectedImages]);

  // ⭐ 新增：全局图片控制和镜头图片选择状态
  const [useGlobalImages, setUseGlobalImages] = useState(false); // 全局图片复选框
  const [showImageSelector, setShowImageSelector] = useState(false); // 图片选择器模态框
  const [selectedShotIndex, setSelectedShotIndex] = useState(null); // 当前选择图片的镜头索引

  // ⭐ 计算当前总时长（用于智能提示）
  const currentTotalDuration = shots.reduce((sum, shot) => sum + (shot.duration || 0), 0);

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
      // ⚠️ 关键修复：使用正向肯定预查而不是 \b（\b 不支持中文）
      // 匹配 @username 后面是：空白字符、字符串结尾、或下一个 @ 符号
      const regex = new RegExp(`@${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|@)`, 'g');
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

  // ⭐ 新增：为镜头选择图片
  const openImageSelector = (index) => {
    setSelectedShotIndex(index);
    setShowImageSelector(true);
  };

  const selectImageForShot = (imageUrl) => {
    const newShots = [...shots];
    newShots[selectedShotIndex].image = imageUrl;
    setShots(newShots);
    setShowImageSelector(false);
  };

  const clearShotImage = () => {
    const newShots = [...shots];
    newShots[selectedShotIndex].image = '';
    setShots(newShots);
    setShowImageSelector(false);
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

  // ⭐ 关键修复：同步 shots 和 useGlobalImages 到 node.data（用于工作流快照保存）
  useEffect(() => {
    if (shots !== data.shots) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, shots } }
            : node
        )
      );
    }
  }, [shots, nodeId, setNodes, data.shots]);

  useEffect(() => {
    if (useGlobalImages !== data.useGlobalImages) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, useGlobalImages } }
            : node
        )
      );
    }
  }, [useGlobalImages, nodeId, setNodes, data.useGlobalImages]);

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
      // ⭐ 收集所有图片（根据复选框和镜头选择）
      const allImages = [];

      // 1. 全局图片（仅当复选框选中时）
      if (useGlobalImages && connectedImages.length > 0) {
        allImages.push(...connectedImages);
      }

      // 2. 镜头图片（每个镜头独立选择的图片）
      validShots.forEach(shot => {
        if (shot.image && shot.image.trim()) {
          allImages.push(shot.image.trim());
        }
      });

      // ⭐ 直接使用用户手动输入的时长，不再自动均分
      const shotsWithDuration = validShots.map(s => ({
        ...s,
        duration: s.duration || 5, // 使用镜头自身的 duration，默认 5 秒
      }));

      // ⭐ 关键修复：先同步 shots 和 useGlobalImages 到节点 data，确保工作流快照包含完整数据
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, shots, useGlobalImages } }
            : node
        )
      );

      // ⭐ 捕获工作流快照（保存节点和连线状态）
      const workflowSnapshot = {
        nodes: getNodes(),
        edges: getEdges(),
      };

      // ✅ 调用后端故事板 API
      const requestBody = {
        platform: apiConfig.platform,
        model: apiConfig.model.toLowerCase(),
        shots: shotsWithDuration,
        images: allImages,
        aspect_ratio: apiConfig.aspect,
        watermark: apiConfig.watermark,
        workflowSnapshot: workflowSnapshot, // ⭐ 添加工作流快照
      };

      // Add API key if provided
      if (apiConfig.apiKey && apiConfig.apiKey.trim()) {
        requestBody.apiKey = apiConfig.apiKey.trim();
      }

      const response = await fetch(`${API_BASE}/api/video/storyboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const taskId = result.data.id || result.data.task_id;

        setStatus('success');

        // ⭐ 关键修复：保存 taskId 到节点 data，以便工作流快照包含 taskId
        if (taskId) {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === nodeId
                ? { ...node, data: { ...node.data, taskId } }
                : node
            )
          );
        }

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
      paddingLeft: '85px',
      paddingRight: '85px',
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
        id="api-config"
        style={{ background: '#3b82f6', width: 10, height: 10, top: '10%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="character-input"
        style={{ background: '#f59e0b', width: 10, height: 10, top: '40%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="images-input"
        style={{ background: '#8b5cf6', width: 10, height: 10, top: '70%' }}
      />

      {/* Input Labels (separate from handles) */}
      <div style={{ position: 'absolute', left: '18px', top: '10%', transform: 'translateY(-50%)', zIndex: 10 }}>
        <span style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 'bold', whiteSpace: 'nowrap' }}>API</span>
      </div>
      <div style={{ position: 'absolute', left: '18px', top: '40%', transform: 'translateY(-50%)', zIndex: 10 }}>
        <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 'bold', whiteSpace: 'nowrap' }}>角色</span>
      </div>
      <div style={{ position: 'absolute', left: '18px', top: '70%', transform: 'translateY(-50%)', zIndex: 10 }}>
        <span style={{ fontSize: '10px', color: '#8b5cf6', fontWeight: 'bold', whiteSpace: 'nowrap' }}>图片</span>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="video-output"
        style={{ background: '#6366f1', width: 10, height: 10 }}
      />

      {/* Output Label (separate from handle) */}
      <div style={{ position: 'absolute', right: '18px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
        <span style={{ fontSize: '10px', color: '#6366f1', fontWeight: 'bold', whiteSpace: 'nowrap' }}>视频</span>
      </div>

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

      {/* ⭐ Connected Images Display with thumbnails and checkbox control */}
      {connectedImages.length > 0 ? (
        <div style={{
          padding: '6px',
          backgroundColor: '#f3e8ff',
          borderRadius: '4px',
          marginBottom: '8px',
          fontSize: '10px',
          color: '#6b21a8',
        }}>
          <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
            🖼️ 全局参考图 ({connectedImages.length} 张)
          </div>

          {/* 复选框控制 */}
          <div className="nodrag" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <input
              id="use-global-images"
              name="useGlobalImages"
              className="nodrag"
              type="checkbox"
              checked={useGlobalImages}
              onChange={(e) => setUseGlobalImages(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <label style={{ fontSize: '11px', color: '#6b21a8', cursor: 'pointer' }}>
              启用全局参考图（应用到所有镜头）
            </label>
          </div>

          {/* Thumbnail grid */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {connectedImages.map((url, index) => (
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

      {/* 总时长提示 */}
      {currentTotalDuration > 0 && (
        <div style={{
          padding: '4px 6px',
          backgroundColor: '#f0fdf4',
          borderRadius: '3px',
          marginBottom: '8px',
          fontSize: '10px',
          color: '#166534',
          textAlign: 'center'
        }}>
          ⏱️ 总时长: {currentTotalDuration} 秒
          {currentTotalDuration > 25 && ' ⚠️ 超过 API 限制（25秒）'}
        </div>
      )}

      {/* API Config Display (read-only, from APISettingsNode) */}
      <div className="nodrag" style={{
        padding: '6px 8px',
        backgroundColor: externalApiConfig ? '#dbeafe' : '#fef3c7',
        borderRadius: '4px',
        marginBottom: '8px',
        fontSize: '10px',
        color: externalApiConfig ? '#1e40af' : '#92400e',
        fontWeight: 'bold',
        border: externalApiConfig ? '1px solid #93c5fd' : '1px dashed #fcd34d',
      }}>
        {externalApiConfig
          ? (
            <div>
              <div style={{ marginBottom: '4px', fontSize: '9px', color: '#3b82f6' }}>
                📌 来自: {apiConfigSourceLabel || 'API 设置'}
              </div>
              <div>
                ⚙️ {apiConfig.platform === 'juxin' ? '聚鑫' : '贞贞'} | {apiConfig.model.toUpperCase()} | {apiConfig.aspect} | {apiConfig.watermark ? '水印' : '无水印'}
              </div>
            </div>
          )
          : '💡 提示：连接 API 设置节点'
        }
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
              id={`scene-input-${shot.id}`}
              name={`scene-${shot.id}`}
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

            {/* Duration hint & Image selector */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {/* ⭐ 时长输入框 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flex: 1 }}>
                <span style={{ fontSize: '9px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                  ⏱️
                </span>
                <input
                  id={`duration-input-${shot.id}`}
                  name={`duration-${shot.id}`}
                  className="nodrag"
                  type="number"
                  min="1"
                  max="25"
                  value={shot.duration}
                  onChange={(e) => {
                    const val = Math.min(25, Math.max(1, parseInt(e.target.value) || 5));
                    updateShot(shot.id, 'duration', val);
                  }}
                  disabled={status === 'generating'}
                  style={{
                    width: '50px',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    border: '1px solid #c7d2fe',
                    fontSize: '10px',
                    textAlign: 'center',
                  }}
                />
                <span style={{ fontSize: '9px', color: '#6b7280' }}>秒</span>
              </div>

              {/* ⭐ 图片选择按钮 */}
              <button
                className="nodrag"
                onClick={() => openImageSelector(index)}
                disabled={status === 'generating'}
                style={{
                  padding: '4px 8px',
                  backgroundColor: shot.image ? '#8b5cf6' : '#e5e7eb',
                  color: shot.image ? 'white' : '#374151',
                  fontSize: '10px',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: status === 'generating' ? 'not-allowed' : 'pointer',
                }}
                title={shot.image ? '已选择参考图' : '选择参考图'}
              >
                📷
              </button>
            </div>

            {/* Selected image info */}
            {shot.image && (
              <div style={{ fontSize: '9px', color: '#6b21a8', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                已选图: {shot.image}
              </div>
            )}
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
        <span>↑ API 配置</span>
        <span>视频 →</span>
      </div>

      {/* ⭐ Image Selector Modal */}
      {showImageSelector && connectedImages.length > 0 && (
        <div
          onClick={() => setShowImageSelector(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              padding: '16px',
              borderRadius: '8px',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', color: '#4338ca' }}>
              为镜头 {selectedShotIndex + 1} 选择参考图
            </h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {connectedImages.map((url, index) => (
                <div
                  key={index}
                  onClick={() => selectImageForShot(url)}
                  style={{
                    padding: '4px',
                    border: shots[selectedShotIndex]?.image === url
                      ? '2px solid #8b5cf6'
                      : '1px solid #e5e7eb',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: shots[selectedShotIndex]?.image === url ? '#f3e8ff' : 'white',
                  }}
                >
                  <img
                    src={url}
                    alt={`ref-${index}`}
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '3px' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                className="nodrag"
                onClick={clearShotImage}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
              >
                清除选择
              </button>
              <button
                className="nodrag"
                onClick={() => setShowImageSelector(false)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

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
