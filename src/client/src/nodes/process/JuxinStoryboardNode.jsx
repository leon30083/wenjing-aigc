import { Handle, Position, useNodeId, useReactFlow } from 'reactflow';
import React, { useState, useEffect, useRef } from 'react';
import { useCharacterAliasMapping, useSceneCharacterInsertion } from '../../hooks';

const API_BASE = 'http://localhost:9000';
const MIN_WIDTH = 340;
const MIN_HEIGHT = 400;

// ⭐ localStorage key for API key persistence
const STORAGE_KEY_API_KEY = 'winjin-api-key';

// Global tracking to prevent node drag during resize
let isResizingNode = false;

function JuxinStoryboardNode({ data }) {
  const nodeId = useNodeId();
  const { setNodes } = useReactFlow();
  const nodeRef = useRef(null);
  const resizeHandleRef = useRef(null);
  const onSizeChangeRef = useRef(data.onSizeChange);

  // Update ref when data.onSizeChange changes
  useEffect(() => {
    onSizeChangeRef.current = data.onSizeChange;
  }, [data.onSizeChange]);

  // Node size state
  const [nodeSize, setNodeSize] = useState(() => ({
    width: data.width || 360,
    height: data.height || MIN_HEIGHT,
  }));
  const [isResizing, setIsResizing] = useState(false);

  // ⭐ 内置 API 配置（聚鑫平台固定）
  const [showApiConfig, setShowApiConfig] = useState(false); // 默认折叠
  const [apiConfig, setApiConfig] = useState(() => {
    // 从 localStorage 加载 API key
    const savedApiKey = localStorage.getItem(STORAGE_KEY_API_KEY) || '';

    return {
      platform: 'juxin', // 固定为聚鑫
      model: 'sora-2-all', // 故事板API使用 sora-2-all
      aspect: '16:9',
      watermark: false,
      apiKey: savedApiKey,
    };
  });

  // 镜头状态
  const [shots, setShots] = useState(
    data.shots || [{ id: '1', scene: '', duration: 5, image: '' }]
  );

  // 连接数据
  const [connectedCharacters, setConnectedCharacters] = useState(data.connectedCharacters || []);
  const [connectedImages, setConnectedImages] = useState(data.connectedImages || []);

  // 同步连接数据
  useEffect(() => {
    setConnectedCharacters(data.connectedCharacters || []);
  }, [data.connectedCharacters]);

  useEffect(() => {
    if (data.connectedImages !== undefined) {
      setConnectedImages(data.connectedImages);
    } else {
      setConnectedImages([]);
    }
  }, [data.connectedImages]);

  // 全局图片控制
  const [useGlobalImages, setUseGlobalImages] = useState(false);
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [selectedShotIndex, setSelectedShotIndex] = useState(null);

  // 生成状态
  const [status, setStatus] = useState(data.taskId ? 'success' : 'idle');
  const [taskId, setTaskId] = useState(data.taskId || null);
  const [error, setError] = useState(null);

  // 场景输入框 refs
  const sceneRefs = useRef([]);
  const lastFocusedSceneIndex = useRef(null);

  // ⭐ 使用共享 Hook 进行角色别名映射
  const { realToDisplay, displayToReal } = useCharacterAliasMapping(connectedCharacters);

  // ⭐ 更新镜头 (must be defined before useSceneCharacterInsertion)
  const updateShot = (shotId, field, value) => {
    setShots((prevShots) =>
      prevShots.map((shot) =>
        shot.id === shotId ? { ...shot, [field]: value } : shot
      )
    );
  };

  // ⭐ 使用共享 Hook 进行场景角色插入
  const insertCharacterToScene = useSceneCharacterInsertion(realToDisplay, displayToReal, updateShot);

  // 同步 taskId 到 node.data
  useEffect(() => {
    if (taskId && data.taskId !== taskId) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, taskId } }
            : node
        )
      );
    }
  }, [taskId, nodeId, setNodes, data.taskId]);

  // 同步 shots 到 node.data
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

  // Update parent node data when size changes
  useEffect(() => {
    if (onSizeChangeRef.current) {
      onSizeChangeRef.current(nodeId, nodeSize.width, nodeSize.height);
    }
  }, [nodeSize.width, nodeSize.height, nodeId]);

  // Resize handling
  const handleResizeMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    isResizingNode = true;

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = nodeSize.width;
    const startHeight = nodeSize.height;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const newWidth = Math.max(MIN_WIDTH, startWidth + deltaX);
      const newHeight = Math.max(MIN_HEIGHT, startHeight + deltaY);
      setNodeSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      isResizingNode = false;
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    setIsResizing(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // ⭐ 添加镜头
  const addShot = () => {
    const newId = String(shots.length + 1);
    setShots([...shots, { id: newId, scene: '', duration: 5, image: '' }]);
  };

  // ⭐ 删除镜头
  const removeShot = (shotId) => {
    if (shots.length <= 1) {
      alert('至少需要保留一个镜头');
      return;
    }
    setShots(shots.filter((shot) => shot.id !== shotId));
  };

  // ⭐ 总时长计算
  const currentTotalDuration = shots.reduce((sum, shot) => sum + (shot.duration || 0), 0);

  // ⭐ API配置区：折叠/展开切换
  const toggleApiConfig = () => {
    setShowApiConfig(!showApiConfig);
  };

  // ⭐ 保存 API 密钥到 localStorage
  useEffect(() => {
    if (apiConfig.apiKey && apiConfig.apiKey.trim()) {
      localStorage.setItem(STORAGE_KEY_API_KEY, apiConfig.apiKey.trim());
    }
  }, [apiConfig.apiKey]);

  // ⭐ 生成故事板视频
  const handleGenerate = async () => {
    const validShots = shots.filter((s) => s.scene.trim());
    if (validShots.length === 0) {
      setError('请至少填写一个分镜头场景');
      return;
    }

    // ⚠️ 警告：超过25秒
    if (currentTotalDuration > 25) {
      setError(`总时长 ${currentTotalDuration} 秒超过 API 限制（25秒）`);
      return;
    }

    setStatus('generating');
    setError(null);
    setTaskId(null);

    try {
      // ⭐ 先同步 shots 到节点 data
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, shots } }
            : node
        )
      );

      // ⭐ 收集所有图片（全局 + 镜头）
      const allImages = [];
      if (useGlobalImages && connectedImages.length > 0) {
        allImages.push(...connectedImages);
      }
      validShots.forEach((shot) => {
        if (shot.image && shot.image.trim()) {
          allImages.push(shot.image.trim());
        }
      });

      // ⭐ 使用聚鑫故事板 API
      const payload = {
        platform: 'juxin',
        model: apiConfig.model.toLowerCase(),
        shots: validShots,
        images: allImages,
        aspect_ratio: apiConfig.aspect,
        watermark: apiConfig.watermark,
      };

      // 添加 API 密钥（如果有）
      if (apiConfig.apiKey && apiConfig.apiKey.trim()) {
        payload.apiKey = apiConfig.apiKey.trim();
      }

      const response = await fetch(`${API_BASE}/api/video/storyboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const id = result.data.id || result.data.task_id;
        setTaskId(id);
        setStatus('success');

        // 派发事件
        window.dispatchEvent(new CustomEvent('video-task-created', {
          detail: { sourceNodeId: nodeId, taskId: id, platform: 'juxin' }
        }));
      } else {
        setStatus('error');
        setError(result.error || '生成失败');
      }
    } catch (err) {
      setStatus('error');
      setError(err.message || '网络错误');
    }
  };

  return (
    <div
      ref={nodeRef}
      style={{
        padding: '10px 15px',
        paddingLeft: '85px',
        paddingRight: '85px',
        borderRadius: '8px',
        borderWidth: '2px',
        borderColor: '#8b5cf6',
        borderStyle: 'solid',
        backgroundColor: '#faf5ff',
        width: `${nodeSize.width}px`,
        minHeight: `${nodeSize.height}px`,
        position: 'relative',
        userSelect: isResizing ? 'none' : 'auto',
      }}
    >
      {/* Input Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="character-input"
        style={{ background: '#f59e0b', width: 10, height: 10, top: '30%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="images-input"
        style={{ background: '#8b5cf6', width: 10, height: 10, top: '50%' }}
      />

      {/* Input Labels */}
      <div style={{ position: 'absolute', left: '18px', top: '30%', transform: 'translateY(-50%)', zIndex: 10 }}>
        <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 'bold', whiteSpace: 'nowrap' }}>角色</span>
      </div>
      <div style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
        <span style={{ fontSize: '10px', color: '#8b5cf6', fontWeight: 'bold', whiteSpace: 'nowrap' }}>图片</span>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="storyboard-output"
        style={{ background: '#8b5cf6', width: 10, height: 10 }}
      />
      <div style={{ position: 'absolute', right: '18px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
        <span style={{ fontSize: '10px', color: '#8b5cf6', fontWeight: 'bold', whiteSpace: 'nowrap' }}>视频</span>
      </div>

      {/* Node Header */}
      <div style={{
        fontWeight: 'bold',
        color: '#6b21a8',
        marginBottom: '8px',
        fontSize: '14px',
      }}>
        🎬 聚鑫故事板
      </div>

      {/* ⭐ 内置 API 配置区（可折叠） */}
      <div className="nodrag" style={{ marginBottom: '8px' }}>
        <button
          className="nodrag"
          onClick={toggleApiConfig}
          style={{
            width: '100%',
            padding: '4px 8px',
            backgroundColor: '#f3e8ff',
            color: '#6b21a8',
            border: '1px solid #c4b5fd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '10px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {showApiConfig ? '▼ ' : '▶ '}
          API 配置（聚鑫平台）
        </button>

        {showApiConfig && (
          <div style={{
            marginTop: '6px',
            padding: '8px',
            backgroundColor: '#fff',
            borderRadius: '4px',
            border: '1px solid #c4b5fd',
            fontSize: '10px',
          }}>
            {/* 平台（只读） */}
            <div style={{ marginBottom: '6px' }}>
              <label style={{ display: 'block', marginBottom: '2px', fontWeight: 'bold', color: '#6b21a8' }}>
                平台:
              </label>
              <input
                type="text"
                value="聚鑫 (api.jxincm.cn)"
                disabled
                style={{
                  width: '100%',
                  padding: '4px',
                  borderRadius: '3px',
                  border: '1px solid #ddd',
                  backgroundColor: '#f5f5f5',
                  fontSize: '10px',
                }}
              />
            </div>

            {/* 模型（只读） */}
            <div style={{ marginBottom: '6px' }}>
              <label style={{ display: 'block', marginBottom: '2px', fontWeight: 'bold', color: '#6b21a8' }}>
                模型:
              </label>
              <input
                type="text"
                value="sora-2-all"
                disabled
                style={{
                  width: '100%',
                  padding: '4px',
                  borderRadius: '3px',
                  border: '1px solid #ddd',
                  backgroundColor: '#f5f5f5',
                  fontSize: '10px',
                }}
              />
            </div>

            {/* 比例 */}
            <div style={{ marginBottom: '6px' }}>
              <label style={{ display: 'block', marginBottom: '2px', fontWeight: 'bold', color: '#6b21a8' }}>
                比例:
              </label>
              <select
                className="nodrag"
                value={apiConfig.aspect}
                onChange={(e) => setApiConfig({ ...apiConfig, aspect: e.target.value })}
                style={{
                  width: '100%',
                  padding: '4px',
                  borderRadius: '3px',
                  border: '1px solid #c4b5fd',
                  fontSize: '10px',
                }}
              >
                <option value="16:9">16:9 (横屏)</option>
                <option value="9:16">9:16 (竖屏)</option>
              </select>
            </div>

            {/* 水印 */}
            <div style={{ marginBottom: '6px' }}>
              <label className="nodrag" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  className="nodrag"
                  type="checkbox"
                  checked={apiConfig.watermark}
                  onChange={(e) => setApiConfig({ ...apiConfig, watermark: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 'bold', color: '#6b21a8' }}>启用水印</span>
              </label>
            </div>

            {/* API 密钥（可选） */}
            <div>
              <label style={{ display: 'block', marginBottom: '2px', fontWeight: 'bold', color: '#6b21a8' }}>
                API 密钥（可选）:
              </label>
              <input
                className="nodrag"
                type="password"
                value={apiConfig.apiKey}
                onChange={(e) => setApiConfig({ ...apiConfig, apiKey: e.target.value })}
                placeholder="sk-..."
                style={{
                  width: '100%',
                  padding: '4px',
                  borderRadius: '3px',
                  border: '1px solid #c4b5fd',
                  fontSize: '10px',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ⏱️ 总时长显示 */}
      <div className="nodrag" style={{
        padding: '6px',
        backgroundColor: '#d1fae5',
        borderRadius: '4px',
        marginBottom: '8px',
        fontSize: '10px',
      }}>
        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#059669', marginBottom: '4px' }}>
          ⏱️ 总时长: {currentTotalDuration} 秒
        </div>
        {currentTotalDuration > 25 && (
          <div style={{ padding: '4px', backgroundColor: '#fecaca', borderRadius: '3px', fontSize: '9px', color: '#991b1b' }}>
            ⚠️ 超过限制（25秒）
          </div>
        )}
      </div>

      {/* 📊 候选角色显示 */}
      <div className="nodrag" style={{ marginBottom: '8px' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 'bold',
          color: '#059669',
          marginBottom: '4px',
        }}>
          📊 候选角色 (点击场景输入框后插入)
        </div>

        {connectedCharacters.length > 0 ? (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {connectedCharacters.map((char) => (
              <div
                key={char.id}
                className="nodrag"
                onClick={() => {
                  const targetIndex = lastFocusedSceneIndex.current;
                  if (targetIndex === null) {
                    alert('请先点击一个场景输入框');
                    return;
                  }
                  insertCharacterToScene({
                    sceneRefs,
                    targetIndex,
                    username: char.username,
                    alias: char.alias || char.username,
                    shots,
                  });
                }}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#ecfdf5',
                  borderRadius: '4px',
                  border: '1px solid #6ee7b7',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d1fae5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ecfdf5'}
              >
                <img
                  src={char.profilePictureUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%239ca3af"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E'}
                  alt=""
                  style={{ width: '20px', height: '20px', borderRadius: '50%' }}
                />
                <span style={{ fontSize: '10px', color: '#047857' }}>
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
            💡 提示：连接角色库节点并选择角色
          </div>
        )}
      </div>

      {/* 🖼️ 全局参考图控制 */}
      {connectedImages.length > 0 && (
        <div className="nodrag" style={{ padding: '6px', backgroundColor: '#f3e8ff', borderRadius: '4px', marginBottom: '8px' }}>
          <div style={{ marginBottom: '4px', fontWeight: 'bold', color: '#6b21a8' }}>
            🖼️ 全局参考图 ({connectedImages.length} 张)
          </div>

          <label className="nodrag" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <input
              className="nodrag"
              type="checkbox"
              checked={useGlobalImages}
              onChange={(e) => setUseGlobalImages(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontSize: '11px', color: '#6b21a8', cursor: 'pointer' }}>
              启用全局参考图
            </span>
          </label>

          <div style={{ display: 'flex', gap: '4px' }}>
            {connectedImages.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`global-${index}`}
                style={{ width: '36px', height: '36px', borderRadius: '3px', border: '1px solid #c4b5fd' }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 🎬 镜头列表 */}
      <div className="nodrag" style={{ marginBottom: '8px' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 'bold',
          color: '#6b21a8',
          marginBottom: '6px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>镜头列表 ({shots.length} 个)</span>
          <button
            className="nodrag"
            onClick={addShot}
            style={{
              padding: '2px 8px',
              fontSize: '9px',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          >
            + 添加镜头
          </button>
        </div>

        {shots.map((shot, index) => (
          <div
            key={shot.id}
            style={{
              padding: '6px',
              backgroundColor: '#fff',
              borderRadius: '4px',
              border: '1px solid #c4b5fd',
              marginBottom: '4px',
            }}
          >
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', color: '#6b21a8', fontWeight: 'bold' }}>
                镜头 {index + 1}
              </span>
              <input
                className="nodrag"
                type="number"
                value={shot.duration}
                onChange={(e) => updateShot(shot.id, 'duration', Number(e.target.value))}
                min={1}
                max={25}
                style={{
                  width: '50px',
                  padding: '2px 4px',
                  fontSize: '10px',
                  borderRadius: '3px',
                  border: '1px solid #c4b5fd',
                }}
              />
              <span style={{ fontSize: '9px', color: '#6b21a8' }}>秒</span>
              <button
                className="nodrag"
                onClick={() => {
                  setSelectedShotIndex(index);
                  setShowImageSelector(true);
                }}
                style={{
                  padding: '2px 6px',
                  fontSize: '9px',
                  backgroundColor: shot.image ? '#8b5cf6' : '#e5e7eb',
                  color: shot.image ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                }}
                title="选择参考图"
              >
                📷
              </button>
              {shots.length > 1 && (
                <button
                  className="nodrag"
                  onClick={() => removeShot(shot.id)}
                  style={{
                    padding: '2px 6px',
                    fontSize: '9px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                  }}
                  title="删除镜头"
                >
                  ✕
                </button>
              )}
            </div>

            <input
              className="nodrag"
              ref={(el) => sceneRefs.current[index] = el}
              type="text"
              value={shot.scene}
              onChange={(e) => updateShot(shot.id, 'scene', e.target.value)}
              onFocus={() => lastFocusedSceneIndex.current = index}
              placeholder="场景描述..."
              style={{
                width: '100%',
                padding: '4px',
                fontSize: '11px',
                borderRadius: '3px',
                border: '1px solid #c4b5fd',
              }}
            />
            {shot.image && (
              <div style={{ marginTop: '2px', fontSize: '9px', color: '#6b21a8' }}>
                📷 {shot.image.substring(0, 40)}...
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 生成按钮 */}
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
            ? '#6b21a8'
            : status === 'error'
            ? '#dc2626'
            : '#8b5cf6',
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

      {/* 错误消息 */}
      {error && (
        <div style={{
          marginTop: '6px',
          padding: '6px',
          backgroundColor: '#fecaca',
          borderRadius: '4px',
          fontSize: '10px',
          color: '#991b1b',
        }}>
          {typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}
        </div>
      )}

      {/* 任务ID显示 */}
      {taskId && (
        <div style={{
          marginTop: '6px',
          padding: '6px',
          backgroundColor: '#d1fae5',
          borderRadius: '4px',
          fontSize: '10px',
          color: '#065f46',
        }}>
          任务ID: {taskId}
        </div>
      )}

      {/* 图片选择模态框 */}
      {showImageSelector && (
        <div
          onClick={() => setShowImageSelector(false)}
          style={{
            position: 'fixed',
            zIndex: 1000,
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              padding: '16px',
              borderRadius: '8px',
              maxWidth: '500px',
              maxHeight: '400px',
              overflow: 'auto',
            }}
          >
            <h3 style={{ marginTop: 0 }}>为镜头 {selectedShotIndex + 1} 选择参考图</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {connectedImages.map((url, index) => (
                <div
                  key={index}
                  onClick={() => {
                    updateShot(shots[selectedShotIndex].id, 'image', url);
                    setShowImageSelector(false);
                  }}
                  style={{
                    padding: '4px',
                    border: shots[selectedShotIndex]?.image === url
                      ? '2px solid #8b5cf6'
                      : '1px solid #e5e7eb',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src={url}
                    alt={`ref-${index}`}
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '2px' }}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
              <button
                className="nodrag"
                onClick={() => {
                  updateShot(shots[selectedShotIndex].id, 'image', '');
                  setShowImageSelector(false);
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
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
                }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resize Handle */}
      <div
        className="nodrag"
        ref={resizeHandleRef}
        onMouseDown={handleResizeMouseDown}
        style={{
          position: 'absolute',
          right: '0',
          bottom: '0',
          width: '16px',
          height: '16px',
          cursor: 'nwse-resize',
          background: 'linear-gradient(135deg, transparent 50%, #8b5cf6 50%)',
          borderRadius: '0 0 6px 0',
          opacity: '0.6',
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
        title="拖动调整节点大小"
      />
    </div>
  );
}

export default JuxinStoryboardNode;
