import '@noma/ui/foundations.css';
import '@noma/ui/components.css';
import '@noma/ui/commerce.css';
import '../src/app/globals.css';
import '../stories/storybook.css';

import type { Preview } from '@storybook/nextjs-vite';
import MockDate from 'mockdate';

import { FIXED_STORY_INSTANT, nomaViewports } from '../stories/contracts';

const preview: Preview = {
  async beforeEach() {
    MockDate.set(FIXED_STORY_INSTANT);
    return () => MockDate.reset();
  },
  decorators: [
    (Story) => (
      <div className="noma-story-canvas" data-noma-story-ready="true">
        <Story />
      </div>
    ),
  ],
  initialGlobals: {
    backgrounds: { value: 'light' },
    viewport: { value: 'noma-mobile-390', isRotated: false },
  },
  parameters: {
    a11y: { test: 'error' },
    backgrounds: {
      options: {
        light: { name: 'Noma light', value: 'var(--noma-color-surface-page)' },
      },
    },
    controls: { expanded: true, sort: 'requiredFirst' },
    docs: { source: { state: 'open' } },
    locale: 'en-NG',
    noma: { timeZone: 'Africa/Lagos' },
    options: {
      storySort: {
        order: ['Foundations', 'Primitives', 'Commerce', 'Consumer shells', 'Protected surfaces'],
      },
    },
    test: { clearMocks: true, mockReset: true, restoreMocks: true },
    viewport: { options: nomaViewports },
  },
  tags: ['autodocs', 'test'],
};

export default preview;
