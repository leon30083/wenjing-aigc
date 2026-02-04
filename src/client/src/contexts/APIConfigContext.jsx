import React, { createContext, useState, useCallback, useEffect, useMemo } from 'react';

/**
 * API_BASE - API 基础 URL
 */
const API_BASE = 'http://localhost:9000';

/**
 * Cherry Studio style configuration structure
 *
 * 支持的功能：
 * - 用户自定义平台和模型
 * - 配置存储在 config.json（通过 API 管理）
 * - 提供默认配置模板（聚鑫/贞贞）
 * - 支持 VEO 模型和 Gemini 文本模型
 */

export const APIConfigContext = createContext({
  config: {
    platform: 'juxin',
    model: 'sora-2-all',
    aspect: '16:9',
    watermark: false,
  },
  // Text model configuration
  textConfig: {
    platform: 'deepseek',
    model: 'deepseek-chat',
    apiKey: '',
    baseURL: '',  // ⭐ 新增：支持自定义 API 端点
    style: 'picture-book',
  },
  // Concurrency limits
  concurrencyLimits: {
    juxin: 3,
    zhenzhen: 3,
  },
  platforms: [],
  textModels: [],
  updateConfig: () => {},
  updateTextConfig: () => {},
  updateConcurrencyLimits: () => {},
  addPlatform: () => {},
  updatePlatform: () => {},
  deletePlatform: () => {},
  addModel: () => {},
  loadConfig: () => {},
  reloadConfig: () => {},
  isLoading: true,
});

/**
 * APIConfigProvider - Cherry Studio style 配置提供者
 *
 * 功能：
 * - 从 API 加载完整配置（平台、模型、文本模型）
 * - 自动同步配置到 localStorage（向后兼容）
 * - 提供动态配置管理功能（添加/删除平台和模型）
 * - 支持用户自定义平台
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - 子组件
 */
