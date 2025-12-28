/**
 * 历史记录存储模块
 * 使用 JSON 文件永久保存所有视频生成记录
 */

const fs = require('fs');
const path = require('path');

class HistoryStorage {
  constructor() {
    // 数据目录
    this.dataDir = path.join(process.cwd(), 'data');
    // 历史记录文件
    this.historyFile = path.join(this.dataDir, 'history.json');

    // 确保数据目录存在
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // 加载历史记录
    this.records = this._load();
  }

  /**
   * 从文件加载历史记录
   * @private
   * @returns {Array} 历史记录数组
   */
  _load() {
    try {
      if (fs.existsSync(this.historyFile)) {
        const content = fs.readFileSync(this.historyFile, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('加载历史记录失败:', error.message);
    }
    return [];
  }

  /**
   * 保存历史记录到文件
   * @private
   */
  _save() {
    try {
      fs.writeFileSync(this.historyFile, JSON.stringify(this.records, null, 2), 'utf-8');
    } catch (error) {
      console.error('保存历史记录失败:', error.message);
    }
  }

  /**
   * 添加视频生成记录
   * @param {object} record - 记录对象
   * @param {string} record.taskId - 任务 ID
   * @param {string} record.platform - 平台名称
   * @param {string} record.prompt - 提示词
   * @param {string} record.model - 模型名称
   * @param {object} record.options - 其他选项
   * @returns {object} 添加的记录
   */
  addRecord(record) {
    const newRecord = {
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      taskId: record.taskId,
      platform: record.platform || 'juxin',
      prompt: record.prompt || '',
      model: record.model || 'sora-2',
      options: record.options || {},
      status: 'queued',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      result: null,
      downloadedPath: null,
      error: null,
    };

    this.records.unshift(newRecord); // 最新的记录在前面
    this._save();
    return newRecord;
  }

  /**
   * 更新记录状态
   * @param {string} taskId - 任务 ID
   * @param {object} updates - 更新内容
   * @returns {boolean} 是否更新成功
   */
  updateRecord(taskId, updates) {
    const record = this.records.find((r) => r.taskId === taskId);
    if (!record) {
      return false;
    }

    // 合并更新
    Object.assign(record, updates);
    record.updatedAt = new Date().toISOString();

    this._save();
    return true;
  }

  /**
   * 标记任务完成
   * @param {string} taskId - 任务 ID
   * @param {object} result - 任务结果
   * @returns {boolean}
   */
  markCompleted(taskId, result) {
    return this.updateRecord(taskId, {
      status: 'completed',
      result: result,
    });
  }

  /**
   * 标记任务失败
   * @param {string} taskId - 任务 ID
   * @param {string} error - 错误信息
   * @returns {boolean}
   */
  markFailed(taskId, error) {
    return this.updateRecord(taskId, {
      status: 'failed',
      error: error,
    });
  }

  /**
   * 记录视频下载路径
   * @param {string} taskId - 任务 ID
   * @param {string} downloadedPath - 下载路径
   * @returns {boolean}
   */
  recordDownload(taskId, downloadedPath) {
    return this.updateRecord(taskId, {
      downloadedPath: downloadedPath,
    });
  }

  /**
   * 获取记录（按任务 ID）
   * @param {string} taskId - 任务 ID
   * @returns {object|null}
   */
  getRecord(taskId) {
    return this.records.find((r) => r.taskId === taskId) || null;
  }

  /**
   * 获取所有记录
   * @param {object} options - 查询选项
   * @param {number} [options.limit] - 限制返回数量
   * @param {number} [options.skip] - 跳过数量
   * @param {string} [options.status] - 按状态筛选
   * @param {string} [options.platform] - 按平台筛选
   * @returns {Array} 记录数组
   */
  getAllRecords(options = {}) {
    let filtered = [...this.records];

    // 按状态筛选
    if (options.status) {
      filtered = filtered.filter((r) => r.status === options.status);
    }

    // 按平台筛选
    if (options.platform) {
      filtered = filtered.filter((r) => r.platform === options.platform);
    }

    // 分页
    const skip = options.skip || 0;
    const limit = options.limit || filtered.length;

    return filtered.slice(skip, skip + limit);
  }

  /**
   * 获取统计信息
   * @returns {object} 统计信息
   */
  getStats() {
    const stats = {
      total: this.records.length,
      byStatus: {},
      byPlatform: {},
      downloaded: 0,
    };

    for (const record of this.records) {
      // 按状态统计
      stats.byStatus[record.status] = (stats.byStatus[record.status] || 0) + 1;

      // 按平台统计
      stats.byPlatform[record.platform] = (stats.byPlatform[record.platform] || 0) + 1;

      // 下载数量
      if (record.downloadedPath) {
        stats.downloaded++;
      }
    }

    return stats;
  }

  /**
   * 删除记录
   * @param {string} taskId - 任务 ID
   * @returns {boolean}
   */
  deleteRecord(taskId) {
    const index = this.records.findIndex((r) => r.taskId === taskId);
    if (index === -1) {
      return false;
    }

    this.records.splice(index, 1);
    this._save();
    return true;
  }

  /**
   * 清空所有记录
   */
  clearAll() {
    this.records = [];
    this._save();
  }

  /**
   * 导出记录为 JSON
   * @returns {string} JSON 字符串
   */
  exportToJson() {
    return JSON.stringify(this.records, null, 2);
  }

  /**
   * 从 JSON 导入记录
   * @param {string} jsonString - JSON 字符串
   * @returns {boolean}
   */
  importFromJson(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      if (Array.isArray(imported)) {
        this.records = imported;
        this._save();
        return true;
      }
    } catch (error) {
      console.error('导入历史记录失败:', error.message);
    }
    return false;
  }
}

module.exports = HistoryStorage;
