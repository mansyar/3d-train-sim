import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { watchConsoleErrors } from './helpers';

/**
 * River life end to end: the frog floats on water and sits on land, the
 * barge and frog GLBs really load, and a ride with critters aboard stays
 * clean. Dev-only handles (`__tinyTracksWorld`) drive deterministic
 * setups — the same pattern as river.spec.ts / cargo.spec.ts.
 */

interface WorldHandle {
  reset: () => void;
  place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
  placeScenery: (kind: string, cell: { x: number; y: number }, rotation: number) => string;
  scenery: () => readonly { id: string; kind: string; cell: { x: number; y: number } }[];
}

const hasResource = (page: Page, asset: string): Promise<boolean> =>
  page.evaluate(
    (asset) => performance.getEntriesByType('resource').some((entry) => entry.name.includes(asset)),
    asset,
  );

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
  await page.waitForTimeout(1200);
});

test('the frog floats on water, sits on land, and its GLB loads', async ({ page }) => {
  const consoleErrors = watchConsoleErrors(page);

  const results = await page.evaluate(() => {
    const handle = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!handle) throw new Error('dev world handle missing');
    handle.reset();
    return {
      // Row 8's water spans x 7–9 (hand-derived in river.spec.ts); (2,2)
      // sits well west of the banks.
      treeOnWater: handle.placeScenery('tree', { x: 8, y: 8 }, 0),
      frogOnWater: handle.placeScenery('frog', { x: 8, y: 8 }, 0),
      frogOnLand: handle.placeScenery('frog', { x: 2, y: 2 }, 0),
      scenery: handle.scenery().map((toy) => ({ kind: toy.kind, cell: toy.cell })),
    };
  });

  // The float rule stays frog-only: the tree is refused on water, both
  // frogs commit.
  expect(results.treeOnWater).toBe('water');
  expect(results.frogOnWater).toBe('placed');
  expect(results.frogOnLand).toBe('placed');
  expect(results.scenery).toEqual([
    { kind: 'frog', cell: { x: 8, y: 8 } },
    { kind: 'frog', cell: { x: 2, y: 2 } },
  ]);

  // The frog asset really loads (water + land share one template).
  await page.waitForFunction(() =>
    performance.getEntriesByType('resource').some((entry) => entry.name.includes('frog.glb')),
  );

  // The barge is present: its GLB is fetched and it drifts the living
  // river (the scene keeps visibly changing with the meadow idle).
  expect(await hasResource(page, 'barge.glb')).toBe(true);
  const a = await page.screenshot();
  await page.waitForTimeout(1500);
  const b = await page.screenshot();
  expect(Buffer.compare(a, b)).not.toBe(0);

  expect(consoleErrors).toEqual([]);
});

test('a ride with a water frog, a land frog, and the barge aboard stays clean', async ({
  page,
}) => {
  const consoleErrors = watchConsoleErrors(page);

  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await page.evaluate(() => {
    const handle = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!handle) throw new Error('dev world handle missing');
    handle.reset();
    // A rideable loop (cargo.spec's corners) plus critters and ambience.
    handle.place('corner', { x: 1, y: 7 }, 90);
    handle.place('corner', { x: 2, y: 7 }, 180);
    handle.place('corner', { x: 2, y: 8 }, 270);
    handle.place('corner', { x: 1, y: 8 }, 0);
    if (handle.placeScenery('frog', { x: 8, y: 8 }, 0) !== 'placed') {
      throw new Error('water frog placement failed');
    }
    if (handle.placeScenery('frog', { x: 2, y: 2 }, 0) !== 'placed') {
      throw new Error('land frog placement failed');
    }
  });

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  // Long enough for laps, ribbits on approach, and barge drift.
  await page.waitForTimeout(8000);
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  const origin = new URL(page.url()).origin;
  const external = requestUrls.filter((url) => new URL(url).origin !== origin);
  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
