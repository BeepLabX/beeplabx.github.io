import { defineConfig, devices } from '@playwright/test';

const port = 4390;

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  workers: 2, // software WebGL in headless Chromium is CPU-heavy
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.BASE_URL ?? `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
  },
  // BASE_URL lets the same suite run against the live site after deploy.
  webServer: process.env.BASE_URL
    ? undefined
    : { command: `npx astro preview --host 127.0.0.1 --port ${port}`, url: `http://127.0.0.1:${port}`, reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
});
