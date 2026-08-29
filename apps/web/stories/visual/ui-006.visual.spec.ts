import { expect, test as base, type Page } from '@playwright/test';
import { nomaViewports, visualBaselineManifest } from '../contracts';

const baseUrl = process.env.NOMA_STORYBOOK_BASE_URL;
if (!baseUrl) throw new Error('NOMA_STORYBOOK_BASE_URL is required');
const allowedOrigin = new URL(baseUrl).origin;
const comparePixels = process.env.NOMA_VISUAL_MODE === 'compare';

const test = base.extend<{}, { visualPage: Page }>({
  visualPage: [async ({ browser }, use) => {
    const context = await browser.newContext({
      colorScheme: 'light',
      locale: 'en-NG',
      serviceWorkers: 'block',
      timezoneId: 'Africa/Lagos',
    });
    const page = await context.newPage();
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      if (url.startsWith('data:') || url.startsWith('blob:') || new URL(url).origin === allowedOrigin) {
        await route.continue();
      } else {
        await route.abort('blockedbyclient');
      }
    });
    await use(page);
    await context.close();
  }, { scope: 'worker' }],
});

for (const entry of visualBaselineManifest) {
  test(`${entry.id} renders deterministically`, async ({ visualPage: page }) => {
    const viewport = nomaViewports[entry.viewport].styles;
    await page.setViewportSize({ width: Number.parseInt(viewport.width, 10), height: Number.parseInt(viewport.height, 10) });
    await page.emulateMedia({
      forcedColors: 'forcedColours' in entry && entry.forcedColours ? 'active' : 'none',
      reducedMotion: 'reduce',
    });
    await page.goto(`/iframe.html?id=${encodeURIComponent(entry.storyId)}&viewMode=story`, { waitUntil: 'domcontentloaded' });
    const canvas = page.locator('[data-noma-story-ready="true"]');
    await expect(canvas).toBeVisible();
    await page.evaluate(async () => document.fonts.ready);
    await expect(page.locator('body')).not.toContainText("Couldn't find story matching");
    if (comparePixels) {
      await expect(page).toHaveScreenshot(`${entry.id}.png`, { fullPage: true });
    } else {
      await expect(canvas).toHaveAttribute('data-noma-story-ready', 'true');
    }
  });
}
