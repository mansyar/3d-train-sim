import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import { expect, type Page, test } from '@playwright/test';

import { clearMeadow, watchConsoleErrors } from './helpers';

/**
 * Phase 5 evidence harness: one browser session produces the committed bundle
 * (three PNGs + a short riding GIF) and proves AC-1..AC-7 end to end. Raw
 * captures land in the gitignored `.conductor/evidence/` tree; the curated
 * bundle is copied into the track's `evidence/` directory in `afterAll`.
 *
 * ffmpeg is resolved strictly through the environment: PATH by default,
 * `FFMPEG` to point at a binary installed elsewhere. No absolute path is baked
 * in (the R2 lesson).
 */
test.use({
  browserName: 'chromium',
  viewport: { width: 480, height: 720 },
  // The runner's `video` option, not the context's `recordVideo`, enables
  // per-test recording. Scoped to this file so the rest of the matrix stays
  // video-free. Artifacts land in test-results/.
  video: { mode: 'on', size: { width: 480, height: 720 } },
});

const SHOTS_DIR = '.conductor/evidence/20261128-longer-trains/screenshots';
const EVIDENCE_DIR = 'conductor/tracks/20261128-longer-trains/evidence';
const ANCHOR_FILE = path.join(SHOTS_DIR, 'anchor.json');
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';

const RIDE = 'ride.png';
const OVERVIEW = 'consist-overview.png';
const RELOAD = 'reload.png';
const CARGO = 'cargo.png';
const RACK = ['classic', 'coal', 'tank', 'container'] as const;

type Point = { x: number; y: number; z: number };
type WagonView = {
  preset: string | null;
  bodyHex: string | null;
  x: number;
  y: number;
  z: number;
  crateAttached: boolean;
  crateVisible: boolean;
};
type RigView = { kind: string; anchor: string; loco: Point; wagons: WagonView[] };
type ConsistWitness = { rigs(): RigView[] };
type StoreConsist = { count: number; outfits: string[]; preset: string };
type SceneWagon = { preset: string | null; bodyHex: string | null };
type StoredSnapshot = {
  version?: number;
  wagonCount?: number;
  wagonOutfits?: string[];
  consist?: Record<string, string>;
};
type WorldHandle = {
  place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
  placeScenery: (kind: string, cell: { x: number; y: number }, rotation: number) => string;
  scenery: () => readonly { id: string; kind: string }[];
  setWagonCount: (train: string, count: number) => boolean;
  selectWagonOutfit: (train: string, index: number, preset: string) => boolean;
  selectConsist: (train: string, preset: string) => boolean;
  wagonCount: (train: string) => number;
  wagonOutfits: (train: string) => string[];
  consistFor: (train: string) => string;
  deliveryCount: (id: string) => number;
};
type SceneHandle = {
  ridingTrainCount(): number;
  forceCargoStation(id: string): void;
  filmedView(): string;
  cycleFilmTarget(): void;
};

async function waitReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady === true,
    undefined,
    { timeout: 30_000 },
  );
}

async function boot(page: Page): Promise<void> {
  await page.goto('/');
  await waitReady(page);
}

/** An 8-cell loop: enough path for a four-wagon consist. */
function buildRoomyLoop(page: Page): Promise<void> {
  return page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    for (const [x, y, rotation] of [
      [0, 7, 90],
      [3, 7, 180],
      [3, 8, 270],
      [0, 8, 0],
    ] as const) {
      if (world.place('corner', { x, y }, rotation) !== 'placed') {
        throw new Error(`corner placement failed at ${x},${y}`);
      }
    }
    for (const x of [1, 2]) {
      for (const y of [7, 8]) {
        if (world.place('straight', { x, y }, 90) !== 'placed') {
          throw new Error(`straight placement failed at ${x},${y}`);
        }
      }
    }
  });
}

/** A 2x2 corner loop with a station beside it — the cargo run. */
function buildCargoLoop(page: Page): Promise<string> {
  return page.evaluate(() => {
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
}

/** Four wagons, each with a distinct preset — the mixed outfit. */
function dressMixed(page: Page): Promise<void> {
  return page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    // `classic` is the default preset: a slot left on it follows the pair
    // preset. Keeping the pair classic lets all four slots show a distinct
    // outfit once slots 1-3 are chosen explicitly.
    world.selectConsist('steam', 'classic');
    world.setWagonCount('steam', 4);
    world.selectWagonOutfit('steam', 0, 'classic');
    world.selectWagonOutfit('steam', 1, 'coal');
    world.selectWagonOutfit('steam', 2, 'tank');
    world.selectWagonOutfit('steam', 3, 'container');
  });
}

function rigs(page: Page): Promise<RigView[] | null> {
  return page.evaluate(() => {
    const witness = (window as unknown as { __tinyTracksConsist?: ConsistWitness })
      .__tinyTracksConsist;
    return witness ? witness.rigs() : null;
  });
}

