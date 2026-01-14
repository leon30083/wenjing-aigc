import { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css';
import { useWorkflowExecution } from './hooks/useWorkflowExecution';
import { WorkflowStorage } from './utils/workflowStorage';

// API base URL
const API_BASE = 'http://localhost:9000';

// Import test nodes
import TextNode from './nodes/input/TextNode';
import ReferenceImageNode from './nodes/input/ReferenceImageNode';
import CharacterLibraryNode from './nodes/input/CharacterLibraryNode';
import APISettingsNode from './nodes/input/APISettingsNode';
import OpenAIConfigNode from './nodes/input/OpenAIConfigNode';
import NarratorNode from './nodes/input/NarratorNode';
import CharacterCreateNode from './nodes/process/CharacterCreateNode';
import BatchVideoGenerateNode from './nodes/process/BatchVideoGenerateNode';
import VideoGenerateNode from './nodes/process/VideoGenerateNode';
import StoryboardNode from './nodes/process/StoryboardNode';
import NarratorProcessorNode from './nodes/process/NarratorProcessorNode';
// ⚠️ 停用平台专用故事板节点 (2026-01-07) - 使用统一的 VideoGenerateNode 代替
// import JuxinStoryboardNode from './nodes/process/JuxinStoryboardNode';
// import ZhenzhenStoryboardNode from './nodes/process/ZhenzhenStoryboardNode';
import PromptOptimizerNode from './nodes/process/PromptOptimizerNode';
import TaskResultNode from './nodes/output/TaskResultNode';
import CharacterResultNode from './nodes/output/CharacterResultNode';
import BatchResultNode from './nodes/output/BatchResultNode';

// Initial nodes for testing
const initialNodes = [
  // Input Nodes (left column)
  {
    id: '1',
    type: 'textNode',
    position: { x: 50, y: 30 },
    data: { label: '提示词输入', value: '一只可爱的猫咪在花园里玩耍' },
  },
  {
    id: '2',
    type: 'referenceImageNode',
    position: { x: 50, y: 150 },
    data: { label: '参考图片', images: [] },
  },
  {
    id: '3',
    type: 'apiSettingsNode',
    position: { x: 50, y: 270 },
    data: { label: 'API 设置' },
  },
  {
    id: '4',
    type: 'characterLibraryNode',
    position: { x: 50, y: 400 },
    data: { label: '角色库' },
  },

  // Process Nodes (middle column)
  {
    id: '5',
    type: 'characterCreateNode',
    position: { x: 350, y: 30 },
    data: { label: '角色生成' },
  },
  {
    id: '6',
    type: 'videoGenerateNode',
    position: { x: 350, y: 230 },
    data: { label: '视频生成' },
  },
  {
    id: '7',
    type: 'storyboardNode',
    position: { x: 350, y: 420 },
    data: { label: '故事板' },
  },

  // Output Nodes (right column)
  {
    id: '8',
    type: 'taskResultNode',
    position: { x: 650, y: 200 },
    data: { label: '任务结果' },
  },
  {
    id: '9',
    type: 'characterResultNode',
    position: { x: 650, y: 350 },
    data: { label: '角色结果' },
  },
];

// Initial edges for testing
const initialEdges = [
  // 文本节点 -> 视频生成节点
  {
    id: 'e1-6',
    source: '1',
    target: '6',
    sourceHandle: 'text-output',
    targetHandle: 'prompt-input',
  },
  // 视频生成节点 -> 任务结果节点
  {
    id: 'e6-8',
    source: '6',
    target: '8',
    sourceHandle: 'video-output',
    targetHandle: 'task-input',
  },
];

// Node templates for adding new nodes
const nodeTemplates = [
  { type: 'textNode', label: '📝 文本节点', category: 'input' },
  { type: 'referenceImageNode', label: '🖼️ 参考图片', category: 'input' },
  { type: 'characterLibraryNode', label: '📊 角色库', category: 'input' },
  { type: 'apiSettingsNode', label: '⚙️ API 设置', category: 'input' },
  { type: 'openaiConfigNode', label: '⚙️ OpenAI 配置', category: 'input' },
  { type: 'narratorNode', label: '📖 旁白输入', category: 'input' },
  { type: 'characterCreateNode', label: '🎭 角色生成', category: 'process' },
  { type: 'promptOptimizerNode', label: '📝 提示词优化', category: 'process' },
  { type: 'narratorProcessorNode', label: '⚙️ 旁白处理', category: 'process' },
  { type: 'batchVideoGenerateNode', label: '🎬 批量视频生成', category: 'process' },  // ⭐ 新增
  { type: 'videoGenerateNode', label: '🎬 单个视频生成', category: 'process' },  // ⭐ 更新标签
  { type: 'storyboardNode', label: '🎞️ 故事板', category: 'process' },
  // ⚠️ 停用平台专用故事板节点 (2026-01-07) - 使用统一的 VideoGenerateNode 代替
  // { type: 'juxinStoryboardNode', label: '🎬 聚鑫故事板', category: 'process' },
  // { type: 'zhenzhenStoryboardNode', label: '🎬 贞贞故事板', category: 'process' },
  { type: 'taskResultNode', label: '📺 任务结果', category: 'output' },
  { type: 'characterResultNode', label: '📊 角色结果', category: 'output' },
];

function App() {
  // ✅ 使用 useMemo 包装 nodeTypes，避免 HMR 时重新创建
  const nodeTypes = useMemo(() => ({
    textNode: TextNode,
    referenceImageNode: ReferenceImageNode,
    characterLibraryNode: CharacterLibraryNode,
    apiSettingsNode: APISettingsNode,
    openaiConfigNode: OpenAIConfigNode,
    narratorNode: NarratorNode,
    characterCreateNode: CharacterCreateNode,
    batchVideoGenerateNode: BatchVideoGenerateNode,  // ⭐ 批量视频生成节点
    narratorProcessorNode: NarratorProcessorNode,
    // ⚠️ 停用平台专用故事板节点 (2026-01-07)
    // juxinStoryboardNode: JuxinStoryboardNode,
    // zhenzhenStoryboardNode: ZhenzhenStoryboardNode,
    videoGenerateNode: VideoGenerateNode,
    storyboardNode: StoryboardNode,
    promptOptimizerNode: PromptOptimizerNode,
    taskResultNode: TaskResultNode,
    characterResultNode: CharacterResultNode,
    batchResultNode: BatchResultNode,  // ⭐ 批量结果节点
  }), []);

  // ✅ 加载当前命名工作流（替代旧的自动保存系统）
  const loadCurrentWorkflow = () => {
    const currentName = WorkflowStorage.getCurrentWorkflowName();
    if (currentName) {
      const result = WorkflowStorage.loadWorkflow(currentName);
      if (result.success) {
        console.log(`[App] 已加载工作流: ${currentName}`);
        return {
          nodes: result.data.nodes || [],
          edges: result.data.edges || []
        };
      }
    }
    return { nodes: [], edges: [] };
  };

  const savedWorkflow = loadCurrentWorkflow();
  const [nodes, setNodes, onNodesChange] = useNodesState(savedWorkflow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(savedWorkflow.edges);
  const { executionState, progress, executeWorkflow, resetExecution } = useWorkflowExecution();
  const [showAddMenu, setShowAddMenu] = useState(false);

  // ⚠️ 存储 edges 的历史引用，用于内容比较（避免抖动）
  const lastEdgesRef = useRef([]);

  const [nextNodeId, setNextNodeId] = useState(() => {
    // Find the highest node ID from saved workflow
    if (savedWorkflow.nodes.length > 0) {
      const maxId = Math.max(...savedWorkflow.nodes.map(n => parseInt(n.id) || 0));
      return maxId + 1;
    }
    return 10; // Start from 10 if no saved workflow
  });

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);
  const [copiedNode, setCopiedNode] = useState(null);

  // Workflow management state
  const [currentWorkflowName, setCurrentWorkflowName] = useState(() =>
    WorkflowStorage.getCurrentWorkflowName()
  );
  const [showWorkflowMenu, setShowWorkflowMenu] = useState(false);
  const [showWorkflowList, setShowWorkflowList] = useState(false);
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [saveAsDescription, setSaveAsDescription] = useState('');

  // Get React Flow instance for coordinate conversion
  const { project } = useReactFlow();

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Stable onSizeChange callback for resizable nodes
  const handleNodeSizeChange = useCallback((nodeId, width, height) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: { ...n.data, width, height },
              style: { ...n.style, width: `${width}px`, minHeight: `${height}px` },
            }
          : n
      )
    );
  }, [setNodes]);

  // ⚠️ 辅助函数：比较两个 edges 数组的内容是否相同（避免抖动）
  const edgesEqual = (edgesA, edgesB) => {
    if (edgesA.length !== edgesB.length) return false;

    return edgesA.every((edge, index) => {
      const other = edgesB[index];
      return edge.source === other.source &&
             edge.target === other.target &&
             edge.sourceHandle === other.sourceHandle &&
             edge.targetHandle === other.targetHandle;
    });
  };

  // Update node data when connections change or when execution state changes
  useEffect(() => {
    // ⭐ 只在 edges 内容真正变化时才更新节点（避免抖动）
    if (!edgesEqual(lastEdgesRef.current, edges)) {
      console.log('[App] Edges content changed, updating nodes', {
        oldCount: lastEdgesRef.current.length,
        newCount: edges.length
      });
      lastEdgesRef.current = edges;

      // For each node, check incoming connections and update data
      setNodes((nds) =>
        nds.map((node) => {
        const incomingEdges = edges.filter((e) => e.target === node.id);
        const newData = { ...node.data };

        // ⭐ 优化：只在必要时设置 onSizeChange（避免不必要的 data 变化）
        if (node.data.onSizeChange !== handleNodeSizeChange) {
          newData.onSizeChange = handleNodeSizeChange;
        }

        // Check for prompt input from text node, prompt optimizer node, or narrator processor node
        const promptEdge = incomingEdges.find((e) => e.targetHandle === 'prompt-input');
        if (promptEdge) {
          const sourceNode = nds.find((n) => n.id === promptEdge.source);
          // ✅ TextNode, PromptOptimizerNode, NarratorProcessorNode 都可以连接到 prompt-input
          const validPromptSourceTypes = ['textNode', 'promptOptimizerNode', 'narratorProcessorNode'];
          if (sourceNode && validPromptSourceTypes.includes(sourceNode.type)) {
            if (sourceNode.type === 'textNode') {
              newData.connectedPrompt = sourceNode.data.value || '';
            } else if (sourceNode.type === 'promptOptimizerNode') {
              newData.connectedPrompt = sourceNode.data.optimizedPrompt || '';
            } else if (sourceNode.type === 'narratorProcessorNode') {
              // ⭐ 从 NarratorProcessorNode 接收旁白数据
              newData.manualPrompt = sourceNode.data.currentPrompt || '';
              newData.narratorMode = sourceNode.data.narratorMode || false;
              newData.narratorIndex = sourceNode.data.currentIndex || 0;
              newData.narratorTotal = sourceNode.data.total || 0;
              newData.narratorSentences = sourceNode.data.sentences || [];
            }
          } else {
            // ❌ 源节点类型无效，清除连接数据
            newData.connectedPrompt = undefined;
          }
        }

        // Check for character input (for video generate node)
        const characterEdge = incomingEdges.find((e) => e.targetHandle === 'character-input');
        if (characterEdge) {
          const sourceNode = nds.find((n) => n.id === characterEdge.source);

          // ✅ 验证源节点类型（只有 CharacterLibraryNode 可以连接到 character-input）
          const validCharacterSourceTypes = ['characterLibraryNode'];

          if (sourceNode && validCharacterSourceTypes.includes(sourceNode.type)) {
            // 源节点类型有效，允许传递角色数据
            // For video generate node: get selected character(s)
            // ⭐ 支持 connectedCharacters 数组（CharacterLibraryNode 传递）
            if (sourceNode?.data?.connectedCharacters) {
              newData.connectedCharacters = sourceNode.data.connectedCharacters;
            }
            // 兼容旧的单角色选择
            if (sourceNode?.data?.selectedCharacter) {
              newData.connectedCharacter = sourceNode.data.selectedCharacter;
            }

            // For character result node: store connected source ID for event listener
            if (node.type === 'characterResultNode') {
              newData.connectedSourceId = characterEdge.source;
            }
          } else {
            // ❌ 源节点类型无效，清除所有角色相关数据
            newData.connectedCharacters = undefined;
            newData.connectedCharacter = undefined;
            newData.connectedSourceId = undefined;
          }
        }

        // Check for images input
        const imagesEdge = incomingEdges.find((e) => e.targetHandle === 'images-input');
        if (imagesEdge) {
          const sourceNode = nds.find((n) => n.id === imagesEdge.source);
          // ✅ 只有 ReferenceImageNode 可以连接到 images-input
          if (sourceNode?.type === 'referenceImageNode') {
            // ⭐ 关键修复：ReferenceImageNode 保存 selectedImages 为数组
            // 如果有选中的图片数组，直接使用；否则传递所有图片
            const selectedImagesArray = sourceNode.data?.selectedImages;
            const allImages = sourceNode.data?.images || [];

            if (selectedImagesArray && Array.isArray(selectedImagesArray)) {
              // 有 selectedImages 数据：使用它（已过滤）
              newData.connectedImages = selectedImagesArray;
            } else {
              // 向后兼容：没有 selectedImages 数据时传递所有图片
              newData.connectedImages = allImages;
            }
          } else {
            // ❌ 源节点类型无效，清除连接数据
            newData.connectedImages = undefined;
          }
        } else {
          // ⭐ 关键修复：没有 images-input 连接时，清除 connectedImages
          newData.connectedImages = undefined;
        }

        // Check for OpenAI config input (for prompt optimizer node)
        const openaiConfigEdge = incomingEdges.find((e) => e.targetHandle === 'openai-config');
        if (openaiConfigEdge) {
          const sourceNode = nds.find((n) => n.id === openaiConfigEdge.source);
          // ✅ 只有 OpenAIConfigNode 可以连接到 openai-config
          if (sourceNode?.type === 'openaiConfigNode') {
            newData.openaiConfig = sourceNode.data.openaiConfig || null;
          } else {
            // ❌ 源节点类型无效，清除配置
            newData.openaiConfig = undefined;
          }
        } else {
          // 没有连线时，清除配置
          newData.openaiConfig = undefined;
        }

        // ⭐ Check for API config input (for video generate/batch generate nodes) - 2026-01-13 新增
        const apiConfigEdge = incomingEdges.find((e) => e.targetHandle === 'api-config');
        if (apiConfigEdge) {
          const sourceNode = nds.find((n) => n.id === apiConfigEdge.source);
          // ✅ 只有 APISettingsNode 可以连接到 api-config
          if (sourceNode?.type === 'apiSettingsNode' && sourceNode.data?.apiConfig) {
            newData.apiConfig = sourceNode.data.apiConfig;
            console.log('[App] ✅ API 配置已同步:', {
              targetNode: node.type,
              platform: sourceNode.data.apiConfig.platform,
              model: sourceNode.data.apiConfig.model
            });
          } else {
            // ❌ 源节点类型无效，清除配置
            newData.apiConfig = undefined;
          }
        } else {
          // 没有连线时，清除配置
          newData.apiConfig = undefined;
        }

        // Check for narrator input (for narrator processor node)
        const narratorEdge = incomingEdges.find((e) => e.targetHandle === 'narrator-input');
        if (narratorEdge) {
          const sourceNode = nds.find((n) => n.id === narratorEdge.source);
          // ✅ 只有 NarratorNode 可以连接到 narrator-input
          if (sourceNode?.type === 'narratorNode') {
            // 传递句子数组和相关配置
            if (sourceNode.data?.sentences) {
              newData.sentences = sourceNode.data.sentences;
            }
            if (sourceNode.data?.connectedCharacters) {
              newData.connectedCharacters = sourceNode.data.connectedCharacters;
            }
            if (sourceNode.data?.style) {
              newData.style = sourceNode.data.style;
            }
            if (sourceNode.data?.targetDuration) {
              newData.targetDuration = sourceNode.data.targetDuration;
            }
            if (sourceNode.data?.optimizationDirection) {
              newData.optimizationDirection = sourceNode.data.optimizationDirection;
            }
            if (sourceNode.data?.customStyleDescription) {
              newData.customStyleDescription = sourceNode.data.customStyleDescription;
            }
          } else {
            // ❌ 源节点类型无效，清除所有相关数据
            newData.sentences = undefined;
            newData.connectedCharacters = undefined;
            newData.style = undefined;
            newData.targetDuration = undefined;
            newData.optimizationDirection = undefined;
            newData.customStyleDescription = undefined;
          }
        } else {
          // 没有连线时，清除所有相关数据
          newData.sentences = undefined;
          newData.connectedCharacters = undefined;
          newData.style = undefined;
          newData.targetDuration = undefined;
          newData.optimizationDirection = undefined;
          newData.customStyleDescription = undefined;
        }

        // Check for video input (for task result node)
        const videoEdge = incomingEdges.find((e) => e.targetHandle === 'task-input');
        if (videoEdge) {
          const sourceNode = nds.find((n) => n.id === videoEdge.source);

          // ✅ 验证源节点类型
          const validVideoSourceTypes = [
            'videoGenerateNode',   // 视频生成节点
            'storyboardNode',
            // ⚠️ 停用平台专用故事板节点 (2026-01-07)
            // 'juxinStoryboardNode',
            // 'zhenzhenStoryboardNode',      // 故事板节点
            'characterCreateNode'  // 角色创建节点
          ];

          if (sourceNode && validVideoSourceTypes.includes(sourceNode.type)) {
            // 源节点类型有效，允许设置 connectedSourceId
            if (sourceNode?.data?.taskId) {
              newData.taskId = sourceNode.data.taskId;
            }
            // Store connected source ID for event listener
            newData.connectedSourceId = videoEdge.source;
          } else {
            // ❌ 源节点类型无效，清除所有相关数据
            newData.taskId = undefined;
            newData.connectedSourceId = undefined;
          }
        } else {
          // ⭐ 关键修复：没有连线时，清除所有相关数据（防止旧连接残留）
          newData.taskId = undefined;
          newData.connectedSourceId = undefined;
        }

        // ⭐ 关键修复：只有当 data 真正变化时才返回新对象（避免无限循环）
        // 使用精确比较关键属性（替代 JSON.stringify，避免对象属性顺序影响）
        const oldData = node.data;
        const dataChanged = (
          oldData.connectedCharacters !== newData.connectedCharacters ||
          oldData.connectedImages !== newData.connectedImages ||
          oldData.connectedPrompt !== newData.connectedPrompt ||
          oldData.taskId !== newData.taskId ||
          oldData.selectedCharacters !== newData.selectedCharacters ||
          oldData.manualPrompt !== newData.manualPrompt ||
          oldData.images !== newData.images ||
          oldData.shots !== newData.shots ||
          oldData.useGlobalImages !== newData.useGlobalImages ||
          oldData.connectedSourceId !== newData.connectedSourceId || // ⭐ 新增：修复 TaskResultNode 连接检测
          oldData.openaiConfig !== newData.openaiConfig || // ⭐ 新增：OpenAI 配置连接检测
          oldData.sentences !== newData.sentences || // ⭐ 新增：旁白句子数组
          oldData.style !== newData.style || // ⭐ 新增：优化风格
          oldData.targetDuration !== newData.targetDuration || // ⭐ 新增：目标时长
          oldData.optimizationDirection !== newData.optimizationDirection || // ⭐ 新增：优化方向
          oldData.customStyleDescription !== newData.customStyleDescription // ⭐ 新增：自定义风格描述
        );

        if (dataChanged) {
          return { ...node, data: newData };
        }
        return node;
      })
    );
    }
  }, [edges, setNodes, handleNodeSizeChange]);

  // ⭐ 数据迁移：自动迁移旧的 workflow-nodes 数据到新系统（向后兼容）
  useEffect(() => {
    const migrateOldData = () => {
      try {
        const oldNodes = localStorage.getItem('workflow-nodes');
        const oldEdges = localStorage.getItem('workflow-edges');

        if (oldNodes || oldEdges) {
          console.log('[App] 检测到旧的工作流数据，开始迁移...');

          const nodes = oldNodes ? JSON.parse(oldNodes) : [];
          const edges = oldEdges ? JSON.parse(oldEdges) : [];

          // 如果旧数据为空，跳过迁移
          if (nodes.length === 0 && edges.length === 0) {
            console.log('[App] 旧数据为空，跳过迁移');
            localStorage.removeItem('workflow-nodes');
            localStorage.removeItem('workflow-edges');
            return;
          }

          // 生成唯一名称
          const workflows = WorkflowStorage.getAllWorkflows();
          const existingNames = Object.keys(workflows);
          let counter = 1;
          let newName = '未命名工作流 1';
          while (existingNames.includes(newName)) {
            counter++;
            newName = `未命名工作流 ${counter}`;
          }

          // 保存到新系统
          const result = WorkflowStorage.saveWorkflow(newName, nodes, edges, '从旧版本迁移');

          if (result.success) {
            console.log(`[App] ✅ 旧数据已迁移为 "${newName}"`);
            setCurrentWorkflowName(newName);

            // 清理旧数据
            localStorage.removeItem('workflow-nodes');
            localStorage.removeItem('workflow-edges');
            console.log('[App] ✅ 已清理旧的工作流数据');
          } else {
            console.error('[App] ❌ 迁移失败:', result.error);
          }
        }
      } catch (error) {
        console.error('[App] 数据迁移失败:', error);
      }
    };

    migrateOldData();
  }, []);

  // ⭐ 监听 NarratorProcessorNode 优化完成事件，自动保存工作流
  useEffect(() => {
    const handleOptimizationComplete = (event) => {
      const { nodeId, sentencesCount } = event.detail;
      console.log(`[App] NarratorProcessorNode (${nodeId}) 优化完成，自动保存工作流 (${sentencesCount} 个句子)`);

      // 自动保存当前工作流
      let workflowName = currentWorkflowName;

      // 如果没有当前工作流名称，自动生成未命名工作流
      if (!workflowName) {
        const workflows = WorkflowStorage.getAllWorkflows();
        const existingNames = Object.keys(workflows);

        // 找到最大的未命名工作流编号
        let maxCounter = 0;
        existingNames.forEach(name => {
          const match = name.match(/^未命名工作流 (\d+)$/);
          if (match) {
            const counter = parseInt(match[1], 10);
            if (counter > maxCounter) {
              maxCounter = counter;
            }
          }
        });

        // 生成新的未命名工作流名称
        workflowName = `未命名工作流 ${maxCounter + 1}`;
      }

      // 保存工作流
      const result = WorkflowStorage.saveWorkflow(workflowName, nodes, edges);

      if (result.success) {
        setCurrentWorkflowName(workflowName);
        console.log(`[App] ✅ 工作流 "${workflowName}" 已自动保存 (${nodes.length} 节点, ${edges.length} 连线)`);
      } else {
        console.error(`[App] ❌ 自动保存工作流失败: ${result.error}`);
      }
    };

    // 添加事件监听器
    window.addEventListener('narrator-optimization-complete', handleOptimizationComplete);

    // 清理函数：移除事件监听器
    return () => {
      window.removeEventListener('narrator-optimization-complete', handleOptimizationComplete);
    };
  }, [nodes, edges, currentWorkflowName]);

  // Add a new node
  const addNode = useCallback((nodeType, label, position) => {
    const newNode = {
      id: String(nextNodeId),
      type: nodeType,
      position: position || { x: Math.random() * 400 + 100, y: Math.random() * 300 + 50 },
      data: { label },
    };
    setNodes((nds) => [...nds, newNode]);
    setNextNodeId((id) => id + 1);
    setShowAddMenu(false);
  }, [nextNodeId, setNodes]);

  // Delete selected nodes
  const deleteSelectedNodes = useCallback(() => {
    setNodes((nds) => nds.filter((node) => !node.selected));
    setEdges((eds) => eds.filter((edge) => {
      const sourceNode = nds.find((n) => n.id === edge.source);
      const targetNode = nds.find((n) => n.id === edge.target);
      return sourceNode?.selected || targetNode?.selected ? false : true;
    }));
    setContextMenu(null);
  }, [setNodes, setEdges]);

  // Delete a specific node (from context menu)
  const deleteNode = useCallback((nodeToDelete) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeToDelete.id));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeToDelete.id && edge.target !== nodeToDelete.id));
    setContextMenu(null);
  }, [setNodes, setEdges]);

  // Copy node
  const copyNode = useCallback((node) => {
    setCopiedNode({ type: node.type, data: { ...node.data } });
    setContextMenu(null);
  }, []);

  // Paste node
  const pasteNode = useCallback(() => {
    if (copiedNode) {
      addNode(copiedNode.type, copiedNode.data.label + ' (副本)', contextMenu?.position);
      setContextMenu(null);
    }
  }, [copiedNode, addNode, contextMenu]);

  // Handle node right-click
  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'node',
      node,
    });
  }, []);

  // Handle pane right-click
  const onPaneContextMenu = useCallback((event) => {
    event.preventDefault();
    // Convert screen coordinates to flow coordinates
    const position = project({ x: event.clientX, y: event.clientY });
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'pane',
      position,
    });
  }, [project]);

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleExecute = async () => {
    console.log('[App] Starting workflow execution...');
    const result = await executeWorkflow(nodes, edges);
    console.log('[App] Workflow execution result:', result);
  };

  // Workflow management handlers
  const handleSaveWorkflow = () => {
    // ⭐ 派发事件，强制所有节点同步最新状态到 node.data
    // 这确保保存时获取的是所有节点的最新数据
    window.dispatchEvent(new CustomEvent('workflow-before-save', { detail: { timestamp: Date.now() } }));

    // ⭐ 延迟保存，等待所有节点的同步 useEffect 执行完成
    setTimeout(() => {
      // 重新获取最新的 nodes（可能已被节点更新）
      const latestNodes = getNodes();
      const latestEdges = getEdges();

      let workflowName = currentWorkflowName;

      // ⭐ 如果没有当前工作流名称，自动生成未命名工作流
      if (!workflowName) {
        const workflows = WorkflowStorage.getAllWorkflows();
        const existingNames = Object.keys(workflows);

        // 找到最大的未命名工作流编号
        let maxCounter = 0;
        existingNames.forEach(name => {
          const match = name.match(/^未命名工作流 (\d+)$/);
          if (match) {
            const counter = parseInt(match[1]);
            if (counter > maxCounter) {
              maxCounter = counter;
            }
          }
        });

        // 生成新的未命名工作流名称
        workflowName = `未命名工作流 ${maxCounter + 1}`;
      }

      // 保存工作流（使用最新的 nodes 和 edges）
      const result = WorkflowStorage.saveWorkflow(workflowName, latestNodes, latestEdges);

      if (result.success) {
        setCurrentWorkflowName(workflowName);
        console.log(`✅ 工作流 "${workflowName}" 已保存 (${latestNodes.length} 节点, ${latestEdges.length} 连线)`);
        // ⭐ 静默保存，不显示 alert 弹窗
      } else {
        alert(`❌ 保存失败: ${result.error}`);
      }

      setShowWorkflowMenu(false);
    }, 150); // ⭐ 延迟 150ms，确保所有同步 useEffect 执行完成
  };

  const handleSaveAsWorkflow = () => {
    setShowSaveAsDialog(true);
    setShowWorkflowMenu(false);
  };

  const confirmSaveAs = () => {
    const name = saveAsName.trim();
    if (!name) {
      alert('请输入工作流名称');
      return;
    }

    const result = WorkflowStorage.saveWorkflow(
      name,
      nodes,
      edges,
      saveAsDescription
    );

    if (result.success) {
      setCurrentWorkflowName(name);
      setSaveAsName('');
      setSaveAsDescription('');
      setShowSaveAsDialog(false);
      alert(`✅ 工作流 "${name}" 已保存`);
    } else {
      alert(`❌ 保存失败: ${result.error}`);
    }
  };

  const handleNewWorkflow = () => {
    if (nodes.length > 0 || edges.length > 0) {
      if (!confirm('确定要新建工作流吗？当前未保存的更改将丢失。')) {
        return;
      }
    }
    setNodes([]);
    setEdges([]);
    setCurrentWorkflowName(null);
    setNextNodeId(10);
    setShowWorkflowMenu(false);
  };

  const handleLoadWorkflow = (name) => {
    const result = WorkflowStorage.loadWorkflow(name);
    if (result.success) {
      const { nodes: savedNodes, edges: savedEdges } = result.data;
      setNodes(savedNodes);
      setEdges(savedEdges);
      setCurrentWorkflowName(name);

      // 更新 nextNodeId
      if (savedNodes.length > 0) {
        const maxId = Math.max(...savedNodes.map(n => parseInt(n.id) || 0));
        setNextNodeId(maxId + 1);
      } else {
        setNextNodeId(10);
      }

      setShowWorkflowList(false);
      setShowWorkflowMenu(false);
    } else {
      alert(`❌ 加载失败: ${result.error}`);
    }
  };

  const handleDeleteWorkflow = (name) => {
    if (!confirm(`确定要删除工作流 "${name}" 吗？此操作不可恢复。`)) {
      return;
    }

    const result = WorkflowStorage.deleteWorkflow(name);
    if (result.success) {
      // 如果删除的是当前工作流，清除当前工作流名称
      if (currentWorkflowName === name) {
        setCurrentWorkflowName(null);
      }
      alert(`✅ 工作流 "${name}" 已删除`);
    } else {
      alert(`❌ 删除失败: ${result.error}`);
    }
  };

  const handleExportWorkflow = (name) => {
    const result = WorkflowStorage.exportWorkflow(name);
    if (result.success) {
      alert(`✅ 工作流 "${name}" 已导出`);
    } else {
      alert(`❌ 导出失败: ${result.error}`);
    }
  };

  const handleImportWorkflow = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    WorkflowStorage.importWorkflow(file).then(result => {
      if (result.success) {
        alert(`✅ 工作流 "${result.data.name}" 已导入`);
        handleLoadWorkflow(result.data.name);
      } else {
        alert(`❌ 导入失败: ${result.error}`);
      }
    });

    // 重置 input
    event.target.value = '';
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{
        padding: '10px 16px',
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: 1000,
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#f8fafc',
        }}>
          ⚡ AI star视频工作台
        </h1>

        {/* Current Workflow Name Display - 始终显示当前状态 */}
        <div style={{
          padding: '4px 10px',
          backgroundColor: currentWorkflowName ? '#3b82f6' : '#64748b',
          borderRadius: '4px',
          fontSize: '12px',
          color: 'white',
          fontWeight: 'bold',
        }}>
          {currentWorkflowName ? `📁 ${currentWorkflowName}` : '📄 未命名工作流'}
        </div>

        {/* Workflow Menu Button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowWorkflowMenu(!showWorkflowMenu)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
            }}
          >
            📁 工作流
          </button>

          {/* Workflow Dropdown Menu */}
          {showWorkflowMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '4px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '4px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              zIndex: 1001,
              minWidth: '160px',
            }}>
              <div style={{ padding: '8px 0' }}>
                <button
                  onClick={handleSaveWorkflow}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    color: '#f8fafc',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#334155'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  💾 保存工作流
                </button>
                <button
                  onClick={handleSaveAsWorkflow}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    color: '#f8fafc',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#334155'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  💾 另存为...
                </button>
                <button
                  onClick={() => {
                    setShowWorkflowList(true);
                    setShowWorkflowMenu(false);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    color: '#f8fafc',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#334155'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  📂 打开工作流...
                </button>
                <button
                  onClick={handleNewWorkflow}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    color: '#f8fafc',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#334155'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  ➕ 新建工作流
                </button>
                <div style={{ padding: '4px 0', borderBottom: '1px solid #334155' }}></div>
                <label
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 16px',
                    color: '#f8fafc',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#334155'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  📥 导入工作流...
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportWorkflow}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Add Node Button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
            }}
          >
            + 添加节点
          </button>

          {/* Add Node Dropdown Menu */}
          {showAddMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '4px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '4px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              zIndex: 1001,
              minWidth: '150px',
            }}>
              <div style={{ padding: '8px 0' }}>
                {nodeTemplates.map((template) => (
                  <button
                    key={template.type}
                    onClick={() => addNode(template.type, template.label)}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 16px',
                      backgroundColor: 'transparent',
                      color: '#f8fafc',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '13px',
                      hover: { backgroundColor: '#334155' },
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#334155'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Delete Node Button */}
        <button
          onClick={deleteSelectedNodes}
          style={{
            padding: '8px 16px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
          }}
        >
          🗑️ 删除选中
        </button>

        <div style={{ flex: 1 }} />

        {/* Execution Status */}
        {executionState.isRunning && (
          <div style={{
            padding: '6px 12px',
            backgroundColor: '#1e40af',
            borderRadius: '4px',
            fontSize: '12px',
            color: 'white',
          }}>
            ⚡ 执行中: {executionState.currentNode || '初始化...'}
          </div>
        )}

        {/* Progress */}
        {progress.total > 0 && (
          <div style={{
            padding: '6px 12px',
            backgroundColor: '#0f766e',
            borderRadius: '4px',
            fontSize: '12px',
            color: 'white',
          }}>
            {progress.completed}/{progress.total} 完成
            {progress.failed > 0 && ` (${progress.failed} 失败)`}
          </div>
        )}

        {/* Execute Button */}
        <button
          onClick={handleExecute}
          disabled={executionState.isRunning}
          style={{
            padding: '8px 16px',
            backgroundColor: executionState.isRunning ? '#64748b' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: executionState.isRunning ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
          }}
        >
          {executionState.isRunning ? '执行中...' : '▶ 执行工作流'}
        </button>

        {/* Reset Button */}
        {executionState.completedNodes.length > 0 && (
          <button
            onClick={resetExecution}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            ↺ 重置
          </button>
        )}
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }} onClick={closeContextMenu}>
        {/* ReactFlow Canvas */}
        <div style={{ flex: 1, height: '100%' }}>
          <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeContextMenu={onNodeContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          nodeTypes={nodeTypes}
          deleteKeyCode="Delete"
          fitView
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            zIndex: 9999,
            minWidth: '160px',
            padding: '4px 0',
          }}
        >
          {contextMenu.type === 'node' ? (
            <>
              {/* Node context menu */}
              <button
                onClick={() => copyNode(contextMenu.node)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: '#f8fafc',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#334155'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                📋 复制节点
              </button>
              <button
                onClick={() => deleteNode(contextMenu.node)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: '#f87171',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#334155'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                🗑️ 删除节点
              </button>
            </>
          ) : (
            <>
              {/* Pane context menu */}
              {copiedNode && (
                <button
                  onClick={pasteNode}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    color: '#f8fafc',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#334155'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  📋 粘贴节点
                </button>
              )}
              <div style={{ padding: '4px 0', borderBottom: '1px solid #334155' }}></div>
              <div style={{ padding: '8px 12px', color: '#94a3b8', fontSize: '11px' }}>
                添加节点:
              </div>
              {nodeTemplates.map((template) => (
                <button
                  key={template.type}
                  onClick={() => addNode(template.type, template.label, contextMenu.position)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 16px',
                    paddingLeft: '24px',
                    backgroundColor: 'transparent',
                    color: '#f8fafc',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#334155'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  {template.label}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Workflow List Dialog */}
      {showWorkflowList && (
        <div
          onClick={() => setShowWorkflowList(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
              width: '600px',
              maxHeight: '500px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Dialog Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#f8fafc' }}>
                📂 工作流列表
              </h2>
              <button
                onClick={() => setShowWorkflowList(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                ×
              </button>
            </div>

            {/* Dialog Body */}
            <div style={{
              padding: '16px 20px',
              overflowY: 'auto',
              flex: 1,
            }}>
              {WorkflowStorage.getWorkflowList().length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#94a3b8',
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>📁</div>
                  <div>暂无保存的工作流</div>
                  <div style={{ fontSize: '12px', marginTop: '8px' }}>
                    创建工作流后，点击"工作流"菜单中的"另存为"来保存
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {WorkflowStorage.getWorkflowList().map((workflow) => (
                    <div
                      key={workflow.name}
                      style={{
                        padding: '12px 16px',
                        backgroundColor: workflow.name === currentWorkflowName ? '#1e40af' : '#334155',
                        borderRadius: '6px',
                        border: workflow.name === currentWorkflowName ? '2px solid #3b82f6' : '1px solid #475569',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: 'bold',
                          color: '#f8fafc',
                          fontSize: '14px',
                          marginBottom: '4px',
                        }}>
                          {workflow.name}
                          {workflow.name === currentWorkflowName && (
                            <span style={{
                              marginLeft: '8px',
                              fontSize: '10px',
                              backgroundColor: '#3b82f6',
                              padding: '2px 6px',
                              borderRadius: '3px',
                            }}>
                              当前
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          color: '#94a3b8',
                        }}>
                          {workflow.nodeCount} 个节点 · {workflow.edgeCount} 条连线
                          {workflow.description && ` · ${workflow.description}`}
                        </div>
                        <div style={{
                          fontSize: '10px',
                          color: '#64748b',
                          marginTop: '4px',
                        }}>
                          更新于 {new Date(workflow.updatedAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => handleLoadWorkflow(workflow.name)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px',
                          }}
                        >
                          打开
                        </button>
                        <button
                          onClick={() => handleExportWorkflow(workflow.name)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#6366f1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px',
                          }}
                        >
                          导出
                        </button>
                        <button
                          onClick={() => handleDeleteWorkflow(workflow.name)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px',
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dialog Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #334155',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setShowWorkflowList(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#64748b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save As Dialog */}
      {showSaveAsDialog && (
        <div
          onClick={() => setShowSaveAsDialog(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
              width: '400px',
            }}
          >
            {/* Dialog Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #334155',
            }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#f8fafc' }}>
                💾 另存为工作流
              </h2>
            </div>

            {/* Dialog Body */}
            <div style={{
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '13px',
                  color: '#f8fafc',
                  fontWeight: 'bold',
                }}>
                  工作流名称 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={saveAsName}
                  onChange={(e) => setSaveAsName(e.target.value)}
                  placeholder="例如: 视频生成工作流"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      confirmSaveAs();
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    color: '#f8fafc',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#334155'}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '13px',
                  color: '#f8fafc',
                  fontWeight: 'bold',
                }}>
                  描述（可选）
                </label>
                <textarea
                  value={saveAsDescription}
                  onChange={(e) => setSaveAsDescription(e.target.value)}
                  placeholder="简单描述这个工作流的用途..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    color: '#f8fafc',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#334155'}
                />
              </div>
            </div>

            {/* Dialog Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #334155',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
            }}>
              <button
                onClick={() => {
                  setShowSaveAsDialog(false);
                  setSaveAsName('');
                  setSaveAsDescription('');
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#64748b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                取消
              </button>
              <button
                onClick={confirmSaveAs}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
