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
      textModels: {},
      userDefaults: {
        videoGeneration: {
          platform: "juxin",
          model: "sora-2-all",
          aspectRatio: "16:9",
          watermark: false
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
    const processedKeys = new Set(); // 防止重复添加

    // ⭐ 内置视频平台（从模板）
    if (this.templates && this.templates.platforms) {
      for (const [key, templatePlatform] of Object.entries(this.templates.platforms)) {
        // 从模板加载基础模型列表
        const templateModels = (templatePlatform.models || []).map(m => ({
          id: m.id,
          name: m.name,
          type: m.type || 'video',
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
              enabled: userModel.enabled !== false,
              apiKey: userModel.apiKey || modelsMap.get(modelId)?.apiKey || ''
            });
          }
        }

        const enabledModels = Array.from(modelsMap.values()).filter(m => m.enabled !== false);

        platforms.push({
          id: key,
          key: key,
          name: templatePlatform.name,
          baseURL: templatePlatform.baseURL,
          enabled: templatePlatform.enabled !== false,
          builtIn: true,
          type: 'video',  // ⭐ 视频平台
          models: enabledModels
        });
        processedKeys.add(key);
      }
    }

    // ⭐ 用户配置中的额外平台（config.platforms）
    // ⭐⭐⭐ 统一架构：支持 type 字段区分平台类型
    for (const [key, platform] of Object.entries(config.platforms || {})) {
      if (processedKeys.has(key)) continue; // 已处理过

      const enabledModels = Object.values(platform.models || {})
        .filter(m => m.enabled !== false)
        .map(m => ({
          id: m.id,
          name: m.name,
          type: m.type || platform.type || 'video',
          enabled: m.enabled !== false,
          apiKey: m.apiKey || ''
        }));

      // ⭐⭐⭐ 关键修复：使用平台自己的 type 字段，而不是硬编码 'video'
      platforms.push({
        id: platform.id || key,
        key: key,
        name: platform.name,
        baseURL: platform.baseURL,
        enabled: platform.enabled !== false,
        builtIn: platform.builtIn || false,
        type: platform.type || 'video',  // ⭐ 使用平台的 type 字段
        apiKey: platform.apiKey || '',
        models: enabledModels
      });
      processedKeys.add(key);
    }

    // ⭐ 用户自定义平台（customPlatforms）
    for (const [key, platform] of Object.entries(config.customPlatforms || {})) {
      if (processedKeys.has(key)) continue;

      const enabledModels = Object.values(platform.models || {})
        .filter(m => m.enabled !== false)
        .map(m => ({
          id: m.id,
          name: m.name,
          type: m.type || 'video',
          enabled: m.enabled !== false
        }));

      platforms.push({
        id: platform.id,
        key: key,
        name: platform.name,
        baseURL: platform.baseURL,
        enabled: platform.enabled !== false,
        builtIn: false,
        type: platform.type || 'video',
        models: enabledModels
      });
      processedKeys.add(key);
    }

    // ⭐⭐⭐ 文本平台（textPlatforms）- 统一迁移到 platforms ⭐⭐⭐
    for (const [key, platform] of Object.entries(config.textPlatforms || {})) {
      if (processedKeys.has(key)) continue;

      const enabledModels = Object.values(platform.models || {})
        .filter(m => m.enabled !== false)
        .map(m => ({
          id: m.id,
          name: m.name,
          type: m.type || 'text',
          enabled: m.enabled !== false,
          apiKey: m.apiKey || ''
        }));

      platforms.push({
        id: platform.id || key,
        key: key,
        name: platform.name,
        baseURL: platform.baseURL,
        enabled: platform.enabled !== false,
        builtIn: false,
        type: 'text',  // ⭐ 文本平台
        models: enabledModels
      });
      processedKeys.add(key);
    }

    return platforms;
  }

  /**
   * 获取文本模型列表 ⭐ 已简化
   * 统一从 getPlatforms() 获取，过滤 type: 'text' 的平台
   */
  getTextModels() {
    // ⭐ 统一架构：调用 getPlatforms() 并过滤文本平台
    return this.getPlatforms().filter(p => p.type === 'text');
  }

  /**
   * 添加平台 ⭐ 统一架构
   * @param {Object} platformData - 平台数据
   * @param {string} [platformData.id] - 平台ID（唯一标识，可选）
   * @param {string} platformData.name - 平台显示名称
   * @param {string} platformData.baseURL - API Base URL
   * @param {string} [platformData.type] - 平台类型 ('video'|'text'|'image')
   * @param {boolean} [platformData.enabled] - 是否启用
   * @param {string} [platformData.apiKey] - 平台级API Key
   * @param {Array} [platformData.models] - 模型数组
   */
  addPlatform(platformData) {
    const config = this.loadUserConfig();

    // ⭐ 确保 platforms 对象存在
    if (!config.platforms) {
      config.platforms = {};
    }

    const platformType = platformData.type || 'text';

    // ⭐⭐⭐ 唯一性验证：检查平台名称是否已存在
    const displayName = platformData.name;
    if (!displayName) {
      // ⭐ 自动命名：未提供 name 时生成友好名称
      const typeLabel = platformType === 'video' ? '视频平台' : platformType === 'text' ? '文本平台' : '平台';
      const existingCount = Object.values(config.platforms).filter(p => p.name && p.name.includes(typeLabel)).length;
      displayName = `${typeLabel} ${existingCount + 1}`;
    } else {
      // ⭐⭐⭐ 验证平台名称是否已存在
      const existingPlatform = Object.values(config.platforms).find(p => p.name === displayName);
      if (existingPlatform) {
        return {
          success: false,
          error: `平台名称 "${displayName}" 已存在（Key: ${existingPlatform.key}），请使用不同的名称。`
        };
      }
    }

    // ⭐ 自动生成 key：基于类型 + 随机字符串
    const typePrefix = platformType === 'video' ? 'video' : platformType === 'text' ? 'text' : 'platform';
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    let key = platformData.id || platformData.key || `${typePrefix}-${randomSuffix}`;

    // 确保生成的 key 不重复（自动修正）
    while (config.platforms[key]) {
      key = `${typePrefix}-${Math.random().toString(36).substring(2, 8)}`;
    }

    // ⭐⭐⭐ 统一架构：所有平台存储在 config.platforms
    // 使用 type 字段区分平台类型
    config.platforms[key] = {
      id: key,
      key: key,
      name: displayName,
      baseURL: platformData.baseURL,
      enabled: platformData.enabled !== false,
      builtIn: false,
      type: platformType,
      apiKey: platformData.apiKey || '',
      models: platformData.models || {},  // ⭐ 修复：模型存储为对象而非数组
      settings: platformData.settings || {},
      createdAt: new Date().toISOString()
    };

    const result = this.saveUserConfig(config);
    if (result.success) {
      return {
        success: true,
        data: {
          key: key,
          name: displayName,
          type: platformType,
          message: `平台 "${displayName}" 已成功添加，Key: ${key}`
        }
      };
    }
    return result;
  }

  /**
   * 更新平台 ⭐ 统一架构
   * @param {string} platformKey - 平台key
   * @param {Object} updates - 要更新的字段
   */
  updatePlatform(platformKey, updates) {
    const config = this.loadUserConfig();

    // ⭐⭐⭐ 统一架构：所有平台在 config.platforms
    // 检查平台是否存在
    if (!config.platforms || !config.platforms[platformKey]) {
      return { success: false, error: 'Platform not found' };
    }

    const platform = config.platforms[platformKey];

    // ⚠️ 内置平台不允许修改某些字段
    if (platform.builtIn) {
      // 内置平台只允许修改 enabled 字段
      const allowedUpdates = {};
      if ('enabled' in updates) {
        allowedUpdates.enabled = updates.enabled;
      }
      if (Object.keys(allowedUpdates).length === 0) {
        return { success: false, error: 'Cannot modify built-in platform' };
      }
      Object.assign(platform, allowedUpdates);
    } else {
      // 自定义平台可以修改所有字段（除了 id 和 key）
      Object.assign(platform, updates);
      // 确保 id 和 key 不被修改
      platform.id = platform.id || platformKey;
      platform.key = platformKey;
    }

    return this.saveUserConfig(config);
  }

  /**
   * 删除平台 ⭐ 统一架构
   * @param {string} platformKey - 平台key
   */
  deletePlatform(platformKey) {
    const config = this.loadUserConfig();

    // ⭐⭐⭐ 统一架构：所有平台在 config.platforms
    if (!config.platforms || !config.platforms[platformKey]) {
      return { success: false, error: 'Platform not found' };
    }

    const platform = config.platforms[platformKey];

    // ⚠️ 内置平台不允许删除
    if (platform.builtIn) {
      return { success: false, error: 'Cannot delete built-in platform' };
    }

    delete config.platforms[platformKey];
    return this.saveUserConfig(config);
  }

  /**
   * 为平台添加模型 ⭐ 统一处理所有类型平台
   *
   * 支持视频平台、文本平台、自定义平台
   * 统一存储到 config.platforms，通过 type 字段区分
   */
  addModelToPlatform(platformKey, modelData) {
    const config = this.loadUserConfig();

    // ⭐ 第一步：确保 platforms 数组存在
    if (!config.platforms) {
      config.platforms = {};
    }

    // ⭐ 第二步：查找或创建平台
    let platform = config.platforms[platformKey];

    if (!platform) {
      // 平台不存在，创建新平台
      platform = {
        id: platformKey,
        name: platformKey,  // 默认使用 key 作为名称
        baseURL: '',
        enabled: true,
        builtIn: false,
        type: modelData.type || 'text',  // ⭐ 根据模型类型推断平台类型
        models: {}
      };
      config.platforms[platformKey] = platform;
    }

    // ⭐ 第三步：更新平台的 type（如果模型指定了类型）
    if (modelData.type && !platform.type) {
      platform.type = modelData.type;
    }

    // ⭐ 第四步：添加模型
    if (!platform.models) {
      platform.models = {};
    }

    platform.models[modelData.id] = {
      id: modelData.id,
      name: modelData.name,
      type: modelData.type || platform.type || 'text',
      enabled: modelData.enabled !== false,
      apiKey: modelData.apiKey || ''
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

    // ⭐ 确保有 models 对象
    if (!platform.models) {
      platform.models = {};
    }

    // ⭐ 如果模型不存在，自动创建新的模型条目（不验证模型名）
    // 用户可以自由添加任何模型名，后端只做存储
    if (!platform.models[modelId]) {
      console.log(`[ConfigManager] 创建新模型 ${modelId} 于平台 ${platformKey}`);
      platform.models[modelId] = {
        id: modelId,
        name: updates.name || modelId,  // 使用提供的名称或模型ID
        type: updates.type || 'sora',   // 使用提供的类型或默认 'sora'
        enabled: true,
        apiKey: updates.apiKey || ''    // 使用提供的 API Key
      };
    } else {
      // 更新现有模型（不允许修改 id）
      const { id, ...allowedUpdates } = updates;
      Object.assign(platform.models[modelId], allowedUpdates);
    }

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
   * 添加文本平台 ⭐ 已废弃 - 请使用 addPlatform({ type: 'text', ... })
   * @deprecated 请使用 addPlatform() 并传入 type: 'text'
   *
   * 文本平台使用 OpenAI 格式，只需填写 baseURL
   * 自动补全 /v1 等后缀
   */
  addTextPlatform(platformData) {
    // ⭐⭐⭐ 重定向到统一的 addPlatform 方法
    console.warn('[ConfigManager] addTextPlatform 已废弃，请使用 addPlatform({ type: \'text\', ... })');
    return this.addPlatform({
      ...platformData,
      type: 'text'  // ⭐ 明确指定为文本平台
    });
  }

  /**
   * 删除文本平台 ⭐ 已废弃 - 请使用 deletePlatform()
   * @deprecated 请使用 deletePlatform()
   */
  deleteTextPlatform(platformKey) {
    // ⭐⭐⭐ 重定向到统一的 deletePlatform 方法
    console.warn('[ConfigManager] deleteTextPlatform 已废弃，请使用 deletePlatform()');
    return this.deletePlatform(platformKey);
  }

  /**
   * 从平台删除模型 ⭐ 统一架构
   * @param {string} platformKey - 平台key
   * @param {string} modelId - 模型ID
   */
  deleteModelFromPlatform(platformKey, modelId) {
    const config = this.loadUserConfig();

    // ⭐⭐⭐ 统一架构：所有平台在 config.platforms
    if (!config.platforms || !config.platforms[platformKey]) {
      return { success: false, error: 'Platform not found' };
    }

    const platform = config.platforms[platformKey];

    // 检查是否是内置平台
    if (platform.builtIn) {
      // 内置平台需要在用户配置中创建引用
      if (!config.platforms[platformKey].models) {
        config.platforms[platformKey].models = {};
      }
      // 从用户配置中删除模型
      if (config.platforms[platformKey].models[modelId]) {
        delete config.platforms[platformKey].models[modelId];
        return this.saveUserConfig(config);
      }
      return { success: false, error: 'Model not found in user config' };
    }

    // 自定义平台直接删除
    if (!platform.models || !platform.models[modelId]) {
      return { success: false, error: 'Model not found' };
    }

    delete platform.models[modelId];
    return this.saveUserConfig(config);
  }

  /**
   * 从文本平台删除模型 ⭐ 已废弃 - 请使用 deleteModelFromPlatform()
   * @deprecated 请使用 deleteModelFromPlatform()
   */
  deleteModelFromTextPlatform(platformKey, modelId) {
    // ⭐⭐⭐ 重定向到统一的 deleteModelFromPlatform 方法
    console.warn('[ConfigManager] deleteModelFromTextPlatform 已废弃，请使用 deleteModelFromPlatform()');
    return this.deleteModelFromPlatform(platformKey, modelId);
  }

  /**
   * 获取完整配置（用于前端）⭐ 统一架构
   */
  getFullConfig() {
    const config = this.loadUserConfig();
    return {
      // ⭐⭐� platforms 现在包含所有平台（video + text）
      // 前端根据 type 字段区分：type === 'video' | 'text' | 'image'
      platforms: this.getPlatforms(),
      userDefaults: config.userDefaults || {},
      version: config.version
    };
  }
}

// 单例实例
const configManager = new ConfigManager();

module.exports = configManager;
