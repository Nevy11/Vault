import { test, expect } from '@playwright/test';

const viewports = [
  { width: 1280, height: 800 }, // desktop
  { width: 1024, height: 768 }, // small desktop / tablet landscape
  { width: 768, height: 1024 }, // tablet portrait
  { width: 414, height: 896 }, // large mobile
  { width: 375, height: 812 }, // mobile
];

for (const vp of viewports) {
  test(`renders at ${vp.width}x${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `e2e/screenshots/responsive-${vp.width}x${vp.height}.png`, fullPage: true });

    // Basic smoke assertion: root exists
    const root = await page.$('#root');
    expect(root).not.toBeNull();
  });
}
