import { readFile } from 'node:fs/promises';

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { clearMeadow, watchConsoleErrors } from './helpers';

/**
 * World portability end-to-end: the round trip through a real file input, the
 * three refusal paths, undo, a mid-ride import, and the hold-to-arm gate that
 * keeps both file controls out of a toddler's reach.
 *
 * The file is a plain JSON snapshot. The DEV-only `__tinyTracksExport()` builds
 * the same payload the Save button downloads, so the spec can assert the exact
 * bytes without depending on the browser's download plumbing.
 */

/** The world-store surface this spec reads (DEV-only handle). */
interface DevWorld {
  pieces: () => { id: string; cell: { x: number; y: number } }[];
  scenery: () => { id: string; cell: { x: number; y: number } }[];
}

/** One toy reduced to what the round trip must preserve: id and cell. */
interface ToyShape {
  id: string;
  cell: { x: number; y: number };
}

/** A snapshot entry; `type`/`kind` only matter when building salvage payloads. */
interface SnapshotToy extends ToyShape {
  type?: string;
  kind?: string;
  rotation: number;
}

interface Snapshot {
  version: number;
  pieces: SnapshotToy[];
  scenery: SnapshotToy[];
}

/** The exact outcome lines `src/ui/parent-gate.ts` writes. */
const NOTE = {
  imported: 'Loaded the meadow.',
  tooLarge: 'That file is too big to be a meadow. Tiny Tracks saves stay under 1 MB.',
  unreadable: 'That file is not a Tiny Tracks meadow, so nothing changed.',
} as const;

/** Two dry-land rails: a valid world that is clearly not the starter oval. */
const alternateSnapshot = {
  version: 3,
  pieces: [
    { id: 'piece-1', type: 'straight', cell: { x: 2, y: 6 }, rotation: 0 },
    { id: 'piece-2', type: 'straight', cell: { x: 2, y: 7 }, rotation: 0 },
  ],
  scenery: [],
};

const waitForReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
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

/** Arms the gate and waits for the tray the two file controls live in. */
const openTray = async (page: Page): Promise<void> => {
  await holdParentGate(page);
  await expect(page.locator('.preset-tray')).toBeVisible();
};

/** Reads the live meadow through the DEV world handle. */
const readMeadow = (page: Page): Promise<{ pieces: ToyShape[]; scenery: ToyShape[] }> =>
  page.evaluate(() => {
    const handle = (window as unknown as { __tinyTracksWorld?: DevWorld }).__tinyTracksWorld;
    if (!handle) throw new Error('dev world handle missing');
    const shape = (toys: { id: string; cell: { x: number; y: number } }[]): ToyShape[] =>
      toys.map((toy) => ({ id: toy.id, cell: { x: toy.cell.x, y: toy.cell.y } }));
    return { pieces: shape(handle.pieces()), scenery: shape(handle.scenery()) };
  });

/** The same payload the Save button downloads, without touching the download. */
const exportWorld = (page: Page): Promise<{ name: string; json: string }> =>
  page.evaluate(() => {
    const handle = (
      window as unknown as { __tinyTracksExport?: () => { name: string; json: string } }
    ).__tinyTracksExport;
    if (!handle) throw new Error('dev export handle missing');
    return handle();
  });

const parseExported = (json: string): Snapshot => JSON.parse(json) as Snapshot;

/** Reduces snapshot entries to the id/cell shape the store exposes. */
const toyShapeOf = (toys: readonly SnapshotToy[]): ToyShape[] =>
  toys.map((toy) => ({ id: toy.id, cell: { x: toy.cell.x, y: toy.cell.y } }));

/** Picks a file on the hidden input — no visible click is needed. */
const importFile = async (
  page: Page,
  payload: string | Buffer,
  fileName = 'world.json',
): Promise<void> => {
  await page.locator('.portable-import-input').setInputFiles({
    name: fileName,
    mimeType: 'application/json',
    buffer: typeof payload === 'string' ? Buffer.from(payload, 'utf8') : payload,
  });
};

const noteText = (page: Page) => page.locator('.portable-note-text');

/** The line the loader's recovery path produces after falling back to `previous`. */
const RESTORED_LINE = 'Your meadow was restored from the last good save.';

