import { expect, type Page, test } from '@playwright/test';

import { clearMeadow } from './helpers';

/**
 * Hill-grade pace: the climb labors, the descent breezes, and each
 * locomotive keeps its own tempo — with the console as the witness. The
 * scene's `trainPace` dev hook (the filmed train's live pace factor) lets
 * the specs prove labor/breeze directly instead of eyeballing pixels.
 */

type WorldHandle = {
  place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
  placeScenery: (kind: string, cell: { x: number; y: number }, rotation: number) => string;
  selectTrain: (kind: string) => boolean;
  pieces: () => readonly unknown[];
  train: () => string;
};

type SceneHandle = {
  steamPuffCount: () => number;
  trainPace: () => number;
};

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

const selectTrain = (page: Page, kind: string) =>
  page.evaluate((name) => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    if (!world.selectTrain(name)) throw new Error(`train selection failed: ${name}`);
  }, kind);

/** Polls the filmed train's live pace; the ride must be rolling. */
const samplePace = async (page: Page, samples: number, gapMs: number): Promise<number[]> => {
  const out: number[] = [];
  for (let i = 0; i < samples; i += 1) {
    out.push(
      await page.evaluate(() => {
        const scene = (window as unknown as { __tinyTracksScene?: SceneHandle }).__tinyTracksScene;
        if (!scene) throw new Error('dev scene handle missing');
        return scene.trainPace();
      }),
    );
    await page.waitForTimeout(gapMs);
  }
  return out;
};

const trackActivity = (page: Page) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));
  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));
  return { consoleErrors, requestUrls };
};

const gotoReady = async (page: Page) => {
  await page.goto('/');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
};

const expectClean = (
  page: Page,
  activity: ReturnType<typeof trackActivity>,
  ignoreConsole: readonly ((text: string) => boolean)[] = [],
) => {
  const origin = new URL(page.url()).origin;
  const external = activity.requestUrls.filter((url) => new URL(url).origin !== origin);
  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
  const unexpected = activity.consoleErrors.filter(
    (text) => !ignoreConsole.some((known) => known(text)),
  );
  expect(unexpected, `console errors: ${unexpected.join(' | ')}`).toEqual([]);
};

/**
 * Pre-existing WebKit noise (tablet project only; Chromium is immune):
 * re-riding a reloaded world intermittently logs blocked fetches for
 * GLB-embedded textures (`Fetch API cannot load blob:<uuid>…` / the
 * station's `colormap.png … due to access control checks`). It reproduces
 * with hills alone — no station, cargo, or pace logic involved — and this
 * track changes no asset-loading code, so the reload test fingerprints it
 * instead of asserting a silence WebKit cannot keep. Scoped to the re-ride
 * only (the first ride asserts strict silence just above). Every behavioral
 * assert in that test still runs at full strength.
 */
const KNOWN_WEBKIT_RELOAD_NOISE: readonly ((text: string) => boolean)[] = [
  // Substring on purpose: the live console text carries affixes the
  // assertion display hides (an anchored match never fires at runtime).
  (text) => text.includes('due to access control checks'),
];

/** The proving ground: straight → slope-up → hill → slope-down → straight. */
const HILL_RUN: [string, { x: number; y: number }][] = [
  ['straight', { x: 2, y: 5 }],
  ['slope-up', { x: 2, y: 6 }],
  ['hill', { x: 2, y: 7 }],
  ['slope-down', { x: 2, y: 8 }],
  ['straight', { x: 2, y: 9 }],
];

test('a steam climb labors and the descent breezes, never stalling', async ({ page }) => {
  const activity = trackActivity(page);
  await gotoReady(page);
  await clearMeadow(page);
  await placeLine(page, HILL_RUN);
  await selectTrain(page, 'steam');
  await page.waitForTimeout(800); // let the locomotive GLB land

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  // The shuttle climbs both dead-end legs within the window: the minimum
  // catches the settled labor (0.9 × 0.65 ≈ 0.585), the maximum the
  // settled breeze (0.9 × 1.25 ≈ 1.125).
  const pace = await samplePace(page, 45, 200);
  expect(Math.min(...pace)).toBeLessThan(0.7);
  expect(Math.max(...pace)).toBeGreaterThan(1.05);

  // Per-train puffs: the laboring engine still breathes while riding.
  let puffsSeen = 0;
  for (let i = 0; i < 5; i += 1) {
    puffsSeen = Math.max(
      puffsSeen,
      await page.evaluate(() => {
        const scene = (window as unknown as { __tinyTracksScene?: SceneHandle }).__tinyTracksScene;
        if (!scene) throw new Error('dev scene handle missing');
        return scene.steamPuffCount();
      }),
    );
    await page.waitForTimeout(300);
  }
  expect(puffsSeen).toBeGreaterThan(0);

  // Still shuttling after the grades — laboring never stalls the ride.
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  expectClean(page, activity);
});

