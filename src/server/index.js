/**
 * WinJin HTTP 服务器
 * 端口 9000
 * 提供视频生成和角色创建接口
 */

// 加载环境变量
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const Sora2Client = require('./sora2-client');
const BatchQueue = require('./batch-queue');
const HistoryStorage = require('./history-storage');
const CharacterStorage = require('./character-storage');

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
      client = getClient(platform);
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
    const { platform = 'zhenzhen', url, timestamps, from_task } = req.body;
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

// ==================== 历史记录 ====================

/**
 * 获取所有历史记录
 * GET /api/history/list
 */
app.get('/api/history/list', (req, res) => {
  try {
    const { limit, skip, status, platform } = req.query;
    const records = historyStorage.getAllRecords({
      limit: limit ? parseInt(limit) : undefined,
      skip: skip ? parseInt(skip) : undefined,
      status,
      platform,
    });
    res.json({ success: true, data: records });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 获取统计信息
 * GET /api/history/stats
 * 必须放在 /api/history/:taskId 之前，否则会被拦截
 */
app.get('/api/history/stats', (req, res) => {
  try {
    const stats = historyStorage.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 获取单条历史记录
 * GET /api/history/:taskId
 */
app.get('/api/history/:taskId', (req, res) => {
  try {
    const { taskId } = req.params;
    const record = historyStorage.getRecord(taskId);
    if (!record) {
      return res.json({ success: false, error: 'Record not found' });
    }
    res.json({ success: true, data: record });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 删除历史记录
 * DELETE /api/history/:taskId
 */
app.delete('/api/history/:taskId', (req, res) => {
  try {
    const { taskId } = req.params;
    const deleted = historyStorage.deleteRecord(taskId);
    res.json({ success: true, data: { deleted } });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 设置收藏状态
 * PUT /api/history/:taskId/favorite
 */
app.put('/api/history/:taskId/favorite', (req, res) => {
  try {
    const { taskId } = req.params;
    const { favorite } = req.body;

    if (typeof favorite !== 'boolean') {
      return res.json({ success: false, error: 'favorite 必须是布尔值' });
    }

    // 先获取记录
    const record = historyStorage.getRecord(taskId);
    if (!record) {
      return res.json({ success: false, error: '记录不存在' });
    }

    // 更新记录
    const success = historyStorage.updateRecord(taskId, { favorite });
    if (!success) {
      return res.json({ success: false, error: '更新失败' });
    }

    // 返回更新后的记录
    const updated = historyStorage.getRecord(taskId);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 获取收藏列表
 * GET /api/history/favorites
 */
app.get('/api/history/favorites', (req, res) => {
  try {
    const allRecords = historyStorage.getAllRecords();
    const favorites = allRecords.filter(r => r.favorite === true);
    res.json({ success: true, data: favorites });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * 清空所有历史记录
 * DELETE /api/history/all
 */
app.delete('/api/history/all', (req, res) => {
  try {
    historyStorage.clearAll();
    res.json({ success: true, data: { message: 'All records cleared' } });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ==================== 备份管理 ====================

/**
 * GET /api/backup/export
 * 导出所有数据（历史记录 + 角色库）
 */
app.get('/api/backup/export', (req, res) => {
  try {
    const backup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {
        history: historyStorage.getAllRecords(),
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
 * Body: { history: [], characters: [] }
 */
app.post('/api/backup/import', (req, res) => {
  try {
    const { history, characters } = req.body;

    if (!history && !characters) {
      return res.json({ success: false, error: 'No data provided' });
    }

    const result = {
      history: { imported: 0, skipped: 0, errors: [] },
      characters: { imported: 0, skipped: 0, errors: [] },
    };

    // 导入历史记录
    if (Array.isArray(history)) {
      history.forEach((record) => {
        try {
          if (record.taskId) {
            // 检查是否已存在
            const existing = historyStorage.getRecord(record.taskId);
            if (!existing) {
              historyStorage.addRecord(record);
              result.history.imported++;
            } else {
              result.history.skipped++;
            }
          }
        } catch (error) {
          result.history.errors.push({ record, error: error.message });
        }
      });
    }

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
      message: `导入完成：历史记录 ${result.history.imported} 条，角色 ${result.characters.imported} 个`,
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
    const historyStats = historyStorage.getStats();
    const characterStats = characterStorage.getStats();

    res.json({
      success: true,
      data: {
        history: {
          total: historyStats.total || 0,
          queued: historyStats.queued || 0,
          processing: historyStats.processing || 0,
          completed: historyStats.completed || 0,
          failed: historyStats.failed || 0,
        },
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

async function checkAndUpdateTask(taskId, platform) {
  try {
    const client = getClient(platform);
    const result = await client.getTaskStatus(taskId);

    if (result.success && result.data) {
      const { status, data } = result.data;

      // 任务完成
      if (status === 'SUCCESS' && data) {
        historyStorage.markCompleted(taskId, data);
        console.log(`[轮询] 任务完成: ${taskId}`);
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
        await checkAndUpdateTask(record.taskId, record.platform);
      }
    } catch (error) {
      console.error('[轮询] 服务错误:', error.message);
    }
  }, POLL_INTERVAL);

  console.log(`[轮询] 服务已启动，间隔 ${POLL_INTERVAL / 1000} 秒`);
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

  // 启动后台轮询服务
  startPollingService();
});

module.exports = app;
