import { expect, test } from '@playwright/test';

import { clearMeadow, watchConsoleErrors } from './helpers';

/**
 * Mirror-switch smoke: the left-hand Y drags in like any track piece, loads
 * its OWN mirrored GLB, and a ride over the alternating branches stays
 * clean — the train takes the straight branch one lap and the west
 * diverging branch the next, with the console as the witness.
 *
 * Alternation itself is proven at the unit level (pathing stem exits
 * ['north', 'west'], ride-motion onSwitchRoad north/west with no repeat);
 * here the ride must survive a full alternating cycle — long enough for a
 * straight lap plus a diverge lap including dead-end turnarounds — which it
 * could not do if either branch failed to ride.
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

const MIRRORED_Y_LAYOUT: [string, { x: number; y: number }][] = [
  ['straight', { x: 2, y: 1 }],
  ['switch-mirror', { x: 2, y: 2 }],
  ['straight', { x: 2, y: 3 }],
];

test('a placed mirror switch loads its GLB and the train rides both branches cleanly', async ({
  page,
}) => {
  const consoleErrors = watchConsoleErrors(page);

  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await page.goto('/');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );

  await placeLine(page, MIRRORED_Y_LAYOUT);

  // The mirror's own GLB arrives only when a mirror switch is placed —
  // boot precaches every piece GLB, so this asserts the mirror's own
  // asset is among the fetches.
  await page.waitForFunction(() =>
    performance
      .getEntriesByType('resource')
      .some((entry) => entry.name.includes('switch-mirror.glb')),
  );

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  // A full alternating cycle: straight lap + diverge lap, each with
  // dead-end turnarounds — the ride must survive both roads and keep rolling.
  await page.waitForTimeout(12000);
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  const a = await page.screenshot();
  await page.waitForTimeout(1200);
  const b = await page.screenshot();
  expect(Buffer.compare(a, b)).not.toBe(0);

  const fetched = requestUrls.filter((url) => url.includes('.glb'));
  expect(fetched.some((url) => url.includes('switch-mirror.glb'))).toBe(true);

  const origin = new URL(page.url()).origin;
  const external = requestUrls.filter((url) => new URL(url).origin !== origin);
  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('a mirrored Y layout survives a reload', async ({ page }) => {
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );

  await clearMeadow(page);
  await placeLine(page, MIRRORED_Y_LAYOUT);
  await page.waitForTimeout(800);

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  await page.waitForTimeout(5000);
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  // The world comes back with its mirror switch through the real autosave path.
  await page.reload();
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
  const restored = await page.evaluate(
    () =>
      (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld?.pieces()
        .length ?? 0,
  );
  expect(restored).toBe(3);

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
