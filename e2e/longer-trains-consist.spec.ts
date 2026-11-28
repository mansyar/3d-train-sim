import { expect, type Page, test } from '@playwright/test';

import { clearMeadow, watchConsoleErrors } from './helpers';

/**
 * Scene-level proof for longer trains: wagons 3–4 spawn in their own outfits,
 * join the consist's path follow (both shuttle directions and across a switch),
 * and take part in the station cargo cycle exactly once per stop.
 *
 * The scene publishes a DEV-only consist witness in the shape of
 * `__tinyTracksLivery`; the assertions below read that witness, never a test
 * side guess about meshes. Before the scene change the witness is absent, so
 * every test fails at `waitForDressedConsist` — the TDD red gate.
 */

type Point = { x: number; y: number; z: number };

type WagonView = {
  preset: string | null;
  x: number;
  y: number;
  z: number;
  crateAttached: boolean;
  crateVisible: boolean;
};

type RigView = {
  kind: string;
  anchor: string;
  loco: Point;
  wagons: WagonView[];
};

type ConsistWitness = { rigs(): RigView[] };

type WorldHandle = {
  place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
  placeScenery: (kind: string, cell: { x: number; y: number }, rotation: number) => string;
  scenery: () => readonly { id: string; kind: string }[];
  setWagonCount: (train: string, count: number) => boolean;
  selectWagonOutfit: (train: string, index: number, preset: string) => boolean;
  selectConsist: (train: string, preset: string) => boolean;
  deliveryCount: (id: string) => number;
};

type SceneHandle = {
  ridingTrainCount: () => number;
  forceCargoStation: (stationId: string) => void;
  switchPose: (pieceId: string) => { blade: number; lever: number | null } | null;
};

type RideSample = {
  z: number;
  spacing: number[];
  spread: number;
  count: number;
  blade: number | null;
  riding: boolean;
};

const waitReady = (page: Page) =>
  page.waitForFunction(
    () => (window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady === true,
    undefined,
    { timeout: 30_000 },
  );

const boot = async (page: Page): Promise<void> => {
  await page.goto('/');
  await waitReady(page);
};

/** The DEV consist witness — null until the scene publishes it (the RED gate). */
const consistRigs = (page: Page): Promise<RigView[] | null> =>
  page.evaluate(() => {
    const witness = (window as unknown as { __tinyTracksConsist?: ConsistWitness })
      .__tinyTracksConsist;
    return witness ? witness.rigs() : null;
  });

/** Dress a mixed four-wagon consist through the real world handle. */
const dressMixedConsist = (page: Page): Promise<void> =>
  page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    world.selectConsist('steam', 'coal');
    world.setWagonCount('steam', 4);
    world.selectWagonOutfit('steam', 2, 'tank');
    world.selectWagonOutfit('steam', 3, 'container');
  });

/** Poll until one rig carries four dressed wagons, each with its own crate. */
const waitForDressedConsist = async (page: Page): Promise<RigView> => {
  await expect
    .poll(
      async () => {
        const rigs = await consistRigs(page);
        const rig = rigs?.find((item) => item.wagons.length === 4);
        return rig?.wagons.every((wagon) => wagon.crateAttached) === true;
      },
      { timeout: 25_000, intervals: [100] },
    )
    .toBe(true);
  const rig = (await consistRigs(page))?.find((item) => item.wagons.length === 4);
  if (!rig) throw new Error('dressed consist missing');
  return rig;
};

/** A long open line: a dead-end shuttle, with an optional Y switch mid-line. */
const buildLine = (page: Page, withSwitch: boolean): Promise<void> =>
  page.evaluate((hasSwitch) => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    for (let y = 1; y <= 6; y += 1) {
      const type = hasSwitch && y === 3 ? 'switch' : 'straight';
      if (world.place(type, { x: 2, y }, 0) !== 'placed') {
        throw new Error(`placement failed: ${type} at ${y}`);
      }
    }
  }, withSwitch);

/** A 2x2 corner loop with a station beside it — the cargo run. */
const buildCargoLoop = (page: Page): Promise<string> =>
  page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    for (const [x, y, rotation] of [
      [1, 7, 90],
      [2, 7, 180],
      [2, 8, 270],
      [1, 8, 0],
    ] as const) {
      if (world.place('corner', { x, y }, rotation) !== 'placed') {
        throw new Error(`corner placement failed at ${x},${y}`);
      }
    }
    if (world.placeScenery('station', { x: 3, y: 7 }, 0) !== 'placed') {
      throw new Error('station placement failed');
    }
    const station = world.scenery().find((item) => item.kind === 'station');
    if (!station) throw new Error('station missing');
    return station.id;
  });

