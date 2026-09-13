import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { clearMeadow, watchConsoleErrors } from './helpers';

/**
 * Boot parking (track spare-train-park_20260913): the pre-ride opener must
 * rest on the loaded world — dry rails of its largest loop, half a cell from
 * the dry cell nearest the meadow heart — instead of world origin, which sits
 * in the river band. The wart was recorded in the starter-railway_20260903
 * track: "the parked spare train sits at world origin, which is river water".
 */

interface Spot {
  x: number;
  z: number;
}

/** World → meadow cell (GROUND_SIZE 60 / MEADOW_CELLS 16 = 3.75). */
const CELL_SIZE = 3.75;
const HALF_MEADOW = 30;

function cellOf(spot: Spot): { x: number; y: number } {
  return {
    x: Math.round((spot.x + HALF_MEADOW) / CELL_SIZE - 0.5),
    y: Math.round((spot.z + HALF_MEADOW) / CELL_SIZE - 0.5),
  };
}

async function waitForParked(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const ready = (window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady;
    const handle = (window as unknown as { __tinyTracksScene?: { parkedSpot(): unknown } })
      .__tinyTracksScene;
    return Boolean(ready) && Boolean(handle?.parkedSpot());
  });
}

async function readSpot(page: Page, method: 'parkedSpot' | 'primarySpot'): Promise<Spot> {
  return page.evaluate((name) => {
    const handle = (
      window as unknown as {
        __tinyTracksScene?: {
          parkedSpot(): Spot | null;
          primarySpot(): Spot | null;
        };
      }
    ).__tinyTracksScene;
    if (!handle) throw new Error('dev scene handle missing');
    const spot = name === 'parkedSpot' ? handle.parkedSpot() : handle.primarySpot();
    if (!spot) throw new Error(`${name} returned null`);
    return spot;
  }, method);
}

async function startRide(page: Page): Promise<void> {
  const started = await page.evaluate(() => {
    const handle = (window as unknown as { __tinyTracksScene?: { startRide(): boolean } })
      .__tinyTracksScene;
    if (!handle) throw new Error('dev scene handle missing');
    return handle.startRide();
  });
  expect(started).toBe(true);
  await page.waitForFunction(() => {
    const handle = (window as unknown as { __tinyTracksScene?: { ridingTrainCount(): number } })
      .__tinyTracksScene;
    return handle?.ridingTrainCount() === 1;
  });
}

test('fresh boot parks the opener on dry rails of the largest loop', async ({ page }) => {
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForParked(page);
  const spot = await readSpot(page, 'parkedSpot');

  // First-run starter (cozy oval): the dry corner cell (3,7) is nearest the
  // meadow heart on the loop, and the engine waits at its entry-edge
  // midpoint — the spot rounds back to that cell.
  expect(cellOf(spot)).toEqual({ x: 3, y: 7 });

  // The old bug parked at world origin — the middle of the river band.
  expect(Math.hypot(spot.x, spot.z)).toBeGreaterThan(4);

  // Both wagons rest right behind the engine rather than at origin.
  const wagons = await page.evaluate(() => {
    const handle = (window as unknown as { __tinyTracksScene?: { wagonCount(): number } })
      .__tinyTracksScene;
    return handle?.wagonCount() ?? -1;
  });
  expect(wagons).toBe(2);

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('pressing play adopts the parked opener without a jump', async ({ page }) => {
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForParked(page);
  const before = await readSpot(page, 'parkedSpot');

  await startRide(page);
  const after = await readSpot(page, 'primarySpot');

  // The ride reuses the spare from exactly its parked spot, so the first
  // frame is continuous; the pre-fix ride began from origin, ~17 units away.
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeLessThan(1);

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('an empty saved world parks the opener on dry land near the heart', async ({ page }) => {
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
  // Empty the meadow (the same store call the parent gate uses) so the
  // autosave persists an empty world, then boot from it.
  await clearMeadow(page);
  await page.waitForTimeout(300);
  await page.reload();
  await waitForParked(page);

  const spot = await readSpot(page, 'parkedSpot');

  // No rails to rest on: the nearest dry cell to the meadow heart is (6,7),
  // just west of the river band — the engine sits at its centre.
  expect(cellOf(spot)).toEqual({ x: 6, y: 7 });
  expect(Math.hypot(spot.x, spot.z)).toBeGreaterThan(4);

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
