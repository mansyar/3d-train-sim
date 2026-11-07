import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { clearMeadow, watchConsoleErrors } from './helpers';

/**
 * Tunnel smoke, merged into one file: a single tunnel loads its own GLB and
 * rides through; a run of three rides as one long hill; and the whole run
 * survives a reload through the real autosave path — the toddler's classic
 * anticipation moment, with the console as the witness (spec acceptance 2, 7).
 */

type WorldHandle = {
  place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
  pieces: () => readonly unknown[];
};

const waitReady = (page: Page) =>
  page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );

const placeLine = (page: Page, cells: [string, { x: number; y: number }][]) =>
  page.evaluate((line) => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    for (const [type, cell] of line) {
      if (world.place(type, cell, 0) !== 'placed') {
        throw new Error(`placement failed: ${type} at ${cell.x},${cell.y}`);
      }
    }
  }, cells);

const expectNoExternalRequests = (page: Page, requestUrls: string[]): void => {
  const origin = new URL(page.url()).origin;
  const external = requestUrls.filter((url) => new URL(url).origin !== origin);
  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
};

const expectClean = (consoleErrors: string[]): void => {
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
};

const pieceCount = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld?.pieces()
        .length ?? 0,
  );

test('a run of tunnels rides as one hill and survives a reload', async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors = watchConsoleErrors(page);
  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await test.step('place a single tunnel and ride through it', async () => {
    await page.goto('/');
    await waitReady(page);

    await clearMeadow(page);
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

    expectNoExternalRequests(page, requestUrls);
    expectClean(consoleErrors);
  });

  await test.step('place a three-tunnel run flanked by straights', async () => {
    await page.click('.ride-toggle');
    await expect(page.locator('.ride-toggle')).not.toHaveClass(/is-riding/);
    await clearMeadow(page);

    // A three-tunnel run flanked by straights — portals only at the ends.
    await placeLine(page, [
      ['straight', { x: 2, y: 5 }],
      ['tunnel', { x: 2, y: 6 }],
      ['tunnel', { x: 2, y: 7 }],
      ['tunnel', { x: 2, y: 8 }],
      ['straight', { x: 2, y: 9 }],
    ]);
    await page.waitForTimeout(800);
  });

  await test.step('ride the long hill', async () => {
    await page.click('.ride-toggle');
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

    // Mid-run: the whole train is under the long hill and the ride goes on.
    await page.waitForTimeout(5000);
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  });

  await test.step('reload and keep all five pieces', async () => {
    // The world comes back with its tunnels through the real autosave path.
    await page.reload();
    await waitReady(page);
    expect(await pieceCount(page)).toBe(5);

    expectClean(consoleErrors);
  });
});
