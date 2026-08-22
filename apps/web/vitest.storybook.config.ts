import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { defineConfig } from 'vitest/config';

const currentDirectory = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    allowOnly: false,
    clearMocks: true,
    fileParallelism: false,
    maxWorkers: 1,
    projects: [
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: join(currentDirectory, '.storybook'),
            storybookScript: 'pnpm --dir ../.. storybook',
            tags: { include: ['test'] },
          }),
        ],
        test: {
          allowOnly: false,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({
              actionTimeout: 5_000,
              contextOptions: {
                colorScheme: 'light',
                locale: 'en-NG',
                reducedMotion: 'reduce',
                timezoneId: 'Africa/Lagos',
              },
            }),
            instances: [{ browser: 'chromium' }],
          },
          clearMocks: true,
          hookTimeout: 15_000,
          name: 'storybook',
          restoreMocks: true,
          retry: 0,
          testTimeout: 15_000,
          unstubEnvs: true,
          unstubGlobals: true,
        },
      },
    ],
    restoreMocks: true,
    retry: 0,
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
