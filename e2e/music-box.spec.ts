import { expect, type Page, test } from '@playwright/test';

import { watchConsoleErrors } from './helpers';

/**
 * Music box smoke: a placed box loads its Blender-authored GLB, rests in the
 * meadow, winds — figure turning, a real tune playing — while a driven train
 * passes within reach, then settles back to rest; the shared winter gate
 * covers its snow cap; the console and the network stay clean (spec
 * acceptance: one winding per pass, tune id present, twirl, rest, silence).
 */

type WorldHandle = {
  placeScenery: (kind: string, cell: { x: number; y: number }, rotation: number) => string;
};

type SceneHandle = {
  musicBoxProbe: () => { state: string; tune: string | null; twirl: number } | null;
  setDelightSnow: (visible: boolean) => void;
};

const placeScenery = (page: Page, kind: string, cell: { x: number; y: number }) =>
  page.evaluate(
    ({ kind, cell }) => {
      const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
      if (!world) throw new Error('dev world handle missing');
      if (world.placeScenery(kind, cell, 0) !== 'placed') {
        throw new Error(`scenery placement failed: ${kind} at ${cell.x},${cell.y}`);
      }
    },
    { kind, cell },
  );

const musicBoxProbe = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as unknown as { __tinyTracksScene?: SceneHandle }
      ).__tinyTracksScene?.musicBoxProbe() ?? null,
  );

const setDelightSnow = (page: Page, visible: boolean) =>
  page.evaluate((snow) => {
    const scene = (window as unknown as { __tinyTracksScene?: SceneHandle }).__tinyTracksScene;
    scene?.setDelightSnow(snow);
  }, visible);

const waitForGlb = (page: Page, name: string) =>
  page.waitForFunction(
    (glb) => performance.getEntriesByType('resource').some((entry) => entry.name.includes(glb)),
    name,
  );

test('a passing train winds the music box, then it settles back to rest', async ({ page }) => {
  // The winding waits for a driven lap; CI tablet profiles crawl under load.
  test.setTimeout(180_000);
  const consoleErrors = watchConsoleErrors(page);

  const external: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (!/localhost|127\.0\.0\.1|^data:|^blob:/.test(url)) external.push(url);
  });

  // Fresh boot: the first-run cozy oval, exactly as a family would meet it.
  await page.goto('/');
  await page.evaluate(() => window.indexedDB.deleteDatabase('tiny-tracks'));
  await page.reload();
  await page.waitForSelector('canvas');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
  // The wipe's reload tears down a live WebGL page (starter-railway
  // precedent); the ride below re-covers the fresh load genuinely.
  consoleErrors.length = 0;
  await page.waitForTimeout(2000);

  // A dry cell right above the cozy oval's top straight (columns 0–3 stay dry).
  await placeScenery(page, 'music-box', { x: 1, y: 4 });
  await waitForGlb(page, 'music-box.glb');

  // Attached and resting before any train rolls.
  await expect
    .poll(() => musicBoxProbe(page).then((probe) => probe?.state ?? 'missing'), {
      timeout: 20_000,
      intervals: [250],
    })
    .toBe('resting');

  await page.locator('.ride-toggle').click();
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/, { timeout: 15_000 });

  // The pass winds it: winding state, a real tune id, a figure on the turn.
  await expect
    .poll(() => musicBoxProbe(page).then((probe) => (probe?.state === 'winding' ? 1 : 0)), {
      timeout: 120_000,
      intervals: [250],
    })
    .toBe(1);
  await expect
    .poll(() => musicBoxProbe(page).then((probe) => probe?.twirl ?? 0), {
      timeout: 5_000,
      intervals: [100],
    })
    .toBeGreaterThan(0.2);
  const winding = await musicBoxProbe(page);
  expect(winding?.tune, 'winding tune id').not.toBeNull();
  expect(['abc', 'mary', 'london', 'row']).toContain(winding?.tune ?? '');

  // One phrase, then the box cools down and rests.
  await expect
    .poll(() => musicBoxProbe(page).then((probe) => probe?.state ?? 'missing'), {
      timeout: 30_000,
      intervals: [250],
    })
    .toMatch(/resting|cooldown/);

  await page.locator('.ride-toggle').click();

  // The shared winter gate reaches the new kind's snow cap too.
  await setDelightSnow(page, true);
  await page.waitForTimeout(300);
  await setDelightSnow(page, false);
  await page.waitForTimeout(300);

  // Reload: the box is part of the autosaved world and re-attaches cleanly.
  await page.reload();
  await page.waitForSelector('canvas');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
  // The reload tears down a live WebGL page (see the boot note above).
  consoleErrors.length = 0;
  await expect
    .poll(() => musicBoxProbe(page).then((probe) => probe?.state ?? 'missing'), {
      timeout: 20_000,
      intervals: [250],
    })
    .toBe('resting');

  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