async function waitForMixedConsist(page: Page): Promise<RigView> {
  await expect
    .poll(
      async () => {
        const rig = (await rigs(page))?.find((item) => item.wagons.length === 4);
        return rig?.wagons.every((wagon) => wagon.crateAttached) === true;
      },
      { timeout: 25_000, intervals: [100] },
    )
    .toBe(true);
  const rig = (await rigs(page))?.find((item) => item.wagons.length === 4);
  if (!rig) throw new Error('mixed consist missing');
  return rig;
}

function readStore(page: Page): Promise<StoreConsist> {
  return page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    return {
      count: world.wagonCount('steam'),
      outfits: world.wagonOutfits('steam'),
      preset: world.consistFor('steam'),
    };
  });
}

/** Scene truth for the byte-identical reload proof. */
function readScene(page: Page): Promise<SceneWagon[] | null> {
  return page.evaluate(() => {
    const witness = (window as unknown as { __tinyTracksConsist?: ConsistWitness })
      .__tinyTracksConsist;
    const rig = witness
      ?.rigs()
      .filter((item) => item.kind === 'steam')
      .sort((left, right) => right.wagons.length - left.wagons.length)[0];
    return rig
      ? rig.wagons.map((wagon) => ({ preset: wagon.preset, bodyHex: wagon.bodyHex }))
      : null;
  });
}

function readStored(page: Page): Promise<StoredSnapshot | null> {
  return page.evaluate(
    () =>
      new Promise<StoredSnapshot | null>((resolve) => {
        const open = indexedDB.open('tiny-tracks');
        open.onerror = () => resolve(null);
        open.onsuccess = () => {
          const db = open.result;
          const read = db.transaction('worlds', 'readonly').objectStore('worlds').get('current');
          read.onsuccess = () => {
            db.close();
            resolve((read.result as StoredSnapshot | undefined) ?? null);
          };
          read.onerror = () => {
            db.close();
            resolve(null);
          };
        };
      }),
  );
}

/** Autosave is async: wait for the real snapshot before reloading. */
async function waitForStored(page: Page, count: number, outfits: string[]): Promise<void> {
  await page.waitForFunction(
    ({ expectedCount, expectedOutfits }) =>
      new Promise<boolean>((resolve) => {
        const open = indexedDB.open('tiny-tracks');
        open.onerror = () => resolve(false);
        open.onsuccess = () => {
          const db = open.result;
          const read = db.transaction('worlds', 'readonly').objectStore('worlds').get('current');
          read.onsuccess = () => {
            db.close();
            const snapshot = read.result as StoredSnapshot | undefined;
            resolve(
              snapshot?.wagonCount === expectedCount &&
                JSON.stringify(snapshot?.wagonOutfits) === JSON.stringify(expectedOutfits),
            );
          };
          read.onerror = () => {
            db.close();
            resolve(false);
          };
        };
      }),
    { expectedCount: count, expectedOutfits: outfits },
    { timeout: 30_000 },
  );
}

async function startRide(page: Page): Promise<void> {
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
}

/** One station hand-off: returns the crate visibility and delivery ledger. */
function forceStation(
  page: Page,
  stationId: string,
): Promise<{ visible: boolean[]; count: number }> {
  return page.evaluate((id) => {
    const scene = (window as unknown as { __tinyTracksScene?: SceneHandle }).__tinyTracksScene;
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    const witness = (window as unknown as { __tinyTracksConsist?: ConsistWitness })
      .__tinyTracksConsist;
    if (!scene || !world || !witness) throw new Error('dev witnesses missing');
    scene.forceCargoStation(id);
    return {
      visible:
        witness
          .rigs()
          .find((item) => item.anchor !== '')
          ?.wagons.map((wagon) => wagon.crateVisible) ?? [],
      count: world.deliveryCount(id),
    };
  }, stationId);
}