export const APIConfigProvider = ({ children }) => {
  // ⭐ 统一配置读取优先级：Context > localStorage > 默认值
  const [config, setConfig] = useState(() => {
    // 1. 尝试从 localStorage 读取（向后兼容）
    try {
      const local = localStorage.getItem('winjin-api-config');
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed.platform) {
          console.log('[APIConfigContext] 从 localStorage 初始化 config:', parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[APIConfigContext] 读取 localStorage 失败:', e);
    }

    // 2. 默认值
    return {
      platform: 'juxin',
      model: 'sora-2-all',
      aspect: '16:9',
      watermark: false,
    };
  });

  const [platforms, setPlatforms] = useState([]);
  const [textModels, setTextModels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 更新服务器端用户默认配置（防抖版本）
   * ⭐ 服务器同步失败不阻塞前端操作，避免频繁请求
   * ⭐ 移到这里避免 TDZ 错误 - updateConfig 需要在其之前定义
   */
  const updateUserDefaultsDebounced = useMemo(() => {
    let timeoutId;
    let pendingDefaults = {};

    return async (defaults) => {
      // 合并待更新的配置
      pendingDefaults = { ...pendingDefaults, ...defaults };

      // 清除之前的定时器
      clearTimeout(timeoutId);

      // 设置新的防抖定时器（1秒后执行）
      timeoutId = setTimeout(async () => {
        try {
          const response = await fetch(`${API_BASE}/api/config/defaults`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ defaults: pendingDefaults }),
          });
          const result = await response.json();
          if (!result.success) {
            console.warn('[APIConfigContext] 更新服务器配置失败:', result.error);
          } else {
            console.log('[APIConfigContext] ✅ 服务器配置已同步');
          }
          // 清空待更新配置
          pendingDefaults = {};
        } catch (error) {
          console.error('[APIConfigContext] 更新服务器配置失败:', error);
        }
      }, 1000);
    };
  }, []); // ✅ 无依赖，避免重新创建

  // Text model configuration state
  const [textConfig, setTextConfig] = useState(() => {
    // ⭐ 从 localStorage 初始化（向后兼容）
    try {
      const local = localStorage.getItem('winjin-text-config');
      if (local) {
        const parsed = JSON.parse(local);
        console.log('[APIConfigContext] 从 localStorage 初始化 textConfig:', parsed);
        return {
          platform: parsed.platform || 'deepseek',
          model: parsed.model || 'deepseek-chat',
          apiKey: parsed.apiKey || '',
          baseURL: parsed.baseURL || '',  // ⭐ 新增：支持自定义 API 端点
          style: parsed.style || 'picture-book',
        };
      }
    } catch (error) {
      console.warn('[APIConfigContext] 读取 localStorage 失败:', error);
    }
    // 默认值
    return {
      platform: 'deepseek',
      model: 'deepseek-chat',
      apiKey: '',
      baseURL: '',  // ⭐ 新增：支持自定义 API 端点
      style: 'picture-book',
    };
  });

  // Concurrency limits state
  const [concurrencyLimits, setConcurrencyLimits] = useState({
    juxin: 3,
    zhenzhen: 3,
  });

  /**
   * 从 API 加载完整配置
   */
  const loadConfig = useCallback(async () => {
    // ⭐ 先读取 localStorage 配置作为备份
    let localStorageTextConfig = null;
    try {
      const local = localStorage.getItem('winjin-text-config');
      if (local) {
        localStorageTextConfig = JSON.parse(local);
      }
    } catch (e) {
      console.warn('[APIConfigContext] 读取 localStorage 失败:', e);
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/api/config`);
      const result = await response.json();

      if (result.success && result.data) {
        const { platforms: platformList, userDefaults } = result.data;

        // ⭐⭐⭐ 统一架构：从 platforms 中过滤文本平台
        const textPlatformList = (platformList || []).filter(p => p.type === 'text');

        setPlatforms(platformList || []);
        setTextModels(textPlatformList);  // ⭐ 从 platforms 过滤，不再使用单独的 textModels 字段

        // 使用用户默认配置
        if (userDefaults && userDefaults.videoGeneration) {
          const videoDefaults = userDefaults.videoGeneration;
          setConfig({
            platform: videoDefaults.platform || 'juxin',
            model: videoDefaults.model || 'sora-2-all',
            aspect: videoDefaults.aspectRatio || '16:9',
            watermark: videoDefaults.watermark || false,
            apiKey: '',
            concurrencyLimits: videoDefaults.concurrencyLimits || { juxin: 3, zhenzhen: 3 },
          });
        }

        // ⭐ 文本模型配置：优先使用 API 返回值，否则使用 localStorage
        if (userDefaults && userDefaults.textGeneration) {
          const textDefaults = userDefaults.textGeneration;
          const textPlatform = platformList.find(p => p.key === textDefaults.platform && p.type === 'text');

          setTextConfig({
            platform: textDefaults.platform || 'deepseek',
            model: textDefaults.model || 'deepseek-chat',
            apiKey: textDefaults.apiKey || '',
            baseURL: textPlatform?.baseURL || textDefaults.baseURL || '',  // ⭐ 新增：加载平台 baseURL
            style: textDefaults.style || 'picture-book',
          });
          // ⭐ 同步更新 localStorage
          localStorage.setItem('winjin-text-config', JSON.stringify({
            platform: textDefaults.platform || 'deepseek',
            model: textDefaults.model || 'deepseek-chat',
            apiKey: textDefaults.apiKey || '',
            baseURL: textPlatform?.baseURL || textDefaults.baseURL || '',  // ⭐ 新增
            style: textDefaults.style || 'picture-book',
          }));
        } else if (localStorageTextConfig) {
          // ⭐ API 没有返回 textDefaults，使用 localStorage 值
          console.log('[APIConfigContext] 使用 localStorage 配置:', localStorageTextConfig);
          setTextConfig(localStorageTextConfig);
        }

        // 同时保存到 localStorage（向后兼容）
        const localStorageConfig = {
          platform: videoDefaults?.platform || 'juxin',
          model: videoDefaults?.model || 'sora-2-all',
          aspect: videoDefaults?.aspectRatio || '16:9',
          watermark: videoDefaults?.watermark || false,
        };
        localStorage.setItem('winjin-api-config', JSON.stringify(localStorageConfig));

        console.log('[APIConfigContext] 配置已从 API 加载:', {
          platforms: platformList?.length || 0,
          textModels: textModelList?.length || 0,
          userDefaults: videoDefaults,
        });
      }
    } catch (error) {
      console.error('[APIConfigContext] 加载配置失败:', error);
      // ⭐ 加载失败时，使用 localStorage 配置
      if (localStorageTextConfig) {
        console.log('[APIConfigContext] 加载失败，使用 localStorage 配置:', localStorageTextConfig);
        setTextConfig(localStorageTextConfig);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 组件挂载时加载配置
   */
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  /**
   * 更新 API 配置
   * 同时更新 localStorage 和服务器配置
   */
  const updateConfig = useCallback(async (updates) => {
    setConfig((prev) => {
      const newConfig = { ...prev, ...updates };

      // ⭐ 智能模型切换：如果切换了平台，确保模型有效
      if (updates.platform && updates.platform !== prev.platform) {
        const platform = platforms.find(p => p.key === updates.platform);
        if (platform && platform.models && platform.models.length > 0) {
          const firstModel = platform.models[0];
          if (firstModel && !platform.models.some(m => m.id === newConfig.model)) {
            console.log('[APIConfigContext] 切换平台，自动调整模型:', {
              oldPlatform: prev.platform,
              newPlatform: updates.platform,
              oldModel: newConfig.model,
              newModel: firstModel.id,
            });
            newConfig.model = firstModel.id;
          }
        }
      }

      // 保存到 localStorage（向后兼容）
      const localStorageConfig = {
        platform: newConfig.platform,
        model: newConfig.model,
        aspect: newConfig.aspect,
        watermark: newConfig.watermark,
      };
      localStorage.setItem('winjin-api-config', JSON.stringify(localStorageConfig));

      // ⭐ 更新服务器端的用户默认配置（防抖版本）
      updateUserDefaultsDebounced({ videoGeneration: localStorageConfig });

      return newConfig;
    });
  }, [platforms, updateUserDefaultsDebounced]);
  // ⭐ 同步版本（用于关键配置立即同步）
  const updateUserDefaultsSync = async (defaults) => {
    try {
      const response = await fetch(`${API_BASE}/api/config/defaults`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaults }),
      });
      const result = await response.json();
      if (!result.success) {
        console.warn('[APIConfigContext] 更新服务器配置失败:', result.error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('[APIConfigContext] 更新服务器配置失败:', error);
      return false;
    }
  };

  /**
   * 添加自定义平台
   */
  const addPlatform = useCallback(async (platformData) => {
    try {
      const response = await fetch(`${API_BASE}/api/config/platforms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(platformData),
      });
      const result = await response.json();

      if (result.success) {
        await loadConfig(); // 重新加载配置
        return { success: true };
      }
      return result;
    } catch (error) {
      console.error('[APIConfigContext] 添加平台失败:', error);
      return { success: false, error: error.message };
    }
  }, [loadConfig]);

  /**
   * 更新平台配置
   */
  const updatePlatform = useCallback(async (platformKey, updates) => {
    try {
      const response = await fetch(`${API_BASE}/api/config/platforms/${platformKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const result = await response.json();

      if (result.success) {
        await loadConfig(); // 重新加载配置
        return { success: true };
      }
      return result;
    } catch (error) {
      console.error('[APIConfigContext] 更新平台失败:', error);
      return { success: false, error: error.message };
    }
  }, [loadConfig]);

  /**
   * 删除自定义平台
   */
  const deletePlatform = useCallback(async (platformKey) => {
    try {
      const response = await fetch(`${API_BASE}/api/config/platforms/${platformKey}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        await loadConfig(); // 重新加载配置
        return { success: true };
      }
      return result;
    } catch (error) {
      console.error('[APIConfigContext] 删除平台失败:', error);
      return { success: false, error: error.message };
    }
  }, [loadConfig]);

  /**
   * 为平台添加模型
   */
  const addModel = useCallback(async (platformKey, modelData) => {
    try {
      const response = await fetch(`${API_BASE}/api/config/platforms/${platformKey}/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modelData),
      });
      const result = await response.json();

      if (result.success) {
        await loadConfig(); // 重新加载配置
        return { success: true };
      }
      return result;
    } catch (error) {
      console.error('[APIConfigContext] 添加模型失败:', error);
      return { success: false, error: error.message };
    }
  }, [loadConfig]);

  /**
   * 更新文本模型配置
   */
  const updateTextConfig = useCallback((updates) => {
    setTextConfig((prev) => {
      const newConfig = { ...prev, ...updates };

      // 保存到 localStorage
      const localStorageConfig = {
        platform: newConfig.platform,
        model: newConfig.model,
        apiKey: newConfig.apiKey,
        baseURL: newConfig.baseURL,  // ⭐ 新增：同步 baseURL
        style: newConfig.style,
      };
      localStorage.setItem('winjin-text-config', JSON.stringify(localStorageConfig));

      // ⭐ 更新服务器端用户默认配置（防抖版本）
      updateUserDefaultsDebounced({ textGeneration: localStorageConfig });

      return newConfig;
    });
  }, [updateUserDefaultsDebounced]);

  /**
   * 更新并发限制
   */
  const updateConcurrencyLimits = useCallback((limits) => {
    setConcurrencyLimits((prev) => {
      const newLimits = typeof limits === 'function' ? limits(prev) : { ...prev, ...limits };

      // 保存到配置
      setConfig((prevConfig) => ({
        ...prevConfig,
        concurrencyLimits: newLimits,
      }));

      // ⭐ 更新服务器端用户默认配置（防抖版本）
      updateUserDefaultsDebounced({ videoGeneration: { ...config, concurrencyLimits: newLimits } });

      return newLimits;
    });
  }, [config, updateUserDefaultsDebounced]);

  return (
    <APIConfigContext.Provider
      value={{
        config,
        textConfig,
        concurrencyLimits,
        platforms,
        textModels,
        updateConfig,
        updateTextConfig,
        updateConcurrencyLimits,
        addPlatform,
        updatePlatform,
        deletePlatform,
        addModel,
        loadConfig,
        reloadConfig: loadConfig, // 别名，用于 UI 重新加载配置
        isLoading
      }}
    >
      {children}
    </APIConfigContext.Provider>
  );
};

/**
 * useAPIConfig - 获取 API 配置的 Hook
 *
 * @returns {Object} API 配置和方法
 *
 * @throws {Error} 如果在 APIConfigProvider 外部使用
 *
 * @example
 * const { config, platforms, updateConfig, addPlatform } = useAPIConfig();
 * console.log(config.platform); // 'juxin'
 * updateConfig({ platform: 'zhenzhen' });
 * addPlatform({ id: 'custom', name: '自定义平台', baseURL: '...' });
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
