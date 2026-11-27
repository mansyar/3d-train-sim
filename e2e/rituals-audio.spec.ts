import { expect, type Page, test } from '@playwright/test';

import { watchConsoleErrors } from './helpers';

// WebKit's headless build in this lane has no AudioContext, so it cannot
// witness an unlock. Chromium is the installed engine that exposes the real
// resume path; WebKit behaviour is covered by the other rituals specs.
test.use({ browserName: 'chromium' });

/**
 * The five greeting motifs are synthesized, gesture-unlocked and instantly
 * muted. Only a real browser can prove the unlock and mute seams still hold
 * once motifs are attached: the witness proves which motif wound and whether
 * it was audible, and an instrumented AudioContext.resume proves the existing
 * gesture-unlock path ran. No microphone, no network, no audio fixtures.
 */

type Greeting =
  | 'dawn-chorus'
  | 'morning-butterflies'
  | 'noon-full-sun'
  | 'dusk-windows'
  | 'night-fireflies';

type RitualAudioWitness = {
  lastMotif: Greeting | null;
  plays: number;
  audiblePlays: number;
  muted: boolean;
  suspended: boolean;
};

type DuskNightWitness = { lullabyHooks: number; lullabyFires: number };

type SceneHandle = {
  setDayPhase(phase: string): void;
  ritualAudio(): RitualAudioWitness;
  nightRituals(): DuskNightWitness;
};

const ready = (page: Page) =>
  page.waitForFunction(
    () => Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
    undefined,
    { timeout: 20_000 },
  );

const ritualAudio = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __tinyTracksScene?: SceneHandle }).__tinyTracksScene?.ritualAudio() ??
      null,
  );

const nightRituals = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as unknown as { __tinyTracksScene?: SceneHandle }
      ).__tinyTracksScene?.nightRituals() ?? null,
  );

/** Counts explicit AudioContext resumes — the gesture-unlock seam. */
const resumeCount = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __ritualAudioProbe?: { resumes: number } }).__ritualAudioProbe
        ?.resumes ?? -1,
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

async function waitForMotif(page: Page, greeting: Greeting): Promise<RitualAudioWitness> {
  await page.waitForFunction(
    (expected) => {
      const witness = (
        window as unknown as { __tinyTracksScene?: SceneHandle }
      ).__tinyTracksScene?.ritualAudio();
      return witness?.lastMotif === expected;
    },
    greeting,
    { timeout: 20_000 },
  );
  const witness = await ritualAudio(page);
  expect(witness, 'the scene exposes its greeting-audio witness').not.toBeNull();
  if (!witness) throw new Error('greeting-audio witness missing');
  return witness;
}

test('greeting motifs stay locked before a gesture and die instantly on mute', async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors = watchConsoleErrors(page);

  // Count resumes without changing what the app's voices do with the context.
  await page.addInitScript(() => {
    const probe: { resumes: number } = { resumes: 0 };
    (window as unknown as { __ritualAudioProbe: typeof probe }).__ritualAudioProbe = probe;
    const NativeContext = window.AudioContext;
    if (!NativeContext) return;
    const resume = NativeContext.prototype.resume;
    NativeContext.prototype.resume = function (...args) {
      probe.resumes += 1;
      return resume.apply(this, args);
    };
  });

  await page.goto('/');
  await ready(page);

  await test.step('a motif may wind before a gesture, but nothing resumes audio', async () => {
    await settleOn(page, 'dawn', 'noon');
    const witness = await waitForMotif(page, 'dawn-chorus');
    expect(witness.plays).toBeGreaterThan(0);
    expect(witness.audiblePlays).toBeGreaterThan(0);
    expect(await resumeCount(page)).toBe(0);
  });

  await test.step('the first real gesture unlocks playback', async () => {
    await page.locator('.day-toggle').click();
    await page.waitForFunction(
      () =>
        ((window as unknown as { __ritualAudioProbe?: { resumes: number } }).__ritualAudioProbe
          ?.resumes ?? 0) > 0,
      undefined,
      { timeout: 15_000 },
    );
    expect(await resumeCount(page)).toBeGreaterThan(0);
  });

  await test.step('a motif after the unlock is audible', async () => {
    const before = await ritualAudio(page);
    expect(before).not.toBeNull();
    if (!before) return;
    await settleOn(page, 'morning', 'dawn');
    const witness = await waitForMotif(page, 'morning-butterflies');
    expect(witness.plays).toBeGreaterThan(before.plays);
    expect(witness.audiblePlays).toBeGreaterThan(before.audiblePlays);
  });

  await test.step('instant mute: motifs wind but say nothing', async () => {
    const before = await ritualAudio(page);
    expect(before).not.toBeNull();
    if (!before) return;
    await page.locator('.mute-toggle').click();
    await expect(page.locator('.mute-toggle')).toHaveAttribute('aria-pressed', 'true');
    expect((await ritualAudio(page))?.muted).toBe(true);

    await settleOn(page, 'noon', 'morning');
    const muted = await waitForMotif(page, 'noon-full-sun');
    expect(muted.plays).toBeGreaterThan(before.plays);
    expect(muted.audiblePlays).toBe(before.audiblePlays);
  });

  await test.step('unmuting lets the next motif speak', async () => {
    const before = await ritualAudio(page);
    expect(before).not.toBeNull();
    if (!before) return;
    await page.locator('.mute-toggle').click();
    await expect(page.locator('.mute-toggle')).toHaveAttribute('aria-pressed', 'false');
    expect((await ritualAudio(page))?.muted).toBe(false);

    await settleOn(page, 'dusk', 'noon');
    const witness = await waitForMotif(page, 'dusk-windows');
    expect(witness.audiblePlays).toBeGreaterThan(before.audiblePlays);
  });

  await test.step('night still rides exactly one lullaby hook', async () => {
    await settleOn(page, 'night', 'dusk');
    await waitForMotif(page, 'night-fireflies');
    const witness = await nightRituals(page);
    expect(witness?.lullabyHooks).toBe(1);
    expect(witness?.lullabyFires).toBeGreaterThan(0);
  });

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