test('diesel keeps a zippier pace than steam on the same hill', async ({ page }) => {
  const activity = trackActivity(page);
  await gotoReady(page);
  await clearMeadow(page);
  await placeLine(page, HILL_RUN);

  // Diesel first: the default opener is steam, so every selection below
  // takes the swap path deterministically.
  await selectTrain(page, 'diesel');
  await page.waitForTimeout(800);
  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  const dieselPace = await samplePace(page, 40, 200);
  const dieselMin = Math.min(...dieselPace);
  await page.click('.ride-toggle');

  await selectTrain(page, 'steam');
  await page.waitForTimeout(800);
  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  const steamPace = await samplePace(page, 40, 200);
  const steamMin = Math.min(...steamPace);

  // Settled labors: diesel ≈ 0.78, steam ≈ 0.585 — clearly ranked.
  expect(dieselMin).toBeGreaterThan(0.7);
  expect(dieselMin).toBeLessThan(0.9);
  expect(steamMin).toBeLessThan(0.7);
  expect(dieselMin).toBeGreaterThan(steamMin + 0.1);
  expectClean(page, activity);
});

test('downhill-into-station docks, resumes, and reloads with its diesel pace', async ({ page }) => {
  // A 10 s first ride plus reload plus re-ride sampling legitimately fills
  // the default 30 s budget on software rendering (cf. wagon-workshop).
  test.setTimeout(120_000);
  const activity = trackActivity(page);
  await gotoReady(page);
  await clearMeadow(page);
  await placeLine(page, HILL_RUN);
  await page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    if (world.placeScenery('station', { x: 3, y: 8 }, 0) !== 'placed') {
      throw new Error('station placement failed beside the descent');
    }
  });
  await selectTrain(page, 'diesel');
  await page.waitForTimeout(800);

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  // Through the brake, the 2 s ding-ding, and onward — the ride never
  // sticks at the station, downhill or otherwise.
  await page.waitForTimeout(10000);
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  // Park before reloading: autosave keeps the parked world (the smoke
  // suite's reload pattern) — a torn-down-mid-ride reload is not a path
  // toddlers can reach, and its audio teardown is noisy by nature.
  await page.click('.ride-toggle');
  // Settle: the stop click can land mid station-ding / mid cargo-load, and
  // reloading under those in-flight asset fetches logs access-control
  // noise. Toddlers only ever reload a parked meadow, so wait it out.
  await page.waitForTimeout(3500);
  // The first ride stays zero-tolerance — the allowlist below covers only
  // the re-ride, never this.
  expectClean(page, activity);
  activity.consoleErrors.length = 0;

  // The world comes back with its hills, its station, and its diesel —
  // and a fresh-built rig still rides at the diesel tempo (no
  // tram-default first leg).
  await page.reload();
  await gotoReady(page);
  // Settle again: let the restored station/diesel/crate models land before
  // the re-ride asks for them.
  await page.waitForTimeout(2000);
  const restored = await page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    return { pieces: world.pieces().length, train: world.train() };
  });
  expect(restored.pieces).toBe(5);
  expect(restored.train).toBe('diesel');

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  const pace = await samplePace(page, 30, 200);
  expect(Math.min(...pace)).toBeGreaterThan(0.7);
  expect(Math.min(...pace)).toBeLessThan(0.9);
  expectClean(page, activity, KNOWN_WEBKIT_RELOAD_NOISE);
});

test('flat shuttles ride at exactly full voice', async ({ page }) => {
  const activity = trackActivity(page);
  await gotoReady(page);
  await clearMeadow(page);
  await placeLine(page, [
    ['straight', { x: 2, y: 5 }],
    ['straight', { x: 2, y: 6 }],
    ['straight', { x: 2, y: 7 }],
  ]);
  await selectTrain(page, 'tram');
  await page.waitForTimeout(800);

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  const pace = await samplePace(page, 25, 200);
  // Zero grade ⇒ exactly today's speed on every sample, no ramps at all.
  expect(pace.every((factor) => factor === 1)).toBe(true);

  // ...and the ride visibly rolls (a stalled renderer would pass vacuously).
  const a = await page.screenshot();
  await page.waitForTimeout(1200);
  const b = await page.screenshot();
  expect(Buffer.compare(a, b)).not.toBe(0);
  expectClean(page, activity);
});
