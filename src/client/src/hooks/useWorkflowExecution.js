import { useState, useCallback } from 'react';

/**
 * Workflow Execution Engine Hook
 * Handles node execution order, data flow, and async task management
 */
export function useWorkflowExecution() {
  const [executionState, setExecutionState] = useState({
    isRunning: false,
    currentNode: null,
    completedNodes: [],
    failedNodes: [],
    results: {},
    logs: [], // Add logs array
  });

  const [progress, setProgress] = useState({
    total: 0,
    completed: 0,
    failed: 0,
  });

  // Helper function to add logs
  const addLog = useCallback((level, message, node = null) => {
    const log = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      node,
    };
    setExecutionState(prev => ({
      ...prev,
      logs: [...prev.logs, log],
    }));
  }, []);

  /**
   * Build adjacency list for topological sorting
   */
  const buildAdjacencyList = (nodes, edges) => {
    const graph = {};
    const inDegree = {};

    // Initialize graph
    nodes.forEach(node => {
      graph[node.id] = [];
      inDegree[node.id] = 0;
    });

    // Build edges
    edges.forEach(edge => {
      graph[edge.source].push(edge.target);
      inDegree[edge.target]++;
    });

    return { graph, inDegree };
  };

  /**
   * Topological sort to determine execution order
   */
  const topologicalSort = (nodes, edges) => {
    const { graph, inDegree } = buildAdjacencyList(nodes, edges);
    const queue = [];
    const result = [];

    // Find nodes with no dependencies (inDegree = 0)
    nodes.forEach(node => {
      if (inDegree[node.id] === 0) {
        queue.push(node.id);
      }
    });

    // Process nodes
    while (queue.length > 0) {
      const nodeId = queue.shift();
      result.push(nodeId);

      // Reduce inDegree for dependent nodes
      graph[nodeId].forEach(dependentId => {
        inDegree[dependentId]--;
        if (inDegree[dependentId] === 0) {
          queue.push(dependentId);
        }
      });
    }

    // Check for cycles
    if (result.length !== nodes.length) {
      throw new Error('工作流中存在循环依赖');
    }

    return result;
  };

  /**
   * Get data from connected source nodes
   */
  const getNodeInputData = (nodeId, nodeType, edges, nodeResults) => {
    const inputData = {};

    // Find all incoming edges for this node
    const incomingEdges = edges.filter(edge => edge.target === nodeId);

    incomingEdges.forEach(edge => {
      const sourceResult = nodeResults[edge.source];
      if (!sourceResult) return;

      // Map data based on source handle type
      const sourceHandle = edge.sourceHandle || 'output';

      switch (sourceHandle) {
        case 'text-output':
          inputData.prompt = sourceResult.text;
          break;
        case 'images-output':
          inputData.images = sourceResult.images || [];
          break;
        case 'character-output':
          inputData.character = sourceResult.character;
          break;
        case 'video-output':
          inputData.videoTaskId = sourceResult.taskId;
          break;
        case 'characters-output':
          inputData.characters = sourceResult.characters || [];
          break;
        default:
          inputData[sourceHandle] = sourceResult;
      }
    });

    return inputData;
  };

  /**
   * Execute a single node
   */
  const executeNode = async (node, inputData) => {
    const { type, data } = node;

    switch (type) {
      case 'textNode':
        return { text: data.value || inputData.text };

      case 'referenceImageNode':
        return { images: data.images || inputData.images || [] };

      case 'characterSelectNode':
        return { character: data.selectedCharacter || inputData.character };

      case 'characterLibraryNode':
        return { characters: data.characters || inputData.characters || [] };

      case 'characterCreateNode':
        // Character creation is handled within the node component
        return { character: data.createdCharacter };

      case 'videoGenerateNode':
        // Video generation is handled within the node component
        return { taskId: data.taskId, result: data.videoResult };

      case 'storyboardNode':
        // Storyboard execution is handled within the node component
        return { taskIds: data.taskIds, results: data.results };

      case 'taskResultNode':
        // Task result node displays the video task result
        return { taskId: inputData.videoTaskId || data.taskId };

      case 'executionLogNode':
        // Execution log node displays execution logs
        return { logs: data.logs || [] };

      default:
        console.warn(`Unknown node type: ${type}`);
        return {};
    }
  };

  /**
   * Execute the entire workflow
   */
  const executeWorkflow = useCallback(async (nodes, edges) => {
    try {
      // Reset state
      setExecutionState({
        isRunning: true,
        currentNode: null,
        completedNodes: [],
        failedNodes: [],
        results: {},
        logs: [],
      });
      setProgress({ total: nodes.length, completed: 0, failed: 0 });

      addLog('info', '开始执行工作流');

      // Get execution order using topological sort
      const executionOrder = topologicalSort(nodes, edges);
      addLog('info', `执行顺序: ${executionOrder.join(' → ')}`);

      const results = {};
      const completedNodes = [];
      const failedNodes = [];

      // Execute nodes in order
      for (const nodeId of executionOrder) {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) continue;

        const nodeLabel = node.data.label || nodeId;
        setExecutionState(prev => ({ ...prev, currentNode: nodeLabel }));
        addLog('info', `执行节点: ${nodeLabel}`, nodeLabel);

        // Get input data from connected source nodes
        const inputData = getNodeInputData(nodeId, node.type, edges, results);

        // Execute the node
        try {
          const result = await executeNode(node, inputData);
          results[nodeId] = result;
          completedNodes.push(nodeId);

          setProgress(prev => ({
            ...prev,
            completed: prev.completed + 1,
          }));

          addLog('success', `✓ 节点完成: ${nodeLabel}`, nodeLabel);
        } catch (error) {
          addLog('error', `✗ 节点失败: ${nodeLabel} - ${error.message}`, nodeLabel);
          failedNodes.push(nodeId);

          setProgress(prev => ({
            ...prev,
            failed: prev.failed + 1,
          }));

          // Continue execution even if a node fails
          results[nodeId] = { error: error.message };
        }
      }

      addLog('info', `工作流执行完成: ${completedNodes.length}/${nodes.length} 成功`);
      if (failedNodes.length > 0) {
        addLog('warn', `${failedNodes.length} 个节点执行失败`);
      }

      setExecutionState({
        isRunning: false,
        currentNode: null,
        completedNodes,
        failedNodes,
        results,
      });

      return { success: true, results, completedNodes, failedNodes };
    } catch (error) {
      addLog('error', `工作流执行错误: ${error.message}`);
      setExecutionState(prev => ({
        ...prev,
        isRunning: false,
        currentNode: null,
      }));

      return { success: false, error: error.message };
    }
  }, [addLog]);

  /**
   * Reset execution state
   */
  const resetExecution = useCallback(() => {
    setExecutionState({
      isRunning: false,
      currentNode: null,
      completedNodes: [],
      failedNodes: [],
      results: {},
      logs: [],
    });
    setProgress({ total: 0, completed: 0, failed: 0 });
  }, []);

  return {
    executionState,
    progress,
    executeWorkflow,
    resetExecution,
  };
}
