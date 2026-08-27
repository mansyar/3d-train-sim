import { expect, test } from '@playwright/test';

test('app boots on a tablet with a clean console and zero external requests', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await page.goto('/');

  await expect(page).toHaveTitle('Tiny Tracks');
  await expect(page.locator('.scene-canvas')).toBeVisible();
  await expect(page.locator('.toy-slot')).toHaveCount(3);

  // Let the render loop and asset loads (locomotive GLB, texture) settle.
  await page.waitForTimeout(1000);

  const origin = new URL(page.url()).origin;
  const external = requestUrls.filter((url) => new URL(url).origin !== origin);
  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
