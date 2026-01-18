/**
 * Express API 路由模板
 *
 * 使用方法:
 * 1. 复制此文件到 src/server/routes/ 目录
 * 2. 重命名文件和路由名称
 * 3. 修改路由路径和业务逻辑
 * 4. 在 src/server/index.js 中注册路由
 */

const express = require('express');
const router = express.Router();

/**
 * [功能名称] 路由
 * 路径: /api/[resource-name]
 */

// ========== POST 创建 ==========

/**
 * POST /api/[resource-name]
 *
 * 创建新的[资源]
 *
 * @param {Object} req.body - 请求体
 * @param {string} req.body.[param1] - 参数1说明
 * @param {string} req.body.[param2] - 参数2说明
 *
 * @returns {Object} { success: boolean, data?: Object, error?: string }
 */
router.post('/', async (req, res) => {
  try {
    const { [param1], [param2] } = req.body;

    // 参数验证
    if (!param1) {
      return res.json({ success: false, error: '[param1]不能为空' });
    }

    // 业务逻辑
    const result = await createResource({ [param1], [param2] });

    // 返回结果
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[ResourceName] 创建失败:', error);
    res.json({ success: false, error: error.message });
  }
});

// ========== GET 查询 ==========

/**
 * GET /api/[resource-name]/:id
 *
 * 查询[资源]详情
 *
 * @param {string} req.params.id - 资源ID
 *
 * @returns {Object} { success: boolean, data?: Object, error?: string }
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 参数验证
    if (!id) {
      return res.json({ success: false, error: '资源ID不能为空' });
    }

    // 业务逻辑
    const result = await getResource(id);

    if (!result) {
      return res.json({ success: false, error: '资源不存在' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[ResourceName] 查询失败:', error);
    res.json({ success: false, error: error.message });
  }
});

// ========== PUT 更新 ==========

/**
 * PUT /api/[resource-name]/:id
 *
 * 更新[资源]
 *
 * @param {string} req.params.id - 资源ID
 * @param {Object} req.body - 更新数据
 *
 * @returns {Object} { success: boolean, data?: Object, error?: string }
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // 参数验证
    if (!id) {
      return res.json({ success: false, error: '资源ID不能为空' });
    }

    // 业务逻辑
    const result = await updateResource(id, updateData);

    if (!result) {
      return res.json({ success: false, error: '资源不存在' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[ResourceName] 更新失败:', error);
    res.json({ success: false, error: error.message });
  }
});

// ========== DELETE 删除 ==========

/**
 * DELETE /api/[resource-name]/:id
 *
 * 删除[资源]
 *
 * @param {string} req.params.id - 资源ID
 *
 * @returns {Object} { success: boolean, error?: string }
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 参数验证
    if (!id) {
      return res.json({ success: false, error: '资源ID不能为空' });
    }

    // 业务逻辑
    const result = await deleteResource(id);

    if (!result) {
      return res.json({ success: false, error: '资源不存在' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[ResourceName] 删除失败:', error);
    res.json({ success: false, error: error.message });
  }
});

// ========== 辅助函数 ==========

/**
 * 创建资源
 */
async function createResource(data) {
  // TODO: 实现创建逻辑
  return { id: 'new-id', ...data };
}

/**
 * 查询资源
 */
async function getResource(id) {
  // TODO: 实现查询逻辑
  return { id, ...data };
}

/**
 * 更新资源
 */
async function updateResource(id, data) {
  // TODO: 实现更新逻辑
  return { id, ...data };
}

/**
 * 删除资源
 */
async function deleteResource(id) {
  // TODO: 实现删除逻辑
  return true;
}

module.exports = router;
