import { expect, type Page, test } from '@playwright/test';

import { watchConsoleErrors } from './helpers';

type DevWorld = {
  __tinyTracksReady?: boolean;
  __tinyTracksWorld?: {
    pieces: () => Array<{ id: string }>;
    scenery: () => Array<{ id: string }>;
    train: () => string;
    consistFor: (kind: string) => string;
  };
};

/**
 * Waits for the loaded world: the canvas, the readiness flag, and the beat the
 * starter GLB clones need to land and the first frame to settle.
 */
async function waitForWorld(page: Page): Promise<void> {
  await page.waitForSelector('canvas');
  await page.waitForFunction(() => (window as unknown as DevWorld).__tinyTracksReady === true);
  await page.waitForTimeout(2000); // Starter GLB clones land + first frame settles.
}

/**
 * Fresh boot: wipe the saved world so the first-run seed path runs.
 *
 * `afterReload` runs once the post-wipe load reports ready. Tests asserting
 * a clean console pass `() => errors.length = 0`: the wipe's reload tears
 * down a live WebGL page, and headless Chromium reports the doomed
 * context's fetch fallout as errors — noise, not app behavior. The ride
 * below re-covers the fresh load genuinely, so real failures still surface.
 */
async function boot(page: Page, afterReload?: () => void): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => window.indexedDB.deleteDatabase('tiny-tracks'));
  await page.reload();
  await page.waitForSelector('canvas');
  await page.waitForFunction(() => (window as unknown as DevWorld).__tinyTracksReady === true);
  afterReload?.();
  await page.waitForTimeout(2000); // Starter GLB clones land + first frame settles.
}

async function counts(page: Page): Promise<{ pieces: number; scenery: number }> {
  return page.evaluate(() => {
    const handle = (window as unknown as DevWorld).__tinyTracksWorld;
    if (!handle) throw new Error('dev world handle missing');
    return {
      pieces: handle.pieces().length,
      scenery: handle.scenery().length,
    };
  });
}

/** The currently chosen engine and its consist, through the dev handle. */
const dressed = (page: Page, train: string) =>
  page.evaluate(
    ([name]) => {
      const handle = (window as unknown as DevWorld).__tinyTracksWorld;
      if (!handle) throw new Error('dev world handle missing');
      return { train: handle.train(), consist: handle.consistFor(name) };
    },
    [train] as const,
  );

/** Press-and-hold the parent gate until the armed-confirm step opens. */
async function openGallery(page: Page): Promise<void> {
  const gate = page.locator('.parent-gate');
  const tray = page.locator('.preset-tray');
  // Shader-compile jank (notably right after a reload) can delay the 2 s arm
  // timer past our release — a real finger simply holds again, so retry.
  for (let attempt = 0; attempt < 3 && !(await tray.isVisible()); attempt++) {
    const box = await gate.boundingBox();
    if (!box) throw new Error('parent gate missing');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(2400);
    await page.mouse.up();
  }
  await expect(tray).toBeVisible();
}

async function rideForAWhile(page: Page): Promise<void> {
  await page.locator('.ride-toggle').click();
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/, {
    timeout: 15000,
  });
  await page.waitForTimeout(3000);
  await page.locator('.ride-toggle').click();
}

