import { expect, type Page, test } from '@playwright/test';

/**
 * Performance-budget hard gate (Phase 2). Unlike the observation spec, this one
 * fails the Playwright job when the dev interactive mark is late or the live
 * frame loop cannot sustain the calibrated ticks/second floor. The floor is
 * recalibrated against GitHub CI samples recorded in
 * `conductor/tracks/perf-budget_20261111/verification/phase-R1.md`.
 */

const MARK_NAME = 'tiny-tracks-interactive';
const MARK_LIMIT_MS = 5000;
const SAMPLE_WINDOW_MS = 2000;
const SAMPLE_COUNT = 3;

/**
 * Floor derived from six GitHub CI ticks/second samples (run 44283047563,
 * shard 1/2): observation 2.79, 2.74, 2.72; hard-gate 2.65, 2.71, 2.67.
 * min 2.65, mean 2.7133, population σ 0.0457;
 * `min − 2σ = 2.65 − 0.0914 = 2.5586`, rounded down to 2.5. Headroom on the
 * minimum sample is 0.15 ticks/s (~5.7%). The old floor of 15 was calibrated
 * from local software-rendered samples; authoritative GitHub CI software
 * rendering sustains only ~2.65–2.79. Raw samples live in `verification/phase-R1.md`.
 */
const FPS_FLOOR_TICKS_PER_SECOND = 2.5;

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

type BudgetInput = {
  markMs?: number | undefined;
  ticksPerSecond?: number | undefined;
};

/** The two hard assertions, isolated so negative proofs exercise the same code. */
function assertBudget({ markMs, ticksPerSecond }: BudgetInput): void {
  if (markMs === undefined || !Number.isFinite(markMs)) {
    throw new Error('interactive mark missing or invalid');
  }
  if (markMs > MARK_LIMIT_MS) {
    throw new Error(`interactive mark startTime ${markMs} ms exceeds ${MARK_LIMIT_MS} ms budget`);
  }
  if (ticksPerSecond === undefined || !Number.isFinite(ticksPerSecond)) {
    throw new Error('frame tick sample missing or invalid');
  }
  if (ticksPerSecond < FPS_FLOOR_TICKS_PER_SECOND) {
    throw new Error(
      `frame ticks/second ${ticksPerSecond} below floor ${FPS_FLOOR_TICKS_PER_SECOND}`,
    );
  }
}

/** Capture the exact thrown message so a negative proof can log and assert it. */
function captureThrow(input: BudgetInput): string {
  try {
    assertBudget(input);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error('assertBudget did not throw for an invalid budget');
}

const waitForReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(
    () => (window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady === true,
    undefined,
    { timeout: 20_000 },
  );
};

test('dev boot meets the interactive mark and calibrated FPS floor budgets @ci', async ({
  page,
}) => {
  // A contended second worker can starve the page's main thread while GLBs load.
  test.setTimeout(90_000);

  await page.goto('/');
  await waitForReady(page);

  const starts = await page.evaluate(
    (name) => performance.getEntriesByName(name).map((entry) => entry.startTime),
    MARK_NAME,
  );
  // Exactly one mark; anything else fails closed via assertBudget's mark guard.
  const markMs = starts.length === 1 ? starts[0] : undefined;
  console.log(
    `interactive mark startTime: ${markMs ?? 'missing'} ms (budget <= ${MARK_LIMIT_MS} ms)`,
  );

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

  for (const sample of samples) {
    assertBudget({ markMs, ticksPerSecond: sample.ticksPerSecond });
  }

  console.log(`FPS floor: ${FPS_FLOOR_TICKS_PER_SECOND} ticks/second`);
  console.log(
    `ticks/second samples: ${samples.map((sample) => sample.ticksPerSecond.toFixed(2)).join(', ')}`,
  );
  test.info().attach('perf-budget-hard-gate', {
    body: JSON.stringify({
      markMs,
      markLimitMs: MARK_LIMIT_MS,
      floorTicksPerSecond: FPS_FLOOR_TICKS_PER_SECOND,
      ticksPerSecond: samples.map((sample) => sample.ticksPerSecond),
    }),
    contentType: 'application/json',
  });
});

test('a deliberately late interactive mark fails the interactive assertion @ci', () => {
  const input: BudgetInput = { markMs: 5001, ticksPerSecond: 25 };
  const expected = 'interactive mark startTime 5001 ms exceeds 5000 ms budget';
  const message = captureThrow(input);
  console.log(`late-mark negative run threw: ${message}`);
  expect(message).toBe(expected);
  expect(() => assertBudget(input)).toThrow(expected);
});

test('a deliberately low tick count fails the FPS assertion @ci', () => {
  const input: BudgetInput = { markMs: 1000, ticksPerSecond: 2.4 };
  const expected = `frame ticks/second 2.4 below floor ${FPS_FLOOR_TICKS_PER_SECOND}`;
  const message = captureThrow(input);
  console.log(`low-tick negative run threw: ${message}`);
  expect(message).toBe(expected);
  expect(() => assertBudget(input)).toThrow(expected);
});
