import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { watchConsoleErrors } from './helpers';

/**
 * Save-resilience end-to-end: a real browser boots against a hand-seeded
 * IndexedDB (`tiny-tracks` / `worlds`), so the salvage, restore, and very
 * fresh paths are proven through the same loader a family device runs.
 *
 * Seeding happens from the page context after the app has created the store:
 * the boot's own autosave must commit first, or it can land after our write
 * and quietly overwrite the corrupt payload. That is what
 * `waitForStoredCurrent` is for.
 */

interface WorldHandle {
  pieces: () => { id: string }[];
}

const HOLD_LABEL = 'Parent gate — press and hold to reset the world';

/** Three dry-land pieces to keep, plus one structurally invalid piece. */
const VALID_PIECES = [
  { id: 'piece-1', type: 'straight', cell: { x: 2, y: 6 }, rotation: 0 },
  { id: 'piece-2', type: 'straight', cell: { x: 2, y: 7 }, rotation: 0 },
  { id: 'piece-3', type: 'straight', cell: { x: 2, y: 8 }, rotation: 0 },
];

/** A readable v3 snapshot whose unknown toy type forces exactly one drop. */
const salvagedSnapshot = {
  version: 3,
  pieces: [
    ...VALID_PIECES,
    { id: 'piece-99', type: 'not-a-piece', cell: { x: 5, y: 5 }, rotation: 0 },
  ],
  scenery: [],
};

/** The last good save the loader should fall back to when current is unusable. */
const previousSnapshot = {
  version: 3,
  pieces: [
    { id: 'piece-10', type: 'straight', cell: { x: 1, y: 6 }, rotation: 0 },
    { id: 'piece-11', type: 'corner', cell: { x: 1, y: 7 }, rotation: 90 },
  ],
  scenery: [],
};

/** A readable v3 snapshot whose every entry is invalid: the salvage keeps nothing. */
const emptySalvageSnapshot = {
  version: 3,
  pieces: [
    { id: 'piece-97', type: 'hovercraft', cell: { x: 5, y: 5 }, rotation: 0 },
    { id: 'piece-98', type: 'not-a-piece', cell: { x: 6, y: 6 }, rotation: 0 },
  ],
  scenery: [],
};

/** Three pieces, two of them claiming the same cell: one duplicate is dropped. */
const duplicateSnapshot = {
  version: 3,
  pieces: [
    { id: 'piece-1', type: 'straight', cell: { x: 2, y: 6 }, rotation: 0 },
    { id: 'piece-2', type: 'corner', cell: { x: 2, y: 6 }, rotation: 90 },
    { id: 'piece-3', type: 'straight', cell: { x: 2, y: 7 }, rotation: 0 },
  ],
  scenery: [],
};

const waitForReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
};

/**
 * Waits until the boot's autosave has committed a `current` snapshot.
 *
 * A first boot seeds the starter railway and saves it asynchronously; writing
 * a seed before that transaction commits lets the save overwrite it. Once the
 * key exists, the boot's persistence has no pending writes left.
 */
const waitForStoredCurrent = async (page: Page): Promise<void> => {
  await page.waitForFunction(
    () =>
      new Promise<boolean>((resolve) => {
        const open = indexedDB.open('tiny-tracks');
        open.onerror = () => resolve(false);
        open.onsuccess = () => {
          const db = open.result;
          const read = db.transaction('worlds', 'readonly').objectStore('worlds').get('current');
          read.onsuccess = () => {
            db.close();
            resolve(read.result !== undefined);
          };
          read.onerror = () => {
            db.close();
            resolve(false);
          };
        };
      }),
  );
};

/**
 * Writes raw payloads into the autosave slots.
 *
 * The app owns store creation, so this opens without an upgrade handler: a
 * missing store is a test bug, not something to paper over by racing the
 * app's own schema.
 */
const writeSlots = (page: Page, slots: Record<string, unknown>): Promise<void> =>
  page.evaluate(
    (payloads) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('tiny-tracks');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('worlds', 'readwrite');
          const store = tx.objectStore('worlds');
          for (const [key, value] of Object.entries(payloads)) {
            store.put(value, key);
          }
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        };
      }),
    slots,
  );

/** Deletes both save slots so the next boot has nothing to discover. */
const clearSlots = (page: Page): Promise<void> =>
  page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('tiny-tracks');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('worlds', 'readwrite');
          const store = tx.objectStore('worlds');
          store.delete('current');
          store.delete('previous');
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        };
      }),
  );

/** The ids the live meadow holds, in insertion order. */
const worldPieceIds = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const handle = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!handle) throw new Error('dev world handle missing');
    return handle.pieces().map((piece) => piece.id);
  });

