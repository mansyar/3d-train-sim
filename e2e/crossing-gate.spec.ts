import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { clearMeadow, watchConsoleErrors } from './helpers';

/**
 * Railway crossing gate end-to-end: the road-level piece places from the
 * Rails tab like any track, refuses water, and wakes when a train nears —
 * gates swing, the bell rings, the pass lifts them — with the console as
 * the witness (spec acceptance 1–4). Dev-only handles
 * (`__tinyTracksWorld` / `__tinyTracksScene`) drive deterministic setups —
 * the same pattern as smoke.spec.ts and tunnel.spec.ts.
 */

interface WorldHandle {
  place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
  pieces: () => { id: string; type: string; cell: { x: number; y: number }; rotation: number }[];
}

const expectConsoleClean = (consoleErrors: string[]): void => {
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
};

/** Screen spot of a meadow cell via the scene's own mapping. */
const cellSpot = (page: Page, cell: { x: number; y: number }): Promise<{ x: number; y: number }> =>
  page.evaluate((target) => {
    const sceneHandle = (
      window as unknown as {
        __tinyTracksScene?: {
          cellToScreen: (cell: { x: number; y: number }) => { x: number; y: number } | null;
        };
      }
    ).__tinyTracksScene;
    const spot = sceneHandle?.cellToScreen(target);
    if (!spot) throw new Error('cell not visible');
    return spot;
  }, cell);

/** Pieces matching a type, read inside the page (handles don't cross to Node). */
const piecesOf = (page: Page, type: string) =>
  page.evaluate((kind) => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    return world.pieces().filter((piece) => piece.type === kind);
  }, type);

test('the crossing places from the Rails tab and refuses water', async ({ page }) => {
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );

  await clearMeadow(page);
  // Toybox opens on the Rails tab; the gate snaps in like any track piece.
  await page.click('[data-drawer="toys"]');
  await expect(page.locator('.drawer-tab[data-tab="rails"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const slot = page.locator(
    '.drawer-panel[data-panel="rails"] .piece-slot[data-piece="crossing-gate"]',
  );
  await expect(slot).toBeVisible();

  const from = await slot.boundingBox();
  if (!from) throw new Error('piece slot not on screen');
  const drop = await cellSpot(page, { x: 3, y: 3 });
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(drop.x, drop.y, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(600);

  const gates = await piecesOf(page, 'crossing-gate');
  expect(gates).toHaveLength(1);
  expect(gates[0]?.cell).toEqual({ x: 3, y: 3 });

  // Row 8's river spans x 7–9 — the store call backs the red ghost up:
  // the gate is dry-land only, exactly like its straight sibling.
  const waterResult = await page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    return world.place('crossing-gate', { x: 8, y: 8 }, 0);
  });
  expect(waterResult).toBe('water');

  expectConsoleClean(consoleErrors);
});

test('the train approach closes the gates, rings the bell, and the pass lifts them', async ({
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
  await page.evaluate(() => {
    const world = (
      window as unknown as {
        __tinyTracksWorld?: {
          place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
        };
      }
    ).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    const line: [string, { x: number; y: number }][] = [
      ['straight', { x: 2, y: 3 }],
      ['straight', { x: 2, y: 4 }],
      ['straight', { x: 2, y: 5 }],
      ['crossing-gate', { x: 2, y: 6 }],
      ['straight', { x: 2, y: 7 }],
      ['straight', { x: 2, y: 8 }],
      ['straight', { x: 2, y: 9 }],
    ];
    for (const [type, cell] of line) {
      if (world.place(type, cell, 0) !== 'placed') {
        throw new Error(`placement failed: ${type} at ${cell.x},${cell.y}`);
      }
    }
  });

  // The gate's own GLB arrives when the piece places.
  await page.waitForFunction(() =>
    performance
      .getEntriesByType('resource')
      .some((entry) => entry.name.includes('crossing-gate.glb')),
  );
  await page.waitForTimeout(800);

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  // The shuttle's first approach wakes the crossing…
  await page.waitForFunction(
    () =>
      (
        window as unknown as { __tinyTracksScene?: { crossingPhases: () => string[] } }
      ).__tinyTracksScene
        ?.crossingPhases()
        .some((phase) => phase !== 'idle'),
    undefined,
    { timeout: 30_000 },
  );
  // …and the bell edge rings while the gates are down (scene witness: the
  // headless suite never fetches Howler media, so the network can't tell us).
  await page.waitForFunction(
    () =>
      (
        window as unknown as { __tinyTracksScene?: { bellRinging: () => boolean } }
      ).__tinyTracksScene?.bellRinging() === true,
    undefined,
    { timeout: 10_000 },
  );

  // After the train passes, everything rests again — the ride keeps rolling.
  await page.waitForFunction(
    () =>
      (
        window as unknown as { __tinyTracksScene?: { crossingPhases: () => string[] } }
      ).__tinyTracksScene
        ?.crossingPhases()
        .every((phase) => phase === 'idle'),
    undefined,
    { timeout: 30_000 },
  );
  await page.waitForFunction(
    () =>
      (
        window as unknown as { __tinyTracksScene?: { bellRinging: () => boolean } }
      ).__tinyTracksScene?.bellRinging() === false,
    undefined,
    { timeout: 10_000 },
  );
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  // The world comes back with its crossing through the real autosave path.
  await page.reload();
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
  const restored = await page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    return world.pieces();
  });
  expect(restored).toHaveLength(7);
  expect(restored.filter((piece) => piece.type === 'crossing-gate')).toHaveLength(1);

  const origin = new URL(page.url()).origin;
  const external = requestUrls.filter((url) => new URL(url).origin !== origin);
  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
  expectConsoleClean(consoleErrors);
});
