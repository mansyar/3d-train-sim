import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  clearMeadow,
  formatSlipFailure,
  missingSlipKeys,
  type SlipFrameSource,
  type SlipRoadTables,
  sampleSlipFixedWindow,
  sampleSlipRoads,
  watchConsoleErrors,
} from './helpers';

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

/** Spec copy of the slip tables in the shape the shared sampler consumes. */
const SLIP_TABLES: SlipRoadTables = {
  entries: ENTRIES,
  bladeTable: SLIP_BLADES,
  leverTable: SLIP_LEVERS,
  requiredBlades: ['0.000', '-0.210', '0.210'],
  requiredRoads: ['0.000', '-1.571', '1.571'],
  bladeTolerance: 1e-3,
  leverTolerance: 0.02,
};

// Sampling is driven by rendered frames with a wall-clock safety backstop —
// never a fixed 320 x 400 ms wall-clock window (the v0.14.0 CI failure).
const SLIP_MAX_FRAMES = 2000;
const SLIP_SAFETY_MS = 240_000;

type FrameProbe = { frameSystems: () => Array<{ name: string; ticks: number }> };

/** Frame counter from the frame-runner probe: 'fleet' ticks once per frame. */
const frameCount = (page: Page) =>
  page.evaluate(() => {
    const scene = (window as unknown as { __tinyTracksScene?: FrameProbe }).__tinyTracksScene;
    return scene?.frameSystems().find((system) => system.name === 'fleet')?.ticks ?? 0;
  });

const waitForNextFrame = (page: Page, after: number, timeout: number) =>
  page.waitForFunction(
    (previous) => {
      const scene = (window as unknown as { __tinyTracksScene?: FrameProbe }).__tinyTracksScene;
      return (
        (scene?.frameSystems().find((system) => system.name === 'fleet')?.ticks ?? 0) > previous
      );
    },
    after,
    { polling: 'raf', timeout },
  );

/** Reads every entry pose once per rendered frame, driving the live sampler. */
const makeSlipFrameSource = (page: Page, id: string): SlipFrameSource => {
  let previous = -1;
  return async () => {
    if (previous < 0) previous = await frameCount(page);
    // A renderer that stops producing frames ends sampling through our own
    // bounded timeout rather than a raw Playwright error, so the diagnostic
    // still carries the frame count.
    await waitForNextFrame(page, previous, SLIP_SAFETY_MS).catch(() => undefined);
    const current = await frameCount(page);
    if (current <= previous) return null;
    previous = current;
    const poses: Array<Pose | null> = [];
    for (const entry of ENTRIES) poses.push(await poseOf(page, id, entry));
    return poses;
  };
};

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

    // Sample once per rendered frame (tracked by the frame-runner tick probe)
    // until every blade and lever key is witnessed. The budget is a frame
    // count plus a wall-clock safety backstop, not a fixed 320 x 400 ms window,
    // so a slow software renderer cannot expire the wait before the east road
    // cycles around (FR-1, AC-1). Only settled, road-paired sightings count —
    // the exact rule the old inline loop used — so mid-tween blades cannot
    // fake a third key and end sampling early.
    const outcome = await sampleSlipRoads(makeSlipFrameSource(page, id), SLIP_TABLES, {
      maxFrames: SLIP_MAX_FRAMES,
      safetyMs: SLIP_SAFETY_MS,
    });
    const { sightings } = outcome;
    const { missingBlades, missingRoads } = missingSlipKeys(sightings, SLIP_TABLES);
    if (sightings.samples === 0 || missingBlades.length > 0 || missingRoads.length > 0) {
      throw new Error(formatSlipFailure(outcome, SLIP_TABLES));
    }

    // After: the entry blades left neutral and the lever moved with them.
    expect(sightings.bladeKeys.has('-0.210') || sightings.bladeKeys.has('0.210')).toBe(true);

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

/**
 * Regression for the release `44475228404` tablet failure (FR-2, AC-2).
 *
 * A deterministic slow-renderer pose sequence shows the straight and west
 * roads from frame 0, but the east road (lever -pi/2) only from frame 360 —
 * past the old 320-poll wall-clock window, well inside a frame-driven budget.
 * Both samplers consume the same frame source through the shared recognition
 * logic, so the assertion proves the sampling strategy is the fix rather than
 * restating the desired outcome. This test stays active: it fails the moment
 * either sampler diverges from its contract.
 */
test('frame-aware slip sampling sees a road the fixed window misses', async () => {
  const eastAtFrame = 360;
  const totalFrames = 480;
  const witness: Edge = 'south';

  // A fresh source per run: the frame index is mutable state, and each sampler
  // must see the identical sequence from frame 0.
  const makeSlowFrames = (): SlipFrameSource => {
    let index = 0;
    return async () => {
      if (index >= totalFrames) return null;
      const frame = index;
      index += 1;
      const cycle: Edge[] = frame < eastAtFrame ? ['north', 'west'] : ['north', 'west', 'east'];
      const road = cycle[frame % cycle.length];
      if (!road) return null;
      return ENTRIES.map((entry) =>
        entry === witness
          ? { blade: SLIP_BLADES[entry][road] ?? 0, lever: SLIP_LEVERS[road] }
          : { blade: 0, lever: 0 },
      );
    };
  };

  const oldOutcome = await sampleSlipFixedWindow(makeSlowFrames(), SLIP_TABLES, 320);
  const oldMissing = missingSlipKeys(oldOutcome.sightings, SLIP_TABLES);
  const before = formatSlipFailure(oldOutcome, SLIP_TABLES);
  console.log(`[slip-regression] before: ${before}`);
  expect(oldOutcome.sightings.complete, 'the fixed window must miss the east road').toBe(false);
  expect(oldMissing, 'the fixed window misses exactly the east road').toEqual({
    missingBlades: ['-0.210'],
    missingRoads: ['-1.571'],
  });

  const newOutcome = await sampleSlipRoads(makeSlowFrames(), SLIP_TABLES, {
    maxFrames: SLIP_MAX_FRAMES,
    safetyMs: SLIP_SAFETY_MS,
  });
  const after = newOutcome.sightings.complete
    ? `all keys seen: blades ${[...newOutcome.sightings.bladeKeys].join(', ')}; ` +
      `roads ${[...newOutcome.sightings.roadKeys].join(', ')}; ` +
      `frames sampled: ${newOutcome.sightings.frames}; elapsed ms: ${newOutcome.elapsedMs}`
    : formatSlipFailure(newOutcome, SLIP_TABLES);
  console.log(`[slip-regression] after: ${after}`);
  expect(newOutcome.sightings.complete, 'frame-aware sampling must witness every road').toBe(true);
  expect(newOutcome.timedOut).toBe(false);
  expect(newOutcome.sightings.frames).toBeGreaterThan(eastAtFrame);
  expect(missingSlipKeys(newOutcome.sightings, SLIP_TABLES)).toEqual({
    missingBlades: [],
    missingRoads: [],
  });
});
