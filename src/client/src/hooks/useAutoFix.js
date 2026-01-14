import { useState, useCallback } from 'react';

// API base URL
const API_BASE = 'http://localhost:9000';

/**
 * 修复策略配置
 */
export const FIX_STRATEGIES = {
  orphaned_node: {
    name: '孤立节点引用修复',
    description: '移除不存在节点的引用',
    confidence: 95,
    risk: 'low',
  },
  missing_dependency: {
    name: 'useEffect 依赖缺失修复',
    description: '添加缺失的 useEffect 依赖',
    confidence: 80,
    risk: 'medium',
  },
  source_not_writing: {
    name: '源节点未写入修复',
    description: '修复源节点未写入数据的问题',
    confidence: 60,
    risk: 'high',
  },
  data_flow_break: {
    name: '数据流断裂修复',
    description: '修复节点间数据流断裂',
    confidence: 50,
    risk: 'high',
  },
};

/**
 * useAutoFix - 自动修复 Hook
 *
 * 功能：
 * - 扫描可修复的问题
 * - 应用修复策略
 * - 处理回滚
 *
 * @returns {Object} { fixableIssues, isFixing, scanFixableIssues, applyFix, getStrategies }
 * @returns {Array} fixableIssues - 可修复的问题列表
 * @returns {boolean} isFixing - 是否正在修复
 * @returns {Function} scanFixableIssues - 扫描可修复问题
 * @returns {Function} applyFix - 应用修复
 * @returns {Function} getStrategies - 获取修复策略
 *
 * @example
 * const { fixableIssues, scanFixableIssues, applyFix } = useAutoFix();
 * await scanFixableIssues();
 * await applyFix(issueId);
 */
export const useAutoFix = () => {
  const [fixableIssues, setFixableIssues] = useState([]);
  const [isFixing, setIsFixing] = useState(false);

  /**
   * 扫描可修复的问题
   *
   * @returns {Promise<Object>} { success, data, error }
   */
  const scanFixableIssues = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/fix/scan`);
      const result = await response.json();

      if (result.success && result.data) {
        setFixableIssues(result.data);
      }

      return result;
    } catch (error) {
      console.error('[useAutoFix] 扫描失败:', error);
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * 应用修复
   *
   * @param {string} issueId - 问题 ID
   * @param {Object} options - 修复选项
   * @param {boolean} options.backup - 是否备份（默认 true）
   * @param {boolean} options.dryRun - 是否干运行（默认 false）
   * @returns {Promise<Object>} { success, data, error }
   */
  const applyFix = useCallback(async (issueId, options = {}) => {
    const { backup = true, dryRun = false } = options;
    setIsFixing(true);

    try {
      const endpoint = dryRun ? '/api/fix/dry-run' : '/api/fix/apply';

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueId,
          backup,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 修复成功后重新扫描
        await scanFixableIssues();
      }

      return result;
    } catch (error) {
      console.error('[useAutoFix] 修复失败:', error);
      return { success: false, error: error.message };
    } finally {
      setIsFixing(false);
    }
  }, [scanFixableIssues]);

  /**
   * 批量应用修复
   *
   * @param {string[]} issueIds - 问题 ID 数组
   * @param {Object} options - 修复选项
   * @returns {Promise<Object[]>} 所有修复结果
   */
  const applyBatchFix = useCallback(async (issueIds, options = {}) => {
    const results = await Promise.all(
      issueIds.map((issueId) => applyFix(issueId, options))
    );
    return results;
  }, [applyFix]);

  /**
   * 获取所有修复策略
   *
   * @returns {Object} FIX_STRATEGIES
   */
  const getStrategies = useCallback(() => {
    return FIX_STRATEGIES;
  }, []);

  /**
   * 获取指定策略信息
   *
   * @param {string} strategyType - 策略类型
   * @returns {Object|null} 策略信息
   */
  const getStrategy = useCallback((strategyType) => {
    return FIX_STRATEGIES[strategyType] || null;
  }, []);

  /**
   * 清除可修复问题列表
   */
  const clearIssues = useCallback(() => {
    setFixableIssues([]);
  }, []);

  /**
   * 前端修复 - 修复工作流中的孤立节点引用
   *
   * @param {Array} edges - 连接数组
   * @param {Array} nodeIds - 现有节点 ID 数组
   * @returns {Array} 清理后的连接数组
   */
  const fixOrphanedNodes = useCallback((edges, nodeIds) => {
    const nodeIdSet = new Set(nodeIds);

    return edges.filter((edge) => {
      const sourceExists = nodeIdSet.has(edge.source);
      const targetExists = nodeIdSet.has(edge.target);

      return sourceExists && targetExists;
    });
  }, []);

  return {
    fixableIssues,
    isFixing,
    scanFixableIssues,
    applyFix,
    applyBatchFix,
    getStrategies,
    getStrategy,
    clearIssues,
    fixOrphanedNodes,
    FIX_STRATEGIES,
  };
};

export default useAutoFix;
