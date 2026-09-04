import type { Page } from '@playwright/test';

/**
 * Empties the meadow through the same store call the parent gate uses.
 *
 * Fresh boots now seed a rideable starter railway (an ordinary autosaved
 * world), so specs that build their own fixed layout must clear the meadow
 * first instead of assuming empty grass.
 */
export async function clearMeadow(page: Page): Promise<void> {
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
