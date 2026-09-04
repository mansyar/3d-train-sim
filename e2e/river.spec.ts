import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { watchConsoleErrors } from './helpers';

/**
 * River & bridge end-to-end: the water-only trestle, the v1→v2 save
 * migration, and a long clean idle with the river active. Dev-only handles
 * (`__tinyTracksWorld` / `__tinyTracksScene`) drive deterministic setups —
 * the same pattern as smoke.spec.ts.
 */

interface WorldHandle {
  place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
  placeScenery: (kind: string, cell: { x: number; y: number }, rotation: number) => string;
  pieces: () => { id: string; type: string; cell: { x: number; y: number }; rotation: number }[];
  scenery: () => { id: string; kind: string; cell: { x: number; y: number } }[];
}

const consoleAndRequests = (page: Page): { consoleErrors: string[]; requestUrls: string[] } => {
  const consoleErrors = watchConsoleErrors(page);
  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));
  return { consoleErrors, requestUrls };
};

const expectLocalAndClean = (page: Page, consoleErrors: string[], requestUrls: string[]): void => {
  const origin = new URL(page.url()).origin;
  const external = requestUrls.filter((url) => new URL(url).origin !== origin);
  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
};

/** Deletes the autosave database so the next load starts from the seed. */
const clearWorldStorage = (page: Page): Promise<void> =>
  page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase('tiny-tracks');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => resolve();
      }),
  );

/** Seeds a raw snapshot into the autosave database (any version shape). */
const seedSnapshot = (page: Page, snapshot: unknown): Promise<void> =>
  page.evaluate(
    (value) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('tiny-tracks', 1);
        open.onupgradeneeded = () => {
          if (!open.result.objectStoreNames.contains('worlds')) {
            open.result.createObjectStore('worlds');
          }
        };
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('worlds', 'readwrite');
          tx.objectStore('worlds').put(value, 'current');
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    snapshot,
  );

test('a bridge places on water, rejects grass and land toys, and renders the trestle', async ({
  page,
}) => {
  const { consoleErrors, requestUrls } = consoleAndRequests(page);
  await page.goto('/');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );

  // Row 8's water spans x 7–9 (hand-derived from the river's center line);
  // (2,2) sits well west of the banks.
  const result = await page.evaluate(async () => {
    const handle = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!handle) throw new Error('dev world handle missing');
    return {
      bridgeOnGrass: handle.place('bridge', { x: 2, y: 2 }, 0),
      straightOnWater: handle.place('straight', { x: 8, y: 8 }, 0),
      treeOnWater: handle.placeScenery('tree', { x: 8, y: 7 }, 0),
    };
  });
  expect(result.bridgeOnGrass).toBe('water');
  expect(result.straightOnWater).toBe('water');
  expect(result.treeOnWater).not.toBe('placed');

  // The valid bridge commits and the trestle really renders.
  const before = await page.screenshot();
  const placed = await page.evaluate(async () => {
    const handle = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!handle) throw new Error('dev world handle missing');
    return handle.place('bridge', { x: 8, y: 8 }, 90);
  });
  expect(placed).toBe('placed');
  await page.waitForTimeout(800);
  const after = await page.screenshot();
  expect(Buffer.compare(before, after)).not.toBe(0);

  expectLocalAndClean(page, consoleErrors, requestUrls);
});

test('a pre-river v1 save loads water-crossing straights as bridges — nothing lost', async ({
  page,
}) => {
  const { consoleErrors, requestUrls } = consoleAndRequests(page);

  await page.goto('/');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
  await clearWorldStorage(page);

  // A v1 world: a straight spanning the river at (8,8), a corner on dry
  // land, a tree — the kid's meadow, built before water existed.
  await seedSnapshot(page, {
    version: 1,
    pieces: [
      { id: 'p1', type: 'straight', cell: { x: 8, y: 8 }, rotation: 90 },
      { id: 'p2', type: 'corner', cell: { x: 2, y: 2 }, rotation: 90 },
    ],
    scenery: [{ id: 's1', kind: 'tree', cell: { x: 2, y: 3 }, rotation: 0 }],
    train: 'steam',
  });

  await page.reload();
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
  await page.waitForTimeout(1000);

  const migrated = await page.evaluate(() => {
    const handle = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!handle) throw new Error('dev world handle missing');
    return {
      pieces: handle.pieces().map((piece) => ({ id: piece.id, type: piece.type })),
      scenery: handle.scenery().map((toy) => toy.kind),
    };
  });
  // Same ids, same count — the water-crossing straight now renders as a
  // trestle bridge; everything else is untouched.
  expect(migrated.pieces).toEqual([
    { id: 'p1', type: 'bridge' },
    { id: 'p2', type: 'corner' },
  ]);
  expect(migrated.scenery).toEqual(['tree']);

  // The migration persists — a second reload keeps the bridge a bridge.
  await page.reload();
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
  await page.waitForTimeout(1000);
  const repieces = await page.evaluate(() => {
    const handle = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!handle) throw new Error('dev world handle missing');
    return handle.pieces().map((piece) => ({ id: piece.id, type: piece.type }));
  });
  expect(repieces.map((piece) => piece.type)).toEqual(['bridge', 'corner']);

  expectLocalAndClean(page, consoleErrors, requestUrls);
});

test('a train rides straight across the trestle bridges over the river', async ({ page }) => {
  const { consoleErrors, requestUrls } = consoleAndRequests(page);
  await page.goto('/');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );

  // An east–west line crossing the river on three trestles: straights on
  // both banks (x 5–6 and 10–11 are dry at row 8), bridges on x 7–9.
  const results = await page.evaluate(async () => {
    const handle = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!handle) throw new Error('dev world handle missing');
    const plan = [
      { cell: { x: 5, y: 8 }, type: 'straight' },
      { cell: { x: 6, y: 8 }, type: 'straight' },
      { cell: { x: 7, y: 8 }, type: 'bridge' },
      { cell: { x: 8, y: 8 }, type: 'bridge' },
      { cell: { x: 9, y: 8 }, type: 'bridge' },
      { cell: { x: 10, y: 8 }, type: 'straight' },
      { cell: { x: 11, y: 8 }, type: 'straight' },
    ];
    return plan.map((step) => handle.place(step.type, step.cell, 90));
  });
  expect(results.every((result) => result === 'placed')).toBe(true);

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  // Mid-crossing: the ride visibly animates (the train is out on the water).
  await page.waitForTimeout(2500);
  const a = await page.screenshot();
  await page.waitForTimeout(1200);
  const b = await page.screenshot();
  expect(Buffer.compare(a, b)).not.toBe(0);

  expectLocalAndClean(page, consoleErrors, requestUrls);
});

test('the river meadow idles clean — living water, silent console, no external requests', async ({
  page,
}) => {
  const { consoleErrors, requestUrls } = consoleAndRequests(page);
  await page.goto('/');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
  await page.waitForTimeout(2000); // Settle asset loads.

  // A long idle with the river active: the living water (sky lerp, drifting
  // ripples, the duck) keeps the scene visibly changing on its own.
  await page.waitForTimeout(10_000);
  const a = await page.screenshot();
  await page.waitForTimeout(1500);
  const b = await page.screenshot();
  expect(Buffer.compare(a, b)).not.toBe(0);

  expectLocalAndClean(page, consoleErrors, requestUrls);
});
