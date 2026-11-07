import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { clearMeadow, watchConsoleErrors } from './helpers';

/**
 * Switch smoke, merged into one file: every switch kind (Y, mirrored Y,
 * three-way, double slip) rides every road with its point blades and signal
 * lever following, a layout re-parks at neutral after a reload, and reduced
 * motion never leaves a partial angle.
 *
 * Routing itself is proven at the unit level (switches cycle
 * straight/right/left; pathing and ride-motion lock the three-road walks and
 * announcements); these tests witness that each authored GLB mounts flush,
 * rides every road cleanly, keeps blades and lever paired, and holds the
 * scene's single-static-frame contract under prefers-reduced-motion.
 */

type Edge = 'north' | 'east' | 'south' | 'west';

type WorldHandle = {
  place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
  pieces: () => readonly { id: string; type: string }[];
};

type SceneHandle = {
  switchPose: (pieceId: string, entry?: Edge) => { blade: number; lever: number | null } | null;
};

type Pose = { blade: number; lever: number | null };

/** Mirrors the renderer's slip pose tables (spec copy, kept in sync). */
const SLIP_BLADES: Record<Edge, Partial<Record<Edge, number>>> = {
  south: { north: 0, east: -0.21, west: 0.21 },
  north: { south: 0, west: -0.21, east: 0.21 },
  east: { west: 0, north: -0.21, south: 0.21 },
  west: { east: 0, south: -0.21, north: 0.21 },
};
const SLIP_LEVERS: Record<Edge, number> = {
  north: 0,
  east: -Math.PI / 2,
  south: Math.PI,
  west: Math.PI / 2,
};

const ENTRIES: Edge[] = ['north', 'east', 'south', 'west'];

const Y_LAYOUT: [string, { x: number; y: number }][] = [
  ['straight', { x: 2, y: 1 }],
  ['switch', { x: 2, y: 2 }],
  ['straight', { x: 2, y: 3 }],
];

const MIRRORED_Y_LAYOUT: [string, { x: number; y: number }][] = [
  ['straight', { x: 2, y: 1 }],
  ['switch-mirror', { x: 2, y: 2 }],
  ['straight', { x: 2, y: 3 }],
];

const THREE_WAY_LAYOUT: [string, { x: number; y: number }][] = [
  ['straight', { x: 2, y: 1 }],
  ['switch-3way', { x: 2, y: 2 }],
  ['straight', { x: 2, y: 3 }],
];

const SLIP_LAYOUT: [string, { x: number; y: number }][] = [['switch-slip', { x: 2, y: 2 }]];

const waitReady = (page: Page) =>
  page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );

const boot = async (page: Page): Promise<void> => {
  await page.goto('/');
  await waitReady(page);
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

const pieceId = (page: Page, type: string) =>
  page.evaluate((kind) => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    const piece = world?.pieces().find((p) => p.type === kind);
    if (!piece) throw new Error(`placed ${kind} piece missing`);
    return piece.id;
  }, type);

const pieceCount = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld?.pieces()
        .length ?? 0,
  );

const poseOf = (page: Page, id: string, entry?: Edge) =>
  page.evaluate(
    ([pieceId, from]) =>
      (window as unknown as { __tinyTracksScene?: SceneHandle }).__tinyTracksScene?.switchPose(
        pieceId,
        from,
      ) ?? null,
    [id, entry] as const,
  );

const waitForGlb = (page: Page, asset: string) =>
  page.waitForFunction(
    (name) => performance.getEntriesByType('resource').some((entry) => entry.name.includes(name)),
    asset,
  );

const startRide = async (page: Page): Promise<void> => {
  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
};

const stopRide = async (page: Page): Promise<void> => {
  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).not.toHaveClass(/is-riding/);
};

const expectSceneChanging = async (page: Page): Promise<void> => {
  const a = await page.screenshot();
  await page.waitForTimeout(1200);
  const b = await page.screenshot();
  expect(Buffer.compare(a, b)).not.toBe(0);
};

const expectLocalAndClean = (page: Page, consoleErrors: string[], requestUrls: string[]): void => {
  const origin = new URL(page.url()).origin;
  const external = requestUrls.filter((url) => new URL(url).origin !== origin);
  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
};