test('fresh boot shows the cozy oval and rides, and each gallery preset applies and rides', async ({
  page,
}) => {
  test.setTimeout(180_000); // the boot journey and the preset tour, summed
  const errors = watchConsoleErrors(page);
  const external: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (!/localhost|127\.0\.0\.1|^data:|^blob:/.test(url)) external.push(url);
  });

  await boot(page, () => {
    errors.length = 0;
  });

  await test.step('the fresh meadow is the cozy oval', async () => {
    // Cozy oval: 10 rails + station, 2 trees, 1 house.
    expect(await counts(page)).toEqual({ pieces: 10, scenery: 4 });
  });

  await test.step('the seeded oval rides', async () => {
    await rideForAWhile(page);
  });

  await test.step('the boot stayed silent', async () => {
    expect(errors).toEqual([]);
  });

  await test.step('each gallery preset applies behind the gate and rides', async () => {
    const presets = [
      { id: 'cozy-oval', pieces: 10, scenery: 4 },
      { id: 'station-village', pieces: 14, scenery: 5 },
      { id: 'river-crossing', pieces: 18, scenery: 2 },
      { id: 'hilltop-junction', pieces: 17, scenery: 3 },
    ];
    for (const preset of presets) {
      await openGallery(page);
      await page.locator(`.preset-pick[data-preset="${preset.id}"]`).click();
      await page.waitForTimeout(2500); // Old-kind meshes leave, new clones land.
      expect(await counts(page)).toEqual({
        pieces: preset.pieces,
        scenery: preset.scenery,
      });
      await expect(page.locator('.undo-toggle')).toBeVisible();
      await rideForAWhile(page);
    }
  });

  expect(errors).toEqual([]);
  // The whole journey — boot, ride, all four presets — stayed on-origin.
  expect(external).toEqual([]);
});

test('presets round-trip through undo and reload, and the dressed train survives with them', async ({
  page,
}) => {
  test.setTimeout(270_000); // the round-trip and dressed-train journeys, summed
  const errors = watchConsoleErrors(page);
  await boot(page, () => {
    errors.length = 0;
  });

  expect(await counts(page)).toEqual({ pieces: 10, scenery: 4 });

  // Dress diesel in coal through the train drawer before any preset is applied.
  await page.click('[data-drawer="trains"]');
  await page.locator('.train-slot[data-train="diesel"]').click();
  await page.locator('.wagon-slot[data-wagon="coal"]').click();
  await expect(page.locator('.wagon-slot[data-wagon="coal"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await test.step('a preset applies over the seeded oval and one ↩️ takes it back', async () => {
    await openGallery(page);
    await page.locator('.preset-pick[data-preset="station-village"]').click();
    await page.waitForTimeout(2500);
    expect(await counts(page)).toEqual({ pieces: 14, scenery: 5 });
    await page.locator('.undo-toggle').click();
    expect(await counts(page)).toEqual({ pieces: 10, scenery: 4 });
  });

  await test.step('the applied world persists across a reload', async () => {
    await openGallery(page);
    await page.locator('.preset-pick[data-preset="station-village"]').click();
    await page.waitForTimeout(2500);
    await page.reload();
    await waitForWorld(page);
    expect(await counts(page)).toEqual({ pieces: 14, scenery: 5 });
  });

  await test.step('a gallery apply preserves the dressed train across undo', async () => {
    await openGallery(page);
    await page.locator('.preset-pick[data-preset="hilltop-junction"]').click();
    await page.waitForTimeout(2500);
    expect(await counts(page)).toEqual({ pieces: 17, scenery: 3 });
    expect(await dressed(page, 'diesel')).toEqual({ train: 'diesel', consist: 'coal' });

    // One ↩️ restores the build this reload brought back — the village, not
    // the seeded oval (the seeded-oval undo is the first step's witness).
    await page.locator('.undo-toggle').click();
    expect(await counts(page)).toEqual({ pieces: 14, scenery: 5 });
    expect(await dressed(page, 'diesel')).toEqual({ train: 'diesel', consist: 'coal' });
  });

  await test.step('the junction and its dressed diesel persist across a reload', async () => {
    await openGallery(page);
    await page.locator('.preset-pick[data-preset="hilltop-junction"]').click();
    await page.waitForTimeout(2500);
    await page.reload();
    await waitForWorld(page);
    expect(await counts(page)).toEqual({ pieces: 17, scenery: 3 });
    expect(await dressed(page, 'diesel')).toEqual({ train: 'diesel', consist: 'coal' });
  });

  await test.step('the parent gate reset still clears to an empty meadow', async () => {
    await openGallery(page);
    // The armed gate pulses (by design) — a real finger taps right through it.
    await page.locator('.parent-gate').click({ force: true });
    await page.waitForTimeout(1500);
    expect(await counts(page)).toEqual({ pieces: 0, scenery: 0 });
  });

  expect(errors).toEqual([]);
});
