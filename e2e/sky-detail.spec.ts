import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { watchConsoleErrors } from './helpers';

/**
 * The two-layer sky, witnessed from a real browser.
 *
 * The cloud math itself (cover curve, snow cap, wrapping, monotonicity) is
 * proven exhaustively by `cloud-layers.test.ts`. What only a live scene can
 * witness is the wiring: one shared puff texture split into two fixed pools,
 * cover chasing the weather bed through a soft cross-fade, near drifting
 * faster than far inside the arc, and reduced motion holding the layers still
 * without hiding them. All weather is pinned through a DEV-only witness — no
 * 30 s clock hold, no save, no production surface.
 */

type CloudWitness = {
  layers: Array<{ name: string; depth: number; speed: number }>;
  /** Visible-puff fraction from the Phase 1 helper. */
  cover: number;
  /** Normalized arc offsets, far then near. */
  offsets: [number, number];
  /** False under reduced motion. */
  drifting: boolean;
  /** Visible puff count across both layers. */
  visible: number;
};

type CloudScene = {
  cloudLayers: () => CloudWitness | null;
  setCloudWeather: (weather: { cloud: number; snow: number } | null) => void;
  stepClouds: (frames: number, dt: number) => void;
};

const ready = (page: Page) =>
  page.waitForFunction(
    () => (window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady === true,
    undefined,
    { timeout: 30_000 },
  );

const layers = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __tinyTracksScene?: CloudScene }).__tinyTracksScene?.cloudLayers() ??
      null,
  );

const pinWeather = (page: Page, bed: { cloud: number; snow: number }) =>
  page.evaluate(
    (weather) =>
      (window as unknown as { __tinyTracksScene?: CloudScene }).__tinyTracksScene?.setCloudWeather(
        weather,
      ),
    bed,
  );

const step = (page: Page, frames: number, dt: number) =>
  page.evaluate(
    ({ frames: count, dt: seconds }) =>
      (window as unknown as { __tinyTracksScene?: CloudScene }).__tinyTracksScene?.stepClouds(
        count,
        seconds,
      ),
    { frames, dt },
  );

/** Clear the pinned bed so later tests start from the clock again. */
const unpin = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as { __tinyTracksScene?: CloudScene }).__tinyTracksScene?.setCloudWeather(
      null,
    ),
  );

const witness = async (page: Page): Promise<CloudWitness> => {
  const value = await layers(page);
  if (!value) throw new Error('DEV cloud witness missing');
  return value;
};

