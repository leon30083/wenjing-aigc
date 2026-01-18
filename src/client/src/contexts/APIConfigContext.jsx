import React, { createContext, useState, useCallback } from 'react';

/**
 * 获取平台支持的模型列表
 */
const PLATFORM_MODELS = {
  juxin: ['sora-2-all'],           // 聚鑫只支持 sora-2-all
  zhenzhen: ['sora-2', 'sora-2-pro'], // 贞贞支持 sora-2 和 sora-2-pro
};

/**
 * 获取平台的有效模型（自动修正不匹配的模型）
 *
 * @param {string} platform - 平台名称 ('juxin' | 'zhenzhen')
 * @param {string} currentModel - 当前模型名称
 * @returns {string} 有效的模型名称
 */
const getValidModelForPlatform = (platform, currentModel) => {
  const validModels = PLATFORM_MODELS[platform];

  if (!validModels) {
    console.warn(`[APIConfigContext] 未知平台: ${platform}，使用默认模型`);
    return 'sora-2-all';
  }

  // 如果当前模型有效，直接返回
  if (validModels.includes(currentModel)) {
    return currentModel;
  }

  // ⭐ 模型不匹配，返回该平台的默认模型
  const defaultModel = validModels[0];
  console.warn(`[APIConfigContext] 模型 ${currentModel} 不支持平台 ${platform}，切换到 ${defaultModel}`);
  return defaultModel;
};

/**
 * APIConfigContext - API 配置全局状态管理
 *
 * 功能：
 * - 提供全局 API 配置状态 (platform, model, aspect, watermark)
 * - 自动同步配置到 localStorage
 * - 提供 updateConfig 函数修改配置
 * - 通知下游节点配置变化
 *
 * 解决问题：错误56 - useState 异步闭包问题导致配置丢失
 */

export const APIConfigContext = createContext({
  config: {
    platform: 'juxin',
    model: 'sora-2-all',
    aspect: '16:9',
    watermark: false,
  },
  updateConfig: () => {},
});

/**
 * APIConfigProvider - API 配置提供者
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - 子组件
 */
export const APIConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(() => {
    // 从 localStorage 初始化 (支持工作流恢复)
    const saved = localStorage.getItem('winjin-api-config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log('[APIConfigContext] 从 localStorage 恢复配置:', parsed);

        // ⭐ 智能模型修正：确保模型与平台匹配
        const validModel = getValidModelForPlatform(parsed.platform, parsed.model);
        if (validModel !== parsed.model) {
          console.log('[APIConfigContext] 自动修正模型:', {
            platform: parsed.platform,
            oldModel: parsed.model,
            newModel: validModel,
          });
          parsed.model = validModel;
        }

        return parsed;
      } catch (error) {
        console.error('[APIConfigContext] 读取 localStorage 失败:', error);
      }
    }
    // 默认配置
    return {
      platform: 'juxin',
      model: 'sora-2-all',
      aspect: '16:9',
      watermark: false,
    };
  });

  /**
   * 更新 API 配置
   * 自动持久化到 localStorage
   * 智能切换模型（确保模型与平台匹配）
   *
   * @param {Object} updates - 要更新的配置字段
   */
  const updateConfig = useCallback((updates) => {
    setConfig((prev) => {
      let newConfig = { ...prev, ...updates };

      // ⭐ 智能模型切换：如果切换了平台，自动切换到有效的模型
      if (updates.platform && updates.platform !== prev.platform) {
        const validModel = getValidModelForPlatform(updates.platform, newConfig.model);
        if (validModel !== newConfig.model) {
          console.log('[APIConfigContext] 切换平台，自动调整模型:', {
            oldPlatform: prev.platform,
            newPlatform: updates.platform,
            oldModel: newConfig.model,
            newModel: validModel,
          });
          newConfig.model = validModel;
        }
      }

      // ⭐ 再次验证：如果用户手动修改了模型，确保它匹配当前平台
      if (updates.model && !PLATFORM_MODELS[newConfig.platform].includes(updates.model)) {
        const validModel = getValidModelForPlatform(newConfig.platform, updates.model);
        console.log('[APIConfigContext] 模型不匹配当前平台，自动修正:', {
          platform: newConfig.platform,
          requestedModel: updates.model,
          correctedModel: validModel,
        });
        newConfig.model = validModel;
      }

      // 自动持久化到 localStorage
      localStorage.setItem('winjin-api-config', JSON.stringify(newConfig));
      console.log('[APIConfigContext] 配置已更新并保存:', newConfig);
      return newConfig;
    });
  }, []);

  return (
    <APIConfigContext.Provider value={{ config, updateConfig }}>
      {children}
    </APIConfigContext.Provider>
  );
};

/**
 * useAPIConfig - 获取 API 配置的 Hook
 *
 * @returns {Object} { config, updateConfig }
 * @returns {Object} config - 当前 API 配置
 * @returns {Function} config.updateConfig - 更新配置的函数
 *
 * @throws {Error} 如果在 APIConfigProvider 外部使用
 *
 * @example
 * const { config, updateConfig } = useAPIConfig();
 * console.log(config.platform); // 'juxin'
 * updateConfig({ platform: 'zhenzhen' });
 */
export const useAPIConfig = () => {
  const context = React.useContext(APIConfigContext);
  if (!context) {
    throw new Error('useAPIConfig must be used within APIConfigProvider');
  }
  return context;
};

// 兼容非 JSX 环境（如测试）
export default APIConfigContext;