test('every switch kind rides every road', async ({ page }) => {
  test.setTimeout(600_000);
  const consoleErrors = watchConsoleErrors(page);
  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await test.step('boot the meadow', async () => {
    await boot(page);
  });

  await test.step('place a plain straight line (the no-switch control)', async () => {
    await clearMeadow(page);
    await placeLine(page, [
      ['straight', { x: 2, y: 1 }],
      ['straight', { x: 2, y: 2 }],
      ['straight', { x: 2, y: 3 }],
    ]);
    await startRide(page);
    await page.waitForTimeout(6000);
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
    await expectSceneChanging(page);
    expectLocalAndClean(page, consoleErrors, requestUrls);
    await stopRide(page);
  });

  await test.step('place a Y switch', async () => {
    await clearMeadow(page);
    await placeLine(page, Y_LAYOUT);
    // The switch's own GLB arrives only when a switch is placed.
    await waitForGlb(page, 'switch.glb');
  });

  await test.step('ride both Y roads with the blades and lever following', async () => {
    const id = await pieceId(page, 'switch');
    // Before: a fresh GLB is parked at neutral (blades closed, lever north).
    const parked = await poseOf(page, id);
    expect(parked, 'the placed Y switch should enter the scene').not.toBeNull();
    expect(Math.abs(parked?.blade ?? 1)).toBeLessThan(1e-6);
    expect(Math.abs(parked?.lever ?? 1)).toBeLessThan(1e-6);

    await startRide(page);
    // Sample the live pose while the ride alternates the roads: the blade
    // sits exactly on a road value and the lever exactly on its paired angle.
    const samples: Pose[] = [];
    const roadsSeen = new Set<string>();
    const roads = [
      { key: '0.000', blade: 0, lever: 0 },
      { key: '-0.210', blade: -0.21, lever: -Math.PI / 2 },
    ];
    for (let i = 0; i < 320; i += 1) {
      const pose = await poseOf(page, id);
      if (pose) {
        samples.push(pose);
        for (const road of roads) {
          if (
            Math.abs(pose.blade - road.blade) < 1e-3 &&
            pose.lever !== null &&
            Math.abs(pose.lever - road.lever) < 0.05
          ) {
            roadsSeen.add(road.key);
          }
        }
      }
      if (roadsSeen.size === roads.length) break;
      await page.waitForTimeout(400);
    }
    expect(samples.length).toBeGreaterThan(0);
    for (const pose of samples) expect(pose.lever).not.toBeNull();
    expect(roadsSeen.has('0.000')).toBe(true); // straight
    expect(roadsSeen.has('-0.210')).toBe(true); // east branch

    // After: the points left the parked neutral pose — the bladed parts and
    // the lever really moved, rather than a pose merely existing.
    expect(samples.some((pose) => Math.abs(pose.blade) > 0.1)).toBe(true);

    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
    await expectSceneChanging(page);

    const fetched = requestUrls.filter((url) => url.includes('.glb'));
    expect(fetched.some((url) => url.includes('switch.glb'))).toBe(true);
    expectLocalAndClean(page, consoleErrors, requestUrls);
    await stopRide(page);
  });

  await test.step('place a mirrored Y switch', async () => {
    await clearMeadow(page);
    await placeLine(page, MIRRORED_Y_LAYOUT);
    await waitForGlb(page, 'switch-mirror.glb');
  });

  await test.step('ride both mirrored Y roads with the blades and lever following', async () => {
    const id = await pieceId(page, 'switch-mirror');
    const parked = await poseOf(page, id);
    expect(parked, 'the placed mirror switch should enter the scene').not.toBeNull();
    expect(Math.abs(parked?.blade ?? 1)).toBeLessThan(1e-6);
    expect(Math.abs(parked?.lever ?? 1)).toBeLessThan(1e-6);

    await startRide(page);
    const samples: Pose[] = [];
    const roadsSeen = new Set<string>();
    const roads = [
      { key: '0.000', blade: 0, lever: 0 },
      { key: '0.210', blade: 0.21, lever: Math.PI / 2 },
    ];
    for (let i = 0; i < 320; i += 1) {
      const pose = await poseOf(page, id);
      if (pose) {
        samples.push(pose);
        for (const road of roads) {
          if (
            Math.abs(pose.blade - road.blade) < 1e-3 &&
            pose.lever !== null &&
            Math.abs(pose.lever - road.lever) < 0.05
          ) {
            roadsSeen.add(road.key);
          }
        }
      }
      if (roadsSeen.size === roads.length) break;
      await page.waitForTimeout(400);
    }
    expect(samples.length).toBeGreaterThan(0);
    for (const pose of samples) expect(pose.lever).not.toBeNull();
    expect(roadsSeen.has('0.000')).toBe(true); // straight
    expect(roadsSeen.has('0.210')).toBe(true); // west branch

    expect(samples.some((pose) => Math.abs(pose.blade) > 0.1)).toBe(true);

    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
    await expectSceneChanging(page);

    const fetched = requestUrls.filter((url) => url.includes('.glb'));
    expect(fetched.some((url) => url.includes('switch-mirror.glb'))).toBe(true);
    expectLocalAndClean(page, consoleErrors, requestUrls);
    await stopRide(page);
  });

  await test.step('place a three-way switch', async () => {
    await clearMeadow(page);
    await placeLine(page, THREE_WAY_LAYOUT);
    await waitForGlb(page, 'switch-3way.glb');
  });

  await test.step('ride all three roads with the blades and lever following', async () => {
    const id = await pieceId(page, 'switch-3way');
    const parked = await poseOf(page, id);
    expect(parked, 'the placed three-way should enter the scene').not.toBeNull();
    expect(Math.abs(parked?.blade ?? 1)).toBeLessThan(1e-6);
    expect(Math.abs(parked?.lever ?? 1)).toBeLessThan(1e-6);

    await startRide(page);
    // The solver takes the stem entry straight (north) first, then the east
    // and west branches in turn; keep sampling until all three parked poses
    // have been seen (the CI software renderer runs the ride slower than a
    // dev machine, so the loop waits for the roads rather than assuming a
    // fixed window).
    const bladeKeys = new Set<string>();
    const samples: Pose[] = [];
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

    // After: every one of the three roads differs from the parked neutral
    // pose the piece entered the scene with.
    expect(samples.some((pose) => Math.abs(pose.blade) > 0.1)).toBe(true);

    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
    await expectSceneChanging(page);

    const fetched = requestUrls.filter((url) => url.includes('.glb'));
    expect(fetched.some((url) => url.includes('switch-3way.glb'))).toBe(true);
    expectLocalAndClean(page, consoleErrors, requestUrls);
    await stopRide(page);
  });

  await test.step('place a double slip', async () => {
    await clearMeadow(page);
    await placeLine(page, SLIP_LAYOUT);
    await waitForGlb(page, 'switch-slip.glb');
  });

  await test.step('ride all three slip roads with the entry blades and lever following', async () => {
    const id = await pieceId(page, 'switch-slip');

    // The renderer attaches the placed piece asynchronously (fresh GLB
    // import), so poll until the probe sees it before probing groups.
    await expect
      .poll(async () => (await poseOf(page, id)) !== null, {
        message: 'the placed double slip should enter the scene',
        timeout: 15_000,
      })
      .toBe(true);

    // Every entry edge hosts a blade group the probe can read, and a fresh
    // GLB is parked neutral on all of them.
    for (const entry of ENTRIES) {
      const pose = await poseOf(page, id, entry);
      expect(pose, `no blade group for entry ${entry}`).not.toBeNull();
      expect(Math.abs(pose?.blade ?? 1)).toBeLessThan(1e-6); // parked neutral
    }

    await startRide(page);

    // Sample EVERY entry's blade group while the ride cycles the roads. The
    // lone slip walks its closed six-step cycle, so each entry recurs with
    // rotating counter phases and every entry's blades take more than one
    // road in turn. The lever is one global node while the blades are
    // per-entry groups, so only a SETTLED sighting of the just-announced
    // entry pairs blade and lever: the blade sits exactly on a table value,
    // the lever exactly on a road angle, and the two agree on the road
    // (mid-tween crossings and stale groups are skipped, as in the 3-way
    // test). The ride must witness all three roads somewhere across the
    // groups: blade closed (0) for a straight-through, ±0.21 for the two
    // diagonals, with the lever at 0, -90°, +90° respectively.
    const bladeKeys = new Set<string>();
    const pairedRoads = new Set<string>();
    let samples = 0;
    for (let i = 0; i < 320 && (bladeKeys.size < 3 || pairedRoads.size < 3); i += 1) {
      for (const entry of ENTRIES) {
        const pose = await poseOf(page, id, entry);
        if (!pose || pose.lever === null) continue;
        const lever = pose.lever;
        // Only settled, road-paired sightings count: mid-tween blades would
        // otherwise fake a third key and end the loop early.
        const road = (Object.entries(SLIP_BLADES[entry]) as [Edge, number][]).find(
          ([road, blade]) =>
            Math.abs(blade - pose.blade) < 1e-3 && Math.abs(SLIP_LEVERS[road] - lever) < 0.02,
        );
        if (!road) continue;
        const [roadName, canonicalBlade] = road;
        samples += 1;
        // Record the road's canonical blade value: the last witnessed tween
        // frame can land one RAF step short (-0.209), and a raw toFixed would
        // then never match the exact '-0.210' key below.
        bladeKeys.add(canonicalBlade.toFixed(3));
        pairedRoads.add(SLIP_LEVERS[roadName].toFixed(3));
      }
      await page.waitForTimeout(400);
    }
    expect(samples).toBeGreaterThan(0);
    const missingBlades = ['0.000', '-0.210', '0.210'].filter((key) => !bladeKeys.has(key));
    const missingRoads = ['0.000', '-1.571', '1.571'].filter((key) => !pairedRoads.has(key));
    if (missingBlades.length > 0 || missingRoads.length > 0) {
      throw new Error(
        `missing blades: ${missingBlades.join(', ')}; missing roads: ${missingRoads.join(', ')}; ` +
          `seen blades: ${[...bladeKeys].join(', ')}; seen roads: ${[...pairedRoads].join(', ')}`,
      );
    }

    // After: the entry blades left neutral and the lever moved with them.
    expect(bladeKeys.has('-0.210') || bladeKeys.has('0.210')).toBe(true);

    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
    await expectSceneChanging(page);

    const fetched = requestUrls.filter((url) => url.includes('.glb'));
    expect(fetched.some((url) => url.includes('switch-slip.glb'))).toBe(true);
    expectLocalAndClean(page, consoleErrors, requestUrls);
  });
});

