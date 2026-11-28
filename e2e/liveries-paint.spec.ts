import { expect, type Page, test } from '@playwright/test';

import { watchConsoleErrors } from './helpers';

const KINDS = ['steam', 'diesel', 'tram', 'express', 'freight', 'bullet'] as const;
const PAINTS = [
  { id: 'cherry', hex: '#e8553f' },
  { id: 'tangerine', hex: '#f49b32' },
  { id: 'sunshine', hex: '#f5cf3f' },
  { id: 'clover', hex: '#59b45a' },
  { id: 'sky', hex: '#3f9bd8' },
  { id: 'grape', hex: '#9b6bd6' },
] as const;

type LiveryAudioWitness = {
  lastReward: 'paint' | 'stamp' | null;
  plays: number;
  audiblePlays: number;
  muted: boolean;
};

type LiveryProbe = {
  bodyHex(id: string): string | null;
  bounceCount(id: string): number;
  audio(): LiveryAudioWitness;
};

type LiverySnapshot = {
  bodies: Record<string, string | null>;
  bounces: Record<string, number>;
  audio: LiveryAudioWitness;
};

/** Reads the dev-only witness the scene publishes for paint assertions. */
async function probe(page: Page, ids: readonly string[]): Promise<LiverySnapshot | null> {
  return page.evaluate(
    (vehicleIds) => {
      const dev = window as unknown as { __tinyTracksLivery?: LiveryProbe };
      const witness = dev.__tinyTracksLivery;
      if (!witness) return null;
      const bodies: Record<string, string | null> = {};
      const bounces: Record<string, number> = {};
      for (const id of vehicleIds) {
        bodies[id] = witness.bodyHex(id);
        bounces[id] = witness.bounceCount(id);
      }
      return { bodies, bounces, audio: witness.audio() };
    },
    [...ids],
  );
}

async function openDrawer(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(
    () => (window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady === true,
    undefined,
    { timeout: 60_000 },
  );
  await page.click('[data-drawer="trains"]');
  await expect(page.locator('.livery-section')).toBeVisible();
  // The body witness is installed by the scene; without it the repaint cannot
  // be observed at all, so fail loudly rather than passing vacuously.
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { __tinyTracksLivery?: LiveryProbe }).__tinyTracksLivery
        ?.bodyHex === 'function',
    undefined,
    { timeout: 20_000 },
  );
}

test('a swatch repaints the whole consist of every locomotive', async ({ page }) => {
  const errors = watchConsoleErrors(page);
  await openDrawer(page);

  for (const kind of KINDS) {
    await page.click(`.train-slot[data-train="${kind}"]`);
    const vehicleIds = [`${kind}:loco`, `${kind}:lead`, `${kind}:rear`];
    for (const paint of PAINTS) {
      await page.click(`.livery-section [data-paint="${paint.id}"]`);
      const seen = await probe(page, vehicleIds);
      expect(seen, `${kind}/${paint.id}: paint witness missing`).not.toBeNull();
      for (const id of vehicleIds) {
        expect(seen?.bodies[id], `${id} after ${paint.id}`).toBe(paint.hex);
      }
    }
  }
  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
});

test('muted swatches still repaint with zero audible plays', async ({ page }) => {
  const errors = watchConsoleErrors(page);
  await openDrawer(page);
  await page.click('.mute-toggle');
  await expect(page.locator('.mute-toggle')).toHaveAttribute('aria-pressed', 'true');

  const before = await probe(page, ['steam:loco']);
  expect(before?.audio.muted).toBe(true);
  const playsBefore = before?.audio.plays ?? 0;
  const audibleBefore = before?.audio.audiblePlays ?? 0;

  for (const paint of PAINTS) {
    await page.click(`.livery-section [data-paint="${paint.id}"]`);
  }
  const after = await probe(page, ['steam:loco', 'steam:lead', 'steam:rear']);
  for (const id of ['steam:loco', 'steam:lead', 'steam:rear']) {
    expect(after?.bodies[id], `${id} repaints while muted`).toBe('#9b6bd6');
  }
  expect(after?.audio.plays, 'muted taps still wind the reward').toBe(playsBefore + PAINTS.length);
  expect(after?.audio.audiblePlays, 'AC-5: zero audible plays while muted').toBe(audibleBefore);
  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
});

test.describe('reduced motion', () => {
  test('paint lands in its final color with no bounce', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = watchConsoleErrors(page);
    await openDrawer(page);
    await page.click('.livery-section [data-paint="sky"]');
    const seen = await probe(page, ['steam:loco', 'steam:lead']);
    expect(seen?.bodies['steam:loco']).toBe('#3f9bd8');
    expect(seen?.bodies['steam:lead']).toBe('#3f9bd8');
    expect(seen?.bounces['steam:loco'] ?? 0, 'no bounce frames under reduced motion').toBe(0);
    expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
  });
});
