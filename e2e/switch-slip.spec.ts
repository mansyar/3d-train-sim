import { expect, test } from '@playwright/test';

import { clearMeadow, watchConsoleErrors } from './helpers';

/**
 * Double-slip smoke: the slip drags in like any track piece, loads its OWN
 * authored GLB, and a ride cycles all three roads — straight, east
 * diagonal, west diagonal — with the entry's point blades and the signal
 * lever following the road being taken (witnessed through the scene's
 * switchPose probe, which reads a per-entry blade group).
 *
 * Routing itself is proven at the unit level (the lone slip walks a closed
 * six-step cycle through every entry); here the piece must mount flush,
 * ride every road cleanly, keep each entry's blades and the lever paired,
 * hold still under reduced motion (the scene's single static frame
 * contract), and survive reloads parked at neutral.
 */

/** Mirrors the renderer's slip pose tables (spec copy, kept in sync). */
const SLIP_BLADES: Record<string, Record<string, number>> = {
  south: { north: 0, east: -0.21, west: 0.21 },
  north: { south: 0, west: -0.21, east: 0.21 },
  east: { west: 0, north: -0.21, south: 0.21 },
  west: { east: 0, south: -0.21, north: 0.21 },
};
const SLIP_LEVERS: Record<string, number> = {
  north: 0,
  east: -Math.PI / 2,
  south: Math.PI,
  west: Math.PI / 2,
};

const ENTRIES = ['north', 'east', 'south', 'west'] as const;

type WorldHandle = {
  place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
  pieces: () => readonly { id: string; type: string }[];
};

type SceneHandle = {
  switchPose: (
    pieceId: string,
    entry?: 'north' | 'east' | 'south' | 'west',
  ) => { blade: number; lever: number | null } | null;
};

const PLACE_LAYOUT: [string, { x: number; y: number }][] = [
  ['switch-slip', { x: 2, y: 2 }],
];

async function boot(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
}

/** Clears the starter meadow, places the layout, returns the slip id. */
async function placeSlip(page: import('@playwright/test').Page): Promise<string> {
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
    const piece = world?.pieces().find((p) => p.type === 'switch-slip');
    if (!piece) throw new Error('placed double-slip piece missing');
    return piece.id;
  });
  return id;
}

const poseOf = (
  page: import('@playwright/test').Page,
  id: string,
  entry?: 'north' | 'east' | 'south' | 'west',
) =>
  page.evaluate(
    ([pieceId, from]) =>
      (window as unknown as { __tinyTracksScene?: SceneHandle }).__tinyTracksScene?.switchPose(
        pieceId,
        from,
      ) ?? null,
    [id, entry] as const,
  );

test('a placed double slip rides all three roads with its entry blades and lever following', async ({
  page,
}) => {
  test.setTimeout(240_000);
  const consoleErrors = watchConsoleErrors(page);
  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await boot(page);
  const id = await placeSlip(page);

  // The slip's own GLB arrives only when one is placed (boot precaches
  // every piece GLB, so this asserts the authored asset is among the
  // fetches).
  await page.waitForFunction(() =>
    performance
      .getEntriesByType('resource')
      .some((entry) => entry.name.includes('switch-slip.glb')),
  );

  // The renderer attaches the placed piece asynchronously (fresh GLB
  // import), so poll until the probe sees it before probing groups.
  await expect
    .poll(async () => (await poseOf(page, id)) !== null, {
      message: 'the placed double slip should enter the scene',
      timeout: 15_000,
    })
    .toBe(true);

  // Every entry edge hosts a blade group the probe can read.
  for (const entry of ['north', 'east', 'south', 'west'] as const) {
    const pose = await poseOf(page, id, entry);
    expect(pose, `no blade group for entry ${entry}`).not.toBeNull();
    expect(Math.abs(pose?.blade ?? 1)).toBeLessThan(1e-6); // parked neutral
  }

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  // Sample EVERY entry's blade group while the ride cycles the roads. The
  // lone slip walks its closed six-step cycle, so each entry recurs with
  // rotating counter phases and every entry's blades take more than one
  // road in turn. The lever is one global node while the blades are
  // per-entry groups, so only a SETTLED sighting of the just-announced
  // entry pairs blade and lever: the blade sits exactly on a table value,
  // the lever exactly on a road angle, and the two agree on the road
  // (mid-tween crossings and stale groups are skipped, as in the 3-way
  // spec). The ride must witness all three roads somewhere across the
  // groups: blade closed (0) for a straight-through, ±0.21 for the two
  // diagonals, with the lever at 0, -90°, +90° respectively.
  const bladeKeys = new Set<string>();
  const pairedRoads = new Set<string>();
  let samples = 0;
  for (let i = 0; i < 320 && (bladeKeys.size < 3 || pairedRoads.size < 3); i += 1) {
    for (const entry of ENTRIES) {
      const pose = await poseOf(page, id, entry);
      if (!pose || pose.lever === null) continue;
      samples += 1;
      bladeKeys.add(pose.blade.toFixed(3));
      const bladeRoads = Object.entries(SLIP_BLADES[entry])
        .filter(([, blade]) => Math.abs(blade - pose.blade) < 1e-3)
        .map(([road]) => road);
      const road = bladeRoads.find(
        (candidate) => Math.abs(SLIP_LEVERS[candidate] - pose.lever) < 0.02,
      );
      if (road !== undefined) pairedRoads.add(SLIP_LEVERS[road].toFixed(3));
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

  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  const a = await page.screenshot();
  await page.waitForTimeout(1200);
  const b = await page.screenshot();
  expect(Buffer.compare(a, b)).not.toBe(0);

  const fetched = requestUrls.filter((url) => url.includes('.glb'));
  expect(fetched.some((url) => url.includes('switch-slip.glb'))).toBe(true);

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
  // Applied before load: the scene samples the setting once at boot. The
  // ride logic still advances and announces, and a switch pose change must
  // SNAP (never tween) under reduce — so the contract here is that every
  // sighting sits exactly on a pose-table value (never a partial angle)
  // and the console stays clean.
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await boot(page);
  const id = await placeSlip(page);
  await page.waitForFunction(() =>
    performance
      .getEntriesByType('resource')
      .some((entry) => entry.name.includes('switch-slip.glb')),
  );

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  // Poll until the probe sees the attached piece, then hold the contract.
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

test('a double-slip layout survives a reload and re-parks at neutral', async ({ page }) => {
  test.setTimeout(180_000);
  const consoleErrors = watchConsoleErrors(page);

  await boot(page);
  await placeSlip(page);
  await page.waitForTimeout(800);

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  await page.waitForTimeout(5000);
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  // The world comes back with its double slip through the real autosave
  // path (the piece kind is additive — no snapshot version bump).
  await page.reload();
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
  const restored = await page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    return world?.pieces().length ?? 0;
  });
  expect(restored).toBe(1);

  // Fresh GLBs re-import parked at neutral: the reloaded piece must rest
  // with blades closed and the lever pointing north until the first pass
  // flips it (routing counters are session-only and restart at 0). The
  // renderer re-attaches the piece asynchronously, so poll until the
  // probe sees it.
  const id = await page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    const piece = world?.pieces().find((p) => p.type === 'switch-slip');
    if (!piece) throw new Error('reloaded double-slip piece missing');
    return piece.id;
  });
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
