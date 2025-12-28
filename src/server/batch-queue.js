/**
 * 批量任务队列模块
 * 实现用户描述的批量机制：
 * 1. 提交阶段：逐一提交任务，收集所有任务 ID
 * 2. 轮询阶段：从第一个任务开始查询，完成后查询下一个
 */

const Sora2Client = require('./sora2-client');

class BatchQueue {
  constructor() {
    // 存储批量任务
    this.batches = new Map();
    // 存储任务状态缓存
    this.tasks = new Map();
  }

  /**
   * 创建批量任务
   * @param {string} platform - 平台名称
   * @param {Array} jobs - 任务数组
   * @returns {string} 批量任务 ID
   */
  createBatch(platform, jobs) {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.batches.set(batchId, {
      id: batchId,
      platform: platform,
      jobs: jobs.map((job, index) => ({
        ...job,
        jobId: `job_${index}`,
        status: 'pending',
        taskId: null,
        result: null,
        error: null,
      })),
      status: 'submitting',
      createdAt: Date.now(),
    });
    return batchId;
  }

  /**
   * 提交阶段：逐一提交任务
   * @param {string} batchId - 批量任务 ID
   * @returns {Promise<object>} 提交结果
   */
  async submitBatch(batchId) {
    const batch = this.batches.get(batchId);
    if (!batch) {
      return { success: false, error: 'Batch not found' };
    }

    const client = new Sora2Client({ platform: batch.platform });
    const results = [];

    // 逐一提交任务
    for (const job of batch.jobs) {
      try {
        job.status = 'submitting';
        const result = await client.createVideo(job);
        if (result.success) {
          job.taskId = result.data.id || result.data.task_id;
          job.status = 'submitted';
          results.push({ jobId: job.jobId, success: true, taskId: job.taskId });
        } else {
          job.status = 'failed';
          job.error = result.error;
          results.push({ jobId: job.jobId, success: false, error: result.error });
        }
      } catch (error) {
        job.status = 'failed';
        job.error = error.message;
        results.push({ jobId: job.jobId, success: false, error: error.message });
      }
    }

    batch.status = 'submitted';
    batch.submittedAt = Date.now();

    return {
      success: true,
      data: {
        batchId: batchId,
        totalJobs: batch.jobs.length,
        submittedJobs: batch.jobs.filter((j) => j.status === 'submitted').length,
        failedJobs: batch.jobs.filter((j) => j.status === 'failed').length,
        jobs: results,
      },
    };
  }

  /**
   * 轮询阶段：从第一个任务开始查询，完成后查询下一个
   * @param {string} batchId - 批量任务 ID
   * @param {object} options - 轮询选项
   * @param {boolean} [options.autoDownload=false] - 是否自动下载视频
   * @param {string} [options.downloadDir] - 下载目录
   * @param {number} [options.pollInterval=30000] - 轮询间隔（毫秒）
   * @returns {Promise<object>} 轮询结果
   */
  async pollBatch(batchId, options = {}) {
    const batch = this.batches.get(batchId);
    if (!batch) {
      return { success: false, error: 'Batch not found' };
    }

    if (batch.status !== 'submitted') {
      return { success: false, error: 'Batch not submitted yet' };
    }

    const client = new Sora2Client({ platform: batch.platform });
    const { onProgress, autoDownload = false, downloadDir = null, pollInterval = 30000 } = options;

    // 从第一个任务开始查询
    for (const job of batch.jobs) {
      if (job.status === 'failed') {
        continue; // 跳过已失败的任务
      }

      if (job.status === 'completed') {
        continue; // 跳过已完成的任务
      }

      // 查询任务状态
      try {
        const result = await client.getTaskStatus(job.taskId);
        if (result.success) {
          const taskData = result.data;
          job.taskData = taskData;

          if (taskData.status === 'SUCCESS') {
            job.status = 'completed';
            job.result = taskData.data;

            // 自动下载视频
            if (autoDownload) {
              try {
                const downloadedPath = await client.downloadVideo(job.taskId, downloadDir);
                job.downloadedPath = downloadedPath;
              } catch (downloadError) {
                job.downloadError = downloadError.message;
              }
            }

            if (onProgress) {
              onProgress({
                batchId: batchId,
                jobId: job.jobId,
                status: 'completed',
                result: job.result,
                downloadedPath: job.downloadedPath,
              });
            }
          } else if (taskData.status === 'FAILURE') {
            job.status = 'failed';
            job.error = taskData.fail_reason || 'Task failed';
            if (onProgress) {
              onProgress({
                batchId: batchId,
                jobId: job.jobId,
                status: 'failed',
                error: job.error,
              });
            }
          } else {
            // 任务仍在进行中，等待一段时间后继续查询下一个
            if (onProgress) {
              onProgress({
                batchId: batchId,
                jobId: job.jobId,
                status: 'in_progress',
                progress: taskData.progress || 'N/A',
              });
            }
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
          }
        } else {
          job.status = 'failed';
          job.error = result.error;
        }
      } catch (error) {
        job.status = 'failed';
        job.error = error.message;
      }
    }

    // 检查是否所有任务都已完成
    const allCompleted = batch.jobs.every((j) => j.status === 'completed' || j.status === 'failed');
    if (allCompleted) {
      batch.status = 'completed';
      batch.completedAt = Date.now();
    }

    return {
      success: true,
      data: {
        batchId: batchId,
        status: batch.status,
        totalJobs: batch.jobs.length,
        completedJobs: batch.jobs.filter((j) => j.status === 'completed').length,
        failedJobs: batch.jobs.filter((j) => j.status === 'failed').length,
        pendingJobs: batch.jobs.filter((j) => j.status === 'submitted').length,
        jobs: batch.jobs.map((j) => ({
          jobId: j.jobId,
          status: j.status,
          taskId: j.taskId,
          result: j.result,
          error: j.error,
        })),
      },
    };
  }

  /**
   * 获取批量任务状态
   * @param {string} batchId - 批量任务 ID
   * @returns {object} 批量任务状态
   */
  getBatchStatus(batchId) {
    const batch = this.batches.get(batchId);
    if (!batch) {
      return { success: false, error: 'Batch not found' };
    }

    return {
      success: true,
      data: {
        batchId: batch.id,
        status: batch.status,
        platform: batch.platform,
        totalJobs: batch.jobs.length,
        completedJobs: batch.jobs.filter((j) => j.status === 'completed').length,
        failedJobs: batch.jobs.filter((j) => j.status === 'failed').length,
        pendingJobs: batch.jobs.filter((j) => j.status === 'submitted' || j.status === 'submitting').length,
        createdAt: batch.createdAt,
        submittedAt: batch.submittedAt,
        completedAt: batch.completedAt,
        jobs: batch.jobs.map((j) => ({
          jobId: j.jobId,
          status: j.status,
          taskId: j.taskId,
          result: j.result,
          error: j.error,
        })),
      },
    };
  }

  /**
   * 删除批量任务
   * @param {string} batchId - 批量任务 ID
   * @returns {boolean}
   */
  deleteBatch(batchId) {
    return this.batches.delete(batchId);
  }

  /**
   * 获取所有批量任务
   * @returns {Array}
   */
  getAllBatches() {
    return Array.from(this.batches.values()).map((batch) => ({
      batchId: batch.id,
      status: batch.status,
      platform: batch.platform,
      totalJobs: batch.jobs.length,
      createdAt: batch.createdAt,
    }));
  }
}

module.exports = BatchQueue;
