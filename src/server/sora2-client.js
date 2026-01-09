/**
 * Sora2 API 客户端
 * 支持聚鑫和贞贞两个平台
 * @module sora2-client
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 平台配置
const PLATFORMS = {
  JUXIN: {
    name: '聚鑫',
    baseURL: 'https://api.jxincm.cn',
    videoEndpoint: '/v1/video/create',
    storyboardEndpoint: '/v1/videos',  // ⭐ 故事板专用端点
    // 聚鑫使用 orientation + size
    useAspectRatio: false,
  },
  ZHENZHEN: {
    name: '贞贞',
    baseURL: 'https://ai.t8star.cn',
    videoEndpoint: '/v2/videos/generations',
    storyboardEndpoint: '/v2/videos/generations',  // ⭐ 贞贞平台使用普通视频端点+特殊prompt格式
    // 贞贞使用 aspect_ratio + hd
    useAspectRatio: true,
  },
};

/**
 * Sora2 客户端类
 */
class Sora2Client {
  /**
   * 创建 Sora2 客户端实例
   * @param {object} config - 配置对象
   * @param {string} config.apiKey - API 密钥
   * @param {string} [config.platform='juxin'] - 平台选择 ('juxin' | 'zhenzhen')
   */
  constructor(config = {}) {
    const { apiKey, platform = 'juxin' } = config;

    // 设置平台
    const platformKey = platform.toUpperCase();
    this.platform = PLATFORMS[platformKey] || PLATFORMS.JUXIN;
    this.platformType = platformKey;

    // 根据平台获取对应的 API Key
    if (!apiKey) {
      if (platformKey === 'ZHENZHEN') {
        this.apiKey = process.env.ZHENZHEN_API_KEY || process.env.SORA2_API_KEY || '';
      } else {
        this.apiKey = process.env.SORA2_API_KEY || '';
      }
    } else {
      this.apiKey = apiKey;
    }

    // 创建 axios 实例
    this.client = axios.create({
      baseURL: this.platform.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  /**
   * 获取认证头
   * @private
   * @returns {object} 请求头
   */
  _getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  /**
   * 转换画面方向参数
   * @private
   * @param {string} orientation - orientation (portrait/landscape) 或 aspect_ratio (9:16/16:9)
   * @returns {object} 转换后的参数
   */
  _convertOrientationParam(orientation) {
    if (this.platform.useAspectRatio) {
      // 贞贞平台使用 aspect_ratio
      if (orientation === 'portrait') return '9:16';
      if (orientation === 'landscape') return '16:9';
      // 如果已经是 aspect_ratio 格式，直接返回
      if (orientation === '9:16' || orientation === '16:9') return orientation;
      return '16:9'; // 默认横屏
    } else {
      // 聚鑫平台使用 orientation
      if (orientation === '9:16' || orientation === 'portrait') return 'portrait';
      if (orientation === '16:9' || orientation === 'landscape') return 'landscape';
      return 'landscape'; // 默认横屏
    }
  }

  /**
   * 转换时长参数
   * @private
   * @param {number|string} duration - 时长
   * @returns {number|string} 转换后的时长
   */
  _convertDurationParam(duration) {
    if (this.platform.useAspectRatio) {
      // 贞贞平台使用字符串
      return String(duration);
    } else {
      // 聚鑫平台使用数字
      return Number(duration);
    }
  }

  /**
   * 创建视频（文生视频）
   * @param {object} options - 视频创建参数
   * @param {string} options.prompt - 提示词
   * @param {string} [options.model] - 模型名称 (聚鑫: sora-2-all, 贞贞: sora-2, sora-2-pro)
   * @param {string} [options.orientation='landscape'] - 画面方向 (portrait/landscape 或 16:9/9:16)
   * @param {number} [options.duration=10] - 视频时长 (10, 15, 25)
   * @param {string|boolean} [options.size='small'] - 分辨率 (small/large) 或 hd (true/false)
   * @param {boolean} [options.watermark=false] - 是否无水印
   * @param {boolean} [options.private=true] - 是否隐藏视频
   * @param {string[]} [options.images] - 参考图片链接数组
   * @returns {Promise<object>} 任务信息
   */
  async createVideo(options) {
    try {
      const {
        prompt,
        model,
        orientation = 'landscape',
        duration = 10,
        size = 'small',
        watermark = false,
        private: isPrivate = true,
        images = [],
      } = options;

      // 根据平台设置默认模型
      const finalModel = model || (this.platformType === 'JUXIN' ? 'sora-2-all' : 'sora-2');

      // 参数校验
      if (!prompt) {
        throw new Error('prompt 是必填参数');
      }

      const validModels = ['sora-2-all', 'sora-2', 'sora-2-pro'];
      if (!validModels.includes(finalModel)) {
        throw new Error(`model 必须是 ${validModels.join(' 或 ')} 之一`);
      }

      const validDurations = [10, 15, 25];
      if (!validDurations.includes(Number(duration))) {
        throw new Error(`duration 必须是 ${validDurations.join(', ')} 之一`);
      }

      // 构建请求体（根据平台不同使用不同参数）
      const body = {
        model: finalModel,
        prompt,
        images,
        watermark,
        private: isPrivate,
      };

      // 转换画面方向参数
      const orientationParam = this._convertOrientationParam(orientation);
      if (this.platform.useAspectRatio) {
        // 贞贞平台使用 aspect_ratio
        body.aspect_ratio = orientationParam;
      } else {
        // 聚鑫平台使用 orientation
        body.orientation = orientationParam;
      }

      // 转换时长参数
      body.duration = this._convertDurationParam(duration);

      // 转换分辨率参数
      if (this.platform.useAspectRatio) {
        // 贞贞平台使用 hd (boolean)
        if (typeof size === 'boolean') {
          body.hd = size;
        } else if (size === 'large') {
          body.hd = true;
        } else {
          body.hd = false;
        }
      } else {
        // 聚鑫平台使用 size (small/large)
        body.size = size === 'large' ? 'large' : 'small';
      }

      // ⭐ 调试日志：打印实际发送的请求
      const authHeaders = this._getAuthHeaders();
      console.log('[Sora2Client] 发送请求到聚鑫 API:');
      console.log('  URL:', this.platform.baseURL + this.platform.videoEndpoint);
      console.log('  Authorization:', authHeaders.Authorization ? `Bearer ${authHeaders.Authorization.substring(0, 20)}...` : 'MISSING');
      console.log('  请求体:', JSON.stringify(body, null, 2));

      const response = await this.client.post(this.platform.videoEndpoint, body, {
        headers: authHeaders,
      });

      console.log('[Sora2Client] 聚鑫 API 响应:', JSON.stringify(response.data, null, 2));

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * 创建视频（带角色参考）
   * @param {object} options - 视频创建参数
   * @param {string} options.prompt - 提示词（可使用 @{username} 引用角色）
   * @param {string} [options.model] - 模型名称 (聚鑫: sora-2-all, 贞贞: sora-2, sora-2-pro)
   * @param {string} options.character_url - 角色视频链接
   * @param {string} options.character_timestamps - 角色出现时间范围 "1,3"
   * @param {string} [options.orientation='landscape'] - 画面方向
   * @param {number} [options.duration=10] - 视频时长
   * @param {string|boolean} [options.size='small'] - 分辨率
   * @param {string[]} [options.images] - 参考图片链接数组
   * @returns {Promise<object>} 任务信息
   */
  async createVideoWithCharacter(options) {
    try {
      const {
        prompt,
        model,
        character_url,
        character_timestamps,
        orientation = 'landscape',
        duration = 10,
        size = 'small',
        images = [],
      } = options;

      // 根据平台设置默认模型
      const finalModel = model || (this.platformType === 'JUXIN' ? 'sora-2-all' : 'sora-2');

      if (!prompt) {
        throw new Error('prompt 是必填参数');
      }
      if (!character_url) {
        throw new Error('character_url 是必填参数');
      }
      if (!character_timestamps) {
        throw new Error('character_timestamps 是必填参数');
      }

      // 时间范围校验
      const [start, end] = character_timestamps.split(',').map(Number);
      const diff = end - start;
      if (diff < 1 || diff > 3) {
        throw new Error('character_timestamps 范围差值必须是 1-3 秒');
      }

      // 构建请求体
      const body = {
        model: finalModel,
        prompt,
        images,
        character_url,
        character_timestamps,
      };

      // 转换画面方向参数
      const orientationParam = this._convertOrientationParam(orientation);
      if (this.platform.useAspectRatio) {
        body.aspect_ratio = orientationParam;
      } else {
        body.orientation = orientationParam;
      }

      // 转换时长参数
      body.duration = this._convertDurationParam(duration);

      // 转换分辨率参数
      if (this.platform.useAspectRatio) {
        if (typeof size === 'boolean') {
          body.hd = size;
        } else if (size === 'large') {
          body.hd = true;
        } else {
          body.hd = false;
        }
      } else {
        body.size = size === 'large' ? 'large' : 'small';
      }

      const response = await this.client.post(this.platform.videoEndpoint, body, {
        headers: this._getAuthHeaders(),
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * 创建故事板视频（批量生成多个镜头）
   * @param {object} options - 视频创建参数
   * @param {Array} options.shots - 镜头数组
   * @param {string} options.shots[].scene - 每个镜头的场景描述
   * @param {number} options.shots[].duration - 每个镜头的时长（秒）
   * @param {string} [options.shots[].image] - 每个镜头的参考图片URL（可选）
   * @param {string} [options.model] - 模型名称 (聚鑫: sora-2-all, 贞贞: sora-2, sora-2-pro)
   * @param {string} [options.orientation='landscape'] - 画面方向
   * @param {string|boolean} [options.size='small'] - 分辨率
   * @param {boolean} [options.watermark=false] - 是否无水印
   * @param {boolean} [options.private=true] - 是否隐藏视频
   * @param {string[]} [options.images] - 参考图片链接数组（全局）
   * @returns {Promise<object>} 任务信息
   */
  async createStoryboardVideo(options) {
    try {
      const {
        shots,
        duration, // ⭐ 新增：总时长参数（可选）
        model,
        orientation = 'landscape',
        size = 'small',
        watermark = false,
        private: isPrivate = true,
        images = [],
      } = options;

      // 根据平台设置默认模型（与createVideo保持一致）
      const finalModel = model || (this.platformType === 'JUXIN' ? 'sora-2-all' : 'sora-2');

      if (!shots || !Array.isArray(shots) || shots.length === 0) {
        throw new Error('shots 是必填参数，且必须是非空数组');
      }

      // 收集所有镜头的参考图片
      const allImages = [...images];
      shots.forEach((shot) => {
        if (shot.image) {
          allImages.push(shot.image);
        }
      });

      // 构建故事板提示词
      const promptParts = shots.map((shot, index) => {
        return `Shot ${index + 1}:\nduration: ${shot.duration}sec\nScene: ${shot.scene}`;
      });
      const prompt = promptParts.join('\n\n');

      // ⭐ 计算所有镜头的总时长（用于 API duration 参数）
      const totalDuration = shots.reduce((sum, shot) => sum + (shot.duration || 0), 0);

      // 构建请求体
      // ⚠️ 注意：API期望布尔值类型（不是字符串）
      const body = {
        model: finalModel,
        prompt,
        watermark: watermark,   // ✅ 布尔值
        private: isPrivate,     // ✅ 布尔值
      };

      // ⭐ 关键修复：根据平台使用不同的图片字段名
      // - 聚鑫平台使用 input_reference (单个字符串)
      // - 贞贞平台使用 images (字符串数组)
      if (this.platformType === 'JUXIN') {
        // 聚鑫故事板：只使用第一张图片
        if (allImages.length > 0) {
          body.input_reference = allImages[0];  // 单个字符串，不是数组
        }
      } else {
        // 贞贞故事板：支持多张图片
        body.images = allImages;
      }

      // ⭐ 关键修复：根据平台使用不同的参数名，并转换为字符串类型
      // - 聚鑫平台使用 seconds (字符串类型)
      // - 贞贞平台使用 duration (字符串类型)
      const finalDuration = duration || totalDuration;
      if (this.platformType === 'JUXIN') {
        body.seconds = String(finalDuration);  // 聚鑫: "15"
      } else {
        body.duration = String(finalDuration); // 贞贞: "15"
      }

      // 转换画面方向参数（与createVideo保持一致）
      const orientationParam = this._convertOrientationParam(orientation);
      if (this.platform.useAspectRatio) {
        // 贞贞平台使用 aspect_ratio
        body.aspect_ratio = orientationParam;
      } else {
        // 聚鑫平台使用 orientation (portrait/landscape)
        body.orientation = orientationParam;
      }

      // 转换分辨率参数（与createVideo保持一致）
      if (this.platform.useAspectRatio) {
        // 贞贞平台使用 hd (boolean)
        if (typeof size === 'boolean') {
          body.hd = size;
        } else if (size === 'large') {
          body.hd = true;
        } else {
          body.hd = false;
        }
      } else {
        // 聚鑫平台使用 size (small/large)
        body.size = size === 'large' ? 'large' : 'small';
      }

      // ⚠️ 重要：聚鑫平台没有专门的故事板API
      // - 聚鑫：使用普通视频API + 特殊格式提示词
      // - 贞贞：使用故事板专用API
      let result;
      if (this.platformType === 'JUXIN') {
        // 聚鑫平台：使用普通视频API（createVideo）
        console.log('[Sora2Client] 聚鑫使用普通视频API（非故事板端点）');
        result = await this.createVideo({
          model: finalModel,
          prompt,
          orientation,
          size,
          duration: finalDuration,  // 使用总时长
          watermark,
          private: isPrivate,
          images: allImages,  // 聚鑫普通API支持images数组
        });
      } else {
        // 贞贞平台：使用故事板专用API
        console.log('[Sora2Client] 贞贞使用故事板API');
        const response = await this.client.post(this.platform.storyboardEndpoint, body, {
          headers: this._getAuthHeaders(),
        });
        result = {
          success: true,
          data: response.data,
        };
      }

      return result;
    } catch (error) {
      // 打印详细错误信息用于调试
      console.error('[Sora2Client] Storyboard API Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data,
        }
      });

      // 尝试提取详细错误信息
      let errorMessage = error.message;
      if (error.response?.data) {
        const data = error.response.data;
        errorMessage = data.message || data.error || data.detail || JSON.stringify(data);
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 创建角色（从视频中提取）
   * ⚠️ 重要：不要传递 model 参数！
   * @param {object} options - 角色创建参数
   * @param {string} options.url - 视频链接
   * @param {string} options.timestamps - 角色出现时间范围 "1,3"
   * @param {string} [options.from_task] - 任务 ID（与 url 二选一）
   * @returns {Promise<object>} 角色信息
   */
  async createCharacter(options) {
    try {
      const { url, timestamps, from_task } = options;

      if (!timestamps) {
        throw new Error('timestamps 是必填参数');
      }
      if (!url && !from_task) {
        throw new Error('url 和 from_task 必须提供一个');
      }

      // 时间范围校验
      const [start, end] = timestamps.split(',').map(Number);
      const diff = end - start;
      if (diff < 1 || diff > 3) {
        throw new Error('timestamps 范围差值必须是 1-3 秒');
      }

      // 构建请求体（不包含 model 参数！）
      const body = {
        timestamps,
      };
      if (url) {
        body.url = url;
      }
      if (from_task) {
        body.from_task = from_task;
      }

      const response = await this.client.post('/sora/v1/characters', body, {
        headers: this._getAuthHeaders(),
      });

      return {
        success: true,
        data: {
          id: response.data.id,
          username: response.data.username,
          permalink: response.data.permalink,
          profile_picture_url: response.data.profile_picture_url,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * 查询任务状态
   * @param {string} taskId - 任务 ID
   * @returns {Promise<object>} 任务状态（统一格式）
   */
  async getTaskStatus(taskId) {
    try {
      if (!taskId) {
        throw new Error('taskId 是必填参数');
      }

      let response;
      // 根据平台使用不同的端点
      if (this.platformType === 'ZHENZHEN') {
        // 贞贞平台: 使用统一格式端点
        response = await this.client.get(`/v2/videos/generations/${taskId}`, {
          headers: this._getAuthHeaders(),
        });
        // 贞贞平台返回格式已经是统一的，直接返回
        return {
          success: true,
          data: response.data,
        };
      } else {
        // 聚鑫平台: 使用统一格式端点 /v1/video/query?id={taskId}
        response = await this.client.get('/v1/video/query', {
          params: { id: taskId },
          headers: this._getAuthHeaders(),
        });

        // 聚鑫平台返回的统一格式需要映射字段
        const juxinData = response.data;
        const unifiedData = {
          task_id: juxinData.id,
          platform: 'openai',
          action: 'sora-video',
          status: this._convertJuxinStatus(juxinData.status),
          fail_reason: juxinData.fail_reason || '',
          submit_time: juxinData.created_at || juxinData.status_update_time,
          start_time: juxinData.created_at,
          finish_time: juxinData.completed_at,
          progress: this._extractProgress(juxinData) || 0,
          data: null,
        };

        // 从聚鑫平台响应中提取视频URL
        // 优先检查顶层的 video_url
        if (juxinData.video_url) {
          unifiedData.data = { output: juxinData.video_url };
        }
        // 然后检查 detail.url
        else if (juxinData.detail?.url) {
          unifiedData.data = { output: juxinData.detail.url };
        }
        // 最后检查 detail 中的其他可能字段
        else if (juxinData.detail?.draft_info?.downloadable_url) {
          unifiedData.data = { output: juxinData.detail.draft_info.downloadable_url };
        }

        return {
          success: true,
          data: unifiedData,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * 转换聚鑫状态到统一格式
   * @private
   * @param {string} juxinStatus - 聚鑫状态 (pending, processing, completed, failed)
   * @returns {string} 统一状态 (NOT_START, IN_PROGRESS, SUCCESS, FAILURE)
   */
  _convertJuxinStatus(juxinStatus) {
    const statusMap = {
      'queued': 'IN_PROGRESS',
      'pending': 'NOT_START',
      'processing': 'IN_PROGRESS',
      'in_progress': 'IN_PROGRESS',
      'completed': 'SUCCESS',
      'succeeded': 'SUCCESS',
      'failed': 'FAILURE',
      'error': 'FAILURE',
    };
    return statusMap[juxinStatus] || juxinStatus.toUpperCase();
  }

  /**
   * 从聚鑫响应中提取进度百分比
   * @private
   * @param {object} juxinData - 聚鑫响应数据
   * @returns {number} 进度百分比
   */
  _extractProgress(juxinData) {
    if (juxinData.detail?.pending_info?.progress_pct !== undefined) {
      return Math.round(juxinData.detail.pending_info.progress_pct * 100);
    }
    if (typeof juxinData.progress === 'number') {
      return juxinData.progress;
    }
    return 0;
  }

  /**
   * 轮询等待任务完成
   * @param {string} taskId - 任务 ID
   * @param {object} options - 轮询选项
   * @param {number} [options.interval=30000] - 轮询间隔（毫秒，默认30秒）
   * @param {number} [options.timeout=600000] - 超时时间（毫秒）
   * @param {function} [options.onProgress] - 进度回调
   * @param {boolean} [options.autoDownload=false] - 是否自动下载视频
   * @param {string} [options.downloadDir] - 下载目录（默认：./downloads）
   * @returns {Promise<object>} 任务结果
   */
  async waitForTask(taskId, options = {}) {
    const {
      interval = 30000, // 默认30秒，sora2生成需要3-5分钟
      timeout = 600000,
      onProgress = null,
      autoDownload = false,
      downloadDir = null,
    } = options;

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = await this.getTaskStatus(taskId);

      if (!result.success) {
        return result;
      }

      const { data } = result;
      const status = data.status;

      // 调用进度回调
      if (onProgress) {
        onProgress(data);
      }

      // 检查状态
      if (status === 'SUCCESS') {
        const result = {
          success: true,
          data: data,
        };

        // 自动下载视频
        if (autoDownload) {
          try {
            const downloadedPath = await this.downloadVideo(taskId, downloadDir);
            result.downloadedPath = downloadedPath;
          } catch (downloadError) {
            result.downloadError = downloadError.message;
          }
        }

        return result;
      }

      if (status === 'FAILURE') {
        return {
          success: false,
          error: data.fail_reason || '任务执行失败',
        };
      }

      // 继续等待
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    return {
      success: false,
      error: '任务超时',
    };
  }

  /**
   * 下载视频到本地
   * @param {string} taskId - 任务 ID
   * @param {string} [downloadDir] - 下载目录（默认：./downloads）
   * @returns {Promise<string>} 下载后的文件路径
   */
  async downloadVideo(taskId, downloadDir = null) {
    try {
      // 先获取任务状态，获取视频 URL
      const statusResult = await this.getTaskStatus(taskId);

      if (!statusResult.success) {
        throw new Error(`获取任务状态失败: ${statusResult.error}`);
      }

      const taskData = statusResult.data;

      // 检查任务是否完成
      if (taskData.status !== 'SUCCESS') {
        throw new Error(`任务未完成，当前状态: ${taskData.status}`);
      }

      // 获取视频 URL（根据不同平台）
      let videoUrl = null;
      if (taskData.data && taskData.data.output) {
        // 贞贞平台：data.output
        videoUrl = taskData.data.output;
      } else if (taskData.video_url) {
        // 聚鑫平台：video_url
        videoUrl = taskData.video_url;
      }

      if (!videoUrl) {
        throw new Error('未找到视频 URL');
      }

      // 设置下载目录
      const targetDir = downloadDir || path.join(process.cwd(), 'downloads');

      // 确保目录存在
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // 从 URL 中提取文件名，或使用任务 ID 生成文件名
      let fileName = taskId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const urlMatch = videoUrl.match(/\/([^/]+\.mp4)/);
      if (urlMatch && urlMatch[1]) {
        fileName = urlMatch[1];
      } else {
        fileName = `${fileName}.mp4`;
      }

      const filePath = path.join(targetDir, fileName);

      // 下载视频
      const response = await axios({
        method: 'GET',
        url: videoUrl,
        responseType: 'stream',
        timeout: 300000, // 5分钟超时
      });

      // 写入文件
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filePath));
        writer.on('error', (err) => reject(err));
      });
    } catch (error) {
      throw new Error(`下载视频失败: ${error.message}`);
    }
  }

  /**
   * 切换平台
   * @param {string} platform - 平台名称 ('juxin' | 'zhenzhen')
   */
  switchPlatform(platform) {
    const platformKey = platform.toUpperCase();
    this.platform = PLATFORMS[platformKey] || PLATFORMS.JUXIN;
    this.platformType = platformKey;
    this.client.defaults.baseURL = this.platform.baseURL;
  }
}

module.exports = Sora2Client;
