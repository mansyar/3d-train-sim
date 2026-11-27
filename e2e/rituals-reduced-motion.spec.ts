import { expect, type Page, test } from '@playwright/test';

import { watchConsoleErrors } from './helpers';

/**
 * FR-9 / AC-6: under `prefers-reduced-motion` every greeting is painted at its
 * resting pose the instant the clock changes phase — no settle timer, no RAF
 * loop to advance a fade. The spin loop renders one static frame and never
 * calls the frame callback (see `src/scene/spin-loop.ts`), so `tick()` cannot
 * fire a greeting here: the resting witnesses, not `activeGreeting`, are the
 * honest proof of what a reduced-motion hand sees.
 *
 * The phase transition paints synchronously (`dayClock.setPhase` announces its
 * listeners inline), so each assertion reads the witness straight after the
 * `setDayPhase` call — deliberately with no `waitForFunction`, which would poll
 * on RAF and prove nothing about an instant pose.
 */

type RitualWitness = {
  activeGreeting: string | null;
  restingGreeting: string | null;
  pendingPhase: string | null;
  level: number;
  chorusCount: number;
  butterflyCount: number;
  glowLevel: number;
};

type DuskNightWitness = {
  activeGreeting: string | null;
  restingGreeting: string | null;
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
  setDayPhase(phase: string): void;
  rituals(): RitualWitness;
  nightRituals(): DuskNightWitness;
};

type Case = {
  phase: string;
  away: string;
  greeting: string;
  stage: 'day' | 'night';
};

const CASES: readonly Case[] = [
  { phase: 'dawn', away: 'noon', greeting: 'dawn-chorus', stage: 'day' },
  { phase: 'morning', away: 'dawn', greeting: 'morning-butterflies', stage: 'day' },
  { phase: 'noon', away: 'dawn', greeting: 'noon-full-sun', stage: 'day' },
  { phase: 'dusk', away: 'noon', greeting: 'dusk-windows', stage: 'night' },
  { phase: 'night', away: 'noon', greeting: 'night-fireflies', stage: 'night' },
];

const ready = (page: Page) =>
  page.waitForFunction(
    () => Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
    undefined,
    { timeout: 20_000 },
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

/** One read of both stages, so the two resting witnesses cannot race each other. */
const witnesses = (page: Page) =>
  page.evaluate(() => {
    const scene = (window as unknown as { __tinyTracksScene?: SceneHandle }).__tinyTracksScene;
    if (!scene) throw new Error('dev scene handle missing');
    return { day: scene.rituals(), night: scene.nightRituals() };
  });

test('reduced motion freezes every greeting at its resting pose', async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors = watchConsoleErrors(page);

  // Set before navigation: the app reads matchMedia once at boot.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await ready(page);

  for (const greetingCase of CASES) {
    await test.step(`${greetingCase.phase}: ${greetingCase.greeting}`, async () => {
      await settleOn(page, greetingCase.phase, greetingCase.away);

      // No RAF wait — the transition already painted the frozen pose.
      const first = await witnesses(page);
      if (greetingCase.stage === 'day') {
        expect(first.day.restingGreeting).toBe(greetingCase.greeting);
        expect(first.night.restingGreeting).toBeNull();
        expect(first.day.level).toBe(1); // frozen at full pose, not an envelope
        expect(first.day.activeGreeting).toBeNull(); // no tick fired a live greeting

        if (greetingCase.greeting === 'dawn-chorus') {
          expect(first.day.chorusCount).toBeGreaterThan(0);
          expect(first.day.chorusCount).toBeLessThanOrEqual(20); // NFR-1 cap
          expect(first.day.butterflyCount).toBe(0);
        } else if (greetingCase.greeting === 'morning-butterflies') {
          expect(first.day.butterflyCount).toBeGreaterThan(0);
          expect(first.day.butterflyCount).toBeLessThanOrEqual(28); // 14 × 2 wings
          expect(first.day.chorusCount).toBe(0);
        } else {
          expect(first.day.glowLevel).toBeGreaterThan(0.8);
          expect(first.day.chorusCount).toBeGreaterThan(0);
        }
      } else {
        expect(first.night.restingGreeting).toBe(greetingCase.greeting);
        expect(first.day.restingGreeting).toBeNull();
        expect(first.night.level).toBe(1);
        expect(first.night.activeGreeting).toBeNull();

        if (greetingCase.greeting === 'dusk-windows') {
          expect(first.night.windowWarmth).toBeGreaterThan(0.8);
          expect(first.night.settledCritterCount).toBeGreaterThan(0);
          expect(first.night.settledCritterCount).toBeLessThanOrEqual(16); // NFR-1 cap
          expect(first.night.fireflyCount).toBe(0);
          expect(first.night.lullabyFires).toBe(0); // no lullaby at dusk
        } else {
          expect(first.night.fireflyRise).toBe(1); // frozen at full hover
          expect(first.night.fireflyCount).toBeGreaterThan(0);
          expect(first.night.fireflyCount).toBeLessThanOrEqual(24); // NFR-1 cap
          expect(first.night.headlightLevel).toBe(1);
          expect(first.night.lullabyHooks).toBe(1);
          expect(first.night.lullabyFires).toBeGreaterThan(0); // the night hook fired
        }
      }

      // Frozen means nothing advances with time: a wall-clock pause (no RAF
      // dependency) must leave every witnessed field byte-for-byte identical.
      await page.waitForTimeout(250);
      expect(await witnesses(page), 'no animation under reduced motion').toEqual(first);
    });
  }

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
