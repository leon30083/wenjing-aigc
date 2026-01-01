import { useCallback, useState, useRef, useEffect } from 'react';
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
import CharacterCreateNode from './nodes/process/CharacterCreateNode';
import VideoGenerateNode from './nodes/process/VideoGenerateNode';
import StoryboardNode from './nodes/process/StoryboardNode';
import TaskResultNode from './nodes/output/TaskResultNode';
import CharacterResultNode from './nodes/output/CharacterResultNode';

// Node types configuration (moved outside component to avoid re-creation)
const nodeTypes = {
  textNode: TextNode,
  referenceImageNode: ReferenceImageNode,
  characterLibraryNode: CharacterLibraryNode,
  apiSettingsNode: APISettingsNode,
  characterCreateNode: CharacterCreateNode,
  videoGenerateNode: VideoGenerateNode,
  storyboardNode: StoryboardNode,
  taskResultNode: TaskResultNode,
  characterResultNode: CharacterResultNode,
};

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
  { type: 'characterCreateNode', label: '🎭 角色生成', category: 'process' },
  { type: 'videoGenerateNode', label: '🎬 视频生成', category: 'process' },
  { type: 'storyboardNode', label: '🎞️ 故事板', category: 'process' },
  { type: 'taskResultNode', label: '📺 任务结果', category: 'output' },
  { type: 'characterResultNode', label: '📊 角色结果', category: 'output' },
];

function App() {
  // Load saved workflow from localStorage or use empty arrays
  const loadSavedWorkflow = () => {
    try {
      const saved = localStorage.getItem('workflow-nodes');
      const savedEdges = localStorage.getItem('workflow-edges');
      return {
        nodes: saved ? JSON.parse(saved) : [],
        edges: savedEdges ? JSON.parse(savedEdges) : []
      };
    } catch (error) {
      console.error('Failed to load saved workflow:', error);
      return { nodes: [], edges: [] };
    }
  };

  const savedWorkflow = loadSavedWorkflow();
  const [nodes, setNodes, onNodesChange] = useNodesState(savedWorkflow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(savedWorkflow.edges);
  const { executionState, progress, executeWorkflow, resetExecution } = useWorkflowExecution();
  const [showAddMenu, setShowAddMenu] = useState(false);
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

  // Update node data when connections change or when execution state changes
  useEffect(() => {
    // For each node, check incoming connections and update data
    setNodes((nds) =>
      nds.map((node) => {
        const incomingEdges = edges.filter((e) => e.target === node.id);
        const newData = { ...node.data };

        // Add onSizeChange callback for resizable nodes (use stable reference)
        newData.onSizeChange = handleNodeSizeChange;

        // Check for prompt input from text node
        const promptEdge = incomingEdges.find((e) => e.targetHandle === 'prompt-input');
        if (promptEdge) {
          const sourceNode = nds.find((n) => n.id === promptEdge.source);
          // ✅ 只有 TextNode 可以连接到 prompt-input
          if (sourceNode?.type === 'textNode') {
            newData.connectedPrompt = sourceNode.data.value || '';
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
          if (sourceNode?.type === 'referenceImageNode' && sourceNode?.data?.images) {
            newData.connectedImages = sourceNode.data.images;
          } else {
            // ❌ 源节点类型无效，清除连接数据
            newData.connectedImages = undefined;
          }
        }

        // Check for video input (for task result node)
        const videoEdge = incomingEdges.find((e) => e.targetHandle === 'task-input');
        if (videoEdge) {
          const sourceNode = nds.find((n) => n.id === videoEdge.source);

          // ✅ 验证源节点类型
          const validVideoSourceTypes = [
            'videoGenerateNode',   // 视频生成节点
            'storyboardNode',      // 故事板节点
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
          oldData.connectedSourceId !== newData.connectedSourceId // ⭐ 新增：修复 TaskResultNode 连接检测
        );

        if (dataChanged) {
          return { ...node, data: newData };
        }
        return node;
      })
    );
  }, [edges, setNodes, handleNodeSizeChange]);

  // Save workflow to localStorage whenever nodes or edges change (with 500ms debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('workflow-nodes', JSON.stringify(nodes));
        localStorage.setItem('workflow-edges', JSON.stringify(edges));
        console.log('[App] Workflow saved to localStorage');
      } catch (error) {
        console.error('[App] Failed to save workflow:', error);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [nodes, edges]);

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
    if (currentWorkflowName) {
      // 保存到当前工作流
      const result = WorkflowStorage.saveWorkflow(
        currentWorkflowName,
        nodes,
        edges
      );
      if (result.success) {
        alert(`✅ 工作流 "${currentWorkflowName}" 已保存`);
      } else {
        alert(`❌ 保存失败: ${result.error}`);
      }
    } else {
      // 没有当前工作流，弹出另存为对话框
      setShowSaveAsDialog(true);
    }
    setShowWorkflowMenu(false);
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
          ⚡ WinJin 工作流编辑器
        </h1>

        {/* Current Workflow Name Display */}
        {currentWorkflowName && (
          <div style={{
            padding: '4px 10px',
            backgroundColor: '#3b82f6',
            borderRadius: '4px',
            fontSize: '12px',
            color: 'white',
            fontWeight: 'bold',
          }}>
            📁 {currentWorkflowName}
          </div>
        )}

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
