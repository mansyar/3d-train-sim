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

type SceneHandle = {
  dayPhase(): string;
  setDayPhase(phase: string): void;
  rituals(): { activeGreeting: Greeting | null; level: number };
  nightRituals(): { lullabyFires: number; level: number };
};

type SpamResult = {
  immediately: Greeting | null;
  levelImmediately: number;
  activations: Greeting[];
  lullabyDelta: number;
  finalPhase: string;
};

const ready = (page: Page) =>
  page.waitForFunction(
    () => Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
    undefined,
    { timeout: 20_000 },
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
