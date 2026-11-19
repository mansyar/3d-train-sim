import type { Page } from '@playwright/test';

/**
 * Empties the meadow through the same store call the parent gate uses.
 *
 * Fresh boots now seed a rideable starter railway (an ordinary autosaved
 * world), so specs that build their own fixed layout must clear the meadow
 * first instead of assuming empty grass.
 *
 * The boot read is asynchronous: `__tinyTracksWorld` exists before the stored
 * world has been hydrated, so a reset that lands early is silently undone when
 * hydration completes afterwards. Waiting for the readiness flag first makes
 * the reset the last word on the world rather than a race with the snapshot.
 */
export async function clearMeadow(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady === true,
    undefined,
    { timeout: 20_000 },
  );
  await page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: { reset: () => void } })
      .__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    world.reset();
  });
}

/**
 * Whether a console-error message matches the known-environmental WebKit
 * blob: texture-fetch rejection, verbatim from the field record:
 * `Fetch API cannot load blob:… due to access control checks`.
 *
 * Why an allowlist at all: the tablet/phone device profiles run headless
 * WebKit, and under load it intermittently rejects GLTFLoader's internal
 * `blob:`-URL texture fetches (the embedded-PNG GLBs: hills, crossing,
 * switches). The noise has tripped ONLY zero-console-error assertions while
 * every functional assertion kept passing — across specs (wagon-workshop,
 * undo, starter-railway) and releases (v0.5.0–v0.7.0). Field record:
 * `conductor/archive/wagon-workshop_20260904/plan.md` and
 * `conductor/archive/release-v0.7.0_20260904/plan.md`. Runbook:
 * `e2e/README.md` (track `e2e-stability_20260904`).
 *
 * Scope: the three-substring conjunction below is the entire allowlist —
 * anything else (including the rarer `colormap.png` load variant seen once
 * in the field) still fails the suite.
 */
export function isEnvironmentalConsoleNoise(message: string): boolean {
  return (
    message.includes('Fetch API cannot load') &&
    message.includes('blob:') &&
    message.includes('due to access control checks')
  );
}

/**
 * Attaches the standard console-error collectors used by every spec and
 * returns the live error array (assert `expect(errors).toEqual([])`; reset
 * with `errors.length = 0` around page teardowns such as reloads).
 *
 * Console errors matching `isEnvironmentalConsoleNoise` are dropped here —
 * the suite's single allowlist site. Page errors (uncaught exceptions) are
 * real crashes and are NEVER allowlisted.
 */
export function watchConsoleErrors(page: Page): string[] {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !isEnvironmentalConsoleNoise(message.text())) {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));
  return consoleErrors;
}

/** One slip-entry pose as read from the dev scene probe. */
export type SlipPose = { blade: number; lever: number | null };

/**
 * Serializable spec copy of the renderer's slip pose tables. Keeping them in
 * one place lets the live ride and the deterministic regression run through
 * the exact same recognition logic, so the fix can only change *how long* we
 * sample, never what counts as a road.
 */
export type SlipRoadTables = {
  entries: readonly string[];
  bladeTable: Readonly<Record<string, Readonly<Record<string, number>>>>;
  leverTable: Readonly<Record<string, number>>;
  requiredBlades: readonly string[];
  requiredRoads: readonly string[];
  bladeTolerance: number;
  leverTolerance: number;
};

/** Accumulated settled-road sightings across the frames sampled so far. */
export type SlipSightings = {
  bladeKeys: Set<string>;
  roadKeys: Set<string>;
  samples: number;
  frames: number;
  complete: boolean;
};

export type SlipSampleOutcome = {
  sightings: SlipSightings;
  timedOut: boolean;
  elapsedMs: number;
};

/** Yields one frame's per-entry poses, or null once no more frames are available. */
export type SlipFrameSource = () => Promise<readonly (SlipPose | null)[] | null>;

export function createSlipSightings(): SlipSightings {
  return {
    bladeKeys: new Set<string>(),
    roadKeys: new Set<string>(),
    samples: 0,
    frames: 0,
    complete: false,
  };
}

/**
 * Folds one frame of per-entry poses into the accumulator. Only a settled,
 * road-paired sighting counts: the blade must sit on a table value AND the
 * global lever on the paired road angle. This is the rule the pre-fix live
 * assertion used, preserved verbatim so the regression isolates the sampler.
 */
