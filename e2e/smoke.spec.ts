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

test('drag-placing a track piece renders it in the world', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await page.goto('/');
  // Let the render loop and GLB loads settle before interacting.
  await page.waitForTimeout(1500);

  const before = await page.screenshot();

  // Open the track drawer and drag a piece onto the meadow.
  await page.click('[data-drawer="track"]');
  const slot = page.locator('.piece-slot').first();
  const box = await slot.boundingBox();
  if (!box) throw new Error('drawer piece slot visible');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(640, 380, { steps: 10 });
  await page.mouse.up();
  // Let the scene sync and the drop-ping animation finish.
  await page.waitForTimeout(600);

  const after = await page.screenshot();
  expect(Buffer.compare(before, after)).not.toBe(0);

  const origin = new URL(page.url()).origin;
  const external = requestUrls.filter((url) => new URL(url).origin !== origin);
  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
