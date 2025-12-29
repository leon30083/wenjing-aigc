import { useCallback, useMemo } from 'react';
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

// Import test nodes
import TextNode from './nodes/input/TextNode';
import VideoNode from './nodes/process/VideoNode';

// Node types configuration (moved outside component to avoid re-creation)
const nodeTypes = {
  textNode: TextNode,
  videoNode: VideoNode,
};

// Initial nodes for testing
const initialNodes = [
  {
    id: '1',
    type: 'textNode',
    position: { x: 100, y: 100 },
    data: { label: '提示词输入', value: '一只可爱的猫咪在花园里玩耍' },
  },
  {
    id: '2',
    type: 'videoNode',
    position: { x: 400, y: 100 },
    data: { label: '视频生成' },
  },
];

// Initial edges for testing
const initialEdges = [];

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
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
  );
}

export default App;
