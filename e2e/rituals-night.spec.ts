import { expect, type Page, test } from '@playwright/test';

import { watchConsoleErrors } from './helpers';

/**
 * The dusk and night greetings are scene-level promises: once the clock settles
 * on a phase its moment paints itself. The director's settle rule is unit-tested
 * in `rituals.test.ts`; what only a real browser can prove is that the
 * clock → director → dusk/night stage wiring lands, that the warm windows and
 * settling critters show at dusk, that fireflies rise and the headlight beams
 * light at night, and that exactly one lullaby hook fires.
 *
 * Screenshots are evidence, not committed artifacts: they live under the
 * gitignored `.conductor/media/` tree and are named per settled phase.
 */

type DuskNightWitness = {
  activeGreeting: string | null;
  restingGreeting: string | null;
  pendingPhase: string | null;
  level: number;
  windowWarmth: number;
  settledCritterCount: number;
  fireflyRise: number;
  fireflyCount: number;
  headlightLevel: number;
  lullabyHooks: number;
  lullabyFires: number;
};

type SceneHandle = {
  dayPhase(): string;
  setDayPhase(phase: string): void;
  rituals(): { activeGreeting: string | null };
  nightRituals(): DuskNightWitness;
};

const MEDIA_DIR = '.conductor/media/20261128-rituals-day-weather';

const ready = (page: Page) =>
  page.waitForFunction(
    () => Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
    undefined,
    { timeout: 20_000 },
  );

const nightRituals = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as unknown as { __tinyTracksScene?: SceneHandle }
      ).__tinyTracksScene?.nightRituals() ?? null,
  );

/** Jump away first: `setPhase` is a no-op when already in the target phase. */
async function settleOn(page: Page, phase: string, away: string): Promise<void> {
  await page.evaluate(
    ({ target, other }) => {
      const scene = (window as unknown as { __tinyTracksScene?: SceneHandle }).__tinyTracksScene;
      if (!scene) throw new Error('dev scene handle missing');
      scene.setDayPhase(other);
      scene.setDayPhase(target);
    },
    { target: phase, other: away },
  );
}

test('dusk and night each greet on stage once the clock settles', async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await ready(page);

  await test.step('dusk: windows warm, critters settle', async () => {
    await settleOn(page, 'dusk', 'noon');

    // Settle window then fade-in both have to elapse before the moment is at
    // full opacity — wait on the real frame-driven witness.
    await page.waitForFunction(
      () => {
        const witness = (
          window as unknown as { __tinyTracksScene?: SceneHandle }
        ).__tinyTracksScene?.nightRituals();
        return witness?.activeGreeting === 'dusk-windows' && witness.level > 0.8;
      },
      undefined,
      { timeout: 20_000 },
    );

    const witness = await nightRituals(page);
    expect(witness, 'the scene exposes its dusk/night witness').not.toBeNull();
    if (!witness) return;
    expect(witness.activeGreeting).toBe('dusk-windows');
    expect(witness.windowWarmth).toBeGreaterThan(0.8); // boosted from the 0.55 bed
    expect(witness.settledCritterCount).toBeGreaterThan(0);
    expect(witness.settledCritterCount).toBeLessThanOrEqual(16); // NFR-1 cap
    expect(witness.fireflyCount).toBe(0); // night's surge waits its turn
    expect(witness.lullabyFires).toBe(0); // no lullaby at dusk

    await page.screenshot({ path: `${MEDIA_DIR}/dusk.png` });
  });

  await test.step('night: fireflies rise, headlight on, one lullaby', async () => {
    await settleOn(page, 'night', 'noon');

    await page.waitForFunction(
      () => {
        const witness = (
          window as unknown as { __tinyTracksScene?: SceneHandle }
        ).__tinyTracksScene?.nightRituals();
        return witness?.activeGreeting === 'night-fireflies' && witness.level > 0.8;
      },
      undefined,
      { timeout: 20_000 },
    );

    const witness = await nightRituals(page);
    expect(witness, 'the scene exposes its dusk/night witness').not.toBeNull();
    if (!witness) return;
    expect(witness.activeGreeting).toBe('night-fireflies');
    expect(witness.fireflyCount).toBeGreaterThan(0);
    expect(witness.fireflyCount).toBeLessThanOrEqual(24); // NFR-1 cap
    expect(witness.fireflyRise).toBeGreaterThan(0.8);
    expect(witness.headlightLevel).toBeGreaterThan(0.9);
    expect(witness.windowWarmth).toBeGreaterThan(0.9);
    expect(witness.settledCritterCount).toBe(0);
    expect(witness.lullabyHooks).toBe(1); // the Phase 4 attachment point
    expect(witness.lullabyFires).toBe(1); // exactly one voice for one greeting

    await page.screenshot({ path: `${MEDIA_DIR}/night.png` });
  });

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
