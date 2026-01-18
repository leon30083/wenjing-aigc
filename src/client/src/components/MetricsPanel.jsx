/**
 * MetricsPanel - 验证指标可视化面板
 *
 * 显示：
 * - 总运行次数、错误数、警告数
 * - 趋势分析（改善/恶化/稳定）
 * - 最近 7 天活动图表
 * - 按类型分组的统计
 * - 操作按钮（刷新、导出、清空）
 */

import { useState } from 'react';
import { useMetrics } from '../hooks/useMetrics';
import './MetricsPanel.css';

export const MetricsPanel = () => {
  const {
    metrics,
    trends,
    history,
    byType,
    byDate,
    loading,
    error,
    refreshMetrics,
    clearMetrics,
    getTotalRuns,
    getTotalErrors,
    getTotalWarnings,
    getTrendDescription,
    getTrendIcon,
    getRecentDaysStats,
    getTypeStatsForChart,
    exportMetrics,
    getPassRate,
  } = useMetrics();

  const [showDetails, setShowDetails] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);

  // 计算最大值（用于图表缩放）
  const recentDays = getRecentDaysStats(7);
  const maxActivity = Math.max(...recentDays.map((d) => d.total), 1);

  // 格式化日期
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 格式化时间
  const formatTime = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && !metrics) {
    return (
      <div className="metrics-panel metrics-loading">
        <div className="metrics-spinner"></div>
        <p>加载指标数据...</p>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="metrics-panel metrics-error">
        <div className="metrics-error-icon">⚠️</div>
        <p>加载失败: {error}</p>
        <button onClick={refreshMetrics} className="metrics-btn metrics-btn-primary">
          重试
        </button>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="metrics-panel metrics-empty">
        <div className="metrics-empty-icon">📊</div>
        <p>暂无指标数据</p>
        <p className="metrics-empty-hint">运行验证后将显示统计数据</p>
      </div>
    );
  }

  const typeStats = getTypeStatsForChart();

  return (
    <div className="metrics-panel">
      {/* 头部 */}
      <div className="metrics-header">
        <div className="metrics-title">
          <span className="metrics-title-icon">📊</span>
          <span className="metrics-title-text">验证指标</span>
        </div>
        <div className="metrics-actions">
          <button
            onClick={refreshMetrics}
            className="metrics-btn metrics-btn-secondary"
            disabled={loading}
            title="刷新数据"
          >
            {loading ? '⏳' : '🔄'}
          </button>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="metrics-btn metrics-btn-secondary"
            title={showDetails ? '收起详情' : '展开详情'}
          >
            {showDetails ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="metrics-overview">
        <div className="metrics-card metrics-card-primary">
          <div className="metrics-card-label">总运行</div>
          <div className="metrics-card-value">{getTotalRuns()}</div>
          <div className="metrics-card-unit">次</div>
        </div>

        <div className="metrics-card metrics-card-success">
          <div className="metrics-card-label">通过率</div>
          <div className="metrics-card-value">{getPassRate()}%</div>
          <div className="metrics-card-unit">
            {getTotalRuns() - getTotalErrors()}/{getTotalRuns()}
          </div>
        </div>

        <div className="metrics-card metrics-card-error">
          <div className="metrics-card-label">总错误</div>
          <div className="metrics-card-value">{getTotalErrors()}</div>
          <div className="metrics-card-unit">个</div>
        </div>

        <div className="metrics-card metrics-card-warning">
          <div className="metrics-card-label">总警告</div>
          <div className="metrics-card-value">{getTotalWarnings()}</div>
          <div className="metrics-card-unit">个</div>
        </div>
      </div>

      {/* 趋势分析 */}
      <div className="metrics-section">
        <div className="metrics-section-header">
          <span className="metrics-section-title">趋势分析</span>
          <span className={`metrics-trend-badge metrics-trend-${trends?.trend || 'unknown'}`}>
            {getTrendIcon()} {getTrendDescription()}
          </span>
        </div>
      </div>

      {/* 最近 7 天活动 */}
      <div className="metrics-section">
        <div className="metrics-section-header">
          <span className="metrics-section-title">最近 7 天活动</span>
        </div>
        <div className="metrics-chart">
          {recentDays.map((day, index) => {
            const height = (day.total / maxActivity) * 100;
            return (
              <div key={index} className="metrics-chart-bar-wrapper">
                <div className="metrics-chart-bar-container">
                  <div
                    className="metrics-chart-bar"
                    style={{ height: `${height}%` }}
                    title={`${day.date}: ${day.total} 次运行, ${day.errors} 错误, ${day.warnings} 警告`}
                  >
                    {day.total > 0 && (
                      <div className="metrics-chart-bar-value">{day.total}</div>
                    )}
                  </div>
                </div>
                <div className="metrics-chart-label">{formatDate(day.date)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 详情部分 */}
      {showDetails && (
        <div className="metrics-details">
          {/* 按类型分组 */}
          <div className="metrics-section">
            <div className="metrics-section-header">
              <span className="metrics-section-title">按类型统计</span>
            </div>
            <div className="metrics-table-container">
              <table className="metrics-table">
                <thead>
                  <tr>
                    <th>验证类型</th>
                    <th>运行次数</th>
                    <th>错误</th>
                    <th>警告</th>
                    <th>最后运行</th>
                  </tr>
                </thead>
                <tbody>
                  {typeStats.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="metrics-table-empty">
                        暂无数据
                      </td>
                    </tr>
                  ) : (
                    typeStats.map((stat) => (
                      <tr key={stat.type}>
                        <td className="metrics-table-type">{stat.type}</td>
                        <td className="metrics-table-number">{stat.total}</td>
                        <td className="metrics-table-number metrics-error">{stat.errors}</td>
                        <td className="metrics-table-number metrics-warning">{stat.warnings}</td>
                        <td className="metrics-table-time">{formatTime(stat.lastRun)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 最近历史 */}
          <div className="metrics-section">
            <div className="metrics-section-header">
              <span className="metrics-section-title">最近运行记录</span>
            </div>
            <div className="metrics-history-list">
              {history.length === 0 ? (
                <div className="metrics-history-empty">暂无历史记录</div>
              ) : (
                history.slice(0, 10).map((record, index) => (
                  <div key={index} className="metrics-history-item">
                    <div className="metrics-history-header">
                      <span className="metrics-history-type">{record.validationType}</span>
                      <span
                        className={`metrics-history-status metrics-history-${record.success ? 'success' : 'error'}`}
                      >
                        {record.success ? '✅ 通过' : '❌ 失败'}
                      </span>
                    </div>
                    <div className="metrics-history-details">
                      <span className="metrics-history-time">{formatTime(record.timestamp)}</span>
                      <span className="metrics-history-errors">
                        {record.errorCount} 错误, {record.warningCount} 警告
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 底部操作 */}
      <div className="metrics-footer">
        <button onClick={exportMetrics} className="metrics-btn metrics-btn-primary">
          📥 导出报告
        </button>
        <button
          onClick={() => {
            if (clearConfirm) {
              clearMetrics();
              setClearConfirm(false);
            } else {
              setClearConfirm(true);
            }
          }}
          className={`metrics-btn ${clearConfirm ? 'metrics-btn-danger' : 'metrics-btn-secondary'}`}
        >
          {clearConfirm ? '⚠️ 确认清空' : '🗑️ 清空数据'}
        </button>
        {clearConfirm && (
          <button
            onClick={() => setClearConfirm(false)}
            className="metrics-btn metrics-btn-secondary"
          >
            取消
          </button>
        )}
      </div>
    </div>
  );
};
