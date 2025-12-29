import { useCallback } from 'react';
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

// Node types configuration (moved outside component to avoid re-creation)
const nodeTypes = {
  textNode: TextNode,
  referenceImageNode: ReferenceImageNode,
  characterSelectNode: CharacterSelectNode,
  characterLibraryNode: CharacterLibraryNode,
  characterCreateNode: CharacterCreateNode,
  videoGenerateNode: VideoGenerateNode,
  storyboardNode: StoryboardNode,
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

  // Process Nodes (right column)
  {
    id: '5',
    type: 'characterCreateNode',
    position: { x: 400, y: 30 },
    data: { label: '角色生成' },
  },
  {
    id: '6',
    type: 'videoGenerateNode',
    position: { x: 400, y: 230 },
    data: { label: '视频生成' },
  },
  {
    id: '7',
    type: 'storyboardNode',
    position: { x: 400, y: 420 },
    data: { label: '故事板' },
  },
];

// Initial edges for testing
const initialEdges = [];

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { executionState, progress, executeWorkflow, resetExecution } = useWorkflowExecution();

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

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
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}

export default App;