export function recordSlipFrame(
  sightings: SlipSightings,
  poses: readonly (SlipPose | null)[],
  tables: SlipRoadTables,
): void {
  sightings.frames += 1;
  poses.forEach((pose, index) => {
    if (!pose) return;
    const lever = pose.lever;
    if (lever === null) return;
    const entry = tables.entries[index];
    if (!entry) return;
    const bladeByRoad = tables.bladeTable[entry];
    if (!bladeByRoad) return;
    for (const roadName of Object.keys(bladeByRoad)) {
      const blade = bladeByRoad[roadName];
      const expectedLever = tables.leverTable[roadName];
      if (blade === undefined || expectedLever === undefined) continue;
      if (
        Math.abs(blade - pose.blade) < tables.bladeTolerance &&
        Math.abs(expectedLever - lever) < tables.leverTolerance
      ) {
        sightings.samples += 1;
        sightings.bladeKeys.add(blade.toFixed(3));
        sightings.roadKeys.add(expectedLever.toFixed(3));
        break;
      }
    }
  });
  sightings.complete =
    tables.requiredBlades.every((key) => sightings.bladeKeys.has(key)) &&
    tables.requiredRoads.every((key) => sightings.roadKeys.has(key));
}

/** The missing required keys, in the order the failure message reports them. */
export function missingSlipKeys(
  sightings: SlipSightings,
  tables: SlipRoadTables,
): { missingBlades: string[]; missingRoads: string[] } {
  return {
    missingBlades: tables.requiredBlades.filter((key) => !sightings.bladeKeys.has(key)),
    missingRoads: tables.requiredRoads.filter((key) => !sightings.roadKeys.has(key)),
  };
}

/** Failure text with frame progress appended, for both the live test and regression. */
export function formatSlipFailure(outcome: SlipSampleOutcome, tables: SlipRoadTables): string {
  const { missingBlades, missingRoads } = missingSlipKeys(outcome.sightings, tables);
  return (
    `missing blades: ${missingBlades.join(', ')}; missing roads: ${missingRoads.join(', ')}; ` +
    `seen blades: ${[...outcome.sightings.bladeKeys].join(', ')}; seen roads: ${[...outcome.sightings.roadKeys].join(', ')}; ` +
    `frames sampled: ${outcome.sightings.frames}; elapsed ms: ${outcome.elapsedMs}` +
    `${outcome.timedOut ? '; SAFETY CAP REACHED' : ''}`
  );
}

/**
 * The old fixed-window sampler, retained only by the regression case. It
 * stops after `maxPolls` reads regardless of how few roads a slow renderer
 * has actually cycled through — the release `44475228404` failure mode.
 */
export async function sampleSlipFixedWindow(
  nextFrame: SlipFrameSource,
  tables: SlipRoadTables,
  maxPolls: number,
): Promise<SlipSampleOutcome> {
  const sightings = createSlipSightings();
  const start = Date.now();
  for (let poll = 0; poll < maxPolls; poll += 1) {
    const poses = await nextFrame();
    if (!poses) break;
    recordSlipFrame(sightings, poses, tables);
    if (sightings.complete) break;
  }
  return { sightings, timedOut: !sightings.complete, elapsedMs: Date.now() - start };
}

/**
 * Frame-aware sampler: folds frames until every required key is witnessed.
 * The budget is a frame count plus a wall-clock safety cap (a backstop for a
 * stalled loop) — never a fixed poll count — so a slow software renderer
 * cannot expire the window before the east road cycles around.
 */
export async function sampleSlipRoads(
  nextFrame: SlipFrameSource,
  tables: SlipRoadTables,
  options: { maxFrames: number; safetyMs: number },
): Promise<SlipSampleOutcome> {
  const sightings = createSlipSightings();
  const start = Date.now();
  let timedOut = false;
  while (!sightings.complete) {
    if (sightings.frames >= options.maxFrames || Date.now() - start >= options.safetyMs) {
      timedOut = true;
      break;
    }
    const poses = await nextFrame();
    if (!poses) {
      timedOut = true;
      break;
    }
    recordSlipFrame(sightings, poses, tables);
  }
  return { sightings, timedOut, elapsedMs: Date.now() - start };
}
