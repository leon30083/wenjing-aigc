/**
 * config-manager.js - Cherry Studio style configuration manager
 *
 * 功能：
 * - 加载/保存用户配置到 config.json
 * - 提供配置模板（聚鑫/贞贞 + VEO/Gemini）
 * - 支持用户自定义平台和模型
 * - 提供配置 API 端点
 */

const fs = require('fs');
const path = require('path');

// 配置文件路径
const CONFIG_DIR = path.join(__dirname, '../data');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const TEMPLATES_FILE = path.join(CONFIG_DIR, 'config-templates.json');

// 确保目录存在
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

/**
 * 配置管理器类
 */
class ConfigManager {
  constructor() {
    this.templates = null;
    this.userConfig = null;
    this.loadTemplates();
  }

  /**
   * 加载配置模板
   */
  loadTemplates() {
    try {
      if (fs.existsSync(TEMPLATES_FILE)) {
        const data = fs.readFileSync(TEMPLATES_FILE, 'utf8');
        this.templates = JSON.parse(data);
        console.log('[ConfigManager] 配置模板已加载:', Object.keys(this.templates.platforms || {}));
      } else {
        console.warn('[ConfigManager] 配置模板文件不存在:', TEMPLATES_FILE);
        this.templates = this.getDefaultTemplates();
      }
    } catch (error) {
      console.error('[ConfigManager] 加载配置模板失败:', error);
      this.templates = this.getDefaultTemplates();
    }
  }

  /**
   * 获取默认配置模板
   */
  getDefaultTemplates() {
    return {
      version: "1.0.0",
      platforms: {
        juxin: {
          id: "juxin",
          name: "聚鑫",
          baseURL: "https://api.jxincm.cn",
          enabled: true,
          models: {
            sora2: { id: "sora-2-all", name: "Sora-2-all", type: "video", enabled: true },
          },
          defaultModel: "sora-2-all",
        },
        zhenzhen: {
          id: "zhenzhen",
          name: "贞贞",
          baseURL: "https://ai.t8star.cn",
          enabled: true,
          models: {
            sora2: { id: "sora-2", name: "Sora-2", type: "video", enabled: true },
            sora2_pro: { id: "sora-2-pro", name: "Sora-2 Pro", type: "video", enabled: true },
          },
          defaultModel: "sora-2",
        },
      },
    };
  }

