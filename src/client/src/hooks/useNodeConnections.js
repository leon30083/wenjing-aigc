import { useCallback } from 'react';
import { useReactFlow } from 'reactflow';

/**
 * 连接规则配置（从 App.jsx 迁移）
 *
 * 定义了每个输入端口允许连接的源节点类型
 */
export const CONNECTION_RULES = {
  'prompt-input': {
    allowedSourceTypes: ['textNode', 'promptOptimizerNode', 'narratorProcessorNode'],
    description: '文本提示词输入和优化',
  },
  'character-input': {
    allowedSourceTypes: ['characterLibraryNode'],
    description: '角色库数据传递',
  },
  'images-input': {
    allowedSourceTypes: ['referenceImageNode'],
    description: '参考图片传递',
  },
  'openai-config': {
    allowedSourceTypes: ['openaiConfigNode'],
    description: 'OpenAI 配置连接',
  },
  'api-config': {
    allowedSourceTypes: ['apiSettingsNode'],
    description: 'API 配置连接',
  },
  'narrator-input': {
    allowedSourceTypes: ['narratorNode'],
    description: '旁白输入连接',
  },
  'task-input': {
    allowedSourceTypes: [
      'videoGenerateNode',
      'storyboardNode',
      'characterCreateNode',
    ],
    description: '任务结果监听',
  },
};

/**
 * useNodeConnections - 节点连接验证 Hook
 *
 * 功能：
 * - 验证节点连接的合法性
 * - 返回允许的源节点类型
 * - 提供连接规则配置
 *
 * @returns {Object} { validateConnection, getAllRules, CONNECTION_RULES }
 * @returns {Function} validateConnection - 验证单个连接
 * @returns {Function} getAllRules - 获取所有连接规则
 * @returns {Object} CONNECTION_RULES - 连接规则配置
 *
 * @example
 * const { validateConnection } = useNodeConnections();
 * const validation = validateConnection('prompt-input', 'textNode');
 * if (validation.valid) {
 *   // 允许连接
 * } else {
 *   // 清除数据（validation.reason）
 * }
 */
export const useNodeConnections = () => {
  const { getNodes, getEdges } = useReactFlow();

  /**
   * 验证单个连接是否合法
   *
   * @param {string} targetHandle - 目标端口 ID（如 'prompt-input'）
   * @param {string} sourceNodeType - 源节点类型（如 'textNode'）
   * @returns {Object} { valid: boolean, reason?: string, allowedTypes?: string[] }
   */
  const validateConnection = useCallback((targetHandle, sourceNodeType) => {
    const rule = CONNECTION_RULES[targetHandle];

    if (!rule) {
      return {
        valid: false,
        reason: `未知的目标端口: ${targetHandle}`,
      };
    }

    if (!rule.allowedSourceTypes.includes(sourceNodeType)) {
      return {
        valid: false,
        reason: `端口 "${targetHandle}" 不允许连接 ${sourceNodeType} 类型节点`,
        allowedTypes: rule.allowedSourceTypes,
      };
    }

    return { valid: true };
  }, []);

  /**
   * 获取所有连接规则
   *
   * @returns {Object} CONNECTION_RULES
   */
  const getAllRules = useCallback(() => {
    return CONNECTION_RULES;
  }, []);

  /**
   * 获取指定端口允许的源节点类型
   *
   * @param {string} targetHandle - 目标端口 ID
   * @returns {string[] | null} 允许的源节点类型数组，如果端口不存在则返回 null
   */
  const getAllowedSourceTypes = useCallback((targetHandle) => {
    const rule = CONNECTION_RULES[targetHandle];
    return rule ? rule.allowedSourceTypes : null;
  }, []);

  /**
   * 检查连接是否合法（快捷方法）
   *
   * @param {string} targetHandle - 目标端口 ID
   * @param {string} sourceNodeType - 源节点类型
   * @returns {boolean} 是否合法
   */
  const isValidConnection = useCallback((targetHandle, sourceNodeType) => {
    return validateConnection(targetHandle, sourceNodeType).valid;
  }, [validateConnection]);

  return {
    validateConnection,
    getAllRules,
    getAllowedSourceTypes,
    isValidConnection,
    CONNECTION_RULES,
  };
};

export default useNodeConnections;
