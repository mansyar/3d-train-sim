import { expect, type Page, test } from '@playwright/test';

import { watchConsoleErrors } from './helpers';

/**
 * AC-5 / FR-8: spamming the sun/moon control must end in exactly one greeting,
 * for the phase left resting when the taps stop. The settle rule itself is
 * unit-tested in `src/state/rituals.test.ts`; what a browser adds is proof that
 * the real button → clock → director → stage path honours it: no greeting
 * starts mid-spam, and the one that follows belongs to the settled phase.
 *
 * The taps are dispatched with the button's own DOM `click()` inside a single
 * `page.evaluate`, so they are genuinely rapid (no Playwright round-trip) and
 * no animation frame can slip between them to settle an intermediate phase.
 */

type Greeting =
  | 'dawn-chorus'
  | 'morning-butterflies'
  | 'noon-full-sun'
  | 'dusk-windows'
  | 'night-fireflies';

type VoiceSnapshot = { activeGreeting: Greeting | null; level: number };
type NightStage = {
  lullabyFires: number;
  level: number;
  fireflyCount: number;
  settledCritterCount: number;
  fireflyRise: number;
};

type SceneHandle = {
  dayPhase(): string;
  setDayPhase(phase: string): void;
  rituals(): VoiceSnapshot;
  nightRituals(): NightStage;
};

type SpamResult = {
  immediately: Greeting | null;
  levelImmediately: number;
  activations: Greeting[];
  lullabyDelta: number;
  finalPhase: string;
};

type NightSnapshot = Pick<
  NightStage,
  'level' | 'fireflyCount' | 'settledCritterCount' | 'fireflyRise'
>;
type TransitionResult = {
  nightInFlight: { level: number; fireflyCount: number };
  changes: Array<Greeting | null>;
  dayAtDawn: VoiceSnapshot | null;
  nightAtDawn: NightSnapshot | null;
  finalVoice: Greeting | null;
};

const ready = (page: Page) =>
  page.waitForFunction(
    () => Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
    undefined,
    // Software-GL CI runners boot the scene slowly; the cap only bites on a
    // real hang, never on a passing run.
    { timeout: 60_000 },
  );

