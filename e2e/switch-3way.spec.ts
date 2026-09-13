import { expect, test } from '@playwright/test';

import { clearMeadow, watchConsoleErrors } from './helpers';

/**
 * Three-way switch smoke: the junction drags in like any track piece, loads
 * its OWN authored GLB, and a ride over the alternating roads takes all
 * three — straight, east branch, west branch — with the point blades and
 * the signal lever following the road being taken (witnessed through the
 * scene's switchPose probe).
 *
 * Routing itself is proven at the unit level (switches cycle
 * straight/right/left; pathing and ride-motion lock the three-road walks
 * and announcements); here the piece must mount flush, ride every road
 * cleanly, keep blades and lever paired, hold still under reduced motion
 * (the scene's single static frame contract), and survive reloads parked
 * at neutral.
 */

type WorldHandle = {
  place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
  pieces: () => readonly { id: string; type: string }[];
};

type SceneHandle = {
  switchPose: (pieceId: string) => { blade: number; lever: number | null } | null;
};

const PLACE_LAYOUT: [string, { x: number; y: number }][] = [
  ['straight', { x: 2, y: 1 }],
  ['switch-3way', { x: 2, y: 2 }],
  ['straight', { x: 2, y: 3 }],
];

async function boot(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
}

/** Clears the starter meadow, places the layout, returns the three-way id. */
async function placeThreeWay(page: import('@playwright/test').Page): Promise<string> {
  await clearMeadow(page);
  await page.evaluate((line) => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    for (const [type, cell] of line) {
      if (world.place(type, cell, 0) !== 'placed') {
        throw new Error(`placement failed: ${type} at ${cell.x},${cell.y}`);
      }
    }
  }, PLACE_LAYOUT);
  const id = await page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    const piece = world?.pieces().find((p) => p.type === 'switch-3way');
    if (!piece) throw new Error('placed three-way piece missing');
    return piece.id;
  });
  return id;
}

const poseOf = (page: import('@playwright/test').Page, id: string) =>
  page.evaluate(
    (pieceId) =>
      (window as unknown as { __tinyTracksScene?: SceneHandle }).__tinyTracksScene?.switchPose(
        pieceId,
      ) ?? null,
    id,
  );

