import { test as base, Page, Locator } from '@playwright/test';

/**
 * Custom Playwright test fixture with React Flow helper functions
 *
 * This fixture provides specialized methods for interacting with React Flow canvas,
 * including node connections, data transfer verification, and state inspection.
 *
 * @example
 * ```typescript
 * import { test } from '../fixtures/reactflow.fixture';
 *
 * test('should connect nodes', async ({ page, reactFlowHelper }) => {
 *   await reactFlowHelper.connectNodes('1', '6', 'text-output', 'prompt-input');
 * });
 * ```
 */
export const test = base.extend<{
  reactFlowHelper: ReactFlowHelper;
}>({
  reactFlowHelper: async ({ page }, use) => {
    const helper = new ReactFlowHelper(page);
    await use(helper);
  },
});

/**
 * React Flow Helper Class
 *
 * Provides methods to interact with React Flow nodes, handles, and connections.
 * Handles the complexity of React Flow's canvas-based interactions.
 */
export class ReactFlowHelper {
  constructor(private page: Page) {}

  /**
   * Find a node by its React Flow type
   * @param nodeType - Node type (e.g., 'textNode', 'videoGenerateNode')
   * @returns Locator for the node
   */
  async getNodeByType(nodeType: string): Promise<Locator> {
    return this.page.locator(`.react-flow__node-${nodeType}`);
  }

  /**
   * Get node ID by type (from DOM data-id attribute)
   * @param nodeType - Node type (e.g., 'textNode', 'videoGenerateNode')
   * @returns Node ID or null if not found
   */
  async getNodeIdByType(nodeType: string): Promise<string | null> {
    const nodeElement = await this.page.locator(`.react-flow__node-${nodeType}`).first();
    if (await nodeElement.count() === 0) {
      return null;
    }
    const nodeId = await nodeElement.getAttribute('data-id');
    return nodeId;
  }

  /**
   * Get all nodes with their IDs and types (from DOM)
   * @returns Array of { id, type } objects
   */
  async getAllNodeInfo(): Promise<Array<{ id: string; type: string }>> {
    return await this.page.evaluate(() => {
      const nodes = document.querySelectorAll('.react-flow__node');
      const result: Array<{ id: string; type: string }> = [];

      nodes.forEach((node) => {
        const id = node.getAttribute('data-id');
        // Extract type from class name (e.g., "react-flow__node-textNode" -> "textNode")
        const classes = Array.from(node.classList);
        const typeClass = classes.find(c => c.startsWith('react-flow__node-') && c !== 'react-flow__node');

        if (id && typeClass) {
          const type = typeClass.replace('react-flow__node-', '');
          result.push({ id, type });
        }
      });

      return result;
    });
  }

  /**
   * Get all nodes currently on canvas
   * @returns Locator for all nodes
   */
  async getAllNodes(): Promise<Locator> {
    return this.page.locator('.react-flow__node');
  }

  /**
   * Get the count of nodes on canvas
   * @returns Number of nodes
   */
  async getNodeCount(): Promise<number> {
    const nodes = await this.getAllNodes();
    return await nodes.count();
  }

  /**
   * Get a specific handle on a node
   * @param nodeId - Node ID (e.g., '1', '2', etc.)
   * @param handleType - 'target' (input) or 'source' (output)
   * @param handleId - Handle ID (e.g., 'text-output', 'character-input')
   * @returns Locator for the handle
   */
  async getHandle(nodeId: string, handleType: 'target' | 'source', handleId?: string): Promise<Locator> {
    if (handleId) {
      return this.page.locator(`.react-flow__handle[data-handleid="${handleId}"][data-nodeid="${nodeId}"]`);
    }
    return this.page.locator(`.react-flow__handle-${handleType}[data-nodeid="${nodeId}"]`);
  }

