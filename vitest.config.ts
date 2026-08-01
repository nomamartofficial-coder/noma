import { defineConfig } from 'vitest/config';

const seed = Number.parseInt(process.env.NOMA_TEST_SEED ?? '6006', 10);
if (!Number.isSafeInteger(seed)) throw new Error('NOMA_TEST_SEED must be a safe integer');
process.env.TZ = 'UTC';
process.env.NOMA_TEST_SEED = String(seed);
console.info(`[noma-testing] seed=${seed} timezone=UTC`);

export default defineConfig({
  test: {
    allowOnly: false,
    clearMocks: true,
    globals: false,
    passWithNoTests: false,
    restoreMocks: true,
    retry: 0,
    sequence: {
      concurrent: false,
      seed,
      shuffle: false,
    },
    unstubEnvs: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.{ts,tsx}', 'apps/*/src/**/*.{ts,tsx}'],
      exclude: [
        'packages/database/src/generated/**',
        'apps/web/src/app/**',
        '**/*.d.ts',
      ],
      reporter: ['text', 'json-summary', 'lcov'],
      reportsDirectory: 'coverage',
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: [
            'packages/*/tests/**/*.test.{ts,mts,js,mjs}',
            'apps/*/tests/**/*.test.{ts,mts,js,mjs}',
          ],
          exclude: ['**/*.component.test.*', '**/*.integration.test.*'],
        },
      },
      {
        extends: true,
        test: {
          name: 'component',
          environment: 'jsdom',
          include: ['tests/component/**/*.component.test.{ts,tsx}'],
          setupFiles: ['./scripts/vitest-component-setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          fileParallelism: false,
          hookTimeout: 300_000,
          include: ['packages/testing/tests/**/*.integration.test.ts'],
          testTimeout: 300_000,
        },
      },
    ],
  },
});
