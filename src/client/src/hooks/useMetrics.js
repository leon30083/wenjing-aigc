/**
 * useMetrics Hook - 验证指标查询 Hook
 *
 * 提供便捷的指标查询函数：
 * - 获取当前指标
 * - 获取趋势数据
 * - 获取历史记录
 * - 计算改善/恶化比例
 * - 格式化显示数据
 */

import { useContext } from 'react';
import { MetricsContext } from '../contexts/MetricsContext';

export const useMetrics = () => {
  const context = useContext(MetricsContext);
  if (!context) {
    throw new Error('useMetrics must be used within MetricsProvider');
  }

  const { metrics, trends, history, byType, byDate, loading, error, refreshMetrics, clearMetrics } = context;

  /**
   * 获取总运行次数
   */
  const getTotalRuns = () => {
    return metrics?.totalRuns || 0;
  };

  /**
   * 获取总错误数
   */
  const getTotalErrors = () => {
    if (!metrics) return 0;
    let total = 0;
    Object.values(byType).forEach((type) => {
      total += type.errors || 0;
    });
    return total;
  };

  /**
   * 获取总警告数
   */
  const getTotalWarnings = () => {
    if (!metrics) return 0;
    let total = 0;
    Object.values(byType).forEach((type) => {
      total += type.warnings || 0;
    });
    return total;
  };

  /**
   * 获取趋势描述
   */
  const getTrendDescription = () => {
    if (!trends) return '暂无数据';

    const { trend, improving, worsening, stable } = trends;

    if (trend === 'improving') {
      return `改善中 📈 (改善: ${improving} 次, 恶化: ${worsening} 次, 稳定: ${stable} 次)`;
    } else if (trend === 'worsening') {
      return `恶化中 📉 (改善: ${improving} 次, 恶化: ${worsening} 次, 稳定: ${stable} 次)`;
    } else {
      return `保持稳定 ➖️ (改善: ${improving} 次, 恶化: ${worsening} 次, 稳定: ${stable} 次)`;
    }
  };

  /**
   * 获取趋势图标
   */
  const getTrendIcon = () => {
    if (!trends) return '❓';
    const { trend } = trends;

    if (trend === 'improving') return '📈';
    if (trend === 'worsening') return '📉';
    return '➖️';
  };

  /**
   * 获取最近 N 天的统计数据
   */
  const getRecentDaysStats = (days = 7) => {
    const today = new Date();
    const recentDays = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayData = byDate[dateStr] || { total: 0, errors: 0, warnings: 0 };
      recentDays.push({
        date: dateStr,
        ...dayData,
      });
    }

    return recentDays;
  };

  /**
   * 获取按类型分组的统计（用于图表）
   */
  const getTypeStatsForChart = () => {
    return Object.entries(byType).map(([type, data]) => ({
      type,
      total: data.total || 0,
      errors: data.errors || 0,
      warnings: data.warnings || 0,
      lastRun: data.lastRun,
    }));
  };

  /**
   * 导出指标数据为 JSON
   */
  const exportMetrics = () => {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      metrics,
      trends,
      history: history.slice(0, 50), // 最多导出50条历史记录
      byType,
      byDate,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `metrics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * 计算通过率（错误数/总验证次数）
   */
  const getPassRate = () => {
    if (!metrics || metrics.totalRuns === 0) return 100;
    const totalErrors = getTotalErrors();
    return Math.round(((metrics.totalRuns - totalErrors) / metrics.totalRuns) * 100);
  };

  return {
    // 原始数据
    metrics,
    trends,
    history,
    byType,
    byDate,
    loading,
    error,

    // 操作函数
    refreshMetrics,
    clearMetrics,

    // 便捷查询函数
    getTotalRuns,
    getTotalErrors,
    getTotalWarnings,
    getTrendDescription,
    getTrendIcon,
    getRecentDaysStats,
    getTypeStatsForChart,
    exportMetrics,
    getPassRate,
  };
};
