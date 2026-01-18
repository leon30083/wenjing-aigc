import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Testing Configuration for WinJin
 *
 * Key features:
 * - Auto-start Vite dev server on http://localhost:5173
 * - Smart waiting for React Flow interactions
 * - Screenshot/video capture on failure
 * - Parallel execution disabled for React Flow tests
 */
export default defineConfig({
  testDir: './tests/e2e',

  // ⭐ Disable parallel for React Flow tests (race conditions with canvas)
  fullyParallel: false,

  // Fail on test.only in CI
  forbidOnly: !!process.env.CI,

  // Retry once in CI for flaky network tests
  retries: process.env.CI ? 1 : 0,

  // Single worker for React Flow tests
  workers: 1,

  // Test reporters
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results.json' }],
    ['list'], // Console output
  ],

  use: {
    // Base URL for tests (Vite dev server)
    baseURL: 'http://localhost:5173',

    // Capture trace on failure for debugging
    trace: 'retain-on-failure',

    // Capture screenshots on failure
    screenshot: 'only-on-failure',

    // Capture video on failure
    video: 'retain-on-failure',

    // Default action timeout: 10 seconds
    actionTimeout: 10000,

    // Navigation timeout: 30 seconds
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Add Firefox when needed
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
  ],

  // Timeouts
  timeout: 30000, // Default: 30s

  expect: {
    timeout: 5000, // Assertion timeout: 5s
  },

  // ⭐ Auto-start Vite dev server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    timeout: 120000, // 2 minutes to start
    reuseExistingServer: !process.env.CI, // Don't start if already running
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