test('a placed three-way rides all three roads with its blades and lever following', async ({
  page,
}) => {
  test.setTimeout(240_000);
  const consoleErrors = watchConsoleErrors(page);
  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await boot(page);
  const id = await placeThreeWay(page);

  // The three-way's own GLB arrives only when one is placed (boot
  // precaches every piece GLB, so this asserts the authored asset is
  // among the fetches).
  await page.waitForFunction(() =>
    performance
      .getEntriesByType('resource')
      .some((entry) => entry.name.includes('switch-3way.glb')),
  );

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  // Sample the live pose while the ride cycles the roads. The solver takes
  // the stem entry straight (north) first, then the east and west branches
  // in turn; keep sampling until all three parked poses have been seen (the
  // CI software renderer runs the ride slower than a dev machine, so the
  // loop waits for the roads rather than assuming a fixed window).
  const bladeKeys = new Set<string>();
  const samples: { blade: number; lever: number | null }[] = [];
  for (let i = 0; i < 320; i += 1) {
    const pose = await poseOf(page, id);
    if (pose) {
      samples.push(pose);
      bladeKeys.add(pose.blade.toFixed(3));
    }
    if (bladeKeys.has('0.000') && bladeKeys.has('-0.210') && bladeKeys.has('0.210')) {
      break;
    }
    await page.waitForTimeout(400);
  }
  expect(samples.length).toBeGreaterThan(0);
  expect(bladeKeys.has('0.000')).toBe(true); // straight
  expect(bladeKeys.has('-0.210')).toBe(true); // east branch
  expect(bladeKeys.has('0.210')).toBe(true); // west branch

  // Blades and lever move together: each road must be witnessed with the
  // lever exactly on its paired angle (blade 0 -> lever 0, -0.21 -> -90
  // degrees, +0.21 -> +90 degrees). Samples where the blade merely crosses
  // a key mid-tween (the lever still swinging through) are ignored — both
  // nodes settle in the same frame, so a settled sighting is the contract.
  const pairedRoads = new Set<string>();
  for (const pose of samples) {
    expect(pose.lever).not.toBeNull();
    const lever = pose.lever ?? Number.NaN;
    const paired =
      Math.abs(pose.blade) < 1e-3
        ? Math.abs(lever) < 0.05
        : Math.abs(pose.blade + 0.21) < 1e-3
          ? Math.abs(lever + Math.PI / 2) < 0.05
          : Math.abs(pose.blade - 0.21) < 1e-3
            ? Math.abs(lever - Math.PI / 2) < 0.05
            : undefined;
    if (paired === true) {
      pairedRoads.add(pose.blade.toFixed(3));
    }
  }
  expect(pairedRoads.has('0.000')).toBe(true);
  expect(pairedRoads.has('-0.210')).toBe(true);
  expect(pairedRoads.has('0.210')).toBe(true);

  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  const a = await page.screenshot();
  await page.waitForTimeout(1200);
  const b = await page.screenshot();
  expect(Buffer.compare(a, b)).not.toBe(0);

  const fetched = requestUrls.filter((url) => url.includes('.glb'));
  expect(fetched.some((url) => url.includes('switch-3way.glb'))).toBe(true);

  const origin = new URL(page.url()).origin;
  const external = requestUrls.filter((url) => new URL(url).origin !== origin);
  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('reduced motion: the scene holds still and the points stay parked at neutral', async ({
  page,
}) => {
  test.setTimeout(180_000);
  const consoleErrors = watchConsoleErrors(page);
  // Applied before load: the scene samples the setting once at boot. Under
  // reduce the spin loop draws a single static frame (no animation at all),
  // so a switch can never flip — the contract here is that the piece stays
  // exactly at its parked neutral pose (never a partial angle) and the
  // console stays clean.
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await boot(page);
  const id = await placeThreeWay(page);
  await page.waitForFunction(() =>
    performance
      .getEntriesByType('resource')
      .some((entry) => entry.name.includes('switch-3way.glb')),
  );

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  // With the scene frozen, every sample stays exactly at the parked
  // neutral pose: blade closed (0) and lever pointing north (0).
  for (let i = 0; i < 12; i += 1) {
    const pose = await poseOf(page, id);
    expect(pose).not.toBeNull();
    expect(Math.abs(pose?.blade ?? 1)).toBeLessThan(1e-9);
    expect(Math.abs(pose?.lever ?? 1)).toBeLessThan(1e-9);
    await page.waitForTimeout(300);
  }

  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('a three-way layout survives a reload and re-parks at neutral', async ({ page }) => {
  const consoleErrors = watchConsoleErrors(page);

  await boot(page);
  await placeThreeWay(page);
  await page.waitForTimeout(800);

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  await page.waitForTimeout(5000);
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  // The world comes back with its three-way through the real autosave path.
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

  // Fresh GLBs re-import parked at neutral (the export-side park fix): the
  // reloaded piece must rest with blades closed and the lever pointing
  // north until the first pass flips it. The renderer re-attaches the piece
  // asynchronously (fresh GLB import), so poll until the probe sees it.
  const id = await page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    const piece = world?.pieces().find((p) => p.type === 'switch-3way');
    if (!piece) throw new Error('reloaded three-way piece missing');
    return piece.id;
  });
  await expect
    .poll(async () => (await poseOf(page, id)) !== null, {
      message: 'the reloaded three-way should re-enter the scene',
      timeout: 15_000,
    })
    .toBe(true);
  const pose = await poseOf(page, id);
  expect(pose).not.toBeNull();
  expect(Math.abs(pose?.blade ?? 1)).toBeLessThan(1e-6);
  expect(Math.abs(pose?.lever ?? 1)).toBeLessThan(1e-6);

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
