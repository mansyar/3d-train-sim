import { expect, test } from '@playwright/test';

import { watchConsoleErrors } from './helpers';

/**
 * The sun/moon rail button: the toddler turns the page on the day.
 *
 * The clock itself — phase order, the jump landing on the first moment of its
 * phase, the persisted preference — is proven exhaustively by unit tests in
 * `day-clock.test.ts`, `save.test.ts` and `persistence.test.ts`. What only a
 * real browser can witness is the wiring: tap → clock → sky, the icon
 * previewing the phase a tap *brings*, the phase surviving a reload, and a
 * legacy save from before the button existed still booting to mid-morning.
 *
 * The day drifts on its own (150 s per day), so no assertion here pins a
 * starting phase or counts a fixed number of turns. The icon invariant is
 * read as "icon and phase agree right now", which stays true at any point in
 * the drift; the reload witness parks on `night`, the longest phase, so drift
 * cannot outrun it between tap and read.
 */

type SceneHandle = { dayPhase: () => string };

/** Phases after which the next tap brings dusk or night — the icon previews a sun. */
const SUN_AHEAD = ['noon', 'dusk', 'night'];

const ready = (page: import('@playwright/test').Page) =>
  page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );

const phase = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    (window as unknown as { __tinyTracksScene?: SceneHandle }).__tinyTracksScene?.dayPhase(),
  );

/** Taps the sun/moon button and waits for the clock to land on a new phase. */
async function turnDay(page: import('@playwright/test').Page): Promise<string> {
  const before = await phase(page);
  await page.locator('.day-toggle').click();
  await page.waitForFunction(
    (previous) =>
      (window as unknown as { __tinyTracksScene?: SceneHandle }).__tinyTracksScene?.dayPhase() !==
      previous,
    before,
  );
  return (await phase(page)) as string;
}

/** The phase stored in IndexedDB, or null when the snapshot omits preferences. */
const storedPhase = (page: import('@playwright/test').Page) =>
  page.evaluate(
    () =>
      new Promise<string | null>((resolve, reject) => {
        const open = indexedDB.open('tiny-tracks', 1);
        open.onerror = () => reject(new Error('storage open failed'));
        open.onsuccess = () => {
          const read = open.result
            .transaction('worlds', 'readonly')
            .objectStore('worlds')
            .get('current');
          read.onerror = () => reject(new Error('storage read failed'));
          read.onsuccess = () => {
            const snapshot = read.result as { preferences?: { dayPhase?: string } } | undefined;
            resolve(snapshot?.preferences?.dayPhase ?? null);
          };
        };
      }),
  );

test('the sun/moon button turns the day, and its icon previews the phase a tap brings', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await ready(page);

  const dayToggle = page.locator('.day-toggle');
  await expect(dayToggle).toBeVisible();
  // Toddler-proof: the target clears the 64px minimum the guidelines ask for.
  const box = await dayToggle.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(64);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(64);

  // The icon and the phase agree, right now, on the button's first showing.
  await expect(dayToggle).toHaveText(
    SUN_AHEAD.includes((await phase(page)) as string) ? '☀️' : '🌙',
  );

  // Every tap turns the page, and the icon keeps previewing the next phase —
  // whatever phase the drift had reached when the test started.
  for (let turn = 0; turn < 4; turn++) {
    const landed = await turnDay(page);
    const icon = await dayToggle.textContent();
    expect(icon, `icon after turning into ${landed}`).toBe(SUN_AHEAD.includes(landed) ? '☀️' : '🌙');
  }

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('the chosen time of day survives a reload, and a legacy save still boots to morning', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await ready(page);

  // Park on night: the longest phase, so the drift cannot outrun the reload.
  for (let turn = 0; turn < 5 && (await phase(page)) !== 'night'; turn++) {
    await turnDay(page);
  }
  expect(await phase(page)).toBe('night');
  expect(await storedPhase(page)).toBe('night');

  await page.waitForTimeout(1000); // let the change-gated save land
  consoleErrors.length = 0; // the reload's own boot is the next witness

  await page.reload();
  await ready(page);
  expect(await phase(page), 'the child finds the night they left behind').toBe('night');
  // Night previews the sun — dawn is what a tap brings.
  await expect(page.locator('.day-toggle')).toHaveText('☀️');

  // A save from before the sun/moon existed carries no phase at all: it must
  // boot to mid-morning, with the world itself untouched.
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('tiny-tracks', 1);
        open.onerror = () => reject(new Error('storage open failed'));
        open.onsuccess = () => {
          const store = open.result.transaction('worlds', 'readwrite').objectStore('worlds');
          const read = store.get('current');
          read.onerror = () => reject(new Error('storage read failed'));
          read.onsuccess = () => {
            const snapshot = read.result as Record<string, unknown>;
            delete snapshot.preferences;
            store.put(snapshot, 'current');
            store.transaction.oncomplete = () => resolve();
          };
        };
      }),
  );

  await page.reload();
  await ready(page);
  expect(await phase(page), 'a legacy save falls back to mid-morning').toBe('morning');
  // Morning previews the moon — noon is what a tap brings.
  await expect(page.locator('.day-toggle')).toHaveText('🌙');

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
