import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Handle, Position, useNodeId } from 'reactflow';
import { useReactFlow } from 'reactflow';

/**
 * NarratorNode - 旁白输入节点
 *
 * 功能：
 * - 多行文本输入（支持角色引用 @username）
 * - 旁白解析（按行分割，去除空行）
 * - 候选角色显示和插入
 * - 风格和时长设置
 * - 优化方向选择
 * - 句子列表显示（带状态指示）
 */

const API_BASE = 'http://localhost:9000';

const STYLES = [
  { value: 'picture-book', label: '📖 绘本风格' },
  { value: 'cinematic', label: '🎬 电影风格' },
  { value: 'documentary', label: '📹 纪录片风格' },
  { value: 'animation', label: '🎨 动画风格' },
  { value: 'custom', label: '✏️ 自定义风格' }
];

const DIRECTIONS = [
  { value: 'balanced', label: '⚖️ 平衡' },
  { value: 'detailed', label: '📝 更详细' },
  { value: 'concise', label: '✂️ 更简洁' },
  { value: 'creative', label: '🎨 更创意' },
  { value: 'professional', label: '🎬 更专业' }
];

const DURATIONS = [
  { value: 10, label: '10秒' },
  { value: 15, label: '15秒' },
  { value: 25, label: '25秒' }
];