test('rapid sun/moon taps play exactly one greeting for the settled phase', async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await ready(page);

  const result = await page.evaluate(
    (clicks) =>
      new Promise<SpamResult>((resolve) => {
        const scene = (window as unknown as { __tinyTracksScene?: SceneHandle }).__tinyTracksScene;
        if (!scene) throw new Error('dev scene handle missing');
        const button = document.querySelector<HTMLButtonElement>('.day-toggle');
        if (!button) throw new Error('sun/moon button missing');

        // Start from a known phase, then turn the page four times: the taps
        // visit morning → noon → dusk and come to rest on night.
        scene.setDayPhase('dawn');
        const lullabyBefore = scene.nightRituals().lullabyFires;
        for (let tap = 0; tap < clicks; tap += 1) button.click();

        // No animation frame has run since the first tap, so nothing can have
        // settled — an intermediate phase must not have greeted.
        const immediately = scene.rituals().activeGreeting;
        const levelImmediately = scene.rituals().level;

        // Count null → greeting transitions on the director's single voice for
        // longer than one greeting's stage time. One transition = one greeting.
        const activations: Greeting[] = [];
        let last = immediately;
        const start = performance.now();
        const tick = (): void => {
          const current = scene.rituals().activeGreeting;
          if (current !== last) {
            if (current !== null) activations.push(current);
            last = current;
          }
          if (performance.now() - start >= 5_200) {
            resolve({
              immediately,
              levelImmediately,
              activations,
              lullabyDelta: scene.nightRituals().lullabyFires - lullabyBefore,
              finalPhase: scene.dayPhase(),
            });
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    4,
  );

  await test.step('nothing greets in the middle of the spam', async () => {
    expect(result.immediately).toBeNull();
    expect(result.levelImmediately).toBe(0);
  });

  await test.step('only the settled phase greets, exactly once', async () => {
    expect(result.finalPhase).toBe('night');
    expect(result.activations).toEqual(['night-fireflies']);
    expect(result.lullabyDelta).toBe(1); // one hook, not a stacked second voice
  });

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

/**
 * F1: the spec's mid-greeting edge. Night is still on stage when the clock
 * settles on dawn; the handing over must hide night at once and keep the new
 * voice, even after the old night timer would have expired. Both stages are
 * watched through their dev witnesses, so overlap and a stale `release()` are
 * observed separately rather than inferred from a screenshot.
 */
test('night in flight yields cleanly to a dawn transition', async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await ready(page);

  const result = await page.evaluate(
    () =>
      new Promise<TransitionResult>((resolve, reject) => {
        const scene = (window as unknown as { __tinyTracksScene?: SceneHandle }).__tinyTracksScene;
        if (!scene) throw new Error('dev scene handle missing');

        const beginTransition = (): void => {
          const inFlight = scene.nightRituals();
          const nightInFlight = {
            level: inFlight.level,
            fireflyCount: inFlight.fireflyCount,
          };
          const changes: Array<Greeting | null> = [];
          let last = scene.rituals().activeGreeting; // night-fireflies
          let dayAtDawn: VoiceSnapshot | null = null;
          let nightAtDawn: NightSnapshot | null = null;
          const start = performance.now();
          // Game time is the rAF deltas the loop itself sees — the same time
          // base the stale night timer runs on. A slow runner delays frames,
          // so a wall-clock deadline could expire before the game has run
          // long enough for a stale release to strike; deadlines below are in
          // accumulated game time instead.
          let lastTick = start;
          let gameElapsed = 0;

          scene.setDayPhase('dawn'); // cross-family handoff: night -> dawn

          const tick = (now: number): void => {
            gameElapsed += now - lastTick;
            lastTick = now;
            const voice = scene.rituals().activeGreeting;
            if (voice !== last) {
              changes.push(voice);
              last = voice;
            }
            if (voice === 'dawn-chorus' && scene.rituals().level > 0.8 && nightAtDawn === null) {
              const day = scene.rituals();
              const night = scene.nightRituals();
              dayAtDawn = { activeGreeting: day.activeGreeting, level: day.level };
              nightAtDawn = {
                level: night.level,
                fireflyCount: night.fireflyCount,
                settledCritterCount: night.settledCritterCount,
                fireflyRise: night.fireflyRise,
              };
            }
            // Past the old night timer's expiry but before dawn's own end: a
            // stale release would have cleared the shared voice by now. The
            // wait is in game time, so it holds on any runner speed; the wall
            // failsafe only resolves early so the assertions fail clearly
            // instead of the promise hanging to the test timeout.
            if (dayAtDawn !== null && gameElapsed >= 4_500) {
              resolve({ nightInFlight, changes, dayAtDawn, nightAtDawn, finalVoice: voice });
              return;
            }
            if (now - start >= 60_000) {
              resolve({ nightInFlight, changes, dayAtDawn, nightAtDawn, finalVoice: voice });
              return;
            }
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        };

        const waitStart = performance.now();
        const waitForNight = (): void => {
          const night = scene.nightRituals();
          if (night.level > 0.8 && night.fireflyCount > 0) {
            beginTransition();
            return;
          }
          if (performance.now() - waitStart >= 60_000) {
            reject(new Error('night greeting never reached the stage'));
            return;
          }
          requestAnimationFrame(waitForNight);
        };

        scene.setDayPhase('noon');
        scene.setDayPhase('night');
        waitForNight();
      }),
  );

  await test.step('night was still on stage when the clock moved', async () => {
    expect(result.nightInFlight.level).toBeGreaterThan(0.8);
    expect(result.nightInFlight.fireflyCount).toBeGreaterThan(0);
  });

  await test.step('dawn speaks alone, with night fully hidden', async () => {
    expect(result.dayAtDawn).not.toBeNull();
    expect(result.dayAtDawn?.activeGreeting).toBe('dawn-chorus');
    expect(result.dayAtDawn?.level).toBeGreaterThan(0.8);
    expect(result.nightAtDawn?.level).toBe(0);
    expect(result.nightAtDawn?.fireflyCount).toBe(0);
    expect(result.nightAtDawn?.settledCritterCount).toBe(0);
    expect(result.nightAtDawn?.fireflyRise).toBe(0);
  });

  await test.step('one voice transition, no stale clobber', async () => {
    expect(result.changes).toEqual([null, 'dawn-chorus']);
    expect(result.finalVoice).toBe('dawn-chorus');
  });

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
