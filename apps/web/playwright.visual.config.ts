import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const currentDirectory = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  expect: {
    timeout: 20_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixels: 0,
      scale: 'css',
      threshold: 0,
    },
  },
  forbidOnly: true,
  fullyParallel: false,
  outputDir: join(currentDirectory, 'test-results', 'visual'),
  preserveOutput: 'failures-only',
  reporter: [['list'], ['html', { open: 'never', outputFolder: join(currentDirectory, 'playwright-report') }]],
  retries: 0,
  snapshotPathTemplate: join(currentDirectory, 'stories', 'visual', '__screenshots__', '{arg}{ext}'),
  testDir: join(currentDirectory, 'stories', 'visual'),
  timeout: 45_000,
  use: {
    baseURL: process.env.NOMA_STORYBOOK_BASE_URL,
    colorScheme: 'light',
    locale: 'en-NG',
    serviceWorkers: 'block',
    timezoneId: 'Africa/Lagos',
    trace: 'retain-on-failure',
  },
  workers: 1,
});
