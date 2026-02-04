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

  // ⭐ Fix Problem 1: 过滤视频平台，防止文本平台（如 juxin2）出现在快速配置中
  const videoPlatforms = platforms.filter(p => p.type === 'video');

  const getCurrentPlatform = () => {
    return videoPlatforms.find(p => p.key === config.platform);
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
            {videoPlatforms.map(p => (
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
      </div>

      {/* 提示信息 */}
      <div className="config-group" style={{ marginTop: '12px', padding: '8px', backgroundColor: '#f0f9ff', borderRadius: '4px', fontSize: '12px', color: '#0369a1' }}>
        💡 提示：画面比例和水印在视频生成节点中配置
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
