/**
 * TextModelConfigPanel - 文本模型配置面板
 *
 * 功能：
 * - 延用视频模型的配置逻辑（与 VideoModelConfigPanel 相同结构）
 * - 平台选择、模型选择、API Key
 * - 管理面板：添加/编辑平台和模型
 */

import { useState } from 'react';
import { useAPIConfig } from '../contexts/APIConfigContext';
import PlatformManagePanel from './PlatformManagePanel';

const API_BASE = 'http://localhost:9000';

const TextModelConfigPanel = ({ onClose }) => {
  const {
    textModels,
    textConfig,
    updateTextConfig
  } = useAPIConfig();

  const [showManagePanel, setShowManagePanel] = useState(false);

  const getCurrentTextPlatform = () => {
    return textModels.find(p => p.key === textConfig.platform);
  };

  const currentTextPlatform = getCurrentTextPlatform();
  const currentTextModels = currentTextPlatform?.models || [];

  return (
    <div className="config-section">
      {/* 快速配置 */}
      <div className="config-group">
        <h3>快速配置</h3>

        <div className="config-item">
          <label>平台</label>
          <select
            value={textConfig.platform}
            onChange={(e) => {
              const newPlatform = e.target.value;
              // 智能模型切换
              const newModel = newPlatform === 'deepseek' ? 'deepseek-chat' : 'gemini-2.5-flash';
              updateTextConfig({ platform: newPlatform, model: newModel });
            }}
            className="nodrag"
          >
            {textModels.map(p => (
              <option key={p.key} value={p.key}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="config-item">
          <label>模型</label>
          <select
            value={textConfig.model}
            onChange={(e) => updateTextConfig({ model: e.target.value })}
            className="nodrag"
          >
            {currentTextModels.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 管理按钮 */}
      <div className="config-group">
        <button
          className="manage-btn nodrag"
          onClick={() => setShowManagePanel(true)}
        >
          📋 管理平台和模型
        </button>
      </div>

      {/* 管理面板 */}
      {showManagePanel && (
        <PlatformManagePanel
          platformType="text"
          onClose={() => setShowManagePanel(false)}
        />
      )}
    </div>
  );
};

export default TextModelConfigPanel;
