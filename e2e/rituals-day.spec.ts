import { expect, type Page, test } from '@playwright/test';

import { watchConsoleErrors } from './helpers';

/**
 * The daylight greetings are a scene-level promise: after the clock settles
 * on a phase, its moment becomes visible without a parent lifting a finger.
 * The director's settle rule is unit-tested in `rituals.test.ts`; what only a
 * real browser can prove is that the clock → director → stage wiring lands
 * and that each greeting paints the right actors.
 *
 * Screenshots are evidence, not committed artifacts: they live under the
 * gitignored `.conductor/media/` tree and are named per settled phase.
 */

type RitualWitness = {
  activeGreeting: string | null;
  pendingPhase: string | null;
  level: number;
  chorusCount: number;
  butterflyCount: number;
  glowLevel: number;
};

type SceneHandle = {
  dayPhase(): string;
  setDayPhase(phase: string): void;
  rituals(): RitualWitness;
};

const MEDIA_DIR = '.conductor/media/20261128-rituals-day-weather';

const CASES = [
  { phase: 'dawn', away: 'noon', greeting: 'dawn-chorus', file: 'dawn.png' },
  { phase: 'morning', away: 'dawn', greeting: 'morning-butterflies', file: 'morning.png' },
  { phase: 'noon', away: 'dawn', greeting: 'noon-full-sun', file: 'noon.png' },
] as const;

const ready = (page: Page) =>
  page.waitForFunction(
    () => Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
    undefined,
    { timeout: 20_000 },
  );

const rituals = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __tinyTracksScene?: SceneHandle }).__tinyTracksScene?.rituals() ??
      null,
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

test('dawn, morning and noon each greet on stage once the clock settles', async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await ready(page);

  for (const greetingCase of CASES) {
    await test.step(`${greetingCase.phase}: ${greetingCase.greeting}`, async () => {
      await settleOn(page, greetingCase.phase, greetingCase.away);

      // The settle window then the fade-in both have to elapse before the
      // moment is at full opacity — wait on the real frame-driven witness.
      await page.waitForFunction(
        (expected) => {
          const witness = (
            window as unknown as { __tinyTracksScene?: SceneHandle }
          ).__tinyTracksScene?.rituals();
          return witness?.activeGreeting === expected && witness.level > 0.8;
        },
        greetingCase.greeting,
        { timeout: 20_000 },
      );

      const witness = await rituals(page);
      expect(witness, 'the scene exposes its day-greeting witness').not.toBeNull();
      if (!witness) return;
      expect(witness.activeGreeting).toBe(greetingCase.greeting);
      expect(witness.chorusCount).toBeLessThanOrEqual(20); // NFR-1: fixed cap.
      expect(witness.butterflyCount).toBeLessThanOrEqual(28); // 14 × 2 wings.

      if (greetingCase.phase === 'dawn') {
        expect(witness.chorusCount).toBe(20);
        expect(witness.butterflyCount).toBe(0);
      } else if (greetingCase.phase === 'morning') {
        expect(witness.butterflyCount).toBeGreaterThan(0);
        expect(witness.chorusCount).toBe(0);
      } else {
        expect(witness.glowLevel).toBeGreaterThan(0.8);
        expect(witness.chorusCount).toBe(20); // critters at their liveliest
      }

      await page.screenshot({ path: `${MEDIA_DIR}/${greetingCase.file}` });
    });
  }

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
