import { expect, type Page, test } from '@playwright/test';

/**
 * Performance-budget hard gate. Unlike the observation spec, this one fails the
 * Playwright job when the dev interactive mark is late or the deterministic
 * frame contract breaks. Throughput stays non-blocking observation only: the
 * hard gate is exactly one interactive mark <= 5000 ms plus a per-frame
 * tick/order contract over at least 10 observed animation frames. There is no
 * wall-clock ticks/second floor — the RAF cadence is environment-dependent and
 * is not a player-facing guarantee.
 *
 * The 12-system order is spelled out on purpose (not imported from the wiring
 * tuple) so a test that merely booted the app could not satisfy the contract.
 * Both tick reads happen at the same point within their RAF callbacks, so where the scene's loop sits in the callback queue cannot bias the delta.
 */

const MARK_NAME = 'tiny-tracks-interactive';
const MARK_LIMIT_MS = 5000;
const MIN_FRAMES = 10;
const FRAMES_TO_SAMPLE = 30;

type FrameSystemSnapshot = Array<{ name: string; ticks: number }>;

type SceneProbe = {
  /** The dev/e2e witness: the wired frame systems with per-system tick counts. */
  frameSystems: () => FrameSystemSnapshot;
};

type FrameSample = {
  before: FrameSystemSnapshot;
  after: FrameSystemSnapshot;
  frames: number;
};

type PerfContractInput = {
  markMs?: number | undefined;
  frameSample?: FrameSample | undefined;
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

function matchesDocumentedOrder(snapshot: FrameSystemSnapshot): boolean {
  const names = snapshot.map((system) => system.name);
  return (
    names.length === DOCUMENTED_ORDER.length &&
    DOCUMENTED_ORDER.every((name, index) => names[index] === name)
  );
}

/** The deterministic hard assertions, isolated so negative proofs run the same code. */
function assertPerfContract({ markMs, frameSample }: PerfContractInput): void {
  if (markMs === undefined || !Number.isFinite(markMs)) {
    throw new Error('interactive mark missing or invalid');
  }
  if (markMs > MARK_LIMIT_MS) {
    throw new Error(`interactive mark startTime ${markMs} ms exceeds ${MARK_LIMIT_MS} ms budget`);
  }
  if (frameSample === undefined) {
    throw new Error('frame sample missing or invalid');
  }
  const { before, after, frames } = frameSample;
  if (!Number.isInteger(frames) || frames <= 0) {
    throw new Error(`non-positive frame count: ${frames}`);
  }
  if (frames < MIN_FRAMES) {
    throw new Error(`too few animation frames observed: ${frames}`);
  }
  if (before.length === 0 || after.length === 0) {
    throw new Error('no frame systems to sample');
  }
  if (!matchesDocumentedOrder(before)) {
    throw new Error('frame order before sampling differs from documented order');
  }
  if (!matchesDocumentedOrder(after)) {
    throw new Error('frame order after sampling differs from documented order');
  }
  DOCUMENTED_ORDER.forEach((name, index) => {
    const delta = (after[index]?.ticks ?? 0) - (before[index]?.ticks ?? 0);
    if (delta !== frames) {
      throw new Error(`system ${name} tick delta ${delta} does not match ${frames} frames`);
    }
  });
}

/** Capture the exact thrown message so a negative proof can log and assert it. */
function captureThrow(input: PerfContractInput): string {
  try {
    assertPerfContract(input);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error('assertPerfContract did not throw for an invalid budget');
}

const waitForReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(
    () => (window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady === true,
    undefined,
    { timeout: 20_000 },
  );
};

test('dev boot meets the interactive mark and the deterministic frame contract @ci', async ({
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
  // Exactly one mark; anything else fails closed via assertPerfContract's mark guard.
  const markMs = starts.length === 1 ? starts[0] : undefined;
  console.log(
    `interactive mark startTime: ${markMs ?? 'missing'} ms (budget <= ${MARK_LIMIT_MS} ms)`,
  );

  const frameSample = await page.evaluate(
    (frames) =>
      new Promise<FrameSample>((resolve, reject) => {
        const scene = (window as unknown as { __tinyTracksScene?: SceneProbe }).__tinyTracksScene;
        if (!scene) {
          reject(new Error('dev scene handle missing'));
          return;
        }
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
          const after = read();
          const sampledBefore = before ?? [];
          if (sampledBefore.length === 0 || after.length === 0) {
            reject(new Error('no frame systems to sample'));
            return;
          }
          resolve({ before: sampledBefore, after, frames: observed - 1 });
        };
        requestAnimationFrame(tick);
      }),
    FRAMES_TO_SAMPLE,
  );

  assertPerfContract({ markMs, frameSample });

  console.log(
    `frame contract: ${DOCUMENTED_ORDER.length} systems over ${frameSample.frames} observed frames`,
  );
  test.info().attach('perf-budget-hard-gate', {
    body: JSON.stringify({
      markMs,
      markLimitMs: MARK_LIMIT_MS,
      documentedOrder: [...DOCUMENTED_ORDER],
      framesObserved: frameSample.frames,
      tickDeltas: frameSample.after.map((system, index) => ({
        name: system.name,
        delta: system.ticks - (frameSample.before[index]?.ticks ?? 0),
      })),
    }),
    contentType: 'application/json',
  });
});

/** A passing frame sample used so each negative proof fails on the field it targets. */
function validFrameSample(): FrameSample {
  return {
    before: DOCUMENTED_ORDER.map((name) => ({ name, ticks: 100 })),
    after: DOCUMENTED_ORDER.map((name) => ({ name, ticks: 130 })),
    frames: 30,
  };
}

test('a deliberately late interactive mark fails the mark assertion @ci', () => {
  const input: PerfContractInput = { markMs: 5001, frameSample: validFrameSample() };
  const expected = 'interactive mark startTime 5001 ms exceeds 5000 ms budget';
  const message = captureThrow(input);
  console.log(`late-mark negative run threw: ${message}`);
  expect(message).toBe(expected);
  expect(() => assertPerfContract(input)).toThrow(expected);
});

test('a deliberately over-ticking frame sample fails the frame contract @ci', () => {
  const sample = validFrameSample();
  sample.after[0] = { name: 'day-ambience', ticks: 131 };
  const input: PerfContractInput = { markMs: 1000, frameSample: sample };
  const expected = 'system day-ambience tick delta 31 does not match 30 frames';
  const message = captureThrow(input);
  console.log(`over-tick negative run threw: ${message}`);
  expect(message).toBe(expected);
  expect(() => assertPerfContract(input)).toThrow(expected);
});
