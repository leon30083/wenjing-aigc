import React, { createContext, useState, useCallback, useEffect } from 'react';

/**
 * API_BASE - API 基础 URL
 */
const API_BASE = 'http://localhost:9000';

/**
 * ConcurrencyContext - 并发状态管理 Context
 *
 * 功能：
 * - 获取当前并发限制配置
 * - 获取各平台的处理中/队列任务数
 * - 轮询更新并发状态
 */
export const ConcurrencyContext = createContext({
  status: null,
  loading: true,
  refreshStatus: () => {},
  updateLimits: () => {},
});

/**
 * ConcurrencyProvider - 并发状态提供者
 */
export const ConcurrencyProvider = ({ children }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * 获取并发状态
   */
  const refreshStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/concurrency/status`);
      const result = await response.json();

      if (result.success) {
        setStatus(result.data);
      }
    } catch (error) {
      console.error('[ConcurrencyContext] 获取并发状态失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 更新并发限制
   */
  const updateLimits = useCallback(async (limits) => {
    try {
      const response = await fetch(`${API_BASE}/api/concurrency/limits`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limits }),
      });

      const result = await response.json();

      if (result.success) {
        // 更新后重新获取状态
        await refreshStatus();
        return { success: true };
      }
      return result;
    } catch (error) {
      console.error('[ConcurrencyContext] 更新并发限制失败:', error);
      return { success: false, error: error.message };
    }
  }, [refreshStatus]);

  /**
   * 组件挂载时获取状态
   */
  useEffect(() => {
    refreshStatus();

    // 每 30 秒刷新一次状态
    const interval = setInterval(refreshStatus, 30000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  return (
    <ConcurrencyContext.Provider value={{ status, loading, refreshStatus, updateLimits }}>
      {children}
    </ConcurrencyContext.Provider>
  );
};

/**
 * useConcurrency - 获取并发状态的 Hook
 */
export const useConcurrency = () => {
  const context = React.useContext(ConcurrencyContext);
  if (!context) {
    throw new Error('useConcurrency must be used within ConcurrencyProvider');
  }
  return context;
};

// 兼容非 JSX 环境
export default ConcurrencyContext;
