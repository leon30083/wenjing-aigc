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
