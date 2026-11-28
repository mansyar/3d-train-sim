import { expect, type Page, test } from '@playwright/test';

import { clearMeadow, watchConsoleErrors } from './helpers';

/**
 * Phase 4 proof: the per-wagon dress rides in the same single world snapshot
 * as the tracks, survives a reload byte-for-byte in the store AND the scene,
 * and the parent reset returns to a paired pair of classic wagons.
 *
 * The last test records the A5 cross-feature contract: extras inherit the
 * loco's paint/stickers through the scene (no migration of stored outfits),
 * while a new wagon's own dress still spawns stock and sticker taps still land
 * only on the vehicle the child tapped.
 */

type WorldHandle = {
  consistFor: (train: string) => string;
  place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
  setWagonCount: (train: string, count: number) => boolean;
  selectWagonOutfit: (train: string, index: number, preset: string) => boolean;
  selectConsist: (train: string, preset: string) => boolean;
  wagonCount: (train: string) => number;
  wagonOutfits: (train: string) => string[];
};

type WagonView = {
  preset: string | null;
  bodyHex: string | null;
  x: number;
  y: number;
  z: number;
  crateAttached: boolean;
  crateVisible: boolean;
};

type RigView = {
  kind: string;
  anchor: string;
  loco: { x: number; y: number; z: number };
  wagons: WagonView[];
};

type StickerView = { visible: string[]; anchors: string[]; stamps: number };
type LiveryProbe = {
  bodyHex(id: string): string | null;
  stickers(id: string): StickerView;
};

type StoreConsist = { count: number; outfits: string[]; preset: string };
type SceneWagon = { preset: string | null; bodyHex: string | null };
type StoredSnapshot = {
  wagonCount?: number;
  wagonOutfits?: string[];
  consist?: Record<string, string>;
};

const CLASSIC_RACK = ['classic', 'classic', 'classic', 'classic'] as const;
const CHERRY = '#e8553f';

const waitReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(
    () => (window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady === true,
    undefined,
    { timeout: 60_000 },
  );
};

async function openDrawer(page: Page): Promise<void> {
  await page.goto('/');
  await waitReady(page);
  await page.click('[data-drawer="trains"]');
  await expect(page.locator('.consist-row')).toBeVisible();
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { __tinyTracksConsist?: { rigs(): unknown[] } })
        .__tinyTracksConsist?.rigs === 'function',
    undefined,
    { timeout: 20_000 },
  );
}

/** Store truth, read from the same handle the drawer writes through. */
const readStore = (page: Page): Promise<StoreConsist> =>
  page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    return {
      count: world.wagonCount('steam'),
      outfits: world.wagonOutfits('steam'),
      preset: world.consistFor('steam'),
    };
  });

/** Scene truth: the steam rig with the most wagons, via the DEV witness. */
const readScene = (page: Page): Promise<SceneWagon[] | null> =>
  page.evaluate(() => {
    const witness = (window as unknown as { __tinyTracksConsist?: { rigs(): RigView[] } })
      .__tinyTracksConsist;
    const rigs = witness
      ?.rigs()
      .filter((rig) => rig.kind === 'steam')
      .sort((a, b) => b.wagons.length - a.wagons.length);
    const rig = rigs?.[0];
    if (!rig) return null;
    return rig.wagons.map((wagon) => ({ preset: wagon.preset, bodyHex: wagon.bodyHex }));
  });

const waitForScene = async (page: Page, expected: string[]): Promise<void> => {
  await expect
    .poll(async () => (await readScene(page))?.map((wagon) => wagon.preset) ?? [], {
      timeout: 30_000,
      intervals: [100],
    })
    .toEqual(expected);
};

