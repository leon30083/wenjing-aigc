/**
 * ConcurrencyConfigPanel - 并发限制配置面板
 *
 * 功能：
 * - 配置各平台的并发任务限制
 * - 实时生效
 */

import { useAPIConfig } from '../contexts/APIConfigContext';

const ConcurrencyConfigPanel = ({ onClose }) => {
  const { concurrencyLimits, updateConcurrencyLimits } = useAPIConfig();

  return (
    <div className="config-section">
      <h3>并发任务限制</h3>
      <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
        控制每个平台同时运行的最大任务数，避免超出 API 限制。
      </p>

      {Object.entries(concurrencyLimits || {}).map(([platform, limit]) => (
        <div key={platform} className="config-item">
          <label>
            {platform === 'juxin' ? '🔵 聚鑫平台' : '🟣 贞贞平台'}
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={limit}
            onChange={(e) => {
              const value = Math.max(1, Math.min(10, parseInt(e.target.value) || 1));
              updateConcurrencyLimits(platform, value);
            }}
            className="nodrag"
          />
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>
            个任务同时运行
          </span>
        </div>
      ))}
    </div>
  );
};

export default ConcurrencyConfigPanel;
