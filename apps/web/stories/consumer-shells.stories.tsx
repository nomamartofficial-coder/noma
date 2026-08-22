import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import AccountError from '../src/app/(buyer)/account/error';
import AccountLoading from '../src/app/(buyer)/account/loading';
import { ActiveNavigation } from '../src/shells/active-navigation';
import { CompactAccountNavigation } from '../src/shells/compact-account-navigation';
import { ConsumerHeader } from '../src/shells/consumer-header';
import { accountDestinations, mobileDestinations } from '../src/shells/navigation';
import { PlaceholderPage } from '../src/shells/placeholder-page';
import { PublicFooter } from '../src/shells/public-footer';
import styles from '../src/shells/shells.module.css';

function MarketplaceFixture({ surfaceMenu = false }: Readonly<{ surfaceMenu?: boolean }>) {
  return (
    <div className={styles.consumerShell} data-story-surface-menu={surfaceMenu || undefined}>
      <a className={styles.skipLink} href="#main-content">Skip to main content</a>
      <ConsumerHeader />
      <main className={styles.mainContent} id="main-content"><PlaceholderPage context="Marketplace" description="Product discovery will be implemented by its owning marketplace tasks. No product or availability data is fabricated here." title="Covenant marketplace" /></main>
      <PublicFooter />
      <ActiveNavigation destinations={mobileDestinations} label="Primary mobile" mobile pathnameOverride="/" />
    </div>
  );
}

function BuyerFixture({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={styles.consumerShell}>
      <a className={styles.skipLink} href="#main-content">Skip to main content</a>
      <ConsumerHeader />
      <section aria-labelledby="story-account-surface-title" className={styles.accountHeader}><p className={styles.accountContextLabel}>Consumer account</p><p className={styles.accountContextTitle} id="story-account-surface-title">My account</p><CompactAccountNavigation pathnameOverride="/account/orders" /></section>
      <div className={styles.accountGrid}>
        <aside className={styles.accountRail}><ActiveNavigation destinations={accountDestinations} label="Account sections" pathnameOverride="/account/orders" /></aside>
        <main className={styles.accountMain} id="main-content">{children}</main>
      </div>
      <ActiveNavigation destinations={mobileDestinations} label="Primary mobile" mobile pathnameOverride="/account/orders" />
    </div>
  );
}

function ConsumerStories() { return <MarketplaceFixture />; }

const meta = {
  id: 'consumer-shells',
  title: 'Consumer shells/Marketplace and Buyer',
  component: ConsumerStories,
  parameters: { layout: 'fullscreen', nextjs: { appDirectory: true } },
} satisfies Meta<typeof ConsumerStories>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Marketplace: Story = { render: () => <MarketplaceFixture /> };

export const BuyerAccount: Story = {
  render: () => <BuyerFixture><PlaceholderPage context="My account" description="Order information will appear only after the owning authenticated workflow supplies it." returnHref="/" returnLabel="Shop on Noma" title="Orders" /></BuyerFixture>,
};

export const BuyerLoading: Story = { render: () => <BuyerFixture><AccountLoading /></BuyerFixture> };

export const BuyerError: Story = {
  render: () => <BuyerFixture><AccountError error={new Error('synthetic story error')} reset={fn()} /></BuyerFixture>,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Try again' }));
  },
};

export const SurfaceSwitcherOpen: Story = {
  render: () => <MarketplaceFixture surfaceMenu />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /Noma surfaces/ }));
    await waitFor(async () => expect(within(document.body).getByRole('menuitem', { name: 'My account' })).toBeVisible());
  },
};
