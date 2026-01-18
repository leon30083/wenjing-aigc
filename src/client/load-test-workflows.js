/**
 * E2E测试工作流快速加载脚本
 *
 * 使用方法：
 * 1. 打开 http://localhost:5173
 * 2. 打开浏览器开发者工具 (F12)
 * 3. 切换到 Console 标签
 * 4. 复制粘贴此脚本并运行
 */

(async function loadTestWorkflows() {
  console.log('🚀 开始加载 E2E 测试工作流...\n');

  try {
    // 1. 加载完整版工作流
    console.log('📦 加载完整测试工作流...');
    const completeResponse = await fetch('/test-workflow-complete.json');
    if (!completeResponse.ok) throw new Error('无法加载完整工作流文件');
    const completeWorkflow = await completeResponse.json();

    // 2. 加载简化版工作流
    console.log('📦 加载简化测试工作流...');
    const simpleResponse = await fetch('/test-workflow-simple.json');
    if (!simpleResponse.ok) throw new Error('无法加载简化工作流文件');
    const simpleWorkflow = await simpleResponse.json();

    // 3. 保存到 localStorage
    const workflows = JSON.parse(localStorage.getItem('winjin-workflows') || '{}');
    workflows[completeWorkflow.name] = completeWorkflow;
    workflows[simpleWorkflow.name] = simpleWorkflow;

    localStorage.setItem('winjin-workflows', JSON.stringify(workflows));

    console.log('✅ 工作流已保存到 localStorage\n');
    console.log('📋 可用工作流列表:');
    console.log(`   1. ${completeWorkflow.name}`);
    console.log(`      - ${completeWorkflow.nodes.length} 个节点`);
    console.log(`      - ${completeWorkflow.edges.length} 条连接`);
    console.log(`   2. ${simpleWorkflow.name}`);
    console.log(`      - ${simpleWorkflow.nodes.length} 个节点`);
    console.log(`      - ${simpleWorkflow.edges.length} 条连接\n`);

    // 4. 提供加载选项
    console.log('⚡ 快速加载命令:\n');
    console.log('   // 加载完整版工作流:');
    console.log(`   localStorage.setItem('winjin-current-workflow', '${completeWorkflow.name}');`);
    console.log('   window.location.reload();\n');
    console.log('   // 加载简化版工作流:');
    console.log(`   localStorage.setItem('winjin-current-workflow', '${simpleWorkflow.name}');`);
    console.log('   window.location.reload();\n');

    // 5. 自动加载简化版（推荐用于快速测试）
    const shouldAutoLoad = confirm(
      '✅ 测试工作流已加载！\n\n' +
      '是否立即加载简化版工作流进行测试？\n\n' +
      '点击"确定"立即加载\n' +
      '点击"取消"手动执行上面的命令'
    );

    if (shouldAutoLoad) {
      localStorage.setItem('winjin-current-workflow', simpleWorkflow.name);
      console.log('✅ 已选择加载简化版工作流，页面即将刷新...\n');
      window.location.reload();
    } else {
      console.log('ℹ️ 已取消自动加载，请手动执行上面的命令加载工作流\n');
    }

  } catch (error) {
    console.error('❌ 加载失败:', error.message);
    console.error('\n可能的原因:');
    console.error('1. Vite 开发服务器未启动');
    console.error('2. 测试文件路径不正确');
    console.error('3. 浏览器安全策略限制\n');

    console.log('💡 手动加载方法:');
    console.log('1. 打开 test-workflow-complete.json 文件');
    console.log('2. 复制文件内容');
    console.log('3. 在控制台运行:');
    console.log('   const data = { /* 粘贴内容 */ };');
    console.log('   localStorage.setItem("winjin-workflows", JSON.stringify({ [data.name]: data }));');
    console.log('   window.location.reload();\n');
  }
})();
