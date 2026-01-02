import { useEffect } from 'react';

/**
 * 工作流数据同步 Hook
 * 自动将组件状态同步到 React Flow 的 node.data
 * 用于工作流持久化（保存/加载）
 *
 * @param {Object} params - 参数对象
 * @param {string} params.nodeId - 当前节点 ID
 * @param {Function} params.setNodes - React Flow 的 setNodes 函数
 * @param {Object} params.syncFields - 需要同步的字段映射 { stateKey: dataKey }
 * @param {Object} params.stateValues - 当前状态值对象
 */
export function useWorkflowSync({ nodeId, setNodes, syncFields, stateValues }) {
  // ⭐ 为每个字段创建独立的 useEffect，避免依赖冲突
  Object.entries(syncFields).forEach(([stateKey, dataKey]) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      const currentValue = stateValues[stateKey];
      const dataValue = dataKey ? stateValues[dataKey] : undefined;

      // ⭐ 只在值变化时同步，避免无限循环
      if (currentValue !== dataValue) {
        setNodes((nds) =>
          nds.map((node) =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, [dataKey]: currentValue } }
              : node
          )
        );
      }
    }, [currentValue, nodeId, setNodes]); // ⚠️ 依赖数组：只包含值本身和必要参数
  });
}

/**
 * 工作流预先同步 Hook
 * 在 API 调用前手动同步所有状态到 node.data
 * 确保工作流快照包含完整数据
 *
 * @param {Object} params - 参数对象
 * @param {string} params.nodeId - 当前节点 ID
 * @param {Function} params.setNodes - React Flow 的 setNodes 函数
 * @param {Object} params.syncFields - 需要同步的字段映射 { stateKey: dataKey }
 * @param {Object} params.stateValues - 当前状态值对象
 */
export function preSaveSync({ nodeId, setNodes, syncFields, stateValues }) {
  // ⭐ 一次性同步所有字段
  setNodes((nds) =>
    nds.map((node) => {
      if (node.id === nodeId) {
        const newData = { ...node.data };
        Object.entries(syncFields).forEach(([stateKey, dataKey]) => {
          newData[dataKey] = stateValues[stateKey];
        });
        return { ...node, data: newData };
      }
      return node;
    })
  );
}
