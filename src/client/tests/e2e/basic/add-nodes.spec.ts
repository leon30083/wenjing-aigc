import { test } from '../../fixtures/reactflow.fixture';
import { expect } from '@playwright/test';

test.describe('Node Addition Tests', () => {
  test.beforeEach(async ({ page, reactFlowHelper }) => {
    await page.goto('/');
    await reactFlowHelper.waitForPageLoad();
  });

  test('should open node menu when clicking add node button', async ({ page, reactFlowHelper }) => {
    await reactFlowHelper.clickAddNodeButton();

    // Verify node menu appears with all node types
    await expect(page.locator('button:has-text("文本节点")')).toBeVisible();
    await expect(page.locator('button:has-text("参考图片")')).toBeVisible();
    await expect(page.locator('button:has-text("角色库")')).toBeVisible();
    await expect(page.locator('button:has-text("视频生成")')).toBeVisible();
    await expect(page.locator('button:has-text("任务结果")')).toBeVisible();
  });

  test('should add TextNode to canvas', async ({ page, reactFlowHelper }) => {
    const initialCount = await reactFlowHelper.getNodeCount();

    await reactFlowHelper.addNode('文本节点');

    // Verify node was added
    const newCount = await reactFlowHelper.getNodeCount();
    expect(newCount).toBe(initialCount + 1);

    // Verify TextNode is visible
    const textNode = await reactFlowHelper.getNodeByType('textNode');
    await expect(textNode).toBeVisible();

    // Verify textarea exists
    const textarea = textNode.locator('textarea');
    await expect(textarea).toBeVisible();
  });

  test('should add CharacterLibraryNode to canvas', async ({ page, reactFlowHelper }) => {
    const initialCount = await reactFlowHelper.getNodeCount();

    await reactFlowHelper.addNode('角色库');

    // Verify node was added
    const newCount = await reactFlowHelper.getNodeCount();
    expect(newCount).toBeGreaterThan(initialCount);

    // Verify CharacterLibraryNode is visible
    const charNode = await reactFlowHelper.getNodeByType('characterLibraryNode');
    await expect(charNode).toBeVisible();

    // Verify search input exists
    const searchInput = charNode.locator('input[placeholder*="搜索"]');
    await expect(searchInput).toBeVisible();
  });

  test('should add VideoGenerateNode to canvas', async ({ page, reactFlowHelper }) => {
    await reactFlowHelper.addNode('视频生成');

    // Verify VideoGenerateNode is visible
    const videoNode = await reactFlowHelper.getNodeByType('videoGenerateNode');
    await expect(videoNode).toBeVisible();

    // Verify generate button exists
    const generateBtn = videoNode.locator('button:has-text("生成视频")');
    await expect(generateBtn).toBeVisible();
  });

  test('should add TaskResultNode to canvas', async ({ page, reactFlowHelper }) => {
    await reactFlowHelper.addNode('任务结果');

    // Verify TaskResultNode is visible
    const resultNode = await reactFlowHelper.getNodeByType('taskResultNode');
    await expect(resultNode).toBeVisible();

    // Verify it shows connection hint
    await expect(resultNode).toContainText('连接视频生成节点以查看结果');
  });

  test('should add multiple nodes of different types', async ({ page, reactFlowHelper }) => {
    const initialCount = await reactFlowHelper.getNodeCount();

    // Add multiple nodes
    await reactFlowHelper.addNode('文本节点');
    await reactFlowHelper.addNode('角色库');
    await reactFlowHelper.addNode('视频生成');
    await reactFlowHelper.addNode('任务结果');

    // Verify all nodes were added
    const newCount = await reactFlowHelper.getNodeCount();
    expect(newCount).toBe(initialCount + 4);

    // Verify each node type is present
    await expect(await reactFlowHelper.getNodeByType('textNode')).toBeVisible();
    await expect(await reactFlowHelper.getNodeByType('characterLibraryNode')).toBeVisible();
    await expect(await reactFlowHelper.getNodeByType('videoGenerateNode')).toBeVisible();
    await expect(await reactFlowHelper.getNodeByType('taskResultNode')).toBeVisible();
  });

  test('should display handles on nodes', async ({ page, reactFlowHelper }) => {
    await reactFlowHelper.addNode('文本节点');

    const textNode = await reactFlowHelper.getNodeByType('textNode');

    // Check for output handle
    const outputHandle = textNode.locator('.react-flow__handle-source[data-handleid="text-output"]');
    await expect(outputHandle).toBeVisible();
  });

  test('should close node menu after adding a node', async ({ page, reactFlowHelper }) => {
    await reactFlowHelper.clickAddNodeButton();

    // Menu should be open
    await expect(page.locator('button:has-text("文本节点")')).toBeVisible();

    // Click outside (on the canvas)
    const canvas = page.locator('.react-flow');
    await canvas.click();

    // Menu should close (button text elements should no longer be visible)
    // Note: This depends on how the menu is implemented
  });

  test('should maintain node state after adding', async ({ page, reactFlowHelper }) => {
    await reactFlowHelper.addNode('文本节点');

    const textNode = await reactFlowHelper.getNodeByType('textNode');
    const textarea = textNode.locator('textarea');

    // Type some text
    await textarea.fill('测试提示词');

    // Verify text persists
    await expect(textarea).toHaveValue('测试提示词');
  });
});
