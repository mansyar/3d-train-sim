import { expect, type Page, test } from '@playwright/test';

/**
 * Performance-budget observation (Phase 1). This records, but does not gate:
 * one dev interactive mark and three frame-tick cadence samples on the tablet
 * profile. Phase 2 owns the calibrated floor and the hard assertion. There is
 * deliberately no FPS floor here — this spec only measures and records.
 */

const MARK_NAME = 'tiny-tracks-interactive';
const SAMPLE_WINDOW_MS = 2000;
const SAMPLE_COUNT = 3;

type FrameSystemSnapshot = Array<{ name: string; ticks: number }>;

type SceneProbe = {
  /** The dev/e2e witness: the wired frame systems with per-system tick counts. */
  frameSystems: () => FrameSystemSnapshot;
};

type TickSample = {
  ticksPerSecond: number;
  systemCount: number;
  elapsedSeconds: number;
  tickProgress: number;
};

const waitForReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(
    () => (window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady === true,
    undefined,
    { timeout: 20_000 },
  );
};

test('dev boot exposes one interactive mark and records three frame-tick samples @ci', async ({
  page,
}) => {
  // A contended second worker can starve the page's main thread while GLBs load.
  test.setTimeout(90_000);

  await page.goto('/');
  await waitForReady(page);

  await test.step('exactly one interactive mark within 5 s of navigation start', async () => {
    const starts = await page.evaluate(
      (name) => performance.getEntriesByName(name).map((entry) => entry.startTime),
      MARK_NAME,
    );
    expect(starts, `expected exactly one "${MARK_NAME}" mark`).toHaveLength(1);
    expect(starts[0], 'interactive mark startTime (ms)').toBeLessThanOrEqual(5000);
  });

  const samples: TickSample[] = [];
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const sample = await page.evaluate(
      (windowMs) =>
        new Promise<TickSample>((resolve, reject) => {
          const scene = (window as unknown as { __tinyTracksScene?: SceneProbe }).__tinyTracksScene;
          if (!scene) {
            reject(new Error('dev scene handle missing'));
            return;
          }
          const read = (): FrameSystemSnapshot =>
            scene.frameSystems().map(({ name, ticks }) => ({ name, ticks }));

          let start: FrameSystemSnapshot | null = null;
          let startTime = 0;
          const tick = () => {
            // Both reads land at the same point in a RAF callback, so where the
            // scene loop sits in the callback queue cannot bias the tick delta.
            if (start === null) {
              start = read();
              startTime = performance.now();
            }
            if (performance.now() - startTime < windowMs) {
              requestAnimationFrame(tick);
              return;
            }
            const end = read();
            if (start.length === 0 || end.length === 0) {
              reject(new Error('no frame systems to sample'));
              return;
            }
            const elapsedSeconds = (performance.now() - startTime) / 1000;
            const tickProgress =
              end.reduce((sum, system) => sum + system.ticks, 0) -
              start.reduce((sum, system) => sum + system.ticks, 0);
            if (elapsedSeconds <= 0) {
              reject(new Error('non-positive elapsed time'));
              return;
            }
            if (tickProgress <= 0) {
              reject(new Error('no tick progress'));
              return;
            }
            resolve({
              ticksPerSecond: tickProgress / end.length / elapsedSeconds,
              systemCount: end.length,
              elapsedSeconds,
              tickProgress,
            });
          };
          requestAnimationFrame(tick);
        }),
      SAMPLE_WINDOW_MS,
    );
    samples.push(sample);
    console.log(
      `frame tick sample ${i + 1}: ${sample.ticksPerSecond.toFixed(2)} ticks/s ` +
        `(${sample.systemCount} systems, ${sample.elapsedSeconds.toFixed(3)} s, ` +
        `${sample.tickProgress} tick progress)`,
    );
  }

  expect(samples, 'frame tick samples recorded').toHaveLength(SAMPLE_COUNT);
  test.info().attach('ticks-per-second-samples', {
    body: JSON.stringify(samples.map((sample) => sample.ticksPerSecond)),
    contentType: 'application/json',
  });
  console.log(
    `ticks/second samples: ${samples.map((sample) => sample.ticksPerSecond.toFixed(2)).join(', ')}`,
  );
});
