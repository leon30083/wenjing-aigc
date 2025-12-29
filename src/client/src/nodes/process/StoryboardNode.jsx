import { Handle, Position } from 'reactflow';
import React, { useState } from 'react';

const API_BASE = 'http://localhost:9000';

function StoryboardNode({ data }) {
  const [config, setConfig] = useState({
    model: 'Sora-2',
    duration: '10s',
    aspect: '16:9',
    watermark: false,
  });

  const [shots, setShots] = useState([
    { id: '1', scene: '', duration: 10, image: '' },
  ]);

  const [status, setStatus] = useState('idle'); // idle, generating, success, error
  const [progress, setProgress] = useState({ total: 0, completed: 0, failed: 0 });
  const [results, setResults] = useState([]);

  // Add a new shot
  const addShot = () => {
    const newShot = {
      id: Date.now().toString(),
      scene: '',
      duration: 10,
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

  // Generate storyboard
  const handleGenerate = async () => {
    // Validation
    const validShots = shots.filter(s => s.scene.trim());
    if (validShots.length === 0) {
      alert('请至少填写一个分镜头场景');
      return;
    }

    setStatus('generating');
    setProgress({ total: validShots.length, completed: 0, failed: 0 });
    setResults([]);

    try {
      // Collect all images from shots
      const allImages = shots
        .filter(s => s.image.trim())
        .map(s => s.image.trim());

      for (let i = 0; i < validShots.length; i++) {
        const shot = validShots[i];

        try {
          const payload = {
            platform: 'juxin',
            model: config.model,
            prompt: shot.scene,
            duration: `${shot.duration}s`,
            aspect_ratio: config.aspect,
            watermark: config.watermark,
            storyboard_mode: true,
            shot_index: i,
            total_shots: validShots.length,
          };

          // Add images from all shots (not just current shot)
          if (allImages.length > 0) {
            payload.images = allImages;
          }

          const response = await fetch(`${API_BASE}/video/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          const result = await response.json();

          if (result.success && result.data) {
            setResults(prev => [...prev, {
              shotId: shot.id,
              scene: shot.scene,
              taskId: result.data.id || result.data.task_id,
              status: 'queued',
            }]);
            setProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
          } else {
            setProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
          }
        } catch (err) {
          console.error(`Failed to generate shot ${i}:`, err);
          setProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
        }
      }

      setStatus('success');

      // Notify parent
      if (data.onStoryboardGenerated) {
        data.onStoryboardGenerated(results);
      }
    } catch (err) {
      setStatus('error');
      console.error('Storyboard generation error:', err);
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
      minWidth: '320px',
      maxWidth: '360px',
    }}>
      {/* Input Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="prompt-input"
        style={{ background: '#6366f1', width: 10, height: 10 }}
      />

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="videos-output"
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

      {/* Global Config */}
      <div style={{
        padding: '6px',
        backgroundColor: '#e0e7ff',
        borderRadius: '4px',
        marginBottom: '8px',
        fontSize: '10px',
      }}>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
          <select
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
          <select
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
            <option value="1:1">1:1</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <label style={{ fontSize: '10px', color: '#4338ca' }}>水印:</label>
          <input
            type="checkbox"
            checked={config.watermark}
            onChange={(e) => setConfig({ ...config, watermark: e.target.checked })}
            disabled={status === 'generating'}
          />
        </div>
      </div>

      {/* Shots List */}
      <div style={{
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

            {/* Scene Input */}
            <input
              type="text"
              value={shot.scene}
              onChange={(e) => updateShot(shot.id, 'scene', e.target.value)}
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
                type="number"
                value={shot.duration}
                onChange={(e) => updateShot(shot.id, 'duration', parseFloat(e.target.value))}
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

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={status === 'generating'}
        style={{
          width: '100%',
          padding: '8px',
          backgroundColor: status === 'generating'
            ? '#9ca3af'
            : status === 'success'
            ? '#059669'
            : '#6366f1',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: status === 'generating' ? 'not-allowed' : 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
        }}
      >
        {status === 'idle' && '批量生成'}
        {status === 'generating' && `生成中... (${progress.completed}/${progress.total})`}
        {status === 'success' && `✓ 完成 (${progress.completed}个成功)`}
      </button>

      {/* Progress */}
      {status === 'generating' && (
        <div style={{
          marginTop: '6px',
          fontSize: '10px',
          color: '#4338ca',
        }}>
          进度: {progress.completed} 完成 / {progress.failed} 失败 / {progress.total} 总计
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
        <span>← 提示词/图片</span>
        <span>视频数组 →</span>
      </div>
    </div>
  );
}

export default StoryboardNode;
