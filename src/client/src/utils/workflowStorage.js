/**
 * 工作流存储管理
 * 支持保存、加载、删除多个命名工作流
 */

const STORAGE_KEY = 'winjin-workflows';
const CURRENT_WORKFLOW_KEY = 'winjin-current-workflow';

export class WorkflowStorage {
  /**
   * 获取所有已保存的工作流
   */
  static getAllWorkflows() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Failed to load workflows:', error);
      return {};
    }
  }

  /**
   * 保存工作流
   * @param {string} name - 工作流名称
   * @param {Array} nodes - 节点数组
   * @param {Array} edges - 连线数组
   * @param {string} description - 工作流描述（可选）
   */
  static saveWorkflow(name, nodes, edges, description = '') {
    try {
      const workflows = this.getAllWorkflows();
      workflows[name] = {
        name,
        description,
        nodes,
        edges,
        updatedAt: new Date().toISOString(),
        createdAt: workflows[name]?.createdAt || new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
      localStorage.setItem(CURRENT_WORKFLOW_KEY, name);
      return { success: true, data: workflows[name] };
    } catch (error) {
      console.error('Failed to save workflow:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 加载工作流
   * @param {string} name - 工作流名称
   */
  static loadWorkflow(name) {
    try {
      const workflows = this.getAllWorkflows();
      const workflow = workflows[name];
      if (!workflow) {
        return { success: false, error: 'Workflow not found' };
      }
      localStorage.setItem(CURRENT_WORKFLOW_KEY, name);
      return { success: true, data: workflow };
    } catch (error) {
      console.error('Failed to load workflow:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 删除工作流
   * @param {string} name - 工作流名称
   */
  static deleteWorkflow(name) {
    try {
      const workflows = this.getAllWorkflows();
      if (!workflows[name]) {
        return { success: false, error: 'Workflow not found' };
      }
      delete workflows[name];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));

      // 如果删除的是当前工作流，清除当前工作流标记
      const current = localStorage.getItem(CURRENT_WORKFLOW_KEY);
      if (current === name) {
        localStorage.removeItem(CURRENT_WORKFLOW_KEY);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取当前工作流名称
   */
  static getCurrentWorkflowName() {
    return localStorage.getItem(CURRENT_WORKFLOW_KEY);
  }

  /**
   * 获取工作流列表（用于显示）
   */
  static getWorkflowList() {
    try {
      const workflows = this.getAllWorkflows();
      return Object.values(workflows).map(w => ({
        name: w.name,
        description: w.description || '',
        updatedAt: w.updatedAt,
        createdAt: w.createdAt,
        nodeCount: w.nodes?.length || 0,
        edgeCount: w.edges?.length || 0,
      })).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    } catch (error) {
      console.error('Failed to get workflow list:', error);
      return [];
    }
  }

  /**
   * 导出工作流为 JSON 文件
   * @param {string} name - 工作流名称
   */
  static exportWorkflow(name) {
    try {
      const workflows = this.getAllWorkflows();
      const workflow = workflows[name];
      if (!workflow) {
        return { success: false, error: 'Workflow not found' };
      }

      const blob = new Blob([JSON.stringify(workflow, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workflow-${name}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Failed to export workflow:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 从 JSON 文件导入工作流
   * @param {File} file - JSON 文件
   */
  static async importWorkflow(file) {
    try {
      const text = await file.text();
      const workflow = JSON.parse(text);

      if (!workflow.name || !workflow.nodes || !workflow.edges) {
        return { success: false, error: 'Invalid workflow file format' };
      }

      // 重命名以避免冲突
      const workflows = this.getAllWorkflows();
      let name = workflow.name;
      let counter = 1;
      while (workflows[name]) {
        name = `${workflow.name} (${counter})`;
        counter++;
      }

      return this.saveWorkflow(name, workflow.nodes, workflow.edges, workflow.description);
    } catch (error) {
      console.error('Failed to import workflow:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 清除所有工作流
   */
  static clearAllWorkflows() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(CURRENT_WORKFLOW_KEY);
      return { success: true };
    } catch (error) {
      console.error('Failed to clear workflows:', error);
      return { success: false, error: error.message };
    }
  }
}
