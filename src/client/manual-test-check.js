// 手动测试脚本 - 在浏览器控制台运行

// 1. 检查测试 API
console.log('=== 检查测试 API ===');
console.log('window.__REACT_FLOW_TEST_API__:', window.__REACT_FLOW_TEST_API__);

// 2. 添加两个节点
console.log('\n=== 添加节点 ===');
const testApi = window.__REACT_FLOW_TEST_API__;

// 3. 创建连接
console.log('\n=== 创建连接 ===');
testApi.connectNodes('10', '12', 'text-output', 'prompt-input');

// 4. 检查状态
console.log('\n=== 检查状态 ===');
setTimeout(() => {
  const edges = testApi.getEdges();
  console.log('Edges in state:', edges.length);
  console.log('Edge data:', edges);
  
  // 5. 检查 DOM
  console.log('\n=== 检查 DOM ===');
  const domEdges = document.querySelectorAll('.react-flow__edge');
  console.log('Edges in DOM:', domEdges.length);
  
  if (domEdges.length === 0) {
    console.error('⚠️ 问题: Edge 在状态中但不在 DOM 中！');
    console.log('这意味着用户看不到连接线');
  }
}, 1000);