test('two fixed cloud pools drift in the arc with near faster than far', async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await ready(page);

  const initial = await witness(page);
  expect(initial.layers).toHaveLength(2);
  const far = initial.layers[0];
  const near = initial.layers[1];
  expect(far?.name).toBe('far');
  expect(near?.name).toBe('near');
  // Depth reads twice: farther puffs are shallower and slower.
  expect(near?.depth ?? 0).toBeGreaterThan(far?.depth ?? 1);
  expect(near?.speed ?? 0).toBeGreaterThan(far?.speed ?? 1);
  expect(initial.drifting).toBe(true);
  expect(initial.visible).toBeGreaterThan(0);
  expect(initial.cover).toBeGreaterThan(0);

  await pinWeather(page, { cloud: 0.1, snow: 0 });
  await step(page, 40, 0.1);
  const before = await witness(page);
  await step(page, 60, 0.1);
  const after = await witness(page);

  const farDelta = (after.offsets[0] ?? 0) - (before.offsets[0] ?? 0);
  const nearDelta = (after.offsets[1] ?? 0) - (before.offsets[1] ?? 0);
  expect(farDelta).toBeGreaterThan(0);
  expect(nearDelta).toBeGreaterThan(0);
  // The near pool's speed is 2.5x the far pool's — the parallax is visible.
  expect(nearDelta).toBeGreaterThan(farDelta * 1.5);

  // One oversized step advances each layer past a full lap and must wrap back
  // into [0, 1) rather than marching the sprites off the arc. A live RAF frame
  // can land between the two probes, so the tolerance is a fraction of one
  // frame's drift (near: 0.01 * 0.1 s = 0.001); it still proves the wrap.
  const frames = 1;
  const dt = 600;
  const start = after;
  await step(page, frames, dt);
  const wrapped = await witness(page);
  for (let index = 0; index < 2; index += 1) {
    const speed = wrapped.layers[index]?.speed ?? 0;
    const advanced = speed * frames * dt;
    expect(advanced, 'the step advances past a whole arc').toBeGreaterThan(1);
    const expected = ((start.offsets[index] ?? 0) + advanced) % 1;
    expect(Math.abs((wrapped.offsets[index] ?? 0) - expected)).toBeLessThan(0.01);
    expect(wrapped.offsets[index] ?? 0).toBeGreaterThanOrEqual(0);
    expect(wrapped.offsets[index] ?? 0).toBeLessThan(1);
  }

  await unpin(page);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('cloud cover follows the weather bed through a soft cross-fade', async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await ready(page);

  await pinWeather(page, { cloud: 0.1, snow: 0 });
  await step(page, 80, 0.1);
  const clear = await witness(page);
  expect(clear.cover).toBeGreaterThan(0);

  await pinWeather(page, { cloud: 1, snow: 0 });
  // One painted frame: the cover has started rising but is nowhere near the
  // storm target — that in-between value is the soft cross-fade.
  const mid = await witness(page);
  expect(mid.cover).toBeGreaterThan(clear.cover);
  expect(mid.cover).toBeLessThan(clear.cover + 0.25);

  await step(page, 80, 0.1);
  const storm = await witness(page);
  expect(storm.cover).toBeGreaterThan(mid.cover + 0.1);
  expect(storm.cover).toBeGreaterThan(clear.cover + 0.2);
  expect(storm.visible).toBeGreaterThan(clear.visible);

  await pinWeather(page, { cloud: 0.1, snow: 0 });
  const rebound = await witness(page);
  expect(rebound.cover).toBeLessThan(storm.cover);
  await step(page, 80, 0.1);
  const clearAgain = await witness(page);
  expect(clearAgain.cover).toBeLessThan(0.3);
  // Clear weather still shows a few puffs — never an empty sky.
  expect(clearAgain.visible).toBeGreaterThan(0);

  // A snow cap keeps a heavy snowfall from turning the sky into whiteout.
  await pinWeather(page, { cloud: 1, snow: 1 });
  await step(page, 80, 0.1);
  const snow = await witness(page);
  expect(snow.cover).toBeLessThanOrEqual(0.55 + 1e-6);

  await unpin(page);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('reduced motion freezes drift but keeps static layers and weather repaint', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const consoleErrors = watchConsoleErrors(page);
  // Must be set before boot: the spin loop renders one static frame when the
  // OS asks for reduced motion.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await ready(page);

  const initial = await witness(page);
  expect(initial.drifting).toBe(false);
  expect(initial.layers).toHaveLength(2);
  expect(initial.visible).toBeGreaterThan(0);
  expect(initial.cover).toBeGreaterThan(0);

  const frozenFar = initial.offsets[0] ?? 0;
  const frozenNear = initial.offsets[1] ?? 0;

  // No RAF loop here: the DEV witness paints directly, so drift must still be
  // frozen while the cloud cover answers the new bed.
  await pinWeather(page, { cloud: 1, snow: 0 });
  await step(page, 60, 0.1);
  const after = await witness(page);
  expect(after.drifting).toBe(false);
  expect(after.offsets[0]).toBe(frozenFar);
  expect(after.offsets[1]).toBe(frozenNear);
  expect(after.cover).toBeGreaterThan(initial.cover);
  expect(after.visible).toBeGreaterThan(0);
  expect(after.layers).toHaveLength(2);

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
