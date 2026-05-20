import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const baseURL = `http://127.0.0.1:${port}`;
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /.*\.pw\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: {
    timeout: 10_000
  },
  outputDir: 'output/playwright/test-results',
  reporter: [['list']],
  use: {
    baseURL,
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--use-angle=swiftshader', '--ignore-gpu-blocklist']
        }
      }
    }
  ],
  webServer: {
    command: `${npmCommand} run dev -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000
  }
});
