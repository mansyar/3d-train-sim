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

/** Distance from a spot to a cell's centre — edge midpoints sit half a cell out. */
function distanceToCell(spot: Spot, cell: { x: number; y: number }): number {
  const centreX = -HALF_MEADOW + (cell.x + 0.5) * CELL_SIZE;
  const centreZ = -HALF_MEADOW + (cell.y + 0.5) * CELL_SIZE;
  return Math.hypot(spot.x - centreX, spot.z - centreZ);
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

/** Press-and-hold the parent gate until the armed-confirm gallery opens. */
async function openGallery(page: Page): Promise<void> {
  const gate = page.locator('.parent-gate');
  const tray = page.locator('.preset-tray');
  // Shader-compile jank can delay the arm timer past our release — retry,
  // exactly like a real finger would hold again (starter-railway spec).
  for (let attempt = 0; attempt < 3 && !(await tray.isVisible()); attempt++) {
    const box = await gate.boundingBox();
    if (!box) throw new Error('parent gate missing');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(2400);
    await page.mouse.up();
  }
  await expect(tray).toBeVisible();
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

test('every gallery starter parks the opener on its nearest dry rail cell', async ({ page }) => {
  test.setTimeout(150_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
  await page.waitForTimeout(1500);

  // The dry cell nearest the meadow heart on each starter's largest loop —
  // the unit-locked chooser spots, confirmed here boot-to-boot.
  const starters = [
    { id: 'station-village', cell: { x: 4, y: 7 } },
    { id: 'river-crossing', cell: { x: 6, y: 8 } },
    { id: 'hilltop-junction', cell: { x: 4, y: 7 } },
  ];
  for (const starter of starters) {
    // Swap through the parent gate, then reload so the opener is born from
    // that starter (parking is boot-time only, per spec FR4).
    await openGallery(page);
    await page.locator(`.preset-pick[data-preset="${starter.id}"]`).click();
    await page.waitForTimeout(2500);
    await page.reload();
    await waitForParked(page);
    // A reload drops the doomed WebGL context; its fetch fallout is known
    // noise (starter-railway boot pattern) — clear it once boot settles.
    consoleErrors.length = 0;

    const spot = await readSpot(page, 'parkedSpot');
    // The engine waits at a rail edge midpoint — half a cell from the centre
    // of the dry piece cell nearest the heart; never at the river's origin.
    expect(distanceToCell(spot, starter.cell)).toBeCloseTo(CELL_SIZE / 2, 1);
    expect(Math.hypot(spot.x, spot.z)).toBeGreaterThan(2);
  }

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