/** One frame's consist geometry, read from the live rig (not the park). */
const sampleRide = (page: Page, switchId: string | null): Promise<RideSample | null> =>
  page.evaluate((id) => {
    const rigs = (
      window as unknown as { __tinyTracksConsist?: ConsistWitness }
    ).__tinyTracksConsist?.rigs();
    const rig = rigs?.find((item) => item.anchor !== '');
    if (!rig) return null;
    const spacing: number[] = [];
    for (let index = 1; index < rig.wagons.length; index += 1) {
      const a = rig.wagons[index - 1];
      const b = rig.wagons[index];
      if (a && b) spacing.push(Math.hypot(b.x - a.x, b.z - a.z));
    }
    const scene = (window as unknown as { __tinyTracksScene?: SceneHandle }).__tinyTracksScene;
    const toggle = document.querySelector<HTMLButtonElement>('.ride-toggle');
    let spread = 0;
    for (const wagon of rig.wagons) {
      const d = Math.hypot(wagon.x - rig.loco.x, wagon.z - rig.loco.z);
      if (d > spread) spread = d;
    }
    return {
      z: rig.loco.z,
      spacing,
      spread,
      count: rig.wagons.length,
      blade: id ? (scene?.switchPose(id)?.blade ?? null) : null,
      riding: toggle?.classList.contains('is-riding') ?? false,
    };
  }, switchId);

/** A straight run keeps every coupler at its ~4.2-unit path gap. */
const expectConsistent = (sample: RideSample): void => {
  expect(sample.count, 'no wagon is lost mid-ride').toBe(4);
  expect(sample.riding, 'a fail state would stop the ride').toBe(true);
  expect(sample.spacing).toHaveLength(3);
  for (const gap of sample.spacing) {
    expect(gap, 'couplers keep their spacing in both directions').toBeGreaterThan(3.4);
    expect(gap, 'couplers keep their spacing in both directions').toBeLessThan(5.1);
  }
};

/**
 * A solved switch cycle can be short enough that wrapped follower distances
 * coincide; the guarantee there is four ordered wagons, a live ride, and a
 * consist that stays with its engine — not a Euclidean coupler gap.
 */
const expectSwitchConsistent = (sample: RideSample): void => {
  expect(sample.count, 'no wagon is lost at the switch').toBe(4);
  expect(sample.riding, 'a fail state would stop the ride').toBe(true);
  expect(sample.spacing).toHaveLength(3);
  expect(
    sample.spacing.some((gap) => gap > 1),
    'the consist did not collapse',
  ).toBe(true);
  expect(sample.spread, 'wagons stayed with their engine').toBeLessThan(25);
};

test('wagons 3 and 4 spawn dressed in their own outfits with their own crates', async ({
  page,
}) => {
  const errors = watchConsoleErrors(page);
  await boot(page);
  await clearMeadow(page);
  await dressMixedConsist(page);

  const rig = await waitForDressedConsist(page);
  expect(rig.kind).toBe('steam');
  expect(rig.wagons.map((wagon) => wagon.preset)).toEqual(['coal', 'coal', 'tank', 'container']);
  expect(
    rig.wagons.every((wagon) => wagon.crateAttached),
    'cargo attaches to extras as well as the base pair',
  ).toBe(true);

  // Shortening via the world handle removes the extra wagons cleanly; the
  // witness must not leave ghost meshes or ghost crates behind.
  await page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    world?.setWagonCount('steam', 2);
  });
  await expect
    .poll(async () => (await consistRigs(page))?.find((item) => item.wagons.length === 2), {
      timeout: 15_000,
      intervals: [100],
    })
    .toBeTruthy();

  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
});

