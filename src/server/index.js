/**
 * WinJin HTTP 服务器
 * 端口 9000
 * 提供视频生成和角色创建接口
 */

// 加载环境变量
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const Sora2Client = require('./sora2-client');
const BatchQueue = require('./batch-queue');
const HistoryStorage = require('./history-storage');
const CharacterStorage = require('./character-storage');
const configManager = require('./config-manager'); // 单例实例
const openaiRoutes = require('./routes/openai');

const app = express();
const PORT = 9000;

// 创建批量任务队列实例
const batchQueue = new BatchQueue();

// 创建历史记录存储实例
const historyStorage = new HistoryStorage();

// 创建角色库存储实例
const characterStorage = new CharacterStorage();

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// 静态文件服务
app.use(express.static('src/renderer/public'));
// ⭐ 添加 downloads 目录的静态文件服务（用于本地视频播放）
app.use('/downloads', express.static('downloads'));

// 创建 Sora2 客户端实例
const sora2Clients = {
  juxin: new Sora2Client({ platform: 'juxin' }),
  zhenzhen: new Sora2Client({ platform: 'zhenzhen' }),
};

/**
 * 获取平台客户端
 * @param {string} platform - 平台名称 ('juxin' | 'zhenzhen')
 * @returns {Sora2Client}
 */
function getClient(platform = 'juxin') {
  return sora2Clients[platform] || sora2Clients.juxin;
}

// ==================== 健康检查 ====================

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'WinJin Server is running', port: PORT });
});

// ==================== 视频生成 ====================

/**
 * 创建视频（文生视频）
 * POST /api/video/create
 */
