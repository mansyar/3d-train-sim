import { expect, test } from '@playwright/test';

import { clearMeadow, watchConsoleErrors } from './helpers';

/**
 * Hill smoke: the hill run drags in like any track piece, loads its own
 * GLBs, and a ride over the crest stays clean — the train climbs, crosses,
 * and comes back down with the console as the witness (spec acceptance 8).
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

test('a placed hill run loads its GLBs and the train rides over the crest cleanly', async ({
  page,
}) => {
  const consoleErrors = watchConsoleErrors(page);

  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await page.goto('/');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );

  await clearMeadow(page);
  // slope-up → hill → slope-down on dry land, via the dev handle.
  await placeLine(page, [
    ['slope-up', { x: 2, y: 6 }],
    ['hill', { x: 2, y: 7 }],
    ['slope-down', { x: 2, y: 8 }],
  ]);

  // The pieces' own GLBs arrive only when a hill is placed.
  await page.waitForFunction(() =>
    performance
      .getEntriesByType('resource')
      .some((entry) => entry.name.includes('hill-slope-up.glb')),
  );
  await page.waitForFunction(() =>
    performance.getEntriesByType('resource').some((entry) => entry.name.includes('hill-hill.glb')),
  );

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  // Long enough to climb, cross the crest, and coast down — the ride must
  // survive the whole transit and keep rolling.
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

test('a hill run survives a reload', async ({ page }) => {
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );

  await clearMeadow(page);
  // A hill run flanked by straights — climb, crest, descent, at grade.
  await placeLine(page, [
    ['straight', { x: 2, y: 5 }],
    ['slope-up', { x: 2, y: 6 }],
    ['hill', { x: 2, y: 7 }],
    ['slope-down', { x: 2, y: 8 }],
    ['straight', { x: 2, y: 9 }],
  ]);
  await page.waitForTimeout(800);

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  await page.waitForTimeout(5000);
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  // The world comes back with its hills through the real autosave path.
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