test('all four wagons load and deliver, and a stop counts exactly once', async ({ page }) => {
  test.setTimeout(150_000);
  // Reduced motion skips the crate arc, so two synchronous stops prove the
  // ledger and every wagon's crate state without a render-timing race.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = watchConsoleErrors(page);
  await boot(page);
  await clearMeadow(page);
  const stationId = await buildCargoLoop(page);
  await dressMixedConsist(page);
  const rig = await waitForDressedConsist(page);
  expect(rig.wagons).toHaveLength(4);

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  await expect
    .poll(
      async () =>
        page.evaluate(
          () =>
            (
              window as unknown as { __tinyTracksScene?: SceneHandle }
            ).__tinyTracksScene?.ridingTrainCount?.() ?? 0,
        ),
      { timeout: 25_000, intervals: [100] },
    )
    .toBeGreaterThanOrEqual(1);

  const before = await page.evaluate(
    (id) =>
      (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld?.deliveryCount(
        id,
      ) ?? 0,
    stationId,
  );
  const cycle = await page.evaluate((id) => {
    const scene = (window as unknown as { __tinyTracksScene?: SceneHandle }).__tinyTracksScene;
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    const witness = (window as unknown as { __tinyTracksConsist?: ConsistWitness })
      .__tinyTracksConsist;
    if (!scene || !world || !witness) throw new Error('dev witnesses missing');
    const visible = () =>
      witness
        .rigs()
        .find((item) => item.anchor !== '')
        ?.wagons.map((wagon) => wagon.crateVisible) ?? [];
    scene.forceCargoStation(id); // empty wagons load
    const loaded = visible();
    const afterLoad = world.deliveryCount(id);
    scene.forceCargoStation(id); // loaded wagons deliver
    const delivered = visible();
    return { loaded, delivered, afterLoad, afterDeliver: world.deliveryCount(id) };
  }, stationId);

  expect(cycle.loaded, 'crates ride on all four wagons after a load').toEqual([
    true,
    true,
    true,
    true,
  ]);
  expect(cycle.delivered, 'all four wagons deliver their crates').toEqual([
    false,
    false,
    false,
    false,
  ]);
  expect(cycle.afterLoad, 'a load stop counts nothing').toBe(before);
  expect(cycle.afterDeliver, 'one delivery stop counts once, not once per wagon').toBe(before + 1);

  await page.waitForTimeout(1500);
  const after = await page.evaluate(
    (id) =>
      (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld?.deliveryCount(
        id,
      ) ?? 0,
    stationId,
  );
  expect(after, 'no double delivery after the stop').toBe(before + 1);

  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
});

test('a four-wagon consist shuttles a dead end in both directions', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchConsoleErrors(page);
  await boot(page);
  await clearMeadow(page);
  await dressMixedConsist(page);
  await buildLine(page, false);
  await waitForDressedConsist(page);

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  const samples: RideSample[] = [];
  for (let poll = 0; poll < 60; poll += 1) {
    const sample = await sampleRide(page, null);
    if (sample) {
      expectConsistent(sample);
      samples.push(sample);
    }
    if (samples.length >= 3) {
      const signs = new Set<number>();
      for (let index = 1; index < samples.length; index += 1) {
        const current = samples[index];
        const previous = samples[index - 1];
        const delta = current && previous ? current.z - previous.z : 0;
        if (Math.abs(delta) > 0.05) signs.add(Math.sign(delta));
      }
      if (signs.size === 2) break; // reversed at the dead end and came back
    }
    await page.waitForTimeout(700);
  }

  expect(samples.length, 'the consist was witnessed riding').toBeGreaterThanOrEqual(3);
  const signs = new Set<number>();
  for (let index = 1; index < samples.length; index += 1) {
    const current = samples[index];
    const previous = samples[index - 1];
    const delta = current && previous ? current.z - previous.z : 0;
    if (Math.abs(delta) > 0.05) signs.add(Math.sign(delta));
  }
  expect(signs, 'the engine shuttled both ways down the dead end').toEqual(new Set([-1, 1]));
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
});

test('a four-wagon consist straddles a switch without a fail state', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchConsoleErrors(page);
  await boot(page);
  await clearMeadow(page);
  await dressMixedConsist(page);
  await buildLine(page, true);
  await waitForDressedConsist(page);
  const switchId = await page.evaluate(() => {
    const world = (
      window as unknown as {
        __tinyTracksWorld?: { pieces: () => readonly { id: string; type: string }[] };
      }
    ).__tinyTracksWorld;
    return world?.pieces().find((piece) => piece.type === 'switch')?.id ?? null;
  });
  expect(switchId, 'the switch entered the scene').not.toBeNull();

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  let sawBlade = false;
  let samples = 0;
  for (let poll = 0; poll < 60; poll += 1) {
    const sample = await sampleRide(page, switchId);
    if (sample) {
      expectSwitchConsistent(sample);
      samples += 1;
      if (sample.blade !== null && Math.abs(sample.blade) > 0.1) sawBlade = true;
    }
    if (sawBlade && samples >= 6) break;
    await page.waitForTimeout(600);
  }

  expect(samples, 'the consist was witnessed across the switch').toBeGreaterThanOrEqual(6);
  expect(sawBlade, 'the resolved switch road moved while the consist rode over it').toBe(true);
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
});