app.post('/api/video/create', async (req, res) => {
  try {
    const { platform = 'juxin', prompt, model, apiKey, workflowSnapshot, ...options } = req.body;

    // 如果请求提供了 apiKey，创建临时客户端实例
    let client;
    if (apiKey && apiKey.trim()) {
      const { Sora2Client } = require('./sora2-client');
      client = new Sora2Client({ platform, apiKey: apiKey.trim() });
    } else {
      // ⭐ 获取平台的模型配置（用于模型专属 Key）
      const platforms = configManager.getPlatforms();
      const platformData = platforms.find(p => p.key === platform || p.id === platform);

      // 创建客户端实例并传入模型配置
      const { Sora2Client } = require('./sora2-client');
      client = new Sora2Client({
        platform,
        models: platformData?.models ?
          Object.fromEntries(platformData.models.map(m => [m.id, m])) :
          null
      });
    }

    const result = await client.createVideo(req.body);

    // 保存到历史记录
    if (result.success && result.data) {
      // 贞贞平台返回 task_id，聚鑫平台返回 id
      const taskId = result.data.id || result.data.task_id;
      if (taskId) {
        historyStorage.addRecord({
          taskId: taskId,
          platform,
          prompt,
          model,
          options,
          workflowSnapshot: workflowSnapshot || null,
        });
      }
    }

    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 创建视频（带角色参考）
 * POST /api/video/create-with-character
 */
app.post('/api/video/create-with-character', async (req, res) => {
  try {
    const { platform = 'juxin', prompt, model, apiKey, workflowSnapshot, ...options } = req.body;
    const client = getClient(platform);
    const result = await client.createVideoWithCharacter(req.body);

    // 保存到历史记录
    if (result.success && result.data && result.data.id) {
      historyStorage.addRecord({
        taskId: result.data.id,
        platform,
        prompt,
        model,
        options: { ...options, type: 'character' },
        workflowSnapshot: workflowSnapshot || null,
      });
    }

    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 创建故事板视频（批量生成多个镜头）
 * POST /api/video/storyboard
 */
app.post('/api/video/storyboard', async (req, res) => {
  try {
    const { platform = 'juxin', shots, model, apiKey, workflowSnapshot, ...options } = req.body;

    // 如果请求提供了 apiKey，创建临时客户端实例
    let client;
    if (apiKey && apiKey.trim()) {
      const { Sora2Client } = require('./sora2-client');
      client = new Sora2Client({ platform, apiKey: apiKey.trim() });
    } else {
      client = getClient(platform);
    }

    const result = await client.createStoryboardVideo({ shots, ...options, workflowSnapshot });

    // 保存到历史记录
    if (result.success && result.data && result.data.id) {
      historyStorage.addRecord({
        taskId: result.data.id,
        platform,
        prompt: `Storyboard: ${shots.length} shots`,
        model,
        options: { ...options, type: 'storyboard', shots },
        workflowSnapshot: workflowSnapshot || null,
      });
    }

    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ==================== 角色管理 ====================

/**
 * 创建角色（从视频中提取）
 * POST /api/character/create
 */
app.post('/api/character/create', async (req, res) => {
  try {
    const { platform = 'zhenzhen', url, timestamps, from_task, alias } = req.body;
    const client = getClient(platform);
    const result = await client.createCharacter({ url, timestamps, from_task });

    // 保存到角色库
    if (result.success && result.data) {
      characterStorage.addCharacter({
        id: result.data.id,
        username: result.data.username,
        permalink: result.data.permalink,
        profilePictureUrl: result.data.profile_picture_url,
        sourceVideoUrl: url,
        platform: platform,
        timestamps: timestamps,
        fromTask: from_task,
        alias: alias || '',  // ⭐ 修复：传递别名参数
      });
    }

    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ==================== 角色库管理 ====================

/**
 * 获取角色库列表
 * GET /api/character/list
 */
app.get('/api/character/list', (req, res) => {
  try {
    const { limit, skip, platform } = req.query;
    const characters = characterStorage.getAllCharacters({
      limit: limit ? parseInt(limit) : undefined,
      skip: skip ? parseInt(skip) : undefined,
      platform,
    });
    res.json({ success: true, data: characters });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 获取角色库统计信息
 * GET /api/character/stats
 */
app.get('/api/character/stats', (req, res) => {
  try {
    const stats = characterStorage.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 获取单个角色详情
 * GET /api/character/:characterId
 */
app.get('/api/character/:characterId', (req, res) => {
  try {
    const { characterId } = req.params;
    const character = characterStorage.getCharacter(characterId);
    if (!character) {
      return res.json({ success: false, error: 'Character not found' });
    }
    res.json({ success: true, data: character });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 搜索角色
 * GET /api/character/search/:query
 */
app.get('/api/character/search/:query', (req, res) => {
  try {
    const { query } = req.params;
    const characters = characterStorage.searchCharacters(query);
    res.json({ success: true, data: characters });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 删除角色
 * DELETE /api/character/:characterId
 */
app.delete('/api/character/:characterId', (req, res) => {
  try {
    const { characterId } = req.params;
    const deleted = characterStorage.deleteCharacter(characterId);
    res.json({ success: true, data: { deleted } });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 清空所有角色
 * DELETE /api/character/all
 */
app.delete('/api/character/all', (req, res) => {
  try {
    characterStorage.clearAll();
    res.json({ success: true, data: { message: 'All characters cleared' } });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 设置角色别名
 * PUT /api/character/:characterId/alias
 */
app.put('/api/character/:characterId/alias', (req, res) => {
  try {
    const { characterId } = req.params;
    const { alias } = req.body;

    if (alias === undefined || alias === null) {
      return res.json({ success: false, error: 'alias 是必填参数' });
    }

    const updated = characterStorage.updateCharacter(characterId, { alias: String(alias).trim() });
    if (!updated) {
      return res.json({ success: false, error: 'Character not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 设置角色收藏状态 ⭐ 新增
 * PUT /api/character/:username/favorite
 * 注意：参数名是 username（不是 ID），使用 updateByUsername 方法
 */
app.put('/api/character/:username/favorite', (req, res) => {
  try {
    const { username } = req.params;
    const { favorite } = req.body;

    // 使用 updateByUsername 方法（按 username 查找）
    const updated = characterStorage.updateByUsername(username, {
      favorite: !!favorite,
      favoritedAt: !!favorite ? new Date().toISOString() : null
    });
    if (!updated) {
      return res.json({ success: false, error: 'Character not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 获取收藏的角色列表 ⭐ 新增
 * GET /api/character/favorites
 */
app.get('/api/character/favorites', (req, res) => {
  try {
    const allCharacters = characterStorage.getAllCharacters();
    const favorites = allCharacters.filter(c => c.favorite === true);
    res.json({ success: true, data: favorites });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ==================== 任务查询 ====================

/**
 * 查询任务状态
 * GET /api/task/:taskId
 */
app.get('/api/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { platform = 'juxin' } = req.query;
    const client = getClient(platform);
    const result = await client.getTaskStatus(taskId);

    // 自动更新历史记录
    if (result.success && result.data) {
      const { status, data } = result.data;

      // 任务完成
      if (status === 'SUCCESS' && data) {
        historyStorage.markCompleted(taskId, data);

        // ⭐ 检查是否有本地下载路径
        const record = historyStorage.getRecord(taskId);
        if (record?.downloadedPath) {
          // 优先返回本地路径
          result.data.data = { ...data, output: `/downloads/${path.basename(record.downloadedPath)}`, localPath: true };
          console.log(`[API] 返回本地视频路径: ${record.downloadedPath}`);
        }
      }
      // 任务失败
      else if (status === 'FAILURE') {
        historyStorage.markFailed(taskId, data?.fail_reason || 'Task failed');
      }
      // 处理中
      else if (status === 'IN_PROGRESS') {
        historyStorage.updateRecord(taskId, { status: 'processing' });
      }
    }

    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 轮询等待任务完成
 * GET /api/task/:taskId/wait
 */
app.get('/api/task/:taskId/wait', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { platform = 'juxin', interval = 30000, timeout = 600000 } = req.query;
    const client = getClient(platform);
    const result = await client.waitForTask(taskId, {
      interval: parseInt(interval),
      timeout: parseInt(timeout),
    });

    // 更新历史记录
    if (result.success && result.data) {
      const { status, data } = result.data;

      if (status === 'SUCCESS' && data) {
        historyStorage.markCompleted(taskId, data);
      } else if (status === 'FAILURE') {
        historyStorage.markFailed(taskId, data?.fail_reason || 'Task failed');
      } else if (status === 'IN_PROGRESS') {
        historyStorage.updateRecord(taskId, { status: 'processing' });
      }
    }

    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 下载视频
 * POST /api/video/download
 * Body: { taskId, platform, downloadDir }
 */
app.post('/api/video/download', async (req, res) => {
  try {
    const { taskId, platform = 'juxin', downloadDir } = req.body;
    if (!taskId) {
      return res.json({ success: false, error: 'taskId 是必填参数' });
    }
    const client = getClient(platform);
    const filePath = await client.downloadVideo(taskId, downloadDir);

    // 记录下载路径到历史记录
    historyStorage.recordDownload(taskId, filePath);

    res.json({ success: true, data: { filePath } });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ==================== 平台切换 ====================

/**
 * 切换默认平台
 * POST /api/platform/switch
 */
app.post('/api/platform/switch', (req, res) => {
  try {
    const { platform } = req.body;
    if (platform && sora2Clients[platform]) {
      sora2Clients[platform].switchPlatform(platform);
      res.json({ success: true, message: `Switched to ${platform}` });
    } else {
      res.json({ success: false, error: 'Invalid platform' });
    }
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 获取平台列表
 * GET /api/platform/list
 */
app.get('/api/platform/list', (req, res) => {
  res.json({
    success: true,
    data: {
      juxin: { name: '聚鑫', baseURL: 'https://api.jxincm.cn' },
      zhenzhen: { name: '贞贞', baseURL: 'https://ai.t8star.cn' },
    },
  });
});

// ==================== 批量任务队列 ====================

/**
 * 创建批量任务
 * POST /api/batch/create
 * Body: { platform: 'juxin', jobs: [{ prompt, model, ... }, ...] }
 */
app.post('/api/batch/create', async (req, res) => {
  try {
    const { platform = 'juxin', jobs } = req.body;
    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return res.json({ success: false, error: 'jobs 必须是非空数组' });
    }
    const batchId = batchQueue.createBatch(platform, jobs);
    res.json({ success: true, data: { batchId } });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 提交批量任务（逐一提交，收集任务 ID）
 * POST /api/batch/:batchId/submit
 */
app.post('/api/batch/:batchId/submit', async (req, res) => {
  try {
    const { batchId } = req.params;
    const result = await batchQueue.submitBatch(batchId);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * ⭐ 重试失败的任务（修改提示词后重新提交）
 * POST /api/batch/:batchId/retry
 */
app.post('/api/batch/:batchId/retry', async (req, res) => {
  try {
    const { batchId } = req.params;
    const { jobId, prompt } = req.body;

    if (!jobId || !prompt) {
      return res.json({ success: false, error: 'Missing required parameters: jobId, prompt' });
    }

    const result = await batchQueue.retryJob(batchId, jobId, prompt);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 轮询批量任务状态（从第一个开始，完成后查询下一个）
 * GET /api/batch/:batchId/poll
 */
app.get('/api/batch/:batchId/poll', async (req, res) => {
  try {
    const { batchId } = req.params;
    const result = await batchQueue.pollBatch(batchId, {
      onProgress: (progress) => {
        // 可选：通过 SSE 或 WebSocket 推送进度
        console.log('Batch progress:', progress);
      },
    });
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 获取批量任务状态
 * GET /api/batch/:batchId/status
 */
app.get('/api/batch/:batchId/status', (req, res) => {
  try {
    const { batchId } = req.params;
    const result = batchQueue.getBatchStatus(batchId);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 获取所有批量任务列表
 * GET /api/batch/list
 */
app.get('/api/batch/list', (req, res) => {
  try {
    const batches = batchQueue.getAllBatches();
    res.json({ success: true, data: batches });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 删除批量任务
 * DELETE /api/batch/:batchId
 */
app.delete('/api/batch/:batchId', (req, res) => {
  try {
    const { batchId } = req.params;
    const deleted = batchQueue.deleteBatch(batchId);
    res.json({ success: true, data: { deleted } });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ==================== 备份管理 ====================

/**
 * GET /api/backup/export
 * 导出角色库数据
 */
app.get('/api/backup/export', (req, res) => {
  try {
    const backup = {
      version: '2.0',
      timestamp: new Date().toISOString(),
      data: {
        characters: characterStorage.getAllCharacters(),
      },
    };

    res.json({ success: true, data: backup });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * POST /api/backup/import
 * 导入备份数据
 * Body: { characters: [] }
 */
app.post('/api/backup/import', (req, res) => {
  try {
    const { characters } = req.body;

    if (!characters) {
      return res.json({ success: false, error: 'No data provided' });
    }

    const result = {
      characters: { imported: 0, skipped: 0, errors: [] },
    };

    // 导入角色库
    if (Array.isArray(characters)) {
      characters.forEach((character) => {
        try {
          if (character.id) {
            // 检查是否已存在
            const existing = characterStorage.getCharacter(character.id);
            if (!existing) {
              characterStorage.addCharacter(character);
              result.characters.imported++;
            } else {
              result.characters.skipped++;
            }
          }
        } catch (error) {
          result.characters.errors.push({ character, error: error.message });
        }
      });
    }

    res.json({
      success: true,
      data: result,
      message: `导入完成：角色 ${result.characters.imported} 个`,
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * GET /api/backup/info
 * 获取数据统计信息
 */
app.get('/api/backup/info', (req, res) => {
  try {
    const characterStats = characterStorage.getStats();

    res.json({
      success: true,
      data: {
        characters: {
          total: characterStats.total || 0,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ==================== Metrics API ====================

const metricsStorage = require('../../scripts/metrics/metrics-storage');

/**
 * GET /api/metrics
 * 获取所有验证指标
 */
app.get('/api/metrics', (req, res) => {
  try {
    const metrics = metricsStorage.getMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * GET /api/metrics/trends
 * 获取趋势分析数据
 */
app.get('/api/metrics/trends', (req, res) => {
  try {
    const trends = metricsStorage.getTrends();
    res.json({ success: true, data: trends });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * GET /api/metrics/history
 * 获取历史记录
 * Query: limit (可选，默认 10)
 */
app.get('/api/metrics/history', (req, res) => {
  try {
    const { limit } = req.query;
    const history = metricsStorage.getHistory(limit ? parseInt(limit) : 10);
    res.json({ success: true, data: history });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * GET /api/metrics/by-type
 * 获取按类型分组的指标
 */
app.get('/api/metrics/by-type', (req, res) => {
  try {
    const byType = metricsStorage.getMetricsByType();
    res.json({ success: true, data: byType });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * GET /api/metrics/by-date
 * 获取按日期分组的指标
 */
app.get('/api/metrics/by-date', (req, res) => {
  try {
    const byDate = metricsStorage.getMetricsByDate();
    res.json({ success: true, data: byDate });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * POST /api/metrics/clear
 * 清空所有指标数据
 */
app.post('/api/metrics/clear', (req, res) => {
  try {
    metricsStorage.clear();
    res.json({ success: true, message: '指标数据已清空' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ==================== OpenAI API 集成 ====================

app.use('/api/openai', openaiRoutes);

// ==================== 配置管理 API ====================
// ⭐ 必须在全局 404 处理器之前定义

/**
 * 获取完整配置
 * GET /api/config
 */
app.get('/api/config', (req, res) => {
  try {
    const config = configManager.getFullConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 更新用户默认配置
 * PUT /api/config/defaults
 */
app.put('/api/config/defaults', (req, res) => {
  try {
    const { defaults } = req.body;
    const result = configManager.updateUserDefaults(defaults);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 获取平台列表
 * GET /api/config/platforms
 */
app.get('/api/config/platforms', (req, res) => {
  try {
    const platforms = configManager.getPlatforms();
    res.json({ success: true, data: platforms });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 添加自定义平台
 * POST /api/config/platforms
 */
app.post('/api/config/platforms', (req, res) => {
  try {
    const result = configManager.addPlatform(req.body);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 更新平台配置
 * PUT /api/config/platforms/:key
 */
app.put('/api/config/platforms/:key', (req, res) => {
  try {
    const { key } = req.params;
    const result = configManager.updatePlatform(key, req.body);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 删除自定义平台
 * DELETE /api/config/platforms/:key
 */
app.delete('/api/config/platforms/:key', (req, res) => {
  try {
    const { key } = req.params;
    const result = configManager.deletePlatform(key);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 添加文本平台 ⭐ 新增
 * POST /api/config/text-platforms
 *
 * 文本平台使用 OpenAI 格式，自动补全 /v1 后缀
 */
app.post('/api/config/text-platforms', (req, res) => {
  try {
    const result = configManager.addTextPlatform(req.body);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 为平台添加模型
 * POST /api/config/platforms/:key/models
 */
app.post('/api/config/platforms/:key/models', (req, res) => {
  try {
    let { key } = req.params;

    // ⭐ 平台名称到 key 的映射（支持中文名称）
    const nameToKeyMap = {
      '贞贞': 'zhenzhen',
      '聚鑫': 'juxin',
      'zhenzhen': 'zhenzhen',
      'juxin': 'juxin'
    };

    // 如果传入的是中文名称，转换为 key
    if (nameToKeyMap[key]) {
      key = nameToKeyMap[key];
    }

    const result = configManager.addModelToPlatform(key, req.body);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 获取文本模型列表
 * GET /api/config/text-models
 */
app.get('/api/config/text-models', (req, res) => {
  try {
    const textModels = configManager.getTextModels();
    res.json({ success: true, data: textModels });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 删除文本平台 ⭐ 新增
 * DELETE /api/config/text-platforms/:key
 */
app.delete('/api/config/text-platforms/:key', (req, res) => {
  try {
    const { key } = req.params;
    const result = configManager.deleteTextPlatform(key);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 从文本平台移除模型 ⭐ 新增
 * DELETE /api/config/text-platforms/:key/models/:modelId
 */
app.delete('/api/config/text-platforms/:key/models/:modelId', (req, res) => {
  try {
    const { key, modelId } = req.params;
    const result = configManager.deleteModelFromTextPlatform(key, modelId);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 从平台移除模型 ⭐ 新增
 * DELETE /api/config/platforms/:key/models/:modelId
 */
app.delete('/api/config/platforms/:key/models/:modelId', (req, res) => {
  try {
    let { key, modelId } = req.params;

    // 平台名称到 key 的映射
    const nameToKeyMap = {
      '贞贞': 'zhenzhen',
      '聚鑫': 'juxin',
      'zhenzhen': 'zhenzhen',
      'juxin': 'juxin'
    };

    if (nameToKeyMap[key]) {
      key = nameToKeyMap[key];
    }

    const result = configManager.removeModelFromPlatform(key, modelId);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 更新平台模型 ⭐ 新增
 * PUT /api/config/platforms/:key/models/:modelId
 */
app.put('/api/config/platforms/:key/models/:modelId', (req, res) => {
  try {
    let { key, modelId } = req.params;

    // 平台名称到 key 的映射
    const nameToKeyMap = {
      '贞贞': 'zhenzhen',
      '聚鑫': 'juxin',
      'zhenzhen': 'zhenzhen',
      'juxin': 'juxin'
    };

    if (nameToKeyMap[key]) {
      key = nameToKeyMap[key];
    }

    const result = configManager.updateModelInPlatform(key, modelId, req.body);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 更新平台设置（baseURL、端点等）⭐ 新增
 * PUT /api/config/platforms/:key/settings
 */
app.put('/api/config/platforms/:key/settings', (req, res) => {
  try {
    let { key } = req.params;

    // 平台名称到 key 的映射
    const nameToKeyMap = {
      '贞贞': 'zhenzhen',
      '聚鑫': 'juxin',
      'zhenzhen': 'zhenzhen',
      'juxin': 'juxin'
    };

    if (nameToKeyMap[key]) {
      key = nameToKeyMap[key];
    }

    const result = configManager.updatePlatformSettings(key, req.body);
    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 测试指定模型的 API Key ⭐ 简化版（仅模型 Key）
 * POST /api/config/test-model
 */
app.post('/api/config/test-model', async (req, res) => {
  try {
    const { platform, modelId, baseURL } = req.body;

    if (!platform || !modelId || !baseURL) {
      return res.json({ success: false, error: '缺少必要参数' });
    }

    const { Sora2Client } = require('./sora2-client');
    const configManager = require('./config-manager');

    // 加载平台和模型配置
    const platforms = configManager.getPlatforms();
    const platformData = platforms.find(p => p.key === platform || p.id === platform);

    if (!platformData) {
      return res.json({ success: false, error: `平台 ${platform} 不存在` });
    }

    const model = platformData.models.find(m => m.id === modelId);
    if (!model) {
      return res.json({ success: false, error: `模型 ${modelId} 不存在` });
    }

    // ⭐ 只获取模型的 API Key（无降级）
    const apiKey = model.apiKey || '';

    if (!apiKey) {
      return res.json({
        success: true,
        data: {
          valid: false,
          message: `⚠️ 模型 ${model.name} 未配置 API Key`
        }
      });
    }

    // 创建客户端并测试
    const client = new Sora2Client({ platform: platformData, models: Object.fromEntries(platformData.models.map(m => [m.id, m])) });

    // 调用测试接口
    let apiResponse;
    try {
      if (platform === 'zhenzhen' || platform === '贞贞') {
        apiResponse = await client.client.get(`/v2/videos/generations/test_validation_${Date.now()}`, {
          timeout: 10000,
          validateStatus: () => true
        });
      } else {
        apiResponse = await client.client.get('/v1/video/query', {
          timeout: 10000,
          validateStatus: () => true,
          params: { id: 'test_validation' }
        });
      }
    } catch (error) {
      return res.json({
        success: true,
        data: {
          valid: false,
          message: `❌ 测试失败: ${error.message}`
        }
      });
    }

    // 判断结果
    const isValid = apiResponse.status === 401 || apiResponse.status === 403
      ? false
      : apiResponse.status >= 200 && apiResponse.status < 500;

    const message = isValid
      ? `✅ ${model.name} API Key 有效`
      : apiResponse.status === 401
        ? `❌ ${model.name} API Key 无效 (401)`
        : apiResponse.status === 403
          ? `❌ ${model.name} API Key 无效 (403)`
          : `⚠️ ${model.name} 返回异常 (${apiResponse.status})`;

    res.json({
      success: true,
      data: {
        valid: isValid,
        status: apiResponse.status,
        message: message
      }
    });

  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 测试平台连接 ⭐ 完整测试（API Key + 模型）
 * POST /api/config/test-connection
 */
app.post('/api/config/test-connection', async (req, res) => {
  try {
    const { platform, baseURL } = req.body;

    if (!platform || !baseURL) {
      return res.json({ success: false, error: '缺少必要参数' });
    }

    console.log(`[测试连接] 平台: ${platform}, BaseURL: ${baseURL}`);

    const axios = require('axios');
    const Sora2Client = require('./sora2-client');

    // 获取平台的 API Key
    let apiKey = '';
    if (platform === 'zhenzhen' || platform === '贞贞') {
      apiKey = process.env.ZHENZHEN_API_KEY || process.env.SORA2_API_KEY || '';
    } else {
      apiKey = process.env.SORA2_API_KEY || '';
    }

    if (!apiKey) {
      return res.json({
        success: true,
        data: {
          valid: false,
          message: '⚠️ 未配置 API Key，请在后端 .env 文件中配置'
        }
      });
    }

    console.log(`[测试连接] 使用 API Key: ${apiKey.substring(0, 10)}...`);

    // 创建 Sora2 客户端实例
    const client = new Sora2Client({ apiKey, platform });

    // 测试查询接口（使用一个假的任务ID）
    const testTaskId = 'test_validation_' + Date.now();

    let apiResponse;
    try {
      if (platform === 'zhenzhen' || platform === '贞贞') {
        // 贞贞平台：查询任务状态接口
        apiResponse = await client.client.get(`/v2/videos/generations/${testTaskId}`, {
          timeout: 10000,
          validateStatus: () => true
        });
      } else {
        // 聚鑫平台：查询任务状态接口
        apiResponse = await client.client.get('/v1/video/query', {
          timeout: 10000,
          validateStatus: () => true,
          params: { id: testTaskId }
        });
      }

      console.log(`[测试连接] API 响应状态码: ${apiResponse.status}`);

      // 判断 API Key 是否有效
      if (apiResponse.status === 401 || apiResponse.status === 403) {
        return res.json({
          success: true,
          data: {
            valid: false,
            status: apiResponse.status,
            message: `❌ API Key 无效 (状态码: ${apiResponse.status})`
          }
        });
      }

      if (apiResponse.status >= 200 && apiResponse.status < 500) {
        return res.json({
          success: true,
          data: {
            valid: true,
            status: apiResponse.status,
            message: `✅ 平台连接正常，API Key 有效`
          }
        });
      }

      return res.json({
        success: true,
        data: {
          valid: false,
          status: apiResponse.status,
          message: `⚠️ 平台返回异常 (状态码: ${apiResponse.status})`
        }
      });

    } catch (error) {
      console.log(`[测试连接] API 调用错误:`, error.message);

      // 网络错误
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return res.json({
          success: true,
          data: {
            valid: false,
            message: `❌ 无法连接到平台: ${error.message}`
          }
        });
      }

      return res.json({
        success: true,
        data: {
          valid: false,
          message: `❌ 测试失败: ${error.message}`
        }
      });
    }

  } catch (error) {
    console.log(`[测试连接] 系统错误:`, error);

    res.json({
      success: true,
      data: {
        valid: false,
        message: `❌ 系统错误: ${error.message}`
      }
    });
  }
});

/**
 * 获取并发状态 ⭐ Stage 3
 * GET /api/concurrency/status
 */
app.get('/api/concurrency/status', (req, res) => {
  try {
    const status = concurrencyManager.getStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 更新并发限制 ⭐ Stage 3
 * PUT /api/concurrency/limits
 */
app.put('/api/concurrency/limits', (req, res) => {
  try {
    const { limits } = req.body;
    concurrencyManager.updateLimits(limits);
    res.json({ success: true, data: { message: '并发限制已更新' } });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 获取任务并发状态 ⭐ Stage 3
 * GET /api/concurrency/task/:taskId
 */
app.get('/api/concurrency/task/:taskId', (req, res) => {
  try {
    const { taskId } = req.params;
    const status = concurrencyManager.getTaskStatus(taskId);
    res.json({ success: true, data: status });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ==================== 错误处理 ====================

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ==================== 启动服务器 ====================

// 后台轮询服务：每30秒检查所有 queued 状态的任务
const POLL_INTERVAL = 30000; // 30秒
const MAX_POLLING_AGE = 24 * 60 * 60 * 1000; // 24小时 - 超过此时间的任务不再轮询

async function checkAndUpdateTask(taskId, platform, createdAt) {
  try {
    // ⭐ 新增：时间检查，超过24小时的任务标记为 stale
    if (createdAt) {
      const age = Date.now() - new Date(createdAt).getTime();
      if (age > MAX_POLLING_AGE) {
        historyStorage.updateRecord(taskId, { status: 'stale' });
        console.log(`[轮询] 任务超时（${Math.floor(age / (60 * 60 * 1000))}小时前），标记为 stale: ${taskId}`);
        return;
      }
    }

    const client = getClient(platform);
    const result = await client.getTaskStatus(taskId);

    if (result.success && result.data) {
      const { status, data } = result.data;

      // 任务完成
      if (status === 'SUCCESS' && data) {
        console.log(`[轮询] 任务完成: ${taskId}`);

        // ⭐ 自动下载视频到本地
        let downloadedPath = null;
        try {
          downloadedPath = await client.downloadVideo(taskId);
          console.log(`[轮询] 视频已下载到本地: ${downloadedPath}`);
        } catch (downloadError) {
          console.error(`[轮询] 下载视频失败:`, downloadError.message);
          // 下载失败不影响任务完成状态，只是没有本地路径
        }

        // 保存结果和本地路径
        historyStorage.markCompleted(taskId, data);
        if (downloadedPath) {
          historyStorage.updateRecord(taskId, { downloadedPath });
        }
      }
      // 任务失败
      else if (status === 'FAILURE') {
        historyStorage.markFailed(taskId, data?.fail_reason || 'Task failed');
        console.log(`[轮询] 任务失败: ${taskId}`);
      }
      // 处理中，更新状态但不记录日志（避免刷屏）
      else if (status === 'IN_PROGRESS') {
        historyStorage.updateRecord(taskId, { status: 'processing' });
      }
    }
  } catch (error) {
    console.error(`[轮询] 检查任务失败 ${taskId}:`, error.message);
  }
}

// 启动轮询服务
function startPollingService() {
  // ⭐ 新增：启动时清理旧任务（超过24小时的标记为 stale）
  const staleThreshold = Date.now() - MAX_POLLING_AGE;
  const allRecords = historyStorage.getAllRecords();

  let staleCount = 0;
  allRecords.forEach(record => {
    if ((record.status === 'queued' || record.status === 'processing') &&
        record.createdAt &&
        new Date(record.createdAt).getTime() < staleThreshold) {
      historyStorage.updateRecord(record.taskId, { status: 'stale' });
      staleCount++;
    }
  });

  if (staleCount > 0) {
    console.log(`[轮询] 已标记 ${staleCount} 个旧任务为 stale（超过24小时）`);
  }

  setInterval(async () => {
    try {
      // 获取所有 queued 和 processing 状态的任务
      const queuedTasks = historyStorage.getAllRecords({ status: 'queued' });
      const processingTasks = historyStorage.getAllRecords({ status: 'processing' });
      const allPendingTasks = [...queuedTasks, ...processingTasks];

      if (allPendingTasks.length > 0) {
        console.log(`[轮询] 检查 ${allPendingTasks.length} 个待处理任务...`);
      }

      for (const record of allPendingTasks) {
        // ⭐ 传入 createdAt 参数进行时间检查
        await checkAndUpdateTask(record.taskId, record.platform, record.createdAt);
      }
    } catch (error) {
      console.error('[轮询] 服务错误:', error.message);
    }
  }, POLL_INTERVAL);

  console.log(`[轮询] 服务已启动，间隔 ${POLL_INTERVAL / 1000} 秒（最大轮询时间: 24小时）`);
}

app.listen(PORT, () => {
  console.log(`WinJin Server running on port ${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/health`);
  console.log(`API 文档:`);
  console.log(`  POST /api/video/create - 创建视频`);
  console.log(`  POST /api/video/create-with-character - 创建视频（带角色）`);
  console.log(`  POST /api/video/storyboard - 创建故事板视频（批量）`);
  console.log(`  POST /api/character/create - 创建角色`);
  console.log(`  GET  /api/task/:taskId - 查询任务状态`);
  console.log(`  GET  /api/task/:taskId/wait - 等待任务完成`);
  console.log(`  POST /api/video/download - 下载视频`);
  console.log(`  GET  /api/history/list - 获取历史记录`);
  console.log(`  GET  /api/history/stats - 获取统计信息`);
  console.log(`  POST /api/history/migrate-downloads - 迁移旧记录视频到本地`);

  // 启动后台轮询服务
  startPollingService();
});

module.exports = app;