  /**
   * ⭐ Core Method: Connect two nodes via exposed test API
   *
   * This method uses the test API exposed by App.jsx to create connections.
   * The API is exposed on window.__REACT_FLOW_TEST_API__ in development mode.
   *
   * @param sourceNodeId - Source node ID
   * @param targetNodeId - Target node ID
   * @param sourceHandleId - Source handle ID (e.g., 'text-output')
   * @param targetHandleId - Target handle ID (e.g., 'prompt-input')
   *
   * @example
   * ```typescript
   * await reactFlowHelper.connectNodes('1', '6', 'text-output', 'prompt-input');
   * ```
   */
  async connectNodes(
    sourceNodeId: string,
    targetNodeId: string,
    sourceHandleId: string,
    targetHandleId: string
  ): Promise<void> {
    // Use the exposed test API from App.jsx
    const result = await this.page.evaluate(({ source, target, sourceHandle, targetHandle }) => {
      // @ts-ignore - Test API exposed by App.jsx
      const testApi = window.__REACT_FLOW_TEST_API__;

      if (!testApi || typeof testApi.connectNodes !== 'function') {
        return { success: false, error: 'Test API not available' };
      }

      try {
        testApi.connectNodes(source, target, sourceHandle, targetHandle);
        return { success: true };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }, { source: sourceNodeId, target: targetNodeId, sourceHandle: sourceHandleId, targetHandle: targetHandleId });

    if (!result.success) {
      throw new Error(`Failed to connect nodes: ${result.error}`);
    }

    // ⭐ Wait for React Flow state to update (edge to appear in state)
    // Note: React Flow may not render the edge in DOM for programmatic connections
    // This is a known limitation - we verify state change instead of DOM rendering
    await this.page.waitForFunction(
      ({ sourceId, targetId }) => {
        // @ts-ignore - Access test API
        const testApi = window.__REACT_FLOW_TEST_API__;
        if (!testApi || !testApi.getEdges) return false;

        const edges = testApi.getEdges();
        return edges.some((e: any) =>
          e.source === sourceId && e.target === targetId
        );
      },
      { sourceId: sourceNodeId, targetId: targetNodeId },
      { timeout: 5000 }
    );

    console.log('[connectNodes] Edge successfully created in React Flow state');
  }

  /**
   * Disconnect two nodes by removing the edge
   * @param sourceNodeId - Source node ID
   * @param targetNodeId - Target node ID
   */
  async disconnectNodes(sourceNodeId: string, targetNodeId: string): Promise<void> {
    // Use the exposed test API to disconnect nodes
    const result = await this.page.evaluate(({ source, target }) => {
      // @ts-ignore - Test API exposed by App.jsx
      const testApi = window.__REACT_FLOW_TEST_API__;

      if (!testApi || typeof testApi.disconnectNodes !== 'function') {
        return { success: false, error: 'Test API not available' };
      }

      try {
        testApi.disconnectNodes(source, target);
        return { success: true };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }, { source: sourceNodeId, target: targetNodeId });

    if (!result.success) {
      throw new Error(`Failed to disconnect nodes: ${result.error}`);
    }

    // Wait for edge to be removed from state
    await this.page.waitForFunction(
      ({ sourceId, targetId }) => {
        // @ts-ignore - Access test API
        const testApi = window.__REACT_FLOW_TEST_API__;
        if (!testApi || !testApi.getEdges) return false;

        const edges = testApi.getEdges();
        return !edges.some((e: any) =>
          e.source === sourceId && e.target === targetId
        );
      },
      { sourceId: sourceNodeId, targetId: targetNodeId },
      { timeout: 5000 }
    );

    console.log('[disconnectNodes] Edge successfully removed from React Flow state');
  }

  /**
   * Get all edges on canvas
   * @returns Locator for all edges
   */
  async getAllEdges(): Promise<Locator> {
    return this.page.locator('.react-flow__edge');
  }

  /**
   * Get the count of edges on canvas
   * @returns Number of edges
   */
  async getEdgeCount(): Promise<number> {
    const edges = await this.getAllEdges();
    return await edges.count();
  }

  /**
   * ⭐ Critical Method: Verify node internal state (data flow validation)
   *
   * This method accesses React Flow's internal state to verify node data,
   * which is essential for testing data transfer between nodes (Error 55 fix validation).
   *
   * @param nodeId - Node ID
   * @param dataPath - Dot-notation path to data (e.g., 'connectedCharacters.length')
   * @param expectedValue - Expected value
   * @returns true if data matches expected value
   *
   * @example
   * ```typescript
   * // Verify VideoGenerateNode received 2 characters
   * const valid = await reactFlowHelper.verifyNodeData('6', 'connectedCharacters.length', 2);
   * expect(valid).toBeTruthy();
   * ```
   */
  async verifyNodeData(nodeId: string, dataPath: string, expectedValue: any): Promise<boolean> {
    const result = await this.page.evaluate(([{ id, path, expected }]) => {
      // Access React Flow internal state
      const wrapper = document.querySelector('.react-flow');

      // Try to get the internal instance
      // @ts-ignore - Access internal React Flow instance
      const internalInstance = wrapper?.__reactFlowInstance || wrapper?.__reactProps?.reactFlowInstance;

      if (!internalInstance || !internalInstance.getNodes) {
        console.error('[ReactFlowHelper] Could not access React Flow instance');
        return false;
      }

      const nodes = internalInstance.getNodes();
      const node = nodes.find((n: any) => n.id === id);

      if (!node) {
        console.error(`[ReactFlowHelper] Node ${id} not found`);
        return false;
      }

      // Navigate data path (e.g., 'connectedCharacters.length')
      const keys = path.split('.');
      let value = node.data;

      for (const key of keys) {
        if (key.includes('[')) {
          // Handle array access
          const [arrayKey, index] = key.split(/[\[\]]/).filter(Boolean);
          if (arrayKey) value = value[arrayKey];
          if (index !== undefined) value = value[parseInt(index)];
        } else {
          value = value[key];
        }
      }

      const matches = JSON.stringify(value) === JSON.stringify(expected);
      if (!matches) {
        console.log(`[ReactFlowHelper] Data mismatch:`, {
          path,
          expected,
          actual: value
        });
      }

      return matches;
    }, [{ id: nodeId, path: dataPath, expected: expectedValue }]);

    return result;
  }

  /**
   * ⭐ Critical Method: Wait for data to transfer between nodes
   *
   * Waits for data to appear in the target node's data field.
   * This is essential for testing data flow between nodes (Error 55 fix validation).
   *
   * @param sourceNodeId - Source node ID
   * @param targetNodeId - Target node ID
   * @param dataField - Data field name (e.g., 'connectedCharacters')
   * @param timeout - Maximum wait time in ms (default: 5000)
   *
   * @example
   * ```typescript
   * await reactFlowHelper.waitForDataTransfer('4', '6', 'connectedCharacters', 10000);
   * ```
   */
  async waitForDataTransfer(
    sourceNodeId: string,
    targetNodeId: string,
    dataField: string,
    timeout: number = 5000
  ): Promise<void> {
    await this.page.waitForFunction(
      ({ sourceId, targetId, field }) => {
        const wrapper = document.querySelector('.react-flow');
        // @ts-ignore - Access internal React Flow instance
        const internalInstance = wrapper?.__reactFlowInstance || wrapper?.__reactProps?.reactFlowInstance;

        if (!internalInstance || !internalInstance.getNodes) return false;

        const nodes = internalInstance.getNodes();
        const targetNode = nodes.find((n: any) => n.id === targetId);

        if (!targetNode) return false;

        const data = targetNode.data?.[field];

        // Check if data exists and has items
        if (Array.isArray(data)) {
          return data.length > 0;
        }
        return data !== undefined && data !== null;
      },
      { sourceId: sourceNodeId, targetId: targetNodeId, field: dataField },
      { timeout }
    );
  }

  /**
   * Click the "Add Node" button to open the node menu
   */
  async clickAddNodeButton(): Promise<void> {
    await this.page.click('button:has-text("添加节点")');
    // Wait for menu to appear
    await this.page.waitForSelector('button:has-text("文本节点")', { state: 'visible' });
  }

  /**
   * Add a node to the canvas
   * @param nodeType - Node type button text (e.g., '文本节点', '视频生成')
   */
  async addNode(nodeType: string): Promise<void> {
    await this.clickAddNodeButton();
    await this.page.click(`button:has-text("${nodeType}")`);
    // Wait for node to appear
    await this.page.waitForTimeout(500);
  }

  /**
   * Clear all nodes from canvas (if a clear button exists)
   */
  async clearCanvas(): Promise<void> {
    const clearButton = this.page.locator('button:has-text("清空")');
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Wait for the page to be fully loaded
   * Note: Canvas may be empty on initial load, so we only wait for React Flow itself
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('.react-flow', { timeout: 10000 });
  }

  /**
   * Take a screenshot of the current canvas state
   * @param filename - Screenshot filename
   */
  async screenshotCanvas(filename: string): Promise<void> {
    await this.page.screenshot({
      path: `test-results/screenshots/${filename}`,
      fullPage: false
    });
  }
}