function deliveryBefore(page: Page, stationId: string): Promise<number> {
  return page.evaluate(
    (id) =>
      (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld?.deliveryCount(
        id,
      ) ?? 0,
    stationId,
  );
}

/** Pull the camera back so the whole four-wagon consist fits the frame. */
async function frameOverview(page: Page): Promise<void> {
  await page.evaluate(() => {
    const scene = (window as unknown as { __tinyTracksScene?: SceneHandle }).__tinyTracksScene;
    if (!scene) throw new Error('dev scene handle missing');
    // The 🎥 cycle goes overview → chase → driver → overview.
    for (let tap = 0; tap < 3 && scene.filmedView() !== 'overview'; tap += 1) {
      scene.cycleFilmTarget();
    }
  });
  await page.waitForTimeout(1400); // let the camera glide back
}

/** Playwright keeps the recording in the per-test artifacts directory. */
function findVideo(): string {
  const videos = readdirSync('test-results', { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('longer-trains-evidence'))
    .map((entry) => path.join('test-results', entry.name, 'video.webm'))
    .filter((video) => existsSync(video))
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs);
  const newest = videos[0];
  if (!newest) throw new Error('no longer-trains evidence video found in test-results');
  return newest;
}

// Runs after the capture test, once the recording has been flushed to disk.
// Curates the three peak frames and trims one short riding cycle to a small
// looping GIF. This harness is temporary; the bundle it writes is the artifact.
test.afterAll(() => {
  // A failed capture has no bundle to curate; let the test failure speak.
  if (![RIDE, OVERVIEW, RELOAD, CARGO].every((name) => existsSync(path.join(SHOTS_DIR, name)))) {
    return;
  }
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  for (const name of [RIDE, OVERVIEW, RELOAD, CARGO]) {
    copyFileSync(path.join(SHOTS_DIR, name), path.join(EVIDENCE_DIR, name));
  }
  const anchor = JSON.parse(readFileSync(ANCHOR_FILE, 'utf8')) as { rideStartMs: number };
  const start = Math.max(0, anchor.rideStartMs / 1000).toFixed(2);
  const gif = path.join(EVIDENCE_DIR, 'longer-trains-cycle.gif');
  try {
    execFileSync(
      FFMPEG,
      [
        '-y',
        '-ss',
        start,
        '-i',
        findVideo(),
        '-t',
        '5',
        '-vf',
        'fps=10,scale=400:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
        '-loop',
        '0',
        gif,
      ],
      { stdio: 'pipe' },
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not render the longer-trains cycle GIF with ${FFMPEG}: ${detail}`);
  }
});

test('integrated 4-wagon consist: ride, byte-identical reload and cargo run', async ({ page }) => {
  // Video on software GL needs a bigger budget than the default 30 s.
  test.setTimeout(480_000);
  mkdirSync(SHOTS_DIR, { recursive: true });
  const errors = watchConsoleErrors(page);
  const videoStart = Date.now();

  await boot(page);
  await clearMeadow(page);
  await buildRoomyLoop(page);

  // Grow through the real + control (AC-1), then dress four distinct outfits.
  await page.click('[data-drawer="trains"]');
  await expect(page.locator('.consist-row')).toBeVisible();
  const add = page.locator('[data-add-wagon]');
  await add.click();
  await add.click();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld?.wagonCount(
          'steam',
        ) ?? 0,
    ),
    'the + slot reached four wagons',
  ).toBe(4);
  await dressMixed(page);
  const rideRig = await waitForMixedConsist(page);
  expect(
    rideRig.wagons.map((wagon) => wagon.preset),
    'four different outfits',
  ).toEqual([...RACK]);

  await startRide(page);
  // Anchor the short GIF just as the lengthened consist starts riding.
  writeFileSync(ANCHOR_FILE, JSON.stringify({ rideStartMs: Date.now() - videoStart }));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(SHOTS_DIR, RIDE) });

  // The GIF window above is pure chase; only now pull back for a frame that
  // shows all four wagons at once (AC-1/AC-4).
  await page.waitForTimeout(4300);
  await frameOverview(page);
  await page.screenshot({ path: path.join(SHOTS_DIR, OVERVIEW) });

  // AC-5: a real reload restores the store and scene byte-for-byte.
  await waitForStored(page, 4, [...RACK]);
  const storeBefore = await readStore(page);
  const sceneBefore = await readScene(page);
  const storedBefore = await readStored(page);
  expect(storedBefore?.wagonCount, 'length reached storage').toBe(4);
  await page.reload();
  await waitReady(page);
  await waitForMixedConsist(page);
  expect(await readStore(page), 'store round-trip').toEqual(storeBefore);
  expect(await readScene(page), 'scene round-trip').toEqual(sceneBefore);
  await page.screenshot({ path: path.join(SHOTS_DIR, RELOAD) });

  // AC-6: crates load and deliver from all four wagons of the cargo run.
  // Reduced motion removes the crate-arc render race, but the scene samples
  // that preference at boot — so reload under it before the cargo phase.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await waitReady(page);
  await clearMeadow(page);
  const stationId = await buildCargoLoop(page);
  await dressMixed(page);
  await waitForMixedConsist(page);
  await startRide(page);
  const before = await deliveryBefore(page, stationId);
  const loaded = await forceStation(page, stationId);
  expect(loaded.visible, 'every wagon loads a crate').toEqual([true, true, true, true]);
  expect(loaded.count, 'a load stop counts nothing').toBe(before);
  await page.screenshot({ path: path.join(SHOTS_DIR, CARGO) });
  const delivered = await forceStation(page, stationId);
  expect(delivered.visible, 'every wagon delivers its crate').toEqual([false, false, false, false]);
  expect(delivered.count, 'one delivery stop counts once, not once per wagon').toBe(before + 1);

  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
});
