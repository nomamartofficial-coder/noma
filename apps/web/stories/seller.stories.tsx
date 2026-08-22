import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SellerShell } from '../src/shells/protected/seller/seller-shell';

function SellerFixture() {
  return <SellerShell context={{ sellerLabel: 'Synthetic campus store', scopeLabel: 'Presentation fixture only' }}><section className="noma-story-shell-content"><p>Seller Centre</p><h1>Overview</h1><p>This shell contains no seller record, counts, authorization result, or business command.</p></section></SellerShell>;
}

const meta = {
  id: 'protected-seller',
  title: 'Protected surfaces/Seller',
  component: SellerFixture,
  parameters: { layout: 'fullscreen', nextjs: { appDirectory: true, navigation: { pathname: '/seller' } } },
} satisfies Meta<typeof SellerFixture>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Overview: Story = {};
