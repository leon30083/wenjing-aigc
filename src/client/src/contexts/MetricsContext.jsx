/**
 * MetricsContext - 验证指标全局状态管理
 *
 * 提供验证指标的全局访问，包括：
 * - 指标数据（总运行次数、错误数、警告数）
 * - 趋势分析（改善/恶化/稳定）
 * - 历史记录查询
 * - 按类型/日期分组的统计
 */

import { createContext, useState, useCallback, useEffect } from 'react';

const API_BASE = 'http://localhost:9000';

export const MetricsContext = createContext({
  metrics: null,
  trends: null,
  history: [],
  byType: {},
  byDate: {},
  loading: false,
  error: null,
  refreshMetrics: () => {},
  clearMetrics: () => {},
});

export const MetricsProvider = ({ children }) => {
  const [metrics, setMetrics] = useState(null);
  const [trends, setTrends] = useState(null);
  const [history, setHistory] = useState([]);
  const [byType, setByType] = useState({});
  const [byDate, setByDate] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * 获取所有指标数据
   */
  const refreshMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 并行请求所有数据
      const [metricsRes, trendsRes, historyRes, byTypeRes, byDateRes] = await Promise.all([
        fetch(`${API_BASE}/api/metrics`),
        fetch(`${API_BASE}/api/metrics/trends`),
        fetch(`${API_BASE}/api/metrics/history?limit=20`),
        fetch(`${API_BASE}/api/metrics/by-type`),
        fetch(`${API_BASE}/api/metrics/by-date`),
      ]);

      const metricsData = await metricsRes.json();
      const trendsData = await trendsRes.json();
      const historyData = await historyRes.json();
      const byTypeData = await byTypeRes.json();
      const byDateData = await byDateRes.json();

      if (metricsData.success) {
        setMetrics(metricsData.data);
      }

      if (trendsData.success) {
        setTrends(trendsData.data);
      }

      if (historyData.success) {
        setHistory(historyData.data);
      }

      if (byTypeData.success) {
        setByType(byTypeData.data);
      }

      if (byDateData.success) {
        setByDate(byDateData.data);
      }
    } catch (err) {
      console.error('[MetricsContext] 获取指标失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 清空所有指标数据
   */
  const clearMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/metrics/clear`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        // 重置所有状态
        setMetrics(null);
        setTrends(null);
        setHistory([]);
        setByType({});
        setByDate({});
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('[MetricsContext] 清空指标失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 组件挂载时自动加载指标
  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  const value = {
    metrics,
    trends,
    history,
    byType,
    byDate,
    loading,
    error,
    refreshMetrics,
    clearMetrics,
  };

  return (
    <MetricsContext.Provider value={value}>
      {children}
    </MetricsContext.Provider>
  );
};