/** The last good save a restored boot falls back to: two dry-land rails. */
const restoredSnapshot = {
  version: 3,
  pieces: [
    { id: 'piece-10', type: 'straight', cell: { x: 1, y: 6 }, rotation: 0 },
    { id: 'piece-11', type: 'corner', cell: { x: 1, y: 7 }, rotation: 90 },
  ],
  scenery: [],
};

/**
 * Waits until the boot's autosave has committed a `current` snapshot.
 *
 * A first boot seeds the starter railway and saves it asynchronously; writing
 * the seed before that transaction commits lets the save overwrite it. Once
 * the key exists, the boot's persistence has no pending writes left.
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

test('save and load stay out of reach until the parent gate is held', async ({ page }) => {
  // The first test in each worker pays the dev server's cold transform of the
  // whole app (~40 s with both form factors booting at once); later boots are
  // warm. Give that one-off cost room without slowing the rest.
  test.setTimeout(120_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);

  const tray = page.locator('.preset-tray');
  const save = page.locator('.portable-export');
  const load = page.locator('.portable-import');

  // Neither the tray nor either control is on screen before the hold.
  await expect(tray).toBeHidden();
  await expect(save).toBeHidden();
  await expect(load).toBeHidden();

  await holdParentGate(page);

  // The two-second hold is the only door: both controls appear with the tray.
  await expect(tray).toBeVisible();
  // The tray holds presets, Save/Load, both notes and the version line now.
  await expect(tray).toHaveAccessibleName('Parent controls');
  await expect(save).toBeVisible();
  await expect(load).toBeVisible();

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('saving writes the starter meadow as a dated v3 file', async ({ page }) => {
  test.setTimeout(60_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);

  const exported = await exportWorld(page);
  expect(exported.name).toMatch(/^tiny-tracks-\d{4}-\d{2}-\d{2}\.json$/);

  const snapshot = parseExported(exported.json);
  expect(snapshot.version).toBe(3);
  expect(Array.isArray(snapshot.pieces)).toBe(true);
  expect(Array.isArray(snapshot.scenery)).toBe(true);
  // A world file, not a device backup: no mute/day-phase preferences.
  expect('preferences' in snapshot).toBe(false);
  expect(snapshot.pieces.map((piece) => piece.id)).toEqual(
    (await readMeadow(page)).pieces.map((piece) => piece.id),
  );

  // The button's note names the same file the payload carries, and the
  // browser really starts a download whose bytes match the dev handle.
  await openTray(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('.portable-export').click(),
  ]);
  expect(download.suggestedFilename()).toBe(exported.name);
  expect(await readFile(await download.path(), 'utf8')).toBe(exported.json);
  await expect(noteText(page)).toHaveText(`Saved ${exported.name}`);

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('a saved meadow re-imports byte for byte @smoke', async ({ page }) => {
  test.setTimeout(90_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);

  const first = await exportWorld(page);
  const captured = parseExported(first.json);
  expect(captured.pieces.length).toBeGreaterThan(0);

  await clearMeadow(page);
  expect((await readMeadow(page)).pieces).toEqual([]);

  await openTray(page);
  await importFile(page, first.json);
  await expect(noteText(page)).toHaveText(NOTE.imported);

  // Every id and cell came back, in the same order.
  const meadow = await readMeadow(page);
  expect(meadow.pieces).toEqual(toyShapeOf(captured.pieces));
  expect(meadow.scenery).toEqual(toyShapeOf(captured.scenery));

  // The round trip is lossless: the re-export is the same string, byte for byte.
  const second = await exportWorld(page);
  expect(second.json).toBe(first.json);

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('a salvaged file keeps its valid toys and names the broken one', async ({ page }) => {
  test.setTimeout(60_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);

  const starter = parseExported((await exportWorld(page)).json);
  const starterIds = starter.pieces.map((piece) => piece.id);
  const brokenToy = { id: 'piece-broken', type: 'not-a-toy', cell: { x: 7, y: 7 }, rotation: 0 };

  await clearMeadow(page);
  await openTray(page);
  await importFile(page, JSON.stringify({ ...starter, pieces: [...starter.pieces, brokenToy] }));

  // One unknown toy is skipped; the note says so, and the rest lands.
  await expect(noteText(page)).toHaveText('Loaded the meadow. Skipped 1 broken toy.');
  const meadow = await readMeadow(page);
  expect(meadow.pieces.map((piece) => piece.id)).toEqual(starterIds);
  expect(meadow.pieces).toEqual(toyShapeOf(starter.pieces));
  expect(meadow.scenery).toEqual(toyShapeOf(starter.scenery));

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('an empty meadow saves and re-imports empty', async ({ page }) => {
  test.setTimeout(60_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);

  await clearMeadow(page);
  const emptyExport = await exportWorld(page);
  const emptySnapshot = parseExported(emptyExport.json);
  expect(emptySnapshot.pieces).toEqual([]);
  expect(emptySnapshot.scenery).toEqual([]);

  // A clean empty world is a world: it imports with no skip sentence.
  await openTray(page);
  await importFile(page, emptyExport.json);
  await expect(noteText(page)).toHaveText(NOTE.imported);

  expect(await readMeadow(page)).toEqual({ pieces: [], scenery: [] });
  // No pieces means no ride to start.
  await expect(page.locator('.ride-toggle')).toBeDisabled();

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('an oversized file is refused and changes nothing', async ({ page }) => {
  test.setTimeout(60_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);
  const before = (await exportWorld(page)).json;

  await openTray(page);
  // Count every decode entry point the helper could plausibly use — File.text,
  // Blob.text and FileReader.readAsText — against one counter, so this proves
  // the refusal happens on the size before any bytes are read. Without the
  // pre-read guard at least one of them still fires (the note would pass), so
  // the zero-read assertion is the witness.
  await page.evaluate(() => {
    const counter = { reads: 0 };
    (window as unknown as { __fileReads?: { reads: number } }).__fileReads = counter;
    const count = () => {
      counter.reads += 1;
    };
    // Capture all three first: a File read must be counted once, not twice.
    const fileText = File.prototype.text;
    const blobText = Blob.prototype.text;
    const readAsText = FileReader.prototype.readAsText;
    File.prototype.text = function (this: File) {
      count();
      return fileText.call(this);
    };
    Blob.prototype.text = function (this: Blob) {
      count();
      return blobText.call(this);
    };
    FileReader.prototype.readAsText = function (this: FileReader, blob: Blob, encoding?: string) {
      count();
      return readAsText.call(this, blob, encoding);
    };
  });
  await importFile(page, Buffer.alloc(1_048_577, 0x20));

  await expect(noteText(page)).toHaveText(NOTE.tooLarge);
  expect(
    await page.evaluate(
      () => (window as unknown as { __fileReads?: { reads: number } }).__fileReads?.reads,
    ),
  ).toBe(0);
  // Refused before parsing: the meadow is byte-identical.
  expect((await exportWorld(page)).json).toBe(before);

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('unreadable files are refused and change nothing', async ({ page }) => {
  test.setTimeout(90_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);
  const before = (await exportWorld(page)).json;

  await openTray(page);
  await importFile(page, "{'not a meadow'");
  await expect(noteText(page)).toHaveText(NOTE.unreadable);
  expect((await exportWorld(page)).json).toBe(before);

  // Dismiss the armed tray on a rail control (not the meadow: a stray tap
  // there can rotate a placed toy), then prove the version check and a
  // non-record JSON array refuse too.
  await page.locator('.mute-toggle').click();
  await expect(page.locator('.preset-tray')).toBeHidden();

  await openTray(page);
  await expect(page.locator('.portable-note')).toBeHidden();
  await importFile(page, JSON.stringify({ version: 99, pieces: [], scenery: [] }));
  await expect(noteText(page)).toHaveText(NOTE.unreadable);
  expect((await exportWorld(page)).json).toBe(before);

  // Valid JSON, still not a meadow: an array parses but is not a snapshot.
  await page.locator('.mute-toggle').click();
  await expect(page.locator('.preset-tray')).toBeHidden();

  await openTray(page);
  await expect(page.locator('.portable-note')).toBeHidden();
  await importFile(page, '[]');
  await expect(noteText(page)).toHaveText(NOTE.unreadable);
  expect((await exportWorld(page)).json).toBe(before);

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('a refusal after the tray is dismissed stays visible', async ({ page }) => {
  test.setTimeout(60_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);
  const before = (await exportWorld(page)).json;

  // Arm the gate, then dismiss the tray with a tap outside it. The hidden input
  // still accepts a programmatic file, so the refusal lands after the
  // dismissal — where a note written into the hidden tray would be invisible.
  await openTray(page);
  await page.locator('.mute-toggle').click();
  await expect(page.locator('.preset-tray')).toBeHidden();

  await importFile(page, "{'not a meadow'");

  await expect(page.locator('.preset-tray')).toBeVisible();
  await expect(page.locator('.preset-tray')).toHaveClass(/is-reporting/);
  await expect(page.locator('.portable-note')).toBeVisible();
  await expect(noteText(page)).toHaveText(NOTE.unreadable);
  // Reporting only: no tray button comes back within reach.
  await expect(page.locator('.portable-export')).toBeHidden();
  await expect(page.locator('.portable-import')).toBeHidden();

  expect((await exportWorld(page)).json).toBe(before);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('a refusal replaces the recovery note, and re-arming restores it', async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);
  // The boot's own autosave must commit before the seed, or it lands after it.
  await waitForStoredCurrent(page);
  await writeSlots(page, { current: 'garbage', previous: restoredSnapshot });

  await page.reload();
  await waitForReady(page);

  const tray = page.locator('.preset-tray');
  const recovery = page.locator('.recovery-note');
  await openTray(page);
  await expect(recovery).toBeVisible();
  await expect(recovery.locator('.recovery-note-text')).toHaveText(RESTORED_LINE);

  const before = (await exportWorld(page)).json;

  // A refusal inside the open tray replaces the grown-up line: the two notes
  // never stack, because a stale "restored" beside "nothing changed" misleads.
  await importFile(page, "{'not a meadow'");
  await expect(noteText(page)).toHaveText(NOTE.unreadable);
  await expect(recovery).toBeHidden();

  // The armed tray closes on a tap outside it; the mute toggle is on the rail.
  await page.locator('.mute-toggle').click();
  await expect(tray).toBeHidden();

  // Re-arming recomputes the note from the session state, so it comes back.
  await openTray(page);
  await expect(recovery).toBeVisible();
  await expect(recovery.locator('.recovery-note-text')).toHaveText(RESTORED_LINE);

  // Refused before parsing: the restored meadow is byte-identical.
  expect((await exportWorld(page)).json).toBe(before);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('undo puts the pre-import meadow back', async ({ page }) => {
  test.setTimeout(60_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);

  const starterIds = (await readMeadow(page)).pieces.map((piece) => piece.id);

  await openTray(page);
  await importFile(page, JSON.stringify(alternateSnapshot));
  await expect(noteText(page)).toHaveText(NOTE.imported);
  expect((await readMeadow(page)).pieces.map((piece) => piece.id)).toEqual(['piece-1', 'piece-2']);

  // One import is one undoable change, exactly like a preset pick.
  const undo = page.locator('.undo-toggle');
  await expect(undo).toBeVisible();
  await undo.click();
  expect((await readMeadow(page)).pieces.map((piece) => piece.id)).toEqual(starterIds);

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('importing mid-ride stops the train before the meadow changes', async ({ page }) => {
  test.setTimeout(90_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);

  const ride = page.locator('.ride-toggle');
  await ride.click();
  await expect(ride).toHaveClass(/is-riding/, { timeout: 15_000 });
  await expect(ride).toHaveAttribute('aria-label', 'Stop the train');

  // The gate stays on the rail mid-ride, so the tray is reachable.
  await openTray(page);
  await importFile(page, JSON.stringify(alternateSnapshot));
  await expect(noteText(page)).toHaveText(NOTE.imported);

  // The ride stopped (the ▶ face is back) and the imported world is in place.
  await expect(ride).not.toHaveClass(/is-riding/);
  await expect(ride).toHaveAttribute('aria-label', 'Ride the train');
  expect((await readMeadow(page)).pieces.map((piece) => piece.id)).toEqual(['piece-1', 'piece-2']);

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('importing the very same meadow still stops the ride explicitly', async ({ page }) => {
  test.setTimeout(90_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);

  const ride = page.locator('.ride-toggle');
  await ride.click();
  await expect(ride).toHaveClass(/is-riding/, { timeout: 15_000 });

  // Identical pieces: the ride controller's own subscription sees no edit, so
  // only `deps.isRiding() → deps.stopRide()` can end the ride before the import.
  const riding = await exportWorld(page);

  await openTray(page);
  await importFile(page, riding.json);
  await expect(noteText(page)).toHaveText(NOTE.imported);

  await expect(ride).not.toHaveClass(/is-riding/);
  await expect(ride).toHaveAttribute('aria-label', 'Ride the train');
  // The world did not change into something else — it is the same meadow.
  expect((await exportWorld(page)).json).toBe(riding.json);

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
