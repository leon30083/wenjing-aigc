/**
 * 指标存储模块
 *
 * 功能：存储和管理验证指标数据
 * - 持久化到 JSON 文件
 * - 提供增删改查操作
 * - 自动清理过期数据
 */

const fs = require('fs');
const path = require('path');

// 指标文件路径
const METRICS_FILE = path.join(__dirname, '../../.claude/metrics/validation-metrics.json');
const MAX_HISTORY_ENTRIES = 100; // 最多保留 100 条历史记录

/**
 * 指标存储类
 */
class MetricsStorage {
  constructor() {
    this.metrics = this._loadMetrics();
  }

  /**
   * 加载指标数据
   * @private
   */
  _loadMetrics() {
    try {
      if (fs.existsSync(METRICS_FILE)) {
        const data = fs.readFileSync(METRICS_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error(`[MetricsStorage] 加载指标失败: ${error.message}`);
    }

    // 返回默认结构
    return this._getDefaultMetrics();
  }

  /**
   * 获取默认指标结构
   * @private
   */
  _getDefaultMetrics() {
    return {
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      totalRuns: 0,
      byType: {},
      byDate: {},
      history: []
    };
  }

  /**
   * 保存指标数据
   * @private
   */
  _saveMetrics() {
    try {
      // 确保目录存在
      const dir = path.dirname(METRICS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.metrics.lastUpdated = new Date().toISOString();
      fs.writeFileSync(METRICS_FILE, JSON.stringify(this.metrics, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error(`[MetricsStorage] 保存指标失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 记录验证结果
   * @param {Object} result - 验证结果
   */
  recordValidation(result) {
    this.metrics.totalRuns++;

    // 按类型统计
    const type = result.type || 'unknown';
    if (!this.metrics.byType[type]) {
      this.metrics.byType[type] = {
        total: 0,
        errors: 0,
        warnings: 0,
        lastRun: null
      };
    }

    this.metrics.byType[type].total++;
    this.metrics.byType[type].errors += result.errorCount || 0;
    this.metrics.byType[type].warnings += result.warningCount || 0;
    this.metrics.byType[type].lastRun = new Date().toISOString();

    // 按日期统计
    const today = new Date().toISOString().split('T')[0];
    if (!this.metrics.byDate[today]) {
      this.metrics.byDate[today] = {
        total: 0,
        errors: 0,
        warnings: 0
      };
    }

    this.metrics.byDate[today].total++;
    this.metrics.byDate[today].errors += result.errorCount || 0;
    this.metrics.byDate[today].warnings += result.warningCount || 0;

    // 添加历史记录
    this.metrics.history.push({
      timestamp: new Date().toISOString(),
      type: result.type || 'unknown',
      summary: {
        total: result.totalNodes || 0,
        errors: result.errorCount || 0,
        warnings: result.warningCount || 0
      }
    });

    // 限制历史记录数量
    if (this.metrics.history.length > MAX_HISTORY_ENTRIES) {
      this.metrics.history = this.metrics.history.slice(-MAX_HISTORY_ENTRIES);
    }

    return this._saveMetrics();
  }

  /**
   * 获取所有指标
   * @returns {Object} 完整指标数据
   */
  getMetrics() {
    return this.metrics;
  }

  /**
   * 获取按类型分组的指标
   * @returns {Object} 按类型分组的指标
   */
  getMetricsByType() {
    return this.metrics.byType || {};
  }

  /**
   * 获取按日期分组的指标
   * @returns {Object} 按日期分组的指标
   */
  getMetricsByDate() {
    return this.metrics.byDate || {};
  }

  /**
   * 获取历史记录
   * @param {number} limit - 限制数量
   * @returns {Array} 历史记录
   */
  getHistory(limit = 10) {
    if (limit) {
      return this.metrics.history.slice(-limit);
    }
    return this.metrics.history;
  }

  /**
   * 获取趋势分析
   * @returns {Object} 趋势数据
   */
  getTrends() {
    const history = this.metrics.history;
    if (history.length < 2) {
      return {
        improving: 0,
        worsening: 0,
        stable: 0,
        trend: 'insufficient_data'
      };
    }

    let improving = 0;
    let worsening = 0;
    let stable = 0;

    // 比较相邻的记录
    for (let i = 1; i < history.length; i++) {
      const current = history[i].summary.errors + history[i].summary.warnings;
      const previous = history[i - 1].summary.errors + history[i - 1].summary.warnings;

      if (current < previous) {
        improving++;
      } else if (current > previous) {
        worsening++;
      } else {
        stable++;
      }
    }

    // 判断总体趋势
    let trend;
    if (improving > worsening) {
      trend = 'improving';
    } else if (worsening > improving) {
      trend = 'worsening';
    } else {
      trend = 'stable';
    }

    return {
      improving,
      worsening,
      stable,
      trend
    };
  }

  /**
   * 清空所有指标
   */
  clear() {
    this.metrics = this._getDefaultMetrics();
    return this._saveMetrics();
  }

  /**
   * 清理过期数据（超过 30 天）
   */
  cleanup() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 清理 byDate
    Object.keys(this.metrics.byDate).forEach(date => {
      const dateObj = new Date(date);
      if (dateObj < thirtyDaysAgo) {
        delete this.metrics.byDate[date];
      }
    });

    return this._saveMetrics();
  }
}

// 单例模式
const instance = new MetricsStorage();

module.exports = instance;
