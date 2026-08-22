import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-vitest',
  ],
  core: { disableTelemetry: true },
  framework: { name: '@storybook/nextjs-vite', options: {} },
  stories: ['../stories/**/*.mdx', '../stories/**/*.stories.@(ts|tsx)'],
};

export default config;
