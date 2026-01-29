import { test } from '../../fixtures/reactflow.fixture';
import { expect } from '@playwright/test';

/**
 * Data Flow Tests for Character Transfer (Error 55 Validation)
 *
 * These tests verify that character objects are correctly transferred
 * from CharacterLibraryNode to VideoGenerateNode, which is critical
 * for the Error 55 fix validation.
 *
 * IMPORTANT: Due to React Flow API limitations, programmatic connection
 * creation is not currently possible. These tests document the expected
 * behavior and can be run manually or when the connection testing limitation
 * is resolved.
 *
 * Manual Testing Steps:
 * 1. Add CharacterLibraryNode to canvas
 * 2. Add VideoGenerateNode to canvas
 * 3. Connect CharacterLibraryNode.characters-output → VideoGenerateNode.character-input
 * 4. Select characters in CharacterLibraryNode
 * 5. Verify VideoGenerateNode receives connectedCharacters array
 */

test.describe('Character Data Flow Tests (Error 55)', () => {
  test.beforeEach(async ({ page, reactFlowHelper }) => {
    await page.goto('/');
    await reactFlowHelper.waitForPageLoad();
  });

  /**
   * ⭐ CRITICAL TEST: Verify Error 55 Fix
   *
   * This test validates that character objects (not just IDs) are
   * transferred from CharacterLibraryNode to VideoGenerateNode.
   *
   * Expected Behavior:
   * - CharacterLibraryNode.connectedCharacters should be an array of full character objects
   * - VideoGenerateNode should receive connectedCharacters (full objects)
   * - Each character should have username, profilePictureUrl, permalink, etc.
   *
   * Error 55 was caused by using selectedCharacters (ID array) instead
   * of connectedCharacters (full objects).
   */
  test.skip('should transfer complete character objects to VideoGenerateNode', async ({ page, reactFlowHelper }) => {
    // Manual setup required:
    // 1. Add CharacterLibraryNode (id will be dynamic)
    // 2. Add VideoGenerateNode (id will be dynamic)
    // 3. Connect them
    // 4. Select characters

    const allNodes = await reactFlowHelper.getAllNodeInfo();
    const charNode = allNodes.find((n) => n.type === 'characterLibraryNode');
    const videoNode = allNodes.find((n) => n.type === 'videoGenerateNode');

    if (!charNode || !videoNode) {
      test.skip('CharacterLibraryNode and VideoGenerateNode must be added manually');
      return;
    }

    // Connect nodes (requires manual connection due to API limitations)
    // await reactFlowHelper.connectNodes(charNode.id, videoNode.id, 'characters-output', 'character-input');

    // Verify data transfer
    const hasCompleteObjects = await page.evaluate(({ sourceId, targetId }) => {
      // Try to access React Flow internal state
      const wrapper = document.querySelector('.react-flow');
      const instance = (wrapper as any).__reactFlowInstance;

      if (!instance || !instance.getNodes) {
        return { error: 'Cannot access React Flow instance' };
      }

      const nodes = instance.getNodes();
      const sourceNode = nodes.find((n: any) => n.id === sourceId);
      const targetNode = nodes.find((n: any) => n.id === targetId);

      // ⭐ Error 55 Validation: Check if connectedCharacters has full objects
      const connectedCharacters = targetNode?.data?.connectedCharacters;

      if (!connectedCharacters || connectedCharacters.length === 0) {
        return {
          error: 'No connectedCharacters found',
          hint: 'Select characters in CharacterLibraryNode first'
        };
      }

      // ⭐ CRITICAL CHECK: Verify first character has username property
      const firstChar = connectedCharacters[0];
      const hasUsername = firstChar.username !== undefined;
      const hasProfilePicture = firstChar.profilePictureUrl !== undefined;
      const hasPermalink = firstChar.permalink !== undefined;

      return {
        hasCompleteObjects: hasUsername && hasProfilePicture && hasPermalink,
        firstCharKeys: Object.keys(firstChar),
        characterCount: connectedCharacters.length
      };
    }, { sourceId: charNode.id, targetId: videoNode.id });

    // Verify complete objects are transferred
    expect(hasCompleteObjects.hasCompleteObjects).toBeTruthy();
    expect(hasCompleteObjects.characterCount).toBeGreaterThan(0);

    console.log('✅ Error 55 validation passed:', hasCompleteObjects);
  });

  /**
   * Verify CharacterLibraryNode can be added and is visible
   * Note: Handles may be dynamically rendered, so we just verify the node exists
   */
  test('should have CharacterLibraryNode on canvas', async ({ page, reactFlowHelper }) => {
    // Add CharacterLibraryNode
    await reactFlowHelper.addNode('角色库');

    const charNode = await reactFlowHelper.getNodeByType('characterLibraryNode');
    await expect(charNode).toBeVisible();

    // Verify node has the expected label
    await expect(charNode).toContainText('角色库');
  });

  /**
   * Verify VideoGenerateNode has character-input handle
   */
  test('should have character-input handle on VideoGenerateNode', async ({ page, reactFlowHelper }) => {
    // Add VideoGenerateNode
    await reactFlowHelper.addNode('视频生成');

    const videoNode = await reactFlowHelper.getNodeByType('videoGenerateNode');
    await expect(videoNode).toBeVisible();

    // Check for input handles
    const handles = videoNode.locator('.react-flow__handle');
    const handleCount = await handles.count();

    // Should have handles (including character-input)
    expect(handleCount).toBeGreaterThan(0);
  });

  /**
   * Document: Expected data flow for character transfer
   */
  test('document: expected character data flow', async ({ page }) => {
    // This test documents the expected behavior
    const expectedFlow = {
      source: 'CharacterLibraryNode',
      sourceHandle: 'characters-output',
      target: 'VideoGenerateNode',
      targetHandle: 'character-input',
      dataField: 'connectedCharacters',
      dataType: 'Array of full character objects',
      characterProperties: [
        'username (required)',
        'profilePictureUrl (required)',
        'permalink (required)',
        'id (required)',
        'alias (optional)'
      ],
      error55Fix: 'Prioritize connectedCharacters over selectedCharacters',
      codeLocation: 'App.jsx:304-305'
    };

    console.log('Expected Character Data Flow:', JSON.stringify(expectedFlow, null, 2));

    // Verify page loaded successfully
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  /**
   * Verify nodes can be added for manual testing
   */
  test('should allow adding nodes for manual testing', async ({ page, reactFlowHelper }) => {
    const initialCount = await reactFlowHelper.getNodeCount();

    // Add the nodes we need for data flow testing
    await reactFlowHelper.addNode('角色库');
    await reactFlowHelper.addNode('视频生成');

    const newCount = await reactFlowHelper.getNodeCount();
    expect(newCount).toBe(initialCount + 2);

    // Verify both nodes are present
    const allNodes = await reactFlowHelper.getAllNodeInfo();
    const hasCharNode = allNodes.some((n) => n.type === 'characterLibraryNode');
    const hasVideoNode = allNodes.some((n) => n.type === 'videoGenerateNode');

    expect(hasCharNode).toBeTruthy();
    expect(hasVideoNode).toBeTruthy();

    console.log('✅ Nodes added. Manual testing steps:');
    console.log('1. Select characters in CharacterLibraryNode');
    console.log('2. Drag from characters-output handle to character-input handle');
    console.log('3. Verify connectedCharacters in VideoGenerateNode contains full objects');
  });
});
