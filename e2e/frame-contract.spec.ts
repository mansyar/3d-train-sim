import { expect, type Page, test } from '@playwright/test';
import { watchConsoleErrors } from './helpers';

/**
 * The frame contract, witnessed in the running app (FR-10, AC-4).
 *
 * Two claims, one boot. First the live wiring: `frameSystems()` (the dev-only
 * probe on `__tinyTracksScene`) reports exactly the documented names in the
 * documented order. Then the cadence: over a window of animation frames, every
 * system's tick counter advances by exactly the number of frames observed.
 *
 * The order is compared against a list written out here, not imported: the runner
 * already throws on a mismatch between the tuple and the wiring, so a test that
 * imported the tuple could only ever prove the app booted. Spelled out, this fails
 * if someone reorders both the tuple and the wiring together and only that.
 *
 * The cadence is measured against `requestAnimationFrame` callbacks in the same
 * page, never against wall-clock time: the lifecycle suspends the loop while the
 * tab is hidden, so a frame is the unit the contract actually promises. Both
 * tick reads happen inside an RAF callback at the same point in the frame, so
 * where the scene's loop sits in the callback queue cannot bias the delta.
 */

type FrameSystemSnapshot = Array<{ name: string; ticks: number }>;

type SceneProbe = {
  /** The dev/e2e witness: the wired order with per-system tick counts. */
  frameSystems: () => FrameSystemSnapshot;
};

/** The contract as documented in `conductor/tech-stack.md`, spelled out on purpose. */
const DOCUMENTED_ORDER = [
  'day-ambience',
  'fleet',
  'chug',
  'confetti',
  'critters',
  'crossings',
  'delight',
  'music-box',
  'duck',
  'barge',
  'portal-glow',
  'film-camera',
] as const;

/** Frames to observe; a frame count, not a duration, so a slow machine cannot fail it. */
const FRAMES_TO_SAMPLE = 30;

/** Boot has been slow on a contended machine (the smoke spec's precedent). */
const waitForReady = (page: Page) =>
  page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );

test('the loop ticks the documented systems in order and exactly once per frame', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);

  await test.step('the loop ticks the documented systems in order', async () => {
    const liveOrder = await page.evaluate(() => {
      const scene = (window as unknown as { __tinyTracksScene?: SceneProbe }).__tinyTracksScene;
      if (!scene) throw new Error('dev scene handle missing');
      return scene.frameSystems().map((system) => system.name);
    });

    expect(liveOrder, 'live frame order').toEqual([...DOCUMENTED_ORDER]);
    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });

  await test.step('every system advances exactly one tick per frame', async () => {
    const sample = await page.evaluate(
      (frames) =>
        new Promise<{ before: FrameSystemSnapshot; after: FrameSystemSnapshot; frames: number }>(
          (resolve) => {
            const scene = (window as unknown as { __tinyTracksScene?: SceneProbe })
              .__tinyTracksScene;
            if (!scene) throw new Error('dev scene handle missing');
            const read = (): FrameSystemSnapshot =>
              scene.frameSystems().map(({ name, ticks }) => ({ name, ticks }));

            let observed = 0;
            let before: FrameSystemSnapshot | null = null;
            const tick = () => {
              // Sample at the same point in every frame, so the scene loop's
              // position in the callback queue cannot bias the tick delta.
              before ??= read();
              observed += 1;
              if (observed <= frames) {
                requestAnimationFrame(tick);
                return;
              }
              resolve({ before: before ?? [], after: read(), frames: observed - 1 });
            };
            requestAnimationFrame(tick);
          },
        ),
      FRAMES_TO_SAMPLE,
    );

    // Not a clock assertion: a floor only so a stalled loop cannot make the
    // per-frame comparison pass vacuously.
    expect(sample.frames, 'animation frames observed').toBeGreaterThanOrEqual(10);
    expect(
      sample.before.map((system) => system.name),
      'order before sampling',
    ).toEqual([...DOCUMENTED_ORDER]);
    expect(
      sample.after.map((system) => system.name),
      'order after sampling',
    ).toEqual([...DOCUMENTED_ORDER]);

    const deltas = sample.after.map((system, index) => ({
      name: system.name,
      delta: system.ticks - (sample.before[index]?.ticks ?? 0),
    }));
    expect(deltas, `tick deltas over ${sample.frames} frames`).toEqual(
      DOCUMENTED_ORDER.map((name) => ({ name, delta: sample.frames })),
    );

    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });
});