  /**
   * 加载用户配置
   */
  loadUserConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, 'utf8');
        this.userConfig = JSON.parse(data);
        console.log('[ConfigManager] 用户配置已加载');
      } else {
        // 首次运行，创建默认配置
        this.userConfig = this.createDefaultUserConfig();
        this.saveUserConfig();
        console.log('[ConfigManager] 创建默认用户配置');
      }
      return this.userConfig;
    } catch (error) {
      console.error('[ConfigManager] 加载用户配置失败:', error);
      this.userConfig = this.createDefaultUserConfig();
      return this.userConfig;
    }
  }

  /**
   * 创建默认用户配置
   */
  createDefaultUserConfig() {
    return {
      version: "1.0.0",
      // ⭐ 并发限制配置
      concurrencyLimits: {
        juxin: 3,      // 聚鑫平台：最多 3 个并发任务
        zhenzhen: 3,   // 贞贞平台：最多 3 个并发任务
      },
      platforms: {
        juxin: {
          id: "juxin",
          name: "聚鑫",
          baseURL: "https://api.jxincm.cn",
          enabled: true,
          apiKey: "",
          models: {
            "sora-2-all": {
              id: "sora-2-all",
              name: "Sora-2-all",
              type: "video",
              enabled: true
            },
            "veo_3_1-components": {
              id: "veo_3_1-components",
              name: "VEO 3.1 Components",
              type: "video",
              enabled: true
            },
            "veo_3_1-fast-4K": {
              id: "veo_3_1-fast-4K",
              name: "VEO 3.1 Fast 4K",
              type: "video",
              enabled: true
            }
          },
          defaultModel: "sora-2-all"
        },
        zhenzhen: {
          id: "zhenzhen",
          name: "贞贞",
          baseURL: "https://ai.t8star.cn",
          enabled: true,
          apiKey: "",
          models: {
            "sora-2": {
              id: "sora-2",
              name: "Sora-2",
              type: "video",
              enabled: true
            },
            "sora-2-pro": {
              id: "sora-2-pro",
              name: "Sora-2 Pro",
              type: "video",
              enabled: true
            },
            "veo3.1-fast": {
              id: "veo3.1-fast",
              name: "VEO 3.1 Fast",
              type: "video",
              enabled: true
            },
            "veo3.1-components-4k": {
              id: "veo3.1-components-4k",
              name: "VEO 3.1 Components 4K",
              type: "video",
              enabled: true
            },
            "veo3.1-components": {
              id: "veo3.1-components",
              name: "VEO 3.1 Components",
              type: "video",
              enabled: true
            }
          },
          defaultModel: "sora-2"
        }
      },
      textModels: {
        gemini: {
          id: "gemini",
          name: "Gemini (DeepSeek)",
          baseURL: "http://170.106.152.118:2999",
          enabled: true,
          apiKey: "",
          models: {
            "gemini-3-pro-preview": {
              id: "gemini-3-pro-preview",
              name: "Gemini 3 Pro Preview",
              type: "text",
              enabled: true
            },
            "gemini-3-pro-preview-thinking": {
              id: "gemini-3-pro-preview-thinking",
              name: "Gemini 3 Pro Preview Thinking",
              type: "text",
              enabled: true
            },
            "gemini-3-flash-preview": {
              id: "gemini-3-flash-preview",
              name: "Gemini 3 Flash Preview",
              type: "text",
              enabled: true
            }
          },
          defaultModel: "gemini-3-pro-preview"
        }
      },
      userDefaults: {
        videoGeneration: {
          platform: "juxin",
          model: "sora-2-all",
          aspectRatio: "16:9",
          watermark: false
        },
        textProcessing: {
          platform: "gemini",
          model: "gemini-3-pro-preview",
          style: "picture-book"
        }
      },
      customPlatforms: {}
    };
  }

  /**
   * 保存用户配置
   */
  saveUserConfig(config = null) {
    try {
      const configToSave = config || this.userConfig;
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(configToSave, null, 2));
      if (config) {
        this.userConfig = config;
      }
      console.log('[ConfigManager] 用户配置已保存');
      return { success: true };
    } catch (error) {
      console.error('[ConfigManager] 保存用户配置失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取平台列表
   *
   * ⭐ 模型合并逻辑：
   * 1. 内置平台：从模板加载模型作为基础
   * 2. 用户配置：覆盖/添加/禁用模型
   * 3. 过滤：只显示 enabled !== false 的模型
   */
  getPlatforms() {
    const config = this.loadUserConfig();
    const platforms = [];

    // ⭐ 内置平台（从模板）
    if (this.templates && this.templates.platforms) {
      for (const [key, templatePlatform] of Object.entries(this.templates.platforms)) {
        // 从模板加载基础模型列表
        const templateModels = (templatePlatform.models || []).map(m => ({
          id: m.id,
          name: m.name,
          type: m.type,
          enabled: m.enabled !== false
        }));

        // ⭐ 创建模型映射表（用于快速查找和覆盖）
        const modelsMap = new Map();
        templateModels.forEach(m => modelsMap.set(m.id, m));

        // ⭐ 合并用户配置中的模型（覆盖模板，包括 apiKey）
        const userPlatform = config.platforms?.[key];
        if (userPlatform?.models) {
          for (const [modelId, userModel] of Object.entries(userPlatform.models)) {
            modelsMap.set(modelId, {
              id: modelId,
              name: userModel.name || modelsMap.get(modelId)?.name || modelId,
              type: userModel.type || modelsMap.get(modelId)?.type || 'video',
              enabled: userModel.enabled !== false, // 用户配置覆盖
              apiKey: userModel.apiKey || modelsMap.get(modelId)?.apiKey || ''  // ⭐ 保留模型 Key
            });
          }
        }

        // ⭐ 过滤掉被禁用的模型（enabled: false）
        const enabledModels = Array.from(modelsMap.values()).filter(m => m.enabled !== false);

        platforms.push({
          id: templatePlatform.key,
          key: templatePlatform.key,
          name: templatePlatform.name,
          baseURL: templatePlatform.baseURL,
          enabled: templatePlatform.enabled !== false,
          builtIn: true,
          models: enabledModels
        });
      }
    }

    // ⭐ 用户配置中的额外内置平台（不在模板中的）
    for (const [key, platform] of Object.entries(config.platforms || {})) {
      const existingIndex = platforms.findIndex(p => p.key === key);
      if (existingIndex >= 0) {
        // 已经在模板处理阶段合并过了，跳过
        continue;
      }

      // 不在模板中的平台，直接使用用户配置
      const enabledModels = Object.values(platform.models || {})
        .filter(m => m.enabled !== false)
        .map(m => ({
          id: m.id,
          name: m.name,
          type: m.type,
          enabled: m.enabled !== false
        }));

      platforms.push({
        id: platform.id,
        key: key,
        name: platform.name,
        baseURL: platform.baseURL,
        enabled: platform.enabled,
        builtIn: true,
        models: enabledModels
      });
    }

    // ⭐ 用户自定义平台
    for (const [key, platform] of Object.entries(config.customPlatforms || {})) {
      const enabledModels = Object.values(platform.models || {})
        .filter(m => m.enabled !== false)
        .map(m => ({
          id: m.id,
          name: m.name,
          type: m.type,
          enabled: m.enabled !== false
        }));

      platforms.push({
        id: platform.id,
        key: key,
        name: platform.name,
        baseURL: platform.baseURL,
        enabled: platform.enabled !== false,
        builtIn: false,
        models: enabledModels
      });
    }

    return platforms;
  }

  /**
   * 获取文本模型列表
   */
  getTextModels() {
    const config = this.loadUserConfig();
    const textModels = [];

    // ⭐ 文本模型提供商（从模板）
    if (this.templates && this.templates.textModels) {
      for (const [key, provider] of Object.entries(this.templates.textModels)) {
        textModels.push({
          id: provider.key,
          key: provider.key,
          name: provider.name,
          baseURL: provider.baseURL,
          enabled: provider.enabled !== false,
          builtIn: true,
          models: (provider.models || []).map(m => ({
            id: m.id,
            name: m.name,
            type: m.type || 'text',
            enabled: m.enabled !== false
          }))
        });
      }
    }

    // ⭐ 用户自定义文本平台（新增：支持 textPlatforms）
    for (const [key, provider] of Object.entries(config.textPlatforms || {})) {
      const existingIndex = textModels.findIndex(t => t.key === key);
      const providerData = {
        id: provider.id || key,
        key: key,
        name: provider.name,
        baseURL: provider.baseURL,
        enabled: provider.enabled !== false,
        builtIn: false,
        models: Object.values(provider.models || {}).map(m => ({
          id: m.id,
          name: m.name,
          type: m.type || 'text',
          enabled: m.enabled !== false
        }))
      };

      if (existingIndex >= 0) {
        textModels[existingIndex] = providerData;
      } else {
        textModels.push(providerData);
      }
    }

    // 用户自定义文本模型提供商（向后兼容）
    for (const [key, provider] of Object.entries(config.textModels || {})) {
      const existingIndex = textModels.findIndex(t => t.key === key);
      const providerData = {
        id: provider.id || key,
        key: key,
        name: provider.name,
        baseURL: provider.baseURL,
        enabled: provider.enabled !== false,
        builtIn: false,
        models: Object.values(provider.models || {}).map(m => ({
          id: m.id,
          name: m.name,
          type: m.type,
          enabled: m.enabled !== false
        }))
      };

      if (existingIndex >= 0) {
        // 已存在，跳过（避免重复）
      } else {
        textModels.push(providerData);
      }
    }

    return textModels;
  }

  /**
   * 添加自定义平台
   */
  addPlatform(platformData) {
    const config = this.loadUserConfig();

    if (!config.customPlatforms) {
      config.customPlatforms = {};
    }

    const key = platformData.id || platformData.name.toLowerCase().replace(/\s+/g, '_');
    config.customPlatforms[key] = {
      id: platformData.id || key,
      name: platformData.name,
      baseURL: platformData.baseURL,
      enabled: platformData.enabled !== false,
      apiKey: platformData.apiKey || '',
      models: platformData.models || {},
      defaultModel: platformData.defaultModel
    };

    return this.saveUserConfig(config);
  }

  /**
   * 更新平台
   */
  updatePlatform(platformKey, updates) {
    const config = this.loadUserConfig();

    // 检查是否是内置平台
    if (config.platforms && config.platforms[platformKey]) {
      return { success: false, error: 'Cannot modify built-in platform' };
    }

    if (!config.customPlatforms || !config.customPlatforms[platformKey]) {
      return { success: false, error: 'Platform not found' };
    }

    Object.assign(config.customPlatforms[platformKey], updates);
    return this.saveUserConfig(config);
  }

  /**
   * 删除自定义平台
   */
  deletePlatform(platformKey) {
    const config = this.loadUserConfig();

    // 不允许删除内置平台
    if (config.platforms && config.platforms[platformKey]) {
      return { success: false, error: 'Cannot delete built-in platform' };
    }

    if (!config.customPlatforms || !config.customPlatforms[platformKey]) {
      return { success: false, error: 'Platform not found' };
    }

    delete config.customPlatforms[platformKey];
    return this.saveUserConfig(config);
  }

  /**
   * 为平台添加模型
   */
  addModelToPlatform(platformKey, modelData) {
    const config = this.loadUserConfig();
    let platform;
    let isBuiltIn = false;

    // ⭐ 先在模板中查找内置平台
    if (this.templates && this.templates.platforms && this.templates.platforms[platformKey]) {
      platform = this.templates.platforms[platformKey];
      isBuiltIn = true;

      // ⭐ 关键：为内置平台在用户配置中创建引用（用于存储自定义模型）
      if (!config.platforms) {
        config.platforms = {};
      }
      if (!config.platforms[platformKey]) {
        config.platforms[platformKey] = {
          id: platform.key,
          name: platform.name,
          baseURL: platform.baseURL,
          enabled: platform.enabled,
          models: {} // 自定义模型存储在这里
        };
      }
    }

    // 在用户配置中查找平台
    if (config.platforms && config.platforms[platformKey]) {
      platform = config.platforms[platformKey];
    } else if (config.customPlatforms && config.customPlatforms[platformKey]) {
      platform = config.customPlatforms[platformKey];
      isBuiltIn = false;
    } else {
      return { success: false, error: 'Platform not found' };
    }

    if (!platform.models) {
      platform.models = {};
    }

    platform.models[modelData.id] = {
      id: modelData.id,
      name: modelData.name,
      type: modelData.type || 'video',
      enabled: modelData.enabled !== false,
      apiKey: modelData.apiKey || ''  // ⭐ 新增：保存模型 Key
    };

    return this.saveUserConfig(config);
  }

  /**
   * 从平台移除模型 ⭐ 新增
   *
   * ⭐ 重要：对于内置平台，如果模型只存在于模板中，需要在用户配置中
   * 创建一个禁用该模型的记录（enabled: false），而不是返回错误
   */
  removeModelFromPlatform(platformKey, modelId) {
    const config = this.loadUserConfig();
    let platform;
    let isBuiltIn = false;

    // ⭐ 先检查是否是内置平台（从模板）
    if (this.templates && this.templates.platforms && this.templates.platforms[platformKey]) {
      isBuiltIn = true;

      // ⭐ 为内置平台在用户配置中创建引用（用于存储自定义模型配置）
      if (!config.platforms) {
        config.platforms = {};
      }
      if (!config.platforms[platformKey]) {
        config.platforms[platformKey] = {
          id: this.templates.platforms[platformKey].key,
          name: this.templates.platforms[platformKey].name,
          baseURL: this.templates.platforms[platformKey].baseURL,
          enabled: this.templates.platforms[platformKey].enabled,
          models: {} // 自定义模型配置存储在这里
        };
      }
    }

    // 在用户配置中查找平台
    if (config.platforms && config.platforms[platformKey]) {
      platform = config.platforms[platformKey];
    } else if (config.customPlatforms && config.customPlatforms[platformKey]) {
      platform = config.customPlatforms[platformKey];
    } else {
      return { success: false, error: 'Platform not found' };
    }

    if (!platform.models) {
      platform.models = {};
    }

    // ⭐ 关键修复：如果是内置平台且模型不在用户配置中
    if (isBuiltIn && !platform.models[modelId]) {
      // 检查模型是否存在于模板中
      const templatePlatform = this.templates.platforms[platformKey];
      const modelInTemplate = templatePlatform.models?.find(m => m.id === modelId);

      if (modelInTemplate) {
        // ⭐ 在用户配置中添加禁用记录（enabled: false），而不是返回错误
        console.log(`[ConfigManager] 禁用内置平台 ${platformKey} 的模型 ${modelId}`);
        platform.models[modelId] = {
          id: modelId,
          name: modelInTemplate.name,
          type: modelInTemplate.type,
          enabled: false // ⭐ 禁用该模型
        };
        return this.saveUserConfig(config);
      }
    }

    // ⭐ 用户配置中的模型：直接删除
    if (!platform.models[modelId]) {
      return { success: false, error: 'Model not found in user config' };
    }

    // 删除模型
    delete platform.models[modelId];

    // 如果平台没有自定义模型了，可以选择删除平台引用（保留空对象）
    if (Object.keys(platform.models).length === 0) {
      // 保留空对象，不删除平台引用
      console.log(`[ConfigManager] 平台 ${platformKey} 已无自定义模型`);
    }

    return this.saveUserConfig(config);
  }

  /**
   * 更新平台模型 ⭐ 新增
   * 支持视频平台、文本平台和自定义平台
   */
  updateModelInPlatform(platformKey, modelId, updates) {
    const config = this.loadUserConfig();
    let platform;

    // ⭐ 支持文本平台
    if (config.textPlatforms && config.textPlatforms[platformKey]) {
      platform = config.textPlatforms[platformKey];
    }
    // 视频平台
    else if (config.platforms && config.platforms[platformKey]) {
      platform = config.platforms[platformKey];
    }
    // 自定义平台
    else if (config.customPlatforms && config.customPlatforms[platformKey]) {
      platform = config.customPlatforms[platformKey];
    } else {
      return { success: false, error: 'Platform not found or no custom models' };
    }

    if (!platform.models || !platform.models[modelId]) {
      return { success: false, error: 'Model not found in user config' };
    }

    // 更新模型（不允许修改 id）
    const { id, ...allowedUpdates } = updates;
    Object.assign(platform.models[modelId], allowedUpdates);

    return this.saveUserConfig(config);
  }

  /**
   * 更新平台设置（baseURL、端点等）⭐ 新增
   */
  updatePlatformSettings(platformKey, settings) {
    const config = this.loadUserConfig();

    // 内置平台：需要在用户配置中创建引用
    if (this.templates && this.templates.platforms && this.templates.platforms[platformKey]) {
      if (!config.platforms) {
        config.platforms = {};
      }
      if (!config.platforms[platformKey]) {
        config.platforms[platformKey] = {
          id: this.templates.platforms[platformKey].key,
          name: this.templates.platforms[platformKey].name,
          baseURL: this.templates.platforms[platformKey].baseURL,
          enabled: this.templates.platforms[platformKey].enabled,
          models: {}
        };
      }
    }

    // 在用户配置或自定义平台中查找
    let platform;
    if (config.platforms && config.platforms[platformKey]) {
      platform = config.platforms[platformKey];
    } else if (config.customPlatforms && config.customPlatforms[platformKey]) {
      platform = config.customPlatforms[platformKey];
    } else {
      return { success: false, error: 'Platform not found' };
    }

    // 更新设置
    Object.assign(platform, settings);

    return this.saveUserConfig(config);
  }

  /**
   * 更新用户默认配置
   */
  updateUserDefaults(defaults) {
    const config = this.loadUserConfig();
    config.userDefaults = { ...config.userDefaults, ...defaults };
    return this.saveUserConfig(config);
  }

  /**
   * 添加文本平台 ⭐ 新增
   *
   * 文本平台使用 OpenAI 格式，只需填写 baseURL
   * 自动补全 /v1 等后缀
   */
  addTextPlatform(platformData) {
    const config = this.loadUserConfig();

    if (!config.textPlatforms) {
      config.textPlatforms = {};
    }

    // 检查是否已存在
    if (config.textPlatforms[platformData.key] || (this.templates?.textModels && this.templates.textModels[platformData.key])) {
      return { success: false, error: '平台已存在（包括内置平台）' };
    }

    // 创建文本平台
    config.textPlatforms[platformData.key] = {
      id: platformData.key,
      name: platformData.name,
      baseURL: platformData.baseURL,  // 已经在前端补全了 /v1 后缀
      enabled: platformData.enabled !== false,
      type: 'text',
      models: {}  // 文本模型列表（可以后续添加）
    };

    return this.saveUserConfig(config);
  }

  /**
   * 删除文本平台 ⭐ 新增
   */
  deleteTextPlatform(platformKey) {
    const config = this.loadUserConfig();

    // 不允许删除内置平台
    if (this.templates?.textModels && this.templates.textModels[platformKey]) {
      return { success: false, error: 'Cannot delete built-in platform' };
    }

    if (!config.textPlatforms || !config.textPlatforms[platformKey]) {
      return { success: false, error: 'Platform not found' };
    }

    delete config.textPlatforms[platformKey];
    return this.saveUserConfig(config);
  }

  /**
   * 从文本平台删除模型 ⭐ 新增
   */
  deleteModelFromTextPlatform(platformKey, modelId) {
    const config = this.loadUserConfig();

    // 在模板中查找平台
    if (this.templates?.textModels && this.templates.textModels[platformKey]) {
      const templatePlatform = this.templates.textModels[platformKey];

      // 在用户配置中创建引用
      if (!config.textPlatforms) {
        config.textPlatforms = {};
      }
      if (!config.textPlatforms[platformKey]) {
        config.textPlatforms[platformKey] = {
          id: templatePlatform.id,
          name: templatePlatform.name,
          baseURL: templatePlatform.baseURL,
          enabled: templatePlatform.enabled,
          type: 'text',
          models: {} // 用户自定义模型
        };
      }
    }

    // 在用户配置中查找平台
    const platform = config.textPlatforms?.[platformKey];
    if (!platform) {
      return { success: false, error: 'Platform not found' };
    }

    if (!platform.models || !platform.models[modelId]) {
      return { success: false, error: 'Model not found' };
    }

    delete platform.models[modelId];
    return this.saveUserConfig(config);
  }

  /**
   * 获取完整配置（用于前端）
   */
  getFullConfig() {
    const config = this.loadUserConfig();
    return {
      platforms: this.getPlatforms(),
      textModels: this.getTextModels(),
      userDefaults: config.userDefaults || {},
      version: config.version
    };
  }
}

// 单例实例
const configManager = new ConfigManager();

module.exports = configManager;