test('a switch layout re-parks at neutral after a reload', async ({ page }) => {
  test.setTimeout(300_000);
  const consoleErrors = watchConsoleErrors(page);

  await test.step('boot the meadow', async () => {
    await boot(page);
  });

  await test.step('reload a Y switch layout', async () => {
    await clearMeadow(page);
    await placeLine(page, Y_LAYOUT);
    await page.waitForTimeout(800);

    await startRide(page);
    await page.waitForTimeout(5000);
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

    // The world comes back with its switch through the real autosave path.
    await page.reload();
    await waitReady(page);
    expect(await pieceCount(page)).toBe(3);

    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });

  await test.step('reload a mirrored Y layout', async () => {
    await clearMeadow(page);
    await placeLine(page, MIRRORED_Y_LAYOUT);
    await page.waitForTimeout(800);

    await startRide(page);
    await page.waitForTimeout(5000);
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

    // The world comes back with its mirror switch through the real autosave path.
    await page.reload();
    await waitReady(page);
    expect(await pieceCount(page)).toBe(3);

    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });

  await test.step('reload a three-way and re-park it at neutral', async () => {
    await clearMeadow(page);
    await placeLine(page, THREE_WAY_LAYOUT);
    await page.waitForTimeout(800);

    await startRide(page);
    await page.waitForTimeout(5000);
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

    // The world comes back with its three-way through the real autosave path.
    await page.reload();
    await waitReady(page);
    expect(await pieceCount(page)).toBe(3);

    // Fresh GLBs re-import parked at neutral (the export-side park fix): the
    // reloaded piece must rest with blades closed and the lever pointing
    // north until the first pass flips it. The renderer re-attaches the piece
    // asynchronously (fresh GLB import), so poll until the probe sees it.
    const id = await pieceId(page, 'switch-3way');
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

  await test.step('reload a double slip and re-park it at neutral', async () => {
    await clearMeadow(page);
    await placeLine(page, SLIP_LAYOUT);
    await page.waitForTimeout(800);

    await startRide(page);
    await page.waitForTimeout(5000);
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

    // The world comes back with its double slip through the real autosave
    // path (the piece kind is additive — no snapshot version bump).
    await page.reload();
    await waitReady(page);
    expect(await pieceCount(page)).toBe(1);

    // Fresh GLBs re-import parked at neutral: the reloaded piece must rest
    // with blades closed and the lever pointing north until the first pass
    // flips it (routing counters are session-only and restart at 0). The
    // renderer re-attaches the piece asynchronously, so poll until the
    // probe sees it.
    const id = await pieceId(page, 'switch-slip');
    await expect
      .poll(async () => (await poseOf(page, id)) !== null, {
        message: 'the reloaded double slip should re-enter the scene',
        timeout: 15_000,
      })
      .toBe(true);
    const pose = await poseOf(page, id);
    expect(pose).not.toBeNull();
    expect(Math.abs(pose?.blade ?? 1)).toBeLessThan(1e-6);
    expect(Math.abs(pose?.lever ?? 1)).toBeLessThan(1e-6);

    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });
});

test('a switch under reduced motion still selects the road', async ({ page }) => {
  test.setTimeout(360_000);
  const consoleErrors = watchConsoleErrors(page);
  // Applied before load: the scene samples the setting once at boot.
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await test.step('boot the meadow under reduced motion', async () => {
    await boot(page);
  });

  await test.step('place a three-way and hold it at the parked neutral pose', async () => {
    await clearMeadow(page);
    await placeLine(page, THREE_WAY_LAYOUT);
    await waitForGlb(page, 'switch-3way.glb');
    const id = await pieceId(page, 'switch-3way');

    await startRide(page);

    // Under reduce the spin loop draws a single static frame (no animation at
    // all), so a switch can never flip — the contract here is that the piece
    // stays exactly at its parked neutral pose (never a partial angle) and
    // the console stays clean.
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

  await test.step('place a double slip under the same frozen scene', async () => {
    // The ride logic still advances and announces, and a switch pose change
    // must SNAP (never tween) under reduce — rebuild on the same page.
    await stopRide(page);
    await clearMeadow(page);
    await placeLine(page, SLIP_LAYOUT);
    await waitForGlb(page, 'switch-slip.glb');
  });

  await test.step('every slip entry sits exactly on a pose-table value', async () => {
    const id = await pieceId(page, 'switch-slip');
    await startRide(page);

    // Poll until the probe sees the attached piece, then hold the contract:
    // every sighting sits exactly on a pose-table value (never a partial
    // angle) and the console stays clean.
    await expect
      .poll(async () => (await poseOf(page, id)) !== null, {
        message: 'the placed double slip should enter the scene',
        timeout: 15_000,
      })
      .toBe(true);

    for (let i = 0; i < 12; i += 1) {
      for (const entry of ENTRIES) {
        const pose = await poseOf(page, id, entry);
        expect(pose, `no blade group for entry ${entry}`).not.toBeNull();
        const blade = pose?.blade ?? Number.NaN;
        const lever = pose?.lever ?? Number.NaN;
        expect(
          Object.values(SLIP_BLADES[entry]).some((value) => Math.abs(value - blade) < 1e-9),
          `partial blade angle at entry ${entry}: ${blade}`,
        ).toBe(true);
        expect(
          [0, -Math.PI / 2, Math.PI / 2, Math.PI].some((value) => Math.abs(value - lever) < 1e-9),
          `partial lever angle: ${lever}`,
        ).toBe(true);
      }
      await page.waitForTimeout(300);
    }

    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });
});
