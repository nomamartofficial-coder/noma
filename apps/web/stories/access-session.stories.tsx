import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { AccessStart } from '../src/admin/access-start';

const meta = {
  id: 'access-admin-session',
  title: 'Protected surfaces/Access Admin session',
  component: AccessStart,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AccessStart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ProvisionedIdentityRequired: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Access session' })).toBeVisible();
    await expect(canvas.getByText(/No first-user or environment-admin shortcut exists/)).toBeVisible();
    await userEvent.type(canvas.getByRole('textbox', { name: 'Scope ID' }), 'not-a-scope');
    await userEvent.type(canvas.getByRole('textbox', { name: 'Access assignment ID' }), 'not-an-assignment');
    await userEvent.click(canvas.getByRole('button', { name: 'Open authorized Access workspace' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('Enter valid exact IDs from the provisioning record.');
  },
};
