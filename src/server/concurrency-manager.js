/**
 * concurrency-manager.js - 并发限制管理器
 *
 * 功能：
 * - 限制同时进行的视频生成任务数量
 * - 队列管理：等待 -> 处理中 -> 完成/失败
 * - 支持不同平台设置不同的并发限制
 */

class ConcurrencyManager {
  constructor() {
    // 并发限制配置（默认值）
    this.limits = {
      juxin: 3,        // 聚鑫平台：最多 3 个并发任务
      zhenzhen: 3,     // 贞贞平台：最多 3 个并发任务
    };

    // 当前正在处理的任务
    this.processing = new Map(); // taskId -> { platform, status, startTime }

    // 等待队列
    this.queue = []; // Array of { taskId, platform, data, resolve, reject }

    // 从配置加载限制
    this.loadLimits();
  }

  /**
   * 从配置管理器加载并发限制
   */
  loadLimits() {
    try {
      const configManager = require('./config-manager');
      const config = configManager.loadUserConfig();

      if (config.concurrencyLimits) {
        this.limits = { ...this.limits, ...config.concurrencyLimits };
        console.log('[ConcurrencyManager] 已加载并发限制:', this.limits);
      }
    } catch (error) {
      console.warn('[ConcurrencyManager] 使用默认并发限制:', this.limits);
    }
  }

  /**
   * 更新并发限制
   */
  updateLimits(newLimits) {
    this.limits = { ...this.limits, ...newLimits };
    console.log('[ConcurrencyManager] 并发限制已更新:', this.limits);

    // 保存到配置
    try {
      const configManager = require('./config-manager');
      configManager.saveUserConfig({
        concurrencyLimits: this.limits,
      });
    } catch (error) {
      console.error('[ConcurrencyManager] 保存并发限制失败:', error);
    }
  }

  /**
   * 获取平台的并发限制
   */
  getLimit(platform) {
    return this.limits[platform] || 2; // 默认 2 个并发
  }

  /**
   * 获取当前处理中的任务数量
   */
  getProcessingCount(platform) {
    return Array.from(this.processing.values())
      .filter(t => t.platform === platform && t.status === 'processing')
      .length;
  }

  /**
   * 检查是否可以立即处理任务
   */
  canProcess(platform) {
    return this.getProcessingCount(platform) < this.getLimit(platform);
  }

  /**
   * 提交任务到队列
   * @param {string} taskId - 任务 ID
   * @param {string} platform - 平台名称
   * @param {object} data - 任务数据
   * @returns {Promise<void>}
   */
  async enqueue(taskId, platform, data) {
    return new Promise((resolve, reject) => {
      const task = { taskId, platform, data, resolve, reject, addedAt: Date.now() };

      // 如果可以立即处理，直接处理
      if (this.canProcess(platform)) {
        this.processing.set(taskId, {
          platform,
          status: 'processing',
          startTime: Date.now(),
        });
        console.log(`[ConcurrencyManager] ✅ 任务 ${taskId} 立即开始处理`);
        resolve();
        return;
      }

      // 否则加入等待队列
      this.queue.push(task);
      console.log(`[ConcurrencyManager] ⏳ 任务 ${taskId} 加入等待队列 (队列长度: ${this.queue.length})`);

      // 记录到 processing 中（状态为 queued）
      this.processing.set(taskId, {
        platform,
        status: 'queued',
        queuedAt: Date.now(),
      });
    });
  }

  /**
   * 标记任务完成
   */
  complete(taskId) {
    const task = this.processing.get(taskId);
    if (task) {
      console.log(`[ConcurrencyManager] ✅ 任务 ${taskId} 完成 (${task.platform})`);
      this.processing.delete(taskId);

      // 处理等待队列
      this.processQueue();
    }
  }

  /**
   * 标记任务失败
   */
  fail(taskId, error) {
    const task = this.processing.get(taskId);
    if (task) {
      console.log(`[ConcurrencyManager] ❌ 任务 ${taskId} 失败 (${task.platform}): ${error}`);
      this.processing.delete(taskId);

      // 处理等待队列
      this.processQueue();
    }
  }

  /**
   * 处理等待队列
   */
  processQueue() {
    // 按加入时间排序（FIFO）
    this.queue.sort((a, b) => a.addedAt - b.addedAt);

    // 尝试处理等待中的任务
    const remaining = [];
    for (const task of this.queue) {
      if (this.canProcess(task.platform)) {
        // 从 processing 中移除旧的 queued 状态
        this.processing.delete(task.taskId);

        // 重新加入为 processing 状态
        this.processing.set(task.taskId, {
          platform: task.platform,
          status: 'processing',
          startTime: Date.now(),
        });

        console.log(`[ConcurrencyManager] 🚀 从队列取出任务 ${task.taskId} (${task.platform})`);
        task.resolve();
      } else {
        remaining.push(task);
      }
    }

    this.queue = remaining;

    if (this.queue.length > 0) {
      console.log(`[ConcurrencyManager] ⏳ 队列中还有 ${this.queue.length} 个任务等待`);
    }
  }

  /**
   * 获取队列状态
   */
  getStatus() {
    const processingByPlatform = {};
    for (const [taskId, task] of this.processing) {
      if (task.status === 'processing') {
        processingByPlatform[task.platform] = (processingByPlatform[task.platform] || 0) + 1;
      }
    }

    const queuedByPlatform = {};
    for (const task of this.queue) {
      queuedByPlatform[task.platform] = (queuedByPlatform[task.platform] || 0) + 1;
    }

    return {
      limits: this.limits,
      processing: processingByPlatform,
      queued: queuedByPlatform,
      totalQueue: this.queue.length,
      totalProcessing: Array.from(this.processing.values()).filter(t => t.status === 'processing').length,
    };
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId) {
    const task = this.processing.get(taskId);
    if (task) {
      return {
        inSystem: true,
        status: task.status, // 'queued' | 'processing'
        platform: task.platform,
      };
    }

    // 检查是否在队列中
    const queuedTask = this.queue.find(t => t.taskId === taskId);
    if (queuedTask) {
      const position = this.queue.indexOf(queuedTask);
      return {
        inSystem: true,
        status: 'queued',
        position: position + 1,
        platform: queuedTask.platform,
      };
    }

    return { inSystem: false };
  }
}

// 单例实例
const concurrencyManager = new ConcurrencyManager();

module.exports = concurrencyManager;