const readStored = (page: Page): Promise<StoredSnapshot | null> =>
  page.evaluate(
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

/** Autosave is async: wait for the real snapshot before reloading or resetting. */
const waitForStored = async (page: Page, count: number, outfits?: string[]): Promise<void> => {
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
                (expectedOutfits === undefined ||
                  JSON.stringify(snapshot?.wagonOutfits) === JSON.stringify(expectedOutfits)),
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
};

const stickersOf = (page: Page, id: string): Promise<StickerView> =>
  page.evaluate((vehicleId) => {
    const witness = (window as unknown as { __tinyTracksLivery?: LiveryProbe }).__tinyTracksLivery;
    if (!witness || typeof witness.stickers !== 'function') {
      throw new Error('dev livery witness missing');
    }
    return witness.stickers(vehicleId);
  }, id);

/** Replaces the meadow with an 8-cell loop before any paint is applied. */
const buildRoomyLoop = (page: Page): Promise<void> =>
  page.evaluate(() => {
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

const holdParentGate = async (page: Page): Promise<void> => {
  const box = await page.locator('.parent-gate').boundingBox();
  if (!box) throw new Error('parent gate is not visible');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(page.locator('.parent-gate')).toHaveClass(/is-confirm/, { timeout: 20_000 });
  await page.mouse.up();
  // The hold's own click is suppressed; confirming is a second, real tap.
  await page.locator('.parent-gate').click({ force: true });
};

test('a wagon chip selects its slot for dressing and the pair dress survives reload', async ({
  page,
}) => {
  test.setTimeout(180_000);
  const errors = watchConsoleErrors(page);
  await openDrawer(page);

  // P4.T1: two + taps, then chip-then-preset dresses only the tapped slots.
  await page.locator('[data-add-wagon]').click();
  await page.locator('[data-add-wagon]').click();
  await expect(page.locator('.wagon-chip:not([hidden])')).toHaveCount(4);
  // The last chip unhitches its wagon instead of selecting it, so dress two
  // interior slots; slot 3 stays classic as the tail of the four-wagon consist.
  await page.locator('[data-wagon-index="1"]').click();
  await page.click('.wagon-row [data-wagon="coal"]');
  await page.locator('[data-wagon-index="2"]').click();
  await page.click('.wagon-row [data-wagon="tank"]');

  const expected = ['classic', 'coal', 'tank', 'classic'];
  expect(await readStore(page)).toEqual({ count: 4, outfits: expected, preset: 'classic' });
  await waitForScene(page, expected);
  const sceneBefore = await readScene(page);
  await waitForStored(page, 4, expected);

  // P4.T2: a real reload, not a re-read of the in-memory store.
  await page.reload();
  await waitReady(page);
  await waitForScene(page, expected);
  expect(await readStore(page), 'store round-trip').toEqual({
    count: 4,
    outfits: expected,
    preset: 'classic',
  });
  expect(await readScene(page), 'scene round-trip').toEqual(sceneBefore);
  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
});

test('the parent reset returns to two classic wagons and clears the saved consist', async ({
  page,
}) => {
  test.setTimeout(180_000);
  const errors = watchConsoleErrors(page);
  await openDrawer(page);

  await page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    world.selectConsist('steam', 'container');
    world.setWagonCount('steam', 4);
    world.selectWagonOutfit('steam', 1, 'coal');
    world.selectWagonOutfit('steam', 3, 'tank');
  });
  // A container pair dresses slots 0 and 1 unless a slot was dressed directly.
  const dressed = ['container', 'coal', 'container', 'tank'];
  await waitForScene(page, dressed);
  await waitForStored(page, 4, dressed);
  await page.click('[data-drawer="trains"]');
  await expect(page.locator('.consist-row')).toBeHidden();

  await holdParentGate(page);

  expect(await readStore(page)).toEqual({
    count: 2,
    outfits: [...CLASSIC_RACK],
    preset: 'classic',
  });
  await waitForScene(page, ['classic', 'classic']);
  await expect
    .poll(async () => await readStored(page), { timeout: 30_000, intervals: [100] })
    .toMatchObject({ version: 3 });
  const stored = await readStored(page);
  expect(stored?.wagonCount, 'the default pair is omitted from storage').toBeUndefined();
  expect(stored?.wagonOutfits, 'an all-classic rack is omitted').toBeUndefined();
  expect(stored?.consist, 'the classic pair dress is omitted').toBeUndefined();
  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
});

test('A5: extras inherit loco paint, new wagons spawn stock, and sticker flow is unchanged', async ({
  page,
}) => {
  test.setTimeout(180_000);
  const errors = watchConsoleErrors(page);
  await openDrawer(page);
  await clearMeadow(page);
  await buildRoomyLoop(page);

  // Paint and stamp the locomotive only. A loco change dresses its whole
  // consist through the scene; nothing is migrated into wagon outfit slots.
  await page.click('.livery-section [data-paint="cherry"]');
  await page.waitForFunction(
    () =>
      (window as unknown as { __tinyTracksLivery?: LiveryProbe }).__tinyTracksLivery?.bodyHex(
        'steam:loco',
      ) === '#e8553f',
    undefined,
    { timeout: 30_000 },
  );
  await page.click('.livery-section [data-sticker="star"]');
  await expect(page.locator('.livery-section')).toHaveAttribute('data-armed', 'star');
  await page.click('.train-slot[data-train="steam"]');
  await expect(page.locator('.livery-section')).toHaveAttribute('data-armed', '');

  await waitForScene(page, ['classic', 'classic']);
  const before = await readScene(page);
  expect(before?.map((wagon) => wagon.bodyHex)).toEqual([CHERRY, CHERRY]);
  const locoBefore = await stickersOf(page, 'steam:loco');
  const leadBefore = await stickersOf(page, 'steam:lead');
  expect(locoBefore.visible, 'the stamp landed on the tapped vehicle').toEqual(['star']);
  expect(locoBefore.stamps).toBe(1);

  // Add two wagons after the paint/stamp: extras take the loco's look while
  // their own per-wagon dress stays stock.
  await page.locator('[data-add-wagon]').click();
  await page.locator('[data-add-wagon]').click();
  await waitForScene(page, [...CLASSIC_RACK]);
  const after = await readScene(page);
  expect(after, 'four wagons are live').toHaveLength(4);
  expect(
    after?.map((wagon) => wagon.preset),
    'new wagons spawn stock',
  ).toEqual(['classic', 'classic', 'classic', 'classic']);
  expect(
    after?.map((wagon) => wagon.bodyHex),
    'existing wagons keep their paint and extras inherit the loco',
  ).toEqual([CHERRY, CHERRY, CHERRY, CHERRY]);
  expect(await readStore(page)).toEqual({
    count: 4,
    outfits: [...CLASSIC_RACK],
    preset: 'classic',
  });
  // The witness's frame counter advances on its own; compare the stamp facts.
  const locoAfter = await stickersOf(page, 'steam:loco');
  expect(locoAfter.visible, 'no second sticker was added').toEqual(locoBefore.visible);
  expect(locoAfter.anchors).toEqual(locoBefore.anchors);
  expect(locoAfter.stamps, 'no second stamp was added').toBe(locoBefore.stamps);
  const leadAfter = await stickersOf(page, 'steam:lead');
  expect(leadAfter.visible, 'existing wagon stickers are untouched').toEqual(leadBefore.visible);
  expect(leadAfter.anchors).toEqual(leadBefore.anchors);
  // `stamps` counts reward animations, not dress: a re-dressed wagon mesh
  // starts a fresh binding, so only the visible sticker set is compared here.
  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
});
