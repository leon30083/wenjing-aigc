/**
 * 提示词优化节点
 * 使用 OpenAI API (DeepSeek) 将简单描述优化成详细的 Sora 2 提示词
 */

import React, { useState, useEffect } from 'react';
import { Handle, Position, useNodeId } from 'reactflow';

function PromptOptimizerNode({ data }) {
  const nodeId = useNodeId();

  // 从连接的节点获取 OpenAI 配置
  const [openaiConfig, setOpenaiConfig] = useState(data.openaiConfig || null);

  // 状态管理
  const [simplePrompt, setSimplePrompt] = useState(data.simplePrompt || '');
  const [optimizedPrompt, setOptimizedPrompt] = useState(data.optimizedPrompt || '');
  const [style, setStyle] = useState(data.style || 'picture-book');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [lastOptimization, setLastOptimization] = useState(null);

  // 从 data 接收 OpenAI 配置
  useEffect(() => {
    if (data.openaiConfig) {
      setOpenaiConfig(data.openaiConfig);
    }
  }, [data.openaiConfig]);

  // 同步状态到 node.data
  useEffect(() => {
    if (simplePrompt !== data.simplePrompt) {
      // 需要通过 App.jsx 的 setNodes 更新,这里暂不实现
      data.simplePrompt = simplePrompt;
    }
  }, [simplePrompt, data.simplePrompt]);

  // 优化提示词
  const optimizePrompt = async () => {
    if (!simplePrompt.trim()) {
      alert('⚠️ 请输入要优化的简单描述');
      return;
    }

    if (!openaiConfig) {
      alert('⚠️ 请先连接 OpenAI 配置节点');
      return;
    }

    const { base_url, api_key, model } = openaiConfig;

    if (!base_url || !api_key || !model) {
      alert('⚠️ OpenAI 配置不完整，请检查配置节点');
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
          context: {
            target_duration: 10,
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
        alert(`✅ 优化成功\n\n模型: ${result.data.meta.model_used}\nToken: ${result.data.meta.tokens_used}`);
      } else {
        alert(`❌ 优化失败\n\n${result.error}`);
      }
    } catch (error) {
      alert(`❌ 网络错误: ${error.message}`);
    } finally {
      setIsOptimizing(false);
    }
  };

  // 复制优化结果
  const copyToClipboard = () => {
    navigator.clipboard.writeText(optimizedPrompt);
    alert('✅ 已复制到剪贴板');
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

      {/* 简单描述输入 */}
      <div className="nodrag">
        <label style={{ fontSize: '10px', color: '#6b21a8', fontWeight: 'bold' }}>
          简单描述
        </label>
        <textarea
          className="nodrag"
          name="simplePrompt"
          value={simplePrompt}
          onChange={(e) => setSimplePrompt(e.target.value)}
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
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '6px 8px',
              borderRadius: '4px',
              border: '1px solid #c4b5fd',
              fontSize: '9px',
              resize: 'vertical',
              backgroundColor: '#f3e8ff',
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
