import { useCallback, useState, useRef } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css';
import { useWorkflowExecution } from './hooks/useWorkflowExecution';

// Import test nodes
import TextNode from './nodes/input/TextNode';
import ReferenceImageNode from './nodes/input/ReferenceImageNode';
import CharacterSelectNode from './nodes/input/CharacterSelectNode';
import CharacterLibraryNode from './nodes/input/CharacterLibraryNode';
import CharacterCreateNode from './nodes/process/CharacterCreateNode';
import VideoGenerateNode from './nodes/process/VideoGenerateNode';
import StoryboardNode from './nodes/process/StoryboardNode';
import TaskResultNode from './nodes/output/TaskResultNode';
import ExecutionLogNode from './nodes/output/ExecutionLogNode';

// Node types configuration (moved outside component to avoid re-creation)
const nodeTypes = {
  textNode: TextNode,
  referenceImageNode: ReferenceImageNode,
  characterSelectNode: CharacterSelectNode,
  characterLibraryNode: CharacterLibraryNode,
  characterCreateNode: CharacterCreateNode,
  videoGenerateNode: VideoGenerateNode,
  storyboardNode: StoryboardNode,
  taskResultNode: TaskResultNode,
  executionLogNode: ExecutionLogNode,
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
    type: 'characterSelectNode',
    position: { x: 50, y: 270 },
    data: { label: '角色选择', selectedUsername: null },
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
    type: 'executionLogNode',
    position: { x: 650, y: 400 },
    data: { label: '执行日志', logs: [] },
  },
];

// Initial edges for testing
const initialEdges = [];

// Node templates for adding new nodes
const nodeTemplates = [
  { type: 'textNode', label: '📝 文本节点', category: 'input' },
  { type: 'referenceImageNode', label: '🖼️ 参考图片', category: 'input' },
  { type: 'characterSelectNode', label: '🐱 角色选择', category: 'input' },
  { type: 'characterLibraryNode', label: '📊 角色库', category: 'input' },
  { type: 'characterCreateNode', label: '🎭 角色生成', category: 'process' },
  { type: 'videoGenerateNode', label: '🎬 视频生成', category: 'process' },
  { type: 'storyboardNode', label: '🎞️ 故事板', category: 'process' },
  { type: 'taskResultNode', label: '📺 任务结果', category: 'output' },
  { type: 'executionLogNode', label: '📋 执行日志', category: 'output' },
];

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { executionState, progress, executeWorkflow, resetExecution } = useWorkflowExecution();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [nextNodeId, setNextNodeId] = useState(10); // Start from 10 (initial nodes use 1-9)

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);
  const [copiedNode, setCopiedNode] = useState(null);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

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
    // Get the react-flow container to calculate position
    const container = document.querySelector('.react-flow');
    if (container) {
      const rect = container.getBoundingClientRect();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        type: 'pane',
        position: {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        },
      });
    }
  }, []);

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleExecute = async () => {
    console.log('[App] Starting workflow execution...');
    const result = await executeWorkflow(nodes, edges);
    console.log('[App] Workflow execution result:', result);
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
      <div style={{ flex: 1 }} onClick={closeContextMenu}>
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
                onClick={deleteSelectedNodes}
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
    </div>
  );
}

export default App;
