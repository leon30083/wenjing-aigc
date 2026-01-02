import { useState, useEffect } from 'react';

/**
 * API 配置合并 Hook
 * 合并外部 API 配置（来自 APISettingsNode）和默认配置
 *
 * @param {Object} data - React Flow 节点的 data 对象
 * @param {Object} defaultConfig - 默认配置对象
 * @returns {Object} { apiConfig, setApiConfig, apiConfigSourceLabel }
 */
export function useApiConfig(data, defaultConfig) {
  // ⭐ 接收外部 API 配置（来自 APISettingsNode）
  const externalApiConfig = data.apiConfig || null;
  const apiConfigSourceLabel = data.apiConfigSourceLabel || null;

  // ⭐ 内部 API 配置状态（用于节点内部配置区）
  const [internalApiConfig, setInternalApiConfig] = useState(() => {
    // 优先使用外部配置，否则使用默认配置
    return externalApiConfig || defaultConfig;
  });

  // ⭐ 当外部配置变化时，同步更新内部配置
  useEffect(() => {
    if (externalApiConfig) {
      setInternalApiConfig(externalApiConfig);
    }
  }, [externalApiConfig]);

  // ⭐ 最终使用的配置
  const apiConfig = internalApiConfig;

  return {
    apiConfig,
    setApiConfig: setInternalApiConfig,
    apiConfigSourceLabel,
    hasExternalConfig: !!externalApiConfig,
  };
}

/**
 * 创建平台特定的默认配置
 *
 * @param {string} platform - 平台名称 ('juxin' | 'zhenzhen')
 * @returns {Object} 默认配置对象
 */
export function createDefaultConfig(platform) {
  const platformDefaults = {
    juxin: {
      platform: 'juxin',
      model: 'sora-2-all',  // 聚鑫平台使用 sora-2-all
      aspect: '16:9',
      watermark: false,
    },
    zhenzhen: {
      platform: 'zhenzhen',
      model: 'sora-2',  // 贞贞平台默认使用 sora-2
      aspect: '16:9',
      watermark: false,
    },
  };

  return platformDefaults[platform] || platformDefaults.juxin;
}
