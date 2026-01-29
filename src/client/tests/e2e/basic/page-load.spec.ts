import { test } from '../../fixtures/reactflow.fixture';
import { expect } from '@playwright/test';

test.describe('Page Load Tests', () => {
  test('should load the application successfully', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page).toHaveTitle(/client/i);

    // Check main heading
    const heading = page.locator('h1');
    await expect(heading).toContainText('AI star视频工作台');

    // No console errors
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    await page.waitForLoadState('networkidle');

    const errors = logs.filter(log => log.includes('error') || log.includes('Error'));
    expect(errors.length).toBe(0);
  });

  test('should display React Flow canvas', async ({ page }) => {
    await page.goto('/');

    // Wait for React Flow to load
    await page.waitForSelector('.react-flow', { timeout: 10000 });

    // Check if canvas exists
    const canvas = page.locator('.react-flow');
    await expect(canvas).toBeVisible();

    // Check for controls
    await expect(page.locator('button:has-text("添加节点")')).toBeVisible();
    await expect(page.locator('button:has-text("删除选中")')).toBeVisible();
    await expect(page.locator('button:has-text("执行工作流")')).toBeVisible();
  });

  test('should display workflow name', async ({ page }) => {
    await page.goto('/');

    // Check for workflow name display
    const workflowName = page.locator('text=/未命名工作流/');
    await expect(workflowName).toBeVisible();
  });

  test('should display zoom controls', async ({ page }) => {
    await page.goto('/');

    // Check for zoom buttons
    await expect(page.locator('button[aria-label*="zoom in"]')).toBeVisible();
    await expect(page.locator('button[aria-label*="zoom out"]')).toBeVisible();
    await expect(page.locator('button[aria-label*="fit view"]')).toBeVisible();
  });

  test('should load without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(consoleErrors).toEqual([]);
  });
});
