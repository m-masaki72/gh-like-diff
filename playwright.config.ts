import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: { timeout: 5000 },

  // A stray .only would silently shrink the suite to one test on CI.
  forbidOnly: isCI,
  // The pages are static files, so a retry only ever masks a genuine timing bug — but on
  // shared CI runners a single slow frame should not fail the build.
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,

  reporter: isCI
    ? [['github'], ['html', { open: 'never' }], ['list']]
    : [['list']],

  use: {
    headless: true,
    // Kept only for failures: traces are large and the suite is mostly green.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
