/**
 * GlobalConfigPanel - 全局配置滑出面板
 *
 * 功能：
 * - 工具栏按钮触发滑出
 * - 三个分类标签：视频模型、文本模型、并发限制
 * - 复用 APIConfigContext 的状态管理
 */

import { useState } from 'react';
import { useAPIConfig } from '../contexts/APIConfigContext';
import VideoModelConfigPanel from './VideoModelConfigPanel';
import TextModelConfigPanel from './TextModelConfigPanel';
import ConcurrencyConfigPanel from './ConcurrencyConfigPanel';
import './GlobalConfigPanel.css';

const GlobalConfigPanel = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('video');

  if (!isOpen) return null;

  return (
    <div className="global-config-panel open">
      {/* 面板头部 */}
      <div className="config-panel-header">
        <h2>⚙️ 全局配置</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      {/* 分类标签 */}
      <div className="config-tabs">
        <button
          className={`config-tab ${activeTab === 'video' ? 'active' : ''}`}
          onClick={() => setActiveTab('video')}
        >
          📹 视频模型
        </button>
        <button
          className={`config-tab ${activeTab === 'text' ? 'active' : ''}`}
          onClick={() => setActiveTab('text')}
        >
          📝 文本模型
        </button>
        <button
          className={`config-tab ${activeTab === 'concurrency' ? 'active' : ''}`}
          onClick={() => setActiveTab('concurrency')}
        >
          ⚡ 并发限制
        </button>
      </div>

      {/* 面板内容 */}
      <div className="config-panel-content">
        {activeTab === 'video' && (
          <VideoModelConfigPanel onClose={onClose} />
        )}
        {activeTab === 'text' && (
          <TextModelConfigPanel onClose={onClose} />
        )}
        {activeTab === 'concurrency' && (
          <ConcurrencyConfigPanel onClose={onClose} />
        )}
      </div>
    </div>
  );
};

export default GlobalConfigPanel;
