/**
 * 提示词优化节点
 * 使用 OpenAI API (DeepSeek) 将简单描述优化成详细的 Sora 2 提示词
 */

import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position, useNodeId, useReactFlow } from 'reactflow';

function PromptOptimizerNode({ data }) {
  const nodeId = useNodeId();
  const { setNodes, getEdges } = useReactFlow();

  // 从连接的节点获取 OpenAI 配置
  const [openaiConfig, setOpenaiConfig] = useState(data.openaiConfig || null);

  // 状态管理
  const [simplePrompt, setSimplePrompt] = useState(data.simplePrompt || '');
  const [optimizedPrompt, setOptimizedPrompt] = useState(data.optimizedPrompt || '');
  const [style, setStyle] = useState(data.style || 'picture-book');
  const [customStyleDescription, setCustomStyleDescription] = useState(data.customStyleDescription || '');
  const [optimizationDirection, setOptimizationDirection] = useState(data.optimizationDirection || ''); // ⭐ 新增：优化方向
  const [targetDuration, setTargetDuration] = useState(data.targetDuration || 10); // ⭐ 新增：目标时长
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [lastOptimization, setLastOptimization] = useState(null);
  const [connectedCharacters, setConnectedCharacters] = useState(data.connectedCharacters || []);
  const [statusMessage, setStatusMessage] = useState({ type: '', message: '' }); // ⭐ 新增：状态提示

  // ⭐ 新增：引用 simplePrompt textarea（用于角色插入）
  const promptInputRef = useRef(null);

  // ⭐ 创建用户名到别名的映射
  const usernameToAlias = React.useMemo(() => {
    const map = {};
    connectedCharacters.forEach(char => {
      map[char.username] = char.alias || char.username;
    });
    return map;
  }, [connectedCharacters]);

  // ⭐ 将真实提示词转换为显示提示词（用户看：别名）
  const realToDisplay = (text) => {
    if (!text) return '';
    let result = text;
    Object.entries(usernameToAlias).forEach(([username, alias]) => {
      const regex = new RegExp(`@${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|@)`, 'g');
      result = result.replace(regex, `@${alias}`);
    });
    return result;
  };

  // ⭐ 将显示提示词转换为真实提示词（API用：真实ID）
  const displayToReal = (text) => {
    if (!text) return '';
    let result = text;
    const sortedAliases = Object.entries(usernameToAlias)
      .sort((a, b) => b[1].length - a[1].length);
    sortedAliases.forEach(([username, alias]) => {
      const regex = new RegExp(`@${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|@)`, 'g');
      result = result.replace(regex, `@${username}`);
    });
    return result;
  };

  // ⭐ 在光标位置插入角色引用
  const insertCharacterAtCursor = (username, alias) => {
    const promptElement = promptInputRef.current;
    if (!promptElement) return;

    const start = promptElement.selectionStart;
    const end = promptElement.selectionEnd;
    const displayText = realToDisplay(simplePrompt);
    const refText = `@${alias} `;

    const newDisplayText = displayText.substring(0, start) + refText + displayText.substring(end);
    const newRealText = displayToReal(newDisplayText);
    setSimplePrompt(newRealText);

    setTimeout(() => {
      promptElement.setSelectionRange(start + refText.length, start + refText.length);
      promptElement.focus();
    }, 0);
  };

  // 从 data 接收 OpenAI 配置
  useEffect(() => {
    if (data.openaiConfig) {
      setOpenaiConfig(data.openaiConfig);
    }
  }, [data.openaiConfig]);

  // 从 data 接收角色数据
  useEffect(() => {
    if (data.connectedCharacters !== undefined) {
      setConnectedCharacters(data.connectedCharacters);
    } else {
      setConnectedCharacters([]);
    }
  }, [data.connectedCharacters]);

  // 同步状态到 node.data
  useEffect(() => {
    if (simplePrompt !== data.simplePrompt) {
      data.simplePrompt = simplePrompt;
    }
    if (style !== data.style) {
      data.style = style;
    }
    if (customStyleDescription !== data.customStyleDescription) {
      data.customStyleDescription = customStyleDescription;
    }
    if (optimizationDirection !== data.optimizationDirection) {
      data.optimizationDirection = optimizationDirection;
    }
    if (targetDuration !== data.targetDuration) {
      data.targetDuration = targetDuration;
    }
  }, [simplePrompt, style, customStyleDescription, optimizationDirection, targetDuration, data]);

  // 自动传递优化结果到目标节点
  useEffect(() => {
    if (optimizedPrompt && nodeId) {
      const edges = getEdges();
      const outgoingEdges = edges.filter(e => e.source === nodeId);

      setNodes((nds) =>
        nds.map((node) => {
          // 更新源节点的 optimizedPrompt
          if (node.id === nodeId) {
            return { ...node, data: { ...node.data, optimizedPrompt } };
          }

          // 更新所有连接的目标节点
          const isConnected = outgoingEdges.some(e => e.target === node.id);
          if (isConnected) {
            return {
              ...node,
              data: { ...node.data, connectedPrompt: optimizedPrompt }
            };
          }
          return node;
        })
      );
    }
  }, [optimizedPrompt, nodeId, setNodes, getEdges]);

  // 优化提示词
  const optimizePrompt = async () => {
    // 清空状态消息
    setStatusMessage({ type: '', message: '' });

    if (!simplePrompt.trim()) {
      setStatusMessage({ type: 'warning', message: '请输入要优化的简单描述' });
      return;
    }

    if (!openaiConfig) {
      setStatusMessage({ type: 'warning', message: '请先连接 OpenAI 配置节点' });
      return;
    }

    const { base_url, api_key, model } = openaiConfig;

    if (!base_url || !api_key || !model) {
      setStatusMessage({ type: 'warning', message: 'OpenAI 配置不完整，请检查配置节点' });
      return;
    }

    if (style === 'custom' && !customStyleDescription.trim()) {
      setStatusMessage({ type: 'warning', message: '请输入自定义风格描述' });
      return;
    }

    setIsOptimizing(true);

    try {
      const response = await fetch('http://localhost:9000/api/openai/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_url,
          api_key,
          model,
          prompt: simplePrompt,
          style,
          customStyleDescription: style === 'custom' ? customStyleDescription : undefined,
          optimizationDirection: optimizationDirection || undefined, // ⭐ 新增：优化方向
          context: {
            target_duration: targetDuration, // ⭐ 修改：使用状态变量而非硬编码
            characters: connectedCharacters.map(char => ({
              username: char.username,
              alias: char.alias || char.username,
              profilePictureUrl: char.profilePictureUrl,
            }))
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        setOptimizedPrompt(result.data.optimized_prompt);
        setLastOptimization({
          timestamp: new Date().toISOString(),
          model: result.data.meta.model_used,
          style: result.data.meta.style,
          tokens: result.data.meta.tokens_used,
        });
        setStatusMessage({
          type: 'success',
          message: `✓ 优化成功 | Token: ${result.data.meta.tokens_used}`
        });
        // 3秒后自动清除成功消息
        setTimeout(() => setStatusMessage({ type: '', message: '' }), 3000);
      } else {
        setStatusMessage({ type: 'error', message: `✗ ${result.error}` });
      }
    } catch (error) {
      setStatusMessage({ type: 'error', message: `✗ 网络错误: ${error.message}` });
    } finally {
      setIsOptimizing(false);
    }
  };

  // 复制优化结果
  const copyToClipboard = () => {
    navigator.clipboard.writeText(optimizedPrompt);
    setStatusMessage({ type: 'success', message: '✓ 已复制到剪贴板' });
    // 2秒后自动清除消息
    setTimeout(() => setStatusMessage({ type: '', message: '' }), 2000);
  };

  return (
    <div style={{
      padding: '10px 15px',
      borderRadius: '8px',
      borderWidth: '2px',
      borderColor: '#8b5cf6',
      borderStyle: 'solid',
      backgroundColor: '#faf5ff',
      width: '320px',
    }}>
      {/* 输入端口 */}
      <Handle
        type="target"
        position={Position.Left}
        id="openai-config"
        style={{ background: '#8b5cf6', width: 10, height: 10, top: '15%' }}
      />
      <div style={{ position: 'absolute', left: '18px', top: '15%', transform: 'translateY(-50%)', zIndex: 10 }}>
        <span style={{ fontSize: '10px', color: '#8b5cf6', fontWeight: 'bold', whiteSpace: 'nowrap' }}>配置</span>
      </div>

      {/* 角色输入端口 */}
      <Handle
        type="target"
        position={Position.Left}
        id="character-input"
        style={{ background: '#8b5cf6', width: 10, height: 10, top: '35%' }}
      />
      <div style={{ position: 'absolute', left: '18px', top: '35%', transform: 'translateY(-50%)', zIndex: 10 }}>
        <span style={{ fontSize: '10px', color: '#8b5cf6', fontWeight: 'bold', whiteSpace: 'nowrap' }}>角色</span>
      </div>

      {/* 标题 */}
      <div style={{
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#6b21a8',
        marginBottom: '8px',
        textAlign: 'center',
      }}>
        📝 提示词优化
      </div>

      {/* ⭐ 状态消息提示 */}
      {statusMessage.message && (
        <div style={{
          padding: '6px 8px',
          borderRadius: '4px',
          marginBottom: '8px',
          fontSize: '10px',
          fontWeight: 'bold',
          backgroundColor:
            statusMessage.type === 'success' ? '#d1fae5' :
            statusMessage.type === 'error' ? '#fee2e2' :
            statusMessage.type === 'warning' ? '#fef3c7' : '#f3f4f6',
          color:
            statusMessage.type === 'success' ? '#065f46' :
            statusMessage.type === 'error' ? '#991b1b' :
            statusMessage.type === 'warning' ? '#92400e' : '#374151',
          textAlign: 'center',
          border: `1px solid ${
            statusMessage.type === 'success' ? '#6ee7b7' :
            statusMessage.type === 'error' ? '#fca5a5' :
            statusMessage.type === 'warning' ? '#fcd34d' : '#d1d5db'
          }`,
        }}>
          {statusMessage.message}
        </div>
      )}

      {/* 配置状态指示 */}
      <div style={{
        padding: '4px 8px',
        borderRadius: '3px',
        backgroundColor: openaiConfig ? '#d1fae5' : '#fef3c7',
        fontSize: '9px',
        color: openaiConfig ? '#065f46' : '#92400e',
        textAlign: 'center',
        marginBottom: '8px',
      }}>
        {openaiConfig ? '✅ OpenAI 配置已连接' : '⚠️ 未连接配置节点'}
      </div>

      {/* ⭐ 候选角色显示（可点击插入） */}
      <div className="nodrag" style={{ marginBottom: '8px' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 'bold',
          color: '#059669',
          marginBottom: '4px',
        }}>
          📊 候选角色 (点击插入到光标位置)
        </div>

        {connectedCharacters.length > 0 ? (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {connectedCharacters.map((char) => (
              <div
                key={char.id}
                className="nodrag"
                onClick={() => insertCharacterAtCursor(char.username, char.alias || char.username)}
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
                title="点击插入到光标位置"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d1fae5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ecfdf5'}
              >
                <img
                  src={char.profilePictureUrl}
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
            💡 提示：连接角色库节点并选择角色后，点击角色卡片插入
          </div>
        )}
      </div>

      {/* 简单描述输入 */}
      <div className="nodrag">
        <label style={{ fontSize: '10px', color: '#6b21a8', fontWeight: 'bold' }}>
          简单描述
        </label>
        <textarea
          className="nodrag"
          ref={promptInputRef}
          name="simplePrompt"
          value={realToDisplay(simplePrompt)}
          onChange={(e) => {
            const realText = displayToReal(e.target.value);
            setSimplePrompt(realText);
          }}
          onWheel={(e) => e.stopPropagation()}
          placeholder="例如: @装载机 在工地上干活"
          style={{
            width: '100%',
            minHeight: '60px',
            padding: '6px 8px',
            borderRadius: '4px',
            border: '1px solid #c4b5fd',
            fontSize: '10px',
            resize: 'vertical',
            marginTop: '2px',
            fontFamily: 'monospace',
          }}
        />
      </div>

      {/* 风格选择 */}
      <div className="nodrag" style={{ marginTop: '8px' }}>
        <label style={{ fontSize: '10px', color: '#6b21a8', fontWeight: 'bold' }}>
          风格
        </label>
        <select
          className="nodrag"
          name="style"
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          style={{
            width: '100%',
            padding: '4px 6px',
            borderRadius: '3px',
            border: '1px solid #c4b5fd',
            fontSize: '10px',
            marginTop: '2px',
          }}
        >
          <option value="picture-book">🎨 绘本风格</option>
          <option value="documentary">📹 纪录片风格</option>
          <option value="animation">🎭 动画风格</option>
          <option value="cinematic">🎬 电影风格</option>
          <option value="custom">✏️ 自定义风格...</option>
        </select>
      </div>

      {/* 自定义风格输入框 */}
      {style === 'custom' && (
        <div className="nodrag" style={{ marginTop: '8px' }}>
          <label style={{ fontSize: '10px', color: '#6b21a8', fontWeight: 'bold' }}>
            风格描述
          </label>
          <input
            className="nodrag"
            type="text"
            id="custom-style-description"
            name="customStyleDescription"
            value={customStyleDescription}
            onChange={(e) => setCustomStyleDescription(e.target.value)}
            onWheel={(e) => e.stopPropagation()}
            placeholder="如: 科幻风格、赛博朋克、水墨画风格"
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '4px',
              border: '1px solid #c4b5fd',
              fontSize: '10px',
              marginTop: '2px',
            }}
          />
          <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '2px' }}>
            💡 提示: 输入简单描述，AI 会自动理解并应用风格
          </div>
        </div>
      )}

      {/* ⭐ 优化方向输入框（问题 1） */}
      <div className="nodrag" style={{ marginTop: '8px' }}>
        <label style={{ fontSize: '10px', color: '#6b21a8', fontWeight: 'bold' }}>
          💡 优化方向（可选）
        </label>
        <input
          className="nodrag"
          type="text"
          id="optimization-direction"
          name="optimizationDirection"
          value={optimizationDirection}
          onChange={(e) => setOptimizationDirection(e.target.value)}
          onWheel={(e) => e.stopPropagation()}
          placeholder="例如: 更详细、更简洁、更生动、更专业..."
          style={{
            width: '100%',
            padding: '6px 8px',
            borderRadius: '4px',
            border: '1px solid #c4b5fd',
            fontSize: '10px',
            marginTop: '2px',
          }}
        />
        <div style={{ fontSize: '8px', color: '#9ca3af', marginTop: '2px' }}>
          常用: 更详细 | 更简洁 | 更生动 | 更专业
        </div>
      </div>

      {/* ⭐ 目标时长选择（问题 2） */}
      <div className="nodrag" style={{ marginTop: '8px' }}>
        <label style={{ fontSize: '10px', color: '#6b21a8', fontWeight: 'bold' }}>
          ⏱️ 目标时长（秒）
        </label>
        <select
          className="nodrag"
          name="targetDuration"
          value={targetDuration}
          onChange={(e) => setTargetDuration(Number(e.target.value))}
          style={{
            width: '100%',
            padding: '4px 6px',
            borderRadius: '4px',
            border: '1px solid #c4b5fd',
            fontSize: '10px',
            marginTop: '2px',
          }}
        >
          <option value={5}>5 秒</option>
          <option value={10}>10 秒</option>
          <option value={15}>15 秒</option>
          <option value={25}>25 秒</option>
        </select>
      </div>

      {/* 优化按钮 */}
      <button
        className="nodrag"
        onClick={optimizePrompt}
        disabled={isOptimizing || !openaiConfig}
        style={{
          width: '100%',
          padding: '8px',
          marginTop: '8px',
          backgroundColor: isOptimizing ? '#9ca3af' : '#8b5cf6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '11px',
          cursor: isOptimizing ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
        }}
      >
        {isOptimizing ? '⏳ 优化中...' : '✨ AI 优化'}
      </button>

      {/* 优化结果 */}
      {optimizedPrompt && (
        <div className="nodrag" style={{ marginTop: '8px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px',
          }}>
            <label style={{ fontSize: '10px', color: '#6b21a8', fontWeight: 'bold' }}>
              优化结果
            </label>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                className="nodrag"
                onClick={copyToClipboard}
                style={{
                  padding: '2px 6px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: '9px',
                  cursor: 'pointer',
                }}
              >
                📋 复制
              </button>
              <button
                className="nodrag"
                onClick={() => {
                  setSimplePrompt('');
                  setOptimizedPrompt('');
                  setLastOptimization(null);
                }}
                style={{
                  padding: '2px 6px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: '9px',
                  cursor: 'pointer',
                }}
              >
                🔄 清除
              </button>
            </div>
          </div>
          <textarea
            className="nodrag"
            readOnly
            value={optimizedPrompt}
            onWheel={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '6px 8px',
              borderRadius: '4px',
              border: '1px solid #c4b5fd',
              fontSize: '9px',
              resize: 'vertical',
              backgroundColor: '#faf5ff',
              color: '#1f2937',
              fontFamily: 'monospace',
            }}
          />
          {lastOptimization && (
            <div style={{
              marginTop: '4px',
              fontSize: '8px',
              color: '#6b7280',
            }}>
              模型: {lastOptimization.model} | Token: {lastOptimization.tokens}
            </div>
          )}
        </div>
      )}

      {/* 输出端口 */}
      <Handle
        type="source"
        position={Position.Right}
        id="optimized-prompt"
        style={{ background: '#8b5cf6', width: 10, height: 10, top: '50%' }}
      />
      <div style={{ position: 'absolute', right: '18px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
        <span style={{ fontSize: '10px', color: '#8b5cf6', fontWeight: 'bold', whiteSpace: 'nowrap' }}>提示词</span>
      </div>
    </div>
  );
}

export default PromptOptimizerNode;
