import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { watchConsoleErrors } from './helpers';

/**
 * Save-resilience end-to-end: a real browser boots against a hand-seeded
 * IndexedDB (`tiny-tracks` / `worlds`), so the salvage and restore paths are
 * proven through the same loader a family device runs.
 *
 * What a *corrupt* payload can look like — unreadable JSON, an empty salvage, a
 * duplicate-only salvage, both slots broken — is proven by `save.test.ts`,
 * `recovery.test.ts` and `persistence.test.ts`; here only the two boot outcomes
 * a parent sees remain, plus the note that reports them.
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

/** The exact outcome lines `src/ui/parent-gate.ts` writes. */
const RESTORED_LINE = 'Your meadow was restored from the last good save.';
const UNREADABLE_NOTE = 'That file is not a Tiny Tracks meadow, so nothing changed.';

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

/** The file payload the Save control would write, without touching the download. */
const exportedJson = (page: Page): Promise<string> =>
  page.evaluate(() => {
    const handle = (
      window as unknown as { __tinyTracksExport?: () => { name: string; json: string } }
    ).__tinyTracksExport;
    if (!handle) throw new Error('dev export handle missing');
    return handle().json;
  });

/** Picks a file on the hidden input inside the (armed or report-only) tray. */
const importFile = async (page: Page, payload: string): Promise<void> => {
  await page.locator('.portable-import-input').setInputFiles({
    name: 'world.json',
    mimeType: 'application/json',
    buffer: Buffer.from(payload, 'utf8'),
  });
};

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

test('a boot salvages the corrupt snapshot, keeps every valid piece and tells a grown-up @smoke', async ({
  page,
}) => {
  // The first test in each worker pays the dev server's cold transform of the
  // whole app (~40 s with both form factors booting at once); later boots are
  // warm. Give that one-off cost room without slowing the rest.
  test.setTimeout(180_000); // the salvage and notice budgets, summed
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);
  await waitForStoredCurrent(page);
  await clearSlots(page);
  await writeSlots(page, { current: salvagedSnapshot });

  await page.reload();
  await waitForReady(page);

  await test.step('only the three readable toys survive the salvage', async () => {
    // The unknown type is skipped; the rest is kept in order.
    expect((await worldPieceIds(page)).sort()).toEqual(['piece-1', 'piece-2', 'piece-3']);
  });

  await test.step('the gate reports the salvage with an exact singular count', async () => {
    const tray = page.locator('.preset-tray');
    const note = page.locator('.recovery-note');
    await holdParentGate(page);
    await expect(tray).toBeVisible();
    await expect(note).toBeVisible();
    // Exact singular: one broken toy was skipped in the seeded payload.
    await expect(note.locator('.recovery-note-text')).toHaveText(
      'We saved your meadow and skipped 1 broken toy.',
    );
  });

  await test.step('the dismissal lasts the session, and the tray still arms', async () => {
    const tray = page.locator('.preset-tray');
    const note = page.locator('.recovery-note');

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
  });

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('a boot restores the last good save, and a refusal replaces the note it writes', async ({
  page,
}) => {
  test.setTimeout(180_000); // the restore and refusal budgets, summed
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);
  await waitForStoredCurrent(page);
  await writeSlots(page, { current: 'garbage', previous: previousSnapshot });

  await page.reload();
  await waitForReady(page);

  await test.step('the backup world comes back whole', async () => {
    expect((await worldPieceIds(page)).sort()).toEqual(['piece-10', 'piece-11']);
  });

  await test.step('the restored status is only visible to a grown-up', async () => {
    await holdParentGate(page);
    await expect(page.locator('.recovery-note-text')).toHaveText(RESTORED_LINE);
  });

  await test.step('a refusal replaces the note, and re-arming restores it', async () => {
    const before = await exportedJson(page);

    // A refusal inside the open tray replaces the grown-up line: the two notes
    // never stack, because a stale "restored" beside "nothing changed" misleads.
    await importFile(page, "{'not a meadow'");
    await expect(page.locator('.portable-note-text')).toHaveText(UNREADABLE_NOTE);
    await expect(page.locator('.recovery-note')).toBeHidden();

    // The armed tray closes on a tap outside it; the mute toggle is on the rail.
    await page.locator('.mute-toggle').click();
    await expect(page.locator('.preset-tray')).toBeHidden();

    // Re-arming recomputes the note from the session state, so it comes back.
    await holdParentGate(page);
    await expect(page.locator('.recovery-note')).toBeVisible();
    await expect(page.locator('.recovery-note-text')).toHaveText(RESTORED_LINE);

    // Refused before parsing: the restored meadow is byte-identical.
    expect(await exportedJson(page)).toBe(before);
  });

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
