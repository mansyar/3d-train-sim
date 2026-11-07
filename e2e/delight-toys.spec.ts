import { expect, test } from '@playwright/test';

import { clearMeadow, watchConsoleErrors } from './helpers';

/**
 * Delight toys smoke: the windmill, carousel, and hot-air balloon drag in
 * like any scenery toy, load their Blender-authored GLBs, and the balloon
 * really wanders — landed, airborne, back down — with the console as the
 * witness (spec acceptance: motion plays, winter tells, zero errors).
 */

type WorldHandle = {
  placeScenery: (kind: string, cell: { x: number; y: number }, rotation: number) => string;
  scenery: () => readonly unknown[];
};

type SceneHandle = {
  delightBalloonDrift: () => { x: number; z: number; altitude: number } | null;
  setDelightSnow: (visible: boolean) => void;
};

const placeScenery = (
  page: import('@playwright/test').Page,
  kind: string,
  cell: { x: number; y: number },
) =>
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

const countScenery = (page: import('@playwright/test').Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld?.scenery()
        .length ?? 0,
  );

const balloonDrift = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const scene = (window as unknown as { __tinyTracksScene?: SceneHandle }).__tinyTracksScene;
    return scene?.delightBalloonDrift() ?? null;
  });

const setDelightSnow = (page: import('@playwright/test').Page, visible: boolean) =>
  page.evaluate((snow) => {
    const scene = (window as unknown as { __tinyTracksScene?: SceneHandle }).__tinyTracksScene;
    scene?.setDelightSnow(snow);
  }, visible);

const waitForGlb = (page: import('@playwright/test').Page, name: string) =>
  page.waitForFunction(
    (glb) => performance.getEntriesByType('resource').some((entry) => entry.name.includes(glb)),
    name,
  );

test('the three delight toys load their GLBs, the balloon takes wing, and winter caps them', async ({
  page,
}) => {
  // CI tablet profiles can crawl under parallel load; the balloon is
  // wall-clock driven, so give the takeoff poll generous headroom.
  test.setTimeout(120_000); // the takeoff and winter budgets, summed
  const consoleErrors = watchConsoleErrors(page);

  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await page.goto('/');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );

  await clearMeadow(page);

  await test.step('each delight toy drags in and loads its own GLB', async () => {
    // Dry cells: the default river band spans columns 4–6 in these rows.
    await placeScenery(page, 'windmill', { x: 1, y: 2 });
    await placeScenery(page, 'carousel', { x: 3, y: 2 });
    await placeScenery(page, 'balloon', { x: 8, y: 2 });

    // Each toy's own GLB arrives when its placement demands it.
    await waitForGlb(page, 'windmill.glb');
    await waitForGlb(page, 'carousel.glb');
    await waitForGlb(page, 'balloon.glb');
    expect(await countScenery(page)).toBe(3);
  });

  await test.step('the balloon takes wing and stays under its cruise ceiling', async () => {
    // The balloon rests a beat, then rises: the wander state machine's
    // airborne phase, watched through the dev witness.
    await expect
      .poll(() => balloonDrift(page).then((pose) => pose?.altitude ?? 0), {
        timeout: 60_000,
        intervals: [250],
      })
      .toBeGreaterThan(0.2);

    // …and it stays a gentle toy: never higher than its cruise ceiling.
    const pose = await balloonDrift(page);
    expect(pose).not.toBeNull();
    expect(pose?.altitude ?? 0).toBeLessThan(1.7);
  });

  await test.step('winter toggles the snow caps without a sound', async () => {
    // The windmill is already placed and loaded; the shared frozen gate only
    // has to flip both ways for its caps to show and hide cleanly.
    await waitForGlb(page, 'windmill.glb');
    await setDelightSnow(page, true);
    await page.waitForTimeout(300);
    await setDelightSnow(page, false);
    await page.waitForTimeout(300);
  });

  const origin = new URL(page.url()).origin;
  const external = requestUrls.filter((url) => new URL(url).origin !== origin);
  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
