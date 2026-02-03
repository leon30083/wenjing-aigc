/**
 * VideoModelConfigPanel - 视频模型配置面板
 *
 * 功能：
 * - 从 APISettingsNode 提取配置逻辑
 * - 平台选择、模型选择、画面比例、水印
 * - 管理面板：添加/编辑平台和模型
 */

import { useState } from 'react';
import { useAPIConfig } from '../contexts/APIConfigContext';
import PlatformManagePanel from './PlatformManagePanel';

const API_BASE = 'http://localhost:9000';

const VideoModelConfigPanel = ({ onClose }) => {
  const {
    config,
    platforms,
    updateConfig
  } = useAPIConfig();

  const [showManagePanel, setShowManagePanel] = useState(false);

  const getCurrentPlatform = () => {
    return platforms.find(p => p.key === config.platform);
  };

  const currentPlatform = getCurrentPlatform();
  const currentModels = currentPlatform?.models || [];

  return (
    <div className="config-section">
      {/* 快速配置 */}
      <div className="config-group">
        <h3>快速配置</h3>

        <div className="config-item">
          <label>平台</label>
          <select
            value={config.platform}
            onChange={(e) => {
              const newPlatform = e.target.value;
              // 智能模型切换
              const newModel = newPlatform === 'juxin' ? 'sora-2-all' : 'sora-2';
              updateConfig({ platform: newPlatform, model: newModel });
            }}
            className="nodrag"
          >
            {platforms.map(p => (
              <option key={p.key} value={p.key}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="config-item">
          <label>模型</label>
          <select
            value={config.model}
            onChange={(e) => updateConfig({ model: e.target.value })}
            className="nodrag"
          >
            {currentModels.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div className="config-item">
          <label>画面比例</label>
          <select
            value={config.aspect}
            onChange={(e) => updateConfig({ aspect: e.target.value })}
            className="nodrag"
          >
            <option value="16:9">16:9 (横屏)</option>
            <option value="9:16">9:16 (竖屏)</option>
          </select>
        </div>

        <div className="config-item">
          <label>
            <input
              type="checkbox"
              checked={config.watermark}
              onChange={(e) => updateConfig({ watermark: e.target.checked })}
              className="nodrag"
            />
            启用水印
          </label>
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
          platformType="video"
          onClose={() => setShowManagePanel(false)}
        />
      )}
    </div>
  );
};

export default VideoModelConfigPanel;
