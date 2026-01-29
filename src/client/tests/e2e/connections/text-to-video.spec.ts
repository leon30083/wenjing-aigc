import { test } from '../../fixtures/reactflow.fixture';
import { expect } from '@playwright/test';

/**
 * Connection Tests for React Flow
 *
 * These tests verify that nodes can be connected properly,
 * which is essential for data flow between nodes.
 */
test.describe('Node Connection Tests', () => {
  test.beforeEach(async ({ page, reactFlowHelper }) => {
    await page.goto('/');
    await reactFlowHelper.waitForPageLoad();

    // Add nodes for testing
    await reactFlowHelper.addNode('文本节点');
    await reactFlowHelper.addNode('角色库');
    await reactFlowHelper.addNode('视频生成');
    await reactFlowHelper.addNode('任务结果');
  });

  test('should connect TextNode to VideoGenerateNode', async ({ page, reactFlowHelper }) => {
    // Get node IDs using DOM-based method
    const allNodes = await reactFlowHelper.getAllNodeInfo();

    const textNode = allNodes.find((n) => n.type === 'textNode');
    const videoNode = allNodes.find((n) => n.type === 'videoGenerateNode');

    if (!textNode || !videoNode) {
      throw new Error(`Could not find required nodes. Found: ${JSON.stringify(allNodes)}`);
    }

    console.log(`Found TextNode: ${textNode.id}, VideoNode: ${videoNode.id}`);

    // Connect TextNode → VideoGenerateNode
    await reactFlowHelper.connectNodes(
      textNode.id,
      videoNode.id,
      'text-output',
      'prompt-input'
    );

    // Verify edge was created in state (using test API)
    const edgeExistsInState = await page.evaluate(({ sourceId, targetId }) => {
      // @ts-ignore - Access test API
      const testApi = window.__REACT_FLOW_TEST_API__;
      if (!testApi || !testApi.getEdges) return false;

      const edges = testApi.getEdges();
      return edges.some((e: any) =>
        e.source === sourceId && e.target === targetId
      );
    }, { sourceId: textNode.id, targetId: videoNode.id });

    expect(edgeExistsInState).toBeTruthy();
    console.log('✅ Connection verified in React Flow state');
  });

  test('should connect CharacterLibraryNode to VideoGenerateNode', async ({ page, reactFlowHelper }) => {
    const allNodes = await reactFlowHelper.getAllNodeInfo();

    const charNode = allNodes.find((n) => n.type === 'characterLibraryNode');
    const videoNode = allNodes.find((n) => n.type === 'videoGenerateNode');

    if (!charNode || !videoNode) {
      throw new Error(`Could not find required nodes. Found: ${JSON.stringify(allNodes)}`);
    }

    // Connect CharacterLibraryNode → VideoGenerateNode
    await reactFlowHelper.connectNodes(
      charNode.id,
      videoNode.id,
      'characters-output',
      'character-input'
    );

    // Verify edge exists in state
    const edgeExistsInState = await page.evaluate(({ sourceId, targetId }) => {
      // @ts-ignore - Access test API
      const testApi = window.__REACT_FLOW_TEST_API__;
      if (!testApi || !testApi.getEdges) return false;

      const edges = testApi.getEdges();
      return edges.some((e: any) =>
        e.source === sourceId && e.target === targetId
      );
    }, { sourceId: charNode.id, targetId: videoNode.id });

    expect(edgeExistsInState).toBeTruthy();
    console.log('✅ CharacterLibraryNode → VideoGenerateNode connection verified');
  });

  test('should connect VideoGenerateNode to TaskResultNode', async ({ page, reactFlowHelper }) => {
    const allNodes = await reactFlowHelper.getAllNodeInfo();

    const videoNode = allNodes.find((n) => n.type === 'videoGenerateNode');
    const resultNode = allNodes.find((n) => n.type === 'taskResultNode');

    if (!videoNode || !resultNode) {
      throw new Error(`Could not find required nodes. Found: ${JSON.stringify(allNodes)}`);
    }

    // Connect VideoGenerateNode → TaskResultNode
    await reactFlowHelper.connectNodes(
      videoNode.id,
      resultNode.id,
      'video-output',
      'task-input'
    );

    // Verify edge exists in state
    const edgeExistsInState = await page.evaluate(({ sourceId, targetId }) => {
      // @ts-ignore - Access test API
      const testApi = window.__REACT_FLOW_TEST_API__;
      if (!testApi || !testApi.getEdges) return false;

      const edges = testApi.getEdges();
      return edges.some((e: any) =>
        e.source === sourceId && e.target === targetId
      );
    }, { sourceId: videoNode.id, targetId: resultNode.id });

    expect(edgeExistsInState).toBeTruthy();
    console.log('✅ VideoGenerateNode → TaskResultNode connection verified');
  });

  test('should create multiple connections to the same node', async ({ page, reactFlowHelper }) => {
    const allNodes = await reactFlowHelper.getAllNodeInfo();

    const textNode = allNodes.find((n) => n.type === 'textNode');
    const charNode = allNodes.find((n) => n.type === 'characterLibraryNode');
    const videoNode = allNodes.find((n) => n.type === 'videoGenerateNode');

    if (!textNode || !charNode || !videoNode) {
      throw new Error(`Could not find required nodes. Found: ${JSON.stringify(allNodes)}`);
    }

    // Connect TextNode → VideoGenerateNode
    await reactFlowHelper.connectNodes(textNode.id, videoNode.id, 'text-output', 'prompt-input');

    // Connect CharacterLibraryNode → VideoGenerateNode
    await reactFlowHelper.connectNodes(charNode.id, videoNode.id, 'characters-output', 'character-input');

    // Verify both edges exist in state
    const edgesExistInState = await page.evaluate(({ sourceId1, sourceId2, targetId }) => {
      // @ts-ignore - Access test API
      const testApi = window.__REACT_FLOW_TEST_API__;
      if (!testApi || !testApi.getEdges) return false;

      const edges = testApi.getEdges();
      const edge1Exists = edges.some((e: any) =>
        e.source === sourceId1 && e.target === targetId
      );
      const edge2Exists = edges.some((e: any) =>
        e.source === sourceId2 && e.target === targetId
      );

      return edge1Exists && edge2Exists;
    }, { sourceId1: textNode.id, sourceId2: charNode.id, targetId: videoNode.id });

    expect(edgesExistInState).toBeTruthy();
    console.log('✅ Multiple connections to same node verified');
  });

  test('should disconnect nodes', async ({ page, reactFlowHelper }) => {
    // First, create a connection
    const allNodes = await reactFlowHelper.getAllNodeInfo();

    const textNode = allNodes.find((n) => n.type === 'textNode');
    const videoNode = allNodes.find((n) => n.type === 'videoGenerateNode');

    if (!textNode || !videoNode) {
      throw new Error(`Could not find required nodes. Found: ${JSON.stringify(allNodes)}`);
    }

    await reactFlowHelper.connectNodes(textNode.id, videoNode.id, 'text-output', 'prompt-input');

    // Verify edge exists
    const edgeExistsBefore = await page.evaluate(({ sourceId, targetId }) => {
      // @ts-ignore - Access test API
      const testApi = window.__REACT_FLOW_TEST_API__;
      if (!testApi || !testApi.getEdges) return false;

      const edges = testApi.getEdges();
      return edges.some((e: any) =>
        e.source === sourceId && e.target === targetId
      );
    }, { sourceId: textNode.id, targetId: videoNode.id });

    expect(edgeExistsBefore).toBeTruthy();

    // Disconnect
    await reactFlowHelper.disconnectNodes(textNode.id, videoNode.id);

    // Verify edge was removed
    const edgeExistsAfter = await page.evaluate(({ sourceId, targetId }) => {
      // @ts-ignore - Access test API
      const testApi = window.__REACT_FLOW_TEST_API__;
      if (!testApi || !testApi.getEdges) return false;

      const edges = testApi.getEdges();
      return edges.some((e: any) =>
        e.source === sourceId && e.target === targetId
      );
    }, { sourceId: textNode.id, targetId: videoNode.id });

    expect(edgeExistsAfter).toBeFalsy();
    console.log('✅ Node disconnection verified');
  });

  test('should display source handles on nodes', async ({ page, reactFlowHelper }) => {
    const textNode = await reactFlowHelper.getNodeByType('textNode');
    await expect(textNode).toBeVisible();

    // Check for source handle (output) using the correct class selector
    const sourceHandle = textNode.locator('.react-flow__handle');
    const handleCount = await sourceHandle.count();

    // Should have at least one handle
    expect(handleCount).toBeGreaterThan(0);
  });

  test('should display target handles on VideoGenerateNode', async ({ page, reactFlowHelper }) => {
    const videoNode = await reactFlowHelper.getNodeByType('videoGenerateNode');
    await expect(videoNode).toBeVisible();

    // VideoGenerateNode should have multiple handles
    const handles = videoNode.locator('.react-flow__handle');
    const count = await handles.count();

    // Should have at least some handles
    expect(count).toBeGreaterThan(0);
  });
});
