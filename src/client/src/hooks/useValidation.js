import { useState, useCallback } from 'react';

// API base URL
const API_BASE = 'http://localhost:9000';

/**
 * useValidation - 验证逻辑 Hook
 *
 * 功能：
 * - 执行指定的验证脚本（通过后端 API）
 * - 返回验证结果和错误列表
 * - 提供前端验证能力
 *
 * @returns {Object} { validationResults, isValidating, runValidation, runAllValidations, validateFrontend }
 * @returns {Array} validationResults - 验证结果数组
 * @returns {boolean} isValidating - 是否正在验证
 * @returns {Function} runValidation - 运行单个验证
 * @returns {Function} runAllValidations - 运行所有验证
 * @returns {Function} validateFrontend - 前端验证
 *
 * @example
 * const { validationResults, isValidating, runValidation } = useValidation();
 * await runValidation('registry');
 */
export const useValidation = () => {
  const [validationResults, setValidationResults] = useState([]);
  const [isValidating, setIsValidating] = useState(false);

  /**
   * 运行指定的验证脚本
   *
   * @param {string} validationType - 验证类型 (registry, nodes, docs, data-flow)
   * @returns {Promise<Object>} { success, data, error }
   */
  const runValidation = useCallback(async (validationType) => {
    setIsValidating(true);
    try {
      const response = await fetch(`${API_BASE}/api/validate/${validationType}`);
      const result = await response.json();

      if (result.success) {
        setValidationResults((prev) => [
          ...prev.filter((r) => r.type !== validationType),
          { type: validationType, ...result.data, timestamp: new Date().toISOString() },
        ]);
      }

      return result;
    } catch (error) {
      console.error(`[useValidation] ${validationType} 验证失败:`, error);
      return { success: false, error: error.message };
    } finally {
      setIsValidating(false);
    }
  }, []);

  /**
   * 运行所有验证
   *
   * @returns {Promise<Object[]>} 所有验证结果数组
   */
  const runAllValidations = useCallback(async () => {
    const types = ['registry', 'nodes', 'docs', 'data-flow'];
    const results = await Promise.all(
      types.map((type) => runValidation(type))
    );
    return results;
  }, [runValidation]);

  /**
   * 前端验证 - 验证节点数据结构
   *
   * @param {Object} node - React Flow 节点
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  const validateFrontend = useCallback((node) => {
    const errors = [];

    // 基本字段验证
    if (!node.id) {
      errors.push('节点缺少 id 字段');
    }
    if (!node.type) {
      errors.push('节点缺少 type 字段');
    }
    if (!node.data || typeof node.data !== 'object') {
      errors.push('节点缺少 data 字段或 data 不是对象');
    }

    // 位置验证
    if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
      errors.push('节点位置无效：缺少 x 或 y 坐标');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }, []);

  /**
   * 前端验证 - 验证连接数据结构
   *
   * @param {Object} edge - React Flow 连接
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  const validateEdge = useCallback((edge) => {
    const errors = [];

    if (!edge.id) {
      errors.push('连接缺少 id 字段');
    }
    if (!edge.source) {
      errors.push('连接缺少 source 字段');
    }
    if (!edge.target) {
      errors.push('连接缺少 target 字段');
    }
    if (!edge.sourceHandle) {
      errors.push('连接缺少 sourceHandle 字段');
    }
    if (!edge.targetHandle) {
      errors.push('连接缺少 targetHandle 字段');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }, []);

  /**
   * 前端验证 - 验证工作流
   *
   * @param {Array} nodes - 节点数组
   * @param {Array} edges - 连接数组
   * @returns {Object} { valid: boolean, nodeErrors: Object[], edgeErrors: Object[] }
   */
  const validateWorkflow = useCallback((nodes, edges) => {
    const nodeErrors = [];
    const edgeErrors = [];

    // 验证所有节点
    nodes.forEach((node) => {
      const validation = validateFrontend(node);
      if (!validation.valid) {
        nodeErrors.push({
          nodeId: node.id,
          type: node.type,
          errors: validation.errors,
        });
      }
    });

    // 验证所有连接
    edges.forEach((edge) => {
      const validation = validateEdge(edge);
      if (!validation.valid) {
        edgeErrors.push({
          edgeId: edge.id,
          source: edge.source,
          target: edge.target,
          errors: validation.errors,
        });
      }
    });

    return {
      valid: nodeErrors.length === 0 && edgeErrors.length === 0,
      nodeErrors,
      edgeErrors,
    };
  }, [validateFrontend, validateEdge]);

  /**
   * 清除验证结果
   */
  const clearResults = useCallback(() => {
    setValidationResults([]);
  }, []);

  return {
    validationResults,
    isValidating,
    runValidation,
    runAllValidations,
    validateFrontend,
    validateEdge,
    validateWorkflow,
    clearResults,
  };
};

export default useValidation;
