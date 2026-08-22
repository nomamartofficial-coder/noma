import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import NotFound from '../src/app/not-found';

const meta = {
  id: 'protected-access',
  title: 'Protected surfaces/Neutral denial',
  component: NotFound,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof NotFound>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unavailable: Story = {};
