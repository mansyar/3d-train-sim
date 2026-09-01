import { expect, test } from '@playwright/test';

/**
 * Tunnel smoke: the hill drags in like any track piece, loads its own GLB,
 * and a ride through it stays clean — the toddler's classic anticipation
 * moment, with the console as the witness (spec acceptance 2, 7).
 */

type WorldHandle = {
  place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
  pieces: () => readonly unknown[];
};

const placeLine = (
  page: import('@playwright/test').Page,
  cells: [string, { x: number; y: number }][],
) =>
  page.evaluate((line) => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    for (const [type, cell] of line) {
      if (world.place(type, cell, 0) !== 'placed') {
        throw new Error(`placement failed: ${type} at ${cell.x},${cell.y}`);
      }
    }
  }, cells);

test('a placed tunnel loads its GLB and the train rides through it cleanly', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await page.goto('/');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );

  // Straight → tunnel → straight on dry land, via the dev handle.
  await placeLine(page, [
    ['straight', { x: 2, y: 6 }],
    ['tunnel', { x: 2, y: 7 }],
    ['straight', { x: 2, y: 8 }],
  ]);

  // The tunnel's own GLB arrives only when a tunnel is placed.
  await page.waitForFunction(() =>
    performance.getEntriesByType('resource').some((entry) => entry.name.includes('tunnel.glb')),
  );

  // A toot while parked exercises the whistle path (echo decision, puff).
  await page.locator('.whistle-toot').click();

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  // Long enough to disappear under the hill and roll out the far side —
  // the ride must survive the whole transit and keep rolling.
  await page.waitForTimeout(6000);
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  const a = await page.screenshot();
  await page.waitForTimeout(1200);
  const b = await page.screenshot();
  expect(Buffer.compare(a, b)).not.toBe(0);

  const origin = new URL(page.url()).origin;
  const external = requestUrls.filter((url) => new URL(url).origin !== origin);
  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('a run of tunnels rides as one hill and survives a reload', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  await page.goto('/');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );

  // A three-tunnel run flanked by straights — portals only at the ends.
  await placeLine(page, [
    ['straight', { x: 2, y: 5 }],
    ['tunnel', { x: 2, y: 6 }],
    ['tunnel', { x: 2, y: 7 }],
    ['tunnel', { x: 2, y: 8 }],
    ['straight', { x: 2, y: 9 }],
  ]);
  await page.waitForTimeout(800);

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  // Mid-run: the whole train is under the long hill and the ride goes on.
  await page.waitForTimeout(5000);
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  // The world comes back with its tunnels through the real autosave path.
  await page.reload();
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
  const restored = await page.evaluate(
    () =>
      (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld?.pieces()
        .length ?? 0,
  );
  expect(restored).toBe(5);

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