export default function NarratorNode({ data }) {
  const nodeId = useNodeId();
  const { getEdges, getNodes, setNodes } = useReactFlow();
  const textareaRef = useRef(null);

  // 从 data 初始化状态（支持工作流恢复）
  const [rawText, setRawText] = useState(data.rawText || '');
  const [sentences, setSentences] = useState(data.sentences || []);
  const [connectedCharacters, setConnectedCharacters] = useState(data.connectedCharacters || []);
  const [openaiConfig, setOpenaiConfig] = useState(data.openaiConfig || null);
  const [isMatching, setIsMatching] = useState(false);
  const [style, setStyle] = useState(data.style || 'picture-book');
  const [targetDuration, setTargetDuration] = useState(data.targetDuration || 10);
  const [optimizationDirection, setOptimizationDirection] = useState(data.optimizationDirection || 'balanced');
  const [customStyleDescription, setCustomStyleDescription] = useState(data.customStyleDescription || '');

  /**
   * 解析旁白文本
   * 按行分割，去除空行，为每个句子创建对象
   */
  const parseNarratorText = (text) => {
    if (!text || !text.trim()) {
      return [];
    }

    // 按行分割，去除空行
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // 为每个句子创建对象
    return lines.map((line, index) => ({
      id: `sentence-${Date.now()}-${index}`,
      index: index,
      text: line,
      optimized: '',
      status: 'pending'
    }));
  };

  /**
   * 当 rawText 变化时，重新解析句子
   */
  useEffect(() => {
    const parsedSentences = parseNarratorText(rawText);

    // 保留已优化的结果
    const mergedSentences = parsedSentences.map((newSentence) => {
      const existing = sentences.find(s => s.text === newSentence.text);
      return existing || newSentence;
    });

    // 移除不再存在的句子
    const finalSentences = mergedSentences.filter(
      (s) => parsedSentences.some(ps => ps.text === s.text)
    );

    setSentences(finalSentences);
  }, [rawText]);

  /**
   * 接收来自 CharacterLibraryNode 的角色数据
   */
  useEffect(() => {
    if (nodeId) {
      const edges = getEdges();
      const characterEdge = edges.find(
        (e) => e.target === nodeId && e.targetHandle === 'character-input'
      );

      console.log('[NarratorNode] 检查角色连接:', {
        nodeId,
        hasCharacterEdge: !!characterEdge,
        edge: characterEdge
      });

      if (characterEdge) {
        const sourceNode = getNodes().find(n => n.id === characterEdge.source);
        console.log('[NarratorNode] 源节点数据:', {
          sourceId: characterEdge.source,
          sourceType: sourceNode?.type,
          hasSelectedCharacters: !!sourceNode?.data?.selectedCharacters,
          hasConnectedCharacters: !!sourceNode?.data?.connectedCharacters,
          selectedCount: sourceNode?.data?.selectedCharacters?.length || 0,
          connectedCount: sourceNode?.data?.connectedCharacters?.length || 0
        });

        // 兼容两种字段名：selectedCharacters（CharacterLibraryNode输出）和 connectedCharacters（向后兼容）
        const characterData = sourceNode.data?.selectedCharacters || sourceNode.data?.connectedCharacters;
        if (sourceNode?.type === 'characterLibraryNode' && characterData) {
          console.log('[NarratorNode] ✅ 设置角色数据:', characterData.length, '个角色');
          setConnectedCharacters(characterData);
        } else {
          console.warn('[NarratorNode] ⚠️ 未找到有效角色数据', {
            isCharacterLibraryNode: sourceNode?.type === 'characterLibraryNode',
            hasCharacterData: !!characterData
          });
        }
      } else {
        console.log('[NarratorNode] 未检测到角色连接');
      }
    }
  }, [nodeId, getEdges, getNodes]);

  /**
   * ⭐ 新增：监听 node.data.connectedCharacters 的变化（源节点推送数据时）
   * 这个 useEffect 会在 CharacterLibraryNode 推送数据时触发
   */
  useEffect(() => {
    if (data.connectedCharacters && data.connectedCharacters.length > 0) {
      console.log('[NarratorNode] 从 node.data 同步角色数据:', data.connectedCharacters.length, '个角色');
      setConnectedCharacters(data.connectedCharacters);
    }
  }, [data.connectedCharacters]);

  /**
   * ⭐ 接收来自 OpenAIConfigNode 的配置数据（直接连接）
   */
  useEffect(() => {
    if (data.openaiConfig) {
      console.log('[NarratorNode] ✅ 从直接连接获取 OpenAI 配置:', {
        base_url: data.openaiConfig.base_url,
        model: data.openaiConfig.model
      });
      setOpenaiConfig(data.openaiConfig);
    } else {
      setOpenaiConfig(null);
    }
  }, [data.openaiConfig]);

  /**
   * ⭐ 动态获取 OpenAI 配置（支持直接连接和继承）
   * 优先使用内部状态，如果没有则尝试从 NarratorProcessorNode 继承
   */
  const getOpenAIConfig = () => {
    // 如果已经有配置，直接返回
    if (openaiConfig) {
      return openaiConfig;
    }

    // 尝试从连接的 NarratorProcessorNode 继承
    const edges = getEdges();
    const outgoingEdges = edges.filter((e) => e.source === nodeId);

    for (const edge of outgoingEdges) {
      const targetNode = getNodes().find(n => n.id === edge.target);
      if (targetNode?.type === 'narratorProcessorNode' && targetNode.data?.openaiConfig) {
        console.log('[NarratorNode] ✅ 从 NarratorProcessorNode 继承 OpenAI 配置:', {
          targetNodeId: targetNode.id,
          base_url: targetNode.data.openaiConfig.base_url,
          model: targetNode.data.openaiConfig.model
        });
        // 更新内部状态，下次可以直接使用
        setOpenaiConfig(targetNode.data.openaiConfig);
        return targetNode.data.openaiConfig;
      }
    }

    return null;
  };

  /**
   * ⭐ 判断是否有可用的 OpenAI 配置（用于 UI 显示）
   */
  const hasOpenAIConfig = useMemo(() => {
    return !!getOpenAIConfig();
  }, [openaiConfig, getEdges, getNodes]);

  /**
   * ⭐ 新增：智能匹配角色
   */
  const handleSmartMatch = async () => {
    // ⭐ 动态获取 OpenAI 配置（支持直接连接和继承）
    const config = getOpenAIConfig();
    if (!config) {
      alert('⚠️ 请先连接 OpenAI 配置节点');
      return;
    }

    if (connectedCharacters.length === 0) {
      alert('⚠️ 请先连接角色库节点并选择角色');
      return;
    }

    const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) {
      alert('⚠️ 请先输入旁白文本');
      return;
    }

    setIsMatching(true);

    try {
      let matchedCount = 0;

      // 逐行识别角色
      const newLines = await Promise.all(lines.map(async (line) => {
        // 检查是否已有角色引用
        if (/@[\w.-]+/.test(line)) {
          return line;  // 已有引用，跳过
        }

        // 调用 API 识别角色
        const response = await fetch(`${API_BASE}/api/openai/identify-characters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sentence: line,
            characters: connectedCharacters,
            base_url: config.base_url,
            api_key: config.api_key,
            model: config.model
          })
        });

        const result = await response.json();

        if (result.success && result.data.matches && result.data.matches.length > 0) {
          // ⭐ 支持多角色：插入所有置信度 > 0.8 的角色引用
          const validMatches = result.data.matches.filter(m => m.confidence > 0.8);
          if (validMatches.length > 0) {
            matchedCount += validMatches.length;
            // 在开头插入所有角色引用（用空格分隔）
            const characterRefs = validMatches.map(m => `@${m.username}`).join(' ');
            return `${characterRefs} ${line}`;
          }
        }

        return line;
      }));

      // 更新 rawText
      setRawText(newLines.join('\n'));
      alert(`✅ 完成！已匹配 ${matchedCount} 个角色引用`);

    } catch (error) {
      console.error('[智能匹配] 失败:', error);
      alert('❌ 匹配失败，请检查网络和配置');
    } finally {
      setIsMatching(false);
    }
  };

  /**
   * 同步状态到 node.data（用于工作流保存）
   */
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                rawText,
                sentences,
                connectedCharacters,
                openaiConfig,
                style,
                targetDuration,
                optimizationDirection,
                customStyleDescription
              }
            }
          : node
      )
    );
  }, [rawText, sentences, connectedCharacters, openaiConfig, style, targetDuration, optimizationDirection, customStyleDescription, nodeId, setNodes]);

  /**
   * 创建用户名到别名的映射
   */
  const usernameToAlias = useMemo(() => {
    const map = {};
    connectedCharacters.forEach(char => {
      map[char.username] = char.alias || char.username;
    });
    return map;
  }, [connectedCharacters]);

  /**
   * 在光标位置插入角色引用
   */
  const insertCharacterAtCursor = (username, alias) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      // 如果 ref 不可用，回退到末尾添加
      setRawText(prev => prev + `@${username} `);
      return;
    }

    // 获取光标位置
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = rawText;
    const refText = `@${username} `;

    // 在光标位置插入
    const newText = text.substring(0, start) + refText + text.substring(end);

    setRawText(newText);

    // 恢复光标位置到插入内容之后
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = start + refText.length;
        textareaRef.current.setSelectionRange(newPosition, newPosition);
        textareaRef.current.focus();
      }
    }, 0);
  };

  /**
   * 获取状态显示
   */
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'pending':
        return '⏳ 待优化';
      case 'optimizing':
        return '🔄 优化中';
      case 'ready':
        return '✅ 已就绪';
      case 'error':
        return '❌ 失败';
      default:
        return '⏳ 待优化';
    }
  };

  /**
   * 获取状态颜色
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#9ca3af';
      case 'optimizing':
        return '#3b82f6';
      case 'ready':
        return '#10b981';
      case 'error':
        return '#ef4444';
      default:
        return '#9ca3af';
    }
  };

  return (
    <div
      style={{
        padding: '10px',
        minWidth: '280px',
        maxWidth: '400px',
        background: '#ffffff',
        border: '2px solid #3b82f6',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      {/* 节点标题 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '10px',
          paddingBottom: '8px',
          borderBottom: '1px solid #e5e7eb'
        }}
      >
        <span style={{ fontSize: '16px', fontWeight: 'bold', marginRight: '8px' }}>📖</span>
        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937' }}>旁白输入</span>
      </div>

      {/* 输入端口 - 角色库 */}
      <Handle
        type="target"
        position={Position.Left}
        id="character-input"
        style={{
          background: '#10b981',
          width: 10,
          height: 10,
          top: '15%',
          left: '-5px'
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '-80px',
          top: '15%',
          transform: 'translateY(-50%)',
          fontSize: '10px',
          color: '#10b981',
          fontWeight: 'bold',
          whiteSpace: 'nowrap'
        }}
      >
        角色
      </div>

      {/* 输入端口 - OpenAI 配置 */}
      <Handle
        type="target"
        position={Position.Left}
        id="openai-config"
        style={{
          background: '#f59e0b',
          width: 10,
          height: 10,
          top: '30%',
          left: '-5px'
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '-90px',
          top: '30%',
          transform: 'translateY(-50%)',
          fontSize: '10px',
          color: '#f59e0b',
          fontWeight: 'bold',
          whiteSpace: 'nowrap'
        }}
      >
        OpenAI
      </div>

      {/* 候选角色显示 */}
      {connectedCharacters.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
            📊 候选角色 (点击插入到光标位置)
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
              maxHeight: '60px',
              overflowY: 'auto'
            }}
          >
            {connectedCharacters.map((char) => {
              const displayName = usernameToAlias[char.username] || char.username;
              return (
                <div
                  key={char.id}
                  onClick={() => insertCharacterAtCursor(char.username, displayName)}
                  className="nodrag"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 6px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    border: '1px solid #d1d5db',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#dbeafe';
                    e.currentTarget.style.borderColor = '#3b82f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                >
                  {char.profilePictureUrl && (
                    <img
                      src={char.profilePictureUrl}
                      alt={displayName}
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  <span style={{ fontWeight: '500', color: '#1f2937' }}>
                    {displayName}
                  </span>
                  {char.alias && (
                    <span style={{ fontSize: '8px', color: '#6b7280' }}>
                      (@{char.username})
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 智能匹配按钮 */}
      <div style={{ marginBottom: '10px' }}>
        <button
          onClick={handleSmartMatch}
          disabled={isMatching || !hasOpenAIConfig || connectedCharacters.length === 0}
          className="nodrag"
          style={{
            width: '100%',
            padding: '6px 12px',
            background: isMatching
              ? '#9ca3af'
              : (!hasOpenAIConfig
                ? '#e5e7eb'
                : connectedCharacters.length === 0
                  ? '#fef3c7'
                  : '#8b5cf6'),
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (isMatching || !hasOpenAIConfig) ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!isMatching && hasOpenAIConfig && connectedCharacters.length > 0) {
              e.currentTarget.style.background = '#7c3aed';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMatching && hasOpenAIConfig && connectedCharacters.length > 0) {
              e.currentTarget.style.background = '#8b5cf6';
            }
          }}
        >
          {isMatching
            ? '🔄 匹配中...'
            : !hasOpenAIConfig
              ? '🪄 智能匹配角色（未连接 OpenAI）'
              : connectedCharacters.length === 0
                ? '🪄 智能匹配角色（未选择角色）'
                : '🪄 智能匹配角色'}
        </button>
        {!hasOpenAIConfig && (
          <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>
            💡 提示：连接 OpenAI 配置节点或旁白处理器节点以启用智能匹配
          </div>
        )}
      </div>

      {/* 风格和时长设置 */}
      <div style={{ marginBottom: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '120px' }}>
          <label style={{ fontSize: '10px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>
            风格
          </label>
          <select
            className="nodrag"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            style={{
              width: '100%',
              padding: '4px',
              fontSize: '11px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              boxSizing: 'border-box'
            }}
          >
            {STYLES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: '100px' }}>
          <label style={{ fontSize: '10px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>
            时长
          </label>
          <select
            className="nodrag"
            value={targetDuration}
            onChange={(e) => setTargetDuration(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '4px',
              fontSize: '11px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              boxSizing: 'border-box'
            }}
          >
            {DURATIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 优化方向 */}
      <div style={{ marginBottom: '10px' }}>
        <label style={{ fontSize: '10px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>
          优化方向
        </label>
        <select
          className="nodrag"
          value={optimizationDirection}
          onChange={(e) => setOptimizationDirection(e.target.value)}
          style={{
            width: '100%',
            padding: '4px',
            fontSize: '11px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            boxSizing: 'border-box'
          }}
        >
          {DIRECTIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      {/* 自定义风格描述（仅在选择自定义风格时显示） */}
      {style === 'custom' && (
        <div style={{ marginBottom: '10px' }}>
          <label style={{ fontSize: '10px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>
            自定义风格描述
          </label>
          <textarea
            className="nodrag"
            value={customStyleDescription}
            onChange={(e) => setCustomStyleDescription(e.target.value)}
            placeholder="描述你想要的视觉风格..."
            style={{
              width: '100%',
              minHeight: '40px',
              padding: '4px',
              fontSize: '11px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              boxSizing: 'border-box',
              resize: 'vertical'
            }}
          />
        </div>
      )}

      {/* 多行输入框 */}
      <div style={{ marginBottom: '10px' }}>
        <label style={{ fontSize: '10px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>
          旁白文本（每行一个句子，支持 @username 引用角色）
        </label>
        <textarea
          ref={textareaRef}
          className="nodrag"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="输入旁白，每行一个句子...&#10;示例：&#10;@装载机 在工地上干活&#10;@阳光小猫 在海边玩耍"
          style={{
            width: '100%',
            minHeight: '80px',
            padding: '6px',
            fontSize: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            boxSizing: 'border-box',
            resize: 'vertical',
            fontFamily: 'monospace'
          }}
        />
      </div>

      {/* 句子列表 */}
      {sentences.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
            解析结果 ({sentences.length} 个句子)
          </div>
          <div
            style={{
              maxHeight: '150px',
              overflowY: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              padding: '4px'
            }}
          >
            {sentences.map((sentence, index) => (
              <div
                key={sentence.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px',
                  borderBottom: index < sentences.length - 1 ? '1px solid #f3f4f6' : 'none',
                  fontSize: '10px'
                }}
              >
                <span
                  style={{
                    minWidth: '20px',
                    color: '#6b7280',
                    fontWeight: 'bold'
                  }}
                >
                  {index + 1}.
                </span>
                <span
                  style={{
                    flex: 1,
                    color: '#1f2937',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={sentence.text}
                >
                  {sentence.text}
                </span>
                <span
                  style={{
                    color: getStatusColor(sentence.status),
                    fontSize: '9px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {getStatusDisplay(sentence.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 输出端口 */}
      <Handle
        type="source"
        position={Position.Right}
        id="narrator-output"
        style={{
          background: '#3b82f6',
          width: 10,
          height: 10,
          top: '50%',
          right: '-5px'
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: '-70px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '10px',
          color: '#3b82f6',
          fontWeight: 'bold',
          whiteSpace: 'nowrap'
        }}
      >
        旁白输出
      </div>
    </div>
  );
}
