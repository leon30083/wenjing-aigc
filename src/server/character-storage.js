/**
 * 角色库存储模块
 * 使用 JSON 文件永久保存所有创建的角色
 */

const fs = require('fs');
const path = require('path');

class CharacterStorage {
  constructor() {
    // 数据目录
    this.dataDir = path.join(process.cwd(), 'data');
    // 角色库文件
    this.charactersFile = path.join(this.dataDir, 'characters.json');

    // 确保数据目录存在
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // 加载角色库
    this.characters = this._load();
  }

  /**
   * 从文件加载角色库
   * @private
   * @returns {Array} 角色数组
   */
  _load() {
    try {
      if (fs.existsSync(this.charactersFile)) {
        const content = fs.readFileSync(this.charactersFile, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('加载角色库失败:', error.message);
    }
    return [];
  }

  /**
   * 保存角色库到文件
   * @private
   */
  _save() {
    try {
      fs.writeFileSync(this.charactersFile, JSON.stringify(this.characters, null, 2), 'utf-8');
    } catch (error) {
      console.error('保存角色库失败:', error.message);
    }
  }

  /**
   * 添加角色
   * @param {object} character - 角色对象
   * @param {string} character.id - 角色 ID
   * @param {string} character.username - 用户名
   * @param {string} character.permalink - 主页链接
   * @param {string} character.profilePictureUrl - 头像链接
   * @param {string} character.sourceVideoUrl - 来源视频链接
   * @param {string} character.platform - 平台名称
   * @returns {object} 添加的角色
   */
  addCharacter(character) {
    // 检查是否已存在
    const existingIndex = this.characters.findIndex(c => c.id === character.id);
    if (existingIndex !== -1) {
      // 更新现有角色
      this.characters[existingIndex] = {
        ...this.characters[existingIndex],
        ...character,
        updatedAt: new Date().toISOString(),
      };
    } else {
      // 添加新角色
      const newCharacter = {
        id: character.id,
        username: character.username || '',
        permalink: character.permalink || '',
        profilePictureUrl: character.profilePictureUrl || '',
        sourceVideoUrl: character.sourceVideoUrl || '',
        platform: character.platform || 'zhenzhen',
        timestamps: character.timestamps || '1,3',
        alias: character.alias || '', // 别名
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.characters.unshift(newCharacter); // 最新的在前面
    }

    this._save();
    return this.getCharacter(character.id);
  }

  /**
   * 更新角色
   * @param {string} characterId - 角色 ID
   * @param {object} updates - 更新内容
   * @returns {object|null} 更新后的角色，不存在返回 null
   */
  updateCharacter(characterId, updates) {
    const index = this.characters.findIndex(c => c.id === characterId);
    if (index === -1) {
      return null;
    }

    Object.assign(this.characters[index], updates);
    this.characters[index].updatedAt = new Date().toISOString();
    this._save();
    return this.characters[index];
  }

  /**
   * 按 username 更新角色 ⭐ 新增
   * @param {string} username - 角色用户名
   * @param {object} updates - 更新内容
   * @returns {object|null} 更新后的角色，不存在返回 null
   */
  updateByUsername(username, updates) {
    const index = this.characters.findIndex(c => c.username === username);
    if (index === -1) {
      return null;
    }

    Object.assign(this.characters[index], updates);
    this.characters[index].updatedAt = new Date().toISOString();
    this._save();
    return this.characters[index];
  }

  /**
   * 删除角色
   * @param {string} characterId - 角色 ID
   * @returns {boolean} 是否删除成功
   */
  deleteCharacter(characterId) {
    const index = this.characters.findIndex(c => c.id === characterId);
    if (index === -1) {
      return false;
    }

    this.characters.splice(index, 1);
    this._save();
    return true;
  }

  /**
   * 获取角色（按 ID）
   * @param {string} characterId - 角色 ID
   * @returns {object|null}
   */
  getCharacter(characterId) {
    return this.characters.find(c => c.id === characterId) || null;
  }

  /**
   * 获取所有角色
   * @param {object} options - 查询选项
   * @param {number} [options.limit] - 限制返回数量
   * @param {number} [options.skip] - 跳过数量
   * @param {string} [options.platform] - 按平台筛选
   * @returns {Array} 角色数组
   */
  getAllCharacters(options = {}) {
    let filtered = [...this.characters];

    // 按平台筛选
    if (options.platform) {
      filtered = filtered.filter(c => c.platform === options.platform);
    }

    // 分页
    const skip = options.skip || 0;
    const limit = options.limit || filtered.length;

    return filtered.slice(skip, skip + limit);
  }

  /**
   * 搜索角色（按用户名或 ID）
   * @param {string} query - 搜索关键词
   * @returns {Array} 匹配的角色数组
   */
  searchCharacters(query) {
    const lowerQuery = query.toLowerCase();
    return this.characters.filter(c =>
      c.id.toLowerCase().includes(lowerQuery) ||
      (c.username && c.username.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * 获取统计信息
   * @returns {object} 统计信息
   */
  getStats() {
    const stats = {
      total: this.characters.length,
      byPlatform: {},
    };

    for (const character of this.characters) {
      stats.byPlatform[character.platform] = (stats.byPlatform[character.platform] || 0) + 1;
    }

    return stats;
  }

  /**
   * 清空所有角色
   */
  clearAll() {
    this.characters = [];
    this._save();
  }

  /**
   * 导出为 JSON
   * @returns {string} JSON 字符串
   */
  exportToJson() {
    return JSON.stringify(this.characters, null, 2);
  }

  /**
   * 从 JSON 导入
   * @param {string} jsonString - JSON 字符串
   * @returns {boolean}
   */
  importFromJson(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      if (Array.isArray(imported)) {
        this.characters = imported;
        this._save();
        return true;
      }
    } catch (error) {
      console.error('导入角色库失败:', error.message);
    }
    return false;
  }
}

module.exports = CharacterStorage;
