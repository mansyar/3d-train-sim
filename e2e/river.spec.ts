import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { clearMeadow, watchConsoleErrors } from './helpers';

/**
 * River end-to-end, merged into one file: the water-only trestle, the v1→v2
 * save migration, the bridge crossing under a train, and the living river —
 * the frog floats on water and sits on land, the barge and frog GLBs really
 * load, and the meadow idles with a clean console. Dev-only handles
 * (`__tinyTracksWorld` / `__tinyTracksScene`) drive deterministic setups —
 * the same pattern as smoke.spec.ts.
 */

interface WorldHandle {
  reset: () => void;
  place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
  placeScenery: (kind: string, cell: { x: number; y: number }, rotation: number) => string;
  pieces: () => { id: string; type: string; cell: { x: number; y: number }; rotation: number }[];
  scenery: () => { id: string; kind: string; cell: { x: number; y: number } }[];
}

const waitReady = (page: Page) =>
  page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );

const boot = async (page: Page): Promise<void> => {
  await page.goto('/');
  await waitReady(page);
};

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

const hasResource = (page: Page, asset: string): Promise<boolean> =>
  page.evaluate(
    (asset) => performance.getEntriesByType('resource').some((entry) => entry.name.includes(asset)),
    asset,
  );

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

test('the water refuses land toys and the trestle carries the train', async ({ page }) => {
  test.setTimeout(120_000);
  const { consoleErrors, requestUrls } = consoleAndRequests(page);

  await test.step('boot the meadow', async () => {
    await boot(page);
  });

  await test.step('refuse a bridge on grass and toys on water', async () => {
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
  });

  await test.step('place the bridge and render the trestle', async () => {
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

  await test.step('migrate a pre-river v1 save', async () => {
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
    await waitReady(page);
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
    await waitReady(page);
    await page.waitForTimeout(1000);
    const repieces = await page.evaluate(() => {
      const handle = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
      if (!handle) throw new Error('dev world handle missing');
      return handle.pieces().map((piece) => ({ id: piece.id, type: piece.type }));
    });
    expect(repieces.map((piece) => piece.type)).toEqual(['bridge', 'corner']);

    expectLocalAndClean(page, consoleErrors, requestUrls);
  });

  await test.step('ride straight across the trestle bridges', async () => {
    await clearMeadow(page);

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
});

test('the river lives: the frog floats, the barge drifts, and a ride stays clean', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const { consoleErrors, requestUrls } = consoleAndRequests(page);

  await test.step('let the river meadow idle clean', async () => {
    await boot(page);
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

  await test.step('float the frog on water, sit it on land, and load its GLB', async () => {
    const results = await page.evaluate(() => {
      const handle = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
      if (!handle) throw new Error('dev world handle missing');
      handle.reset();
      return {
        // Row 8's water spans x 7–9 (hand-derived in the bridge test);
        // (2,2) sits well west of the banks.
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

  await test.step('ride with a water frog, a land frog, and the barge aboard', async () => {
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

    expectLocalAndClean(page, consoleErrors, requestUrls);
  });
});