/** Holds the corner gate until it arms, then releases. */
const holdParentGate = async (page: Page): Promise<void> => {
  const box = await page.locator('.parent-gate').boundingBox();
  if (!box) throw new Error('parent gate is not visible');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  // The gate arms itself after 2 s; wait for that rather than guessing. The
  // ceiling is generous because a dev-server boot can throttle the timer.
  await expect(page.locator('.parent-gate')).toHaveClass(/is-confirm/, { timeout: 20_000 });
  await page.mouse.up();
};

/** Taps empty meadow, away from the gate, tray, grid toggle, and bottom rail. */
const tapOutside = async (page: Page): Promise<void> => {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('viewport size missing');
  await page.mouse.click(viewport.width - 24, Math.round(viewport.height * 0.42));
};

test('a boot salvages the corrupt snapshot and keeps every valid piece', async ({ page }) => {
  // The first test in each worker pays the dev server's cold transform of the
  // whole app (~40 s with both form factors booting at once); later boots are
  // warm. Give that one-off cost room without slowing the rest.
  test.setTimeout(120_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);
  await waitForStoredCurrent(page);
  await clearSlots(page);
  await writeSlots(page, { current: salvagedSnapshot });

  await page.reload();
  await waitForReady(page);

  // Only the three readable toys made it; the unknown type is skipped.
  expect((await worldPieceIds(page)).sort()).toEqual(['piece-1', 'piece-2', 'piece-3']);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('a boot restores the previous save when current is unreadable', async ({ page }) => {
  test.setTimeout(60_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);
  await waitForStoredCurrent(page);
  await writeSlots(page, { current: 'garbage', previous: previousSnapshot });

  await page.reload();
  await waitForReady(page);

  expect((await worldPieceIds(page)).sort()).toEqual(['piece-10', 'piece-11']);

  // The restored status is only visible to a grown-up through the gate's note.
  await holdParentGate(page);
  const noteText = page.locator('.recovery-note-text');
  await expect(noteText).toHaveText('Your meadow was restored from the last good save.');
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('a boot ignores an empty salvage and restores the previous save', async ({ page }) => {
  test.setTimeout(60_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);
  await waitForStoredCurrent(page);
  await writeSlots(page, { current: emptySalvageSnapshot, previous: previousSnapshot });

  await page.reload();
  await waitForReady(page);

  // The salvage kept nothing, so the backup is the better world.
  expect((await worldPieceIds(page)).sort()).toEqual(['piece-10', 'piece-11']);

  await holdParentGate(page);
  await expect(page.locator('.recovery-note-text')).toHaveText(
    'Your meadow was restored from the last good save.',
  );
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('a duplicate-only salvage still tells a grown-up', async ({ page }) => {
  test.setTimeout(60_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);
  await waitForStoredCurrent(page);
  await clearSlots(page);
  await writeSlots(page, { current: duplicateSnapshot });

  await page.reload();
  await waitForReady(page);

  expect((await worldPieceIds(page)).sort()).toEqual(['piece-1', 'piece-3']);

  await holdParentGate(page);
  const note = page.locator('.recovery-note');
  await expect(note).toBeVisible();
  await expect(note.locator('.recovery-note-text')).toHaveText(
    'We saved your meadow and skipped 1 broken toy.',
  );
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('the salvage notice shows once and its dismissal lasts the session', async ({ page }) => {
  test.setTimeout(60_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);
  await waitForStoredCurrent(page);
  await clearSlots(page);
  await writeSlots(page, { current: salvagedSnapshot });

  await page.reload();
  await waitForReady(page);

  const tray = page.locator('.preset-tray');
  const note = page.locator('.recovery-note');

  await holdParentGate(page);
  await expect(tray).toBeVisible();
  await expect(note).toBeVisible();
  // Exact singular: one broken toy was skipped in the seeded payload.
  await expect(note.locator('.recovery-note-text')).toHaveText(
    'We saved your meadow and skipped 1 broken toy.',
  );

  await page.locator('.recovery-dismiss').click();
  await expect(note).toBeHidden();

  // A tap outside disarms the gate; the note's dismissal outlives the tray.
  await tapOutside(page);
  await expect(tray).toBeHidden();
  await expect(page.locator('.parent-gate')).toHaveAttribute('aria-label', HOLD_LABEL);

  await holdParentGate(page);
  await expect(tray).toBeVisible();
  await expect(note).toBeHidden();

  await tapOutside(page);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('both unreadable slots seed the starter meadow without a console error', async ({ page }) => {
  test.setTimeout(60_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);

  // Record what a genuinely fresh meadow looks like before the disaster.
  await clearSlots(page);
  await page.reload();
  await waitForReady(page);
  const starterPieces = await worldPieceIds(page);
  expect(starterPieces.length).toBeGreaterThan(0);

  // Corrupt both slots: the boot must land on the same starter, not a crash.
  await waitForStoredCurrent(page);
  await writeSlots(page, { current: 'garbage', previous: 'garbage' });
  await page.reload();
  await waitForReady(page);

  expect((await worldPieceIds(page)).sort()).toEqual([...starterPieces].sort());
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
