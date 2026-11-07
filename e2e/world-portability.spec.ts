import { readFile } from 'node:fs/promises';

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { clearMeadow, watchConsoleErrors } from './helpers';

/**
 * World portability end-to-end: the round trip through a real file input, the
 * salvaged and empty worlds, the refusal path, undo, and a mid-ride import.
 *
 * The file is a plain JSON snapshot. The DEV-only `__tinyTracksExport()` builds
 * the same payload the Save button downloads, so the spec can assert the exact
 * bytes without depending on the browser's download plumbing.
 *
 * The refusal permutations themselves (oversized, malformed JSON, `[]`, version
 * 99) are proven by `src/core/portable.test.ts`; what only a browser can show —
 * the pre-gate reach, the report-only tray after a dismissal, and the world
 * surviving untouched — stays here.
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

/** Taps empty meadow, away from the gate, tray, grid toggle, and bottom rail. */
const tapOutside = async (page: Page): Promise<void> => {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('viewport size missing');
  await page.mouse.click(viewport.width - 24, Math.round(viewport.height * 0.42));
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
const importFile = async (page: Page, payload: string): Promise<void> => {
  await page.locator('.portable-import-input').setInputFiles({
    name: 'world.json',
    mimeType: 'application/json',
    buffer: Buffer.from(payload, 'utf8'),
  });
};

const noteText = (page: Page) => page.locator('.portable-note-text');

test('a saved meadow stays out of reach, saves, and re-imports byte for byte @smoke', async ({
  page,
}) => {
  test.setTimeout(150_000); // the save and round-trip budgets, summed
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);

  const exported = await exportWorld(page);

  await test.step('the export is a dated v3 world file with no device preferences', async () => {
    expect(exported.name).toMatch(/^tiny-tracks-\d{4}-\d{2}-\d{2}\.json$/);

    const snapshot = parseExported(exported.json);
    expect(snapshot.version).toBe(3);
    expect(Array.isArray(snapshot.pieces)).toBe(true);
    expect(Array.isArray(snapshot.scenery)).toBe(true);
    // There is a real starter meadow to round-trip, not an empty file.
    expect(snapshot.pieces.length).toBeGreaterThan(0);
    // A world file, not a device backup: no mute/day-phase preferences.
    expect('preferences' in snapshot).toBe(false);
    expect(snapshot.pieces.map((piece) => piece.id)).toEqual(
      (await readMeadow(page)).pieces.map((piece) => piece.id),
    );
  });

  await test.step('the Save control downloads exactly those bytes', async () => {
    await openTray(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.portable-export').click(),
    ]);
    expect(download.suggestedFilename()).toBe(exported.name);
    expect(await readFile(await download.path(), 'utf8')).toBe(exported.json);
    await expect(noteText(page)).toHaveText(`Saved ${exported.name}`);
  });

  await test.step('clearing the meadow empties it', async () => {
    await clearMeadow(page);
    expect((await readMeadow(page)).pieces).toEqual([]);
  });

  await test.step('re-importing the file is lossless, byte for byte', async () => {
    const captured = parseExported(exported.json);
    await importFile(page, exported.json);
    await expect(noteText(page)).toHaveText(NOTE.imported);

    // Every id and cell came back, in the same order.
    const meadow = await readMeadow(page);
    expect(meadow.pieces).toEqual(toyShapeOf(captured.pieces));
    expect(meadow.scenery).toEqual(toyShapeOf(captured.scenery));

    // The round trip is lossless: the re-export is the same string, byte for byte.
    const second = await exportWorld(page);
    expect(second.json).toBe(exported.json);
  });

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('an empty meadow is a world, and a salvage keeps its toys and names the broken one', async ({
  page,
}) => {
  test.setTimeout(120_000); // the empty and salvage journeys' budgets, summed
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);

  const starter = parseExported((await exportWorld(page)).json);
  const starterIds = starter.pieces.map((piece) => piece.id);

  await test.step('an empty meadow exports and re-imports empty', async () => {
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
  });

  await test.step('one unknown toy is skipped, named, and the rest lands', async () => {
    const brokenToy = { id: 'piece-broken', type: 'not-a-toy', cell: { x: 7, y: 7 }, rotation: 0 };
    await importFile(page, JSON.stringify({ ...starter, pieces: [...starter.pieces, brokenToy] }));

    // One unknown toy is skipped; the note says so, and the rest lands.
    await expect(noteText(page)).toHaveText('Loaded the meadow. Skipped 1 broken toy.');
    const meadow = await readMeadow(page);
    expect(meadow.pieces.map((piece) => piece.id)).toEqual(starterIds);
    expect(meadow.pieces).toEqual(toyShapeOf(starter.pieces));
    expect(meadow.scenery).toEqual(toyShapeOf(starter.scenery));
  });

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('save and load stay out of reach until the hold, and a refusal is reported, not trusted', async ({
  page,
}) => {
  test.setTimeout(270_000); // the gate, refusal and dismissal budgets, summed
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);

  const tray = page.locator('.preset-tray');
  const save = page.locator('.portable-export');
  const load = page.locator('.portable-import');

  await test.step('neither the tray nor either file control is on screen', async () => {
    await expect(tray).toBeHidden();
    await expect(save).toBeHidden();
    await expect(load).toBeHidden();
  });

  await test.step('the two-second hold is the only door to the file controls', async () => {
    await holdParentGate(page);
    await expect(tray).toBeVisible();
    // The tray holds presets, Save/Load, both notes and the version line now.
    await expect(tray).toHaveAccessibleName('Parent controls');
    await expect(save).toBeVisible();
    await expect(load).toBeVisible();
  });

  await test.step('an unreadable file is refused and changes nothing', async () => {
    const before = (await exportWorld(page)).json;
    await importFile(page, "{'not a meadow'");
    await expect(noteText(page)).toHaveText(NOTE.unreadable);
    expect((await exportWorld(page)).json).toBe(before);
  });

  await test.step('a rail tap dismisses the armed tray', async () => {
    // A rail control, not the meadow: a stray tap there can rotate a placed toy.
    await page.locator('.mute-toggle').click();
    await expect(tray).toBeHidden();
  });

  await test.step('re-arming opens the tray with no stale note', async () => {
    await openTray(page);
    await expect(page.locator('.portable-note')).toBeHidden();
    await page.locator('.mute-toggle').click();
    await expect(tray).toBeHidden();
  });

  await test.step('a refusal after the dismissal reopens the tray report-only', async () => {
    const before = (await exportWorld(page)).json;
    // The hidden input still accepts a programmatic file, so the refusal lands
    // after the dismissal — where a note written into the hidden tray would be
    // invisible. The tray must come back just to report.
    await importFile(page, "{'not a meadow'");

    await expect(tray).toBeVisible();
    await expect(tray).toHaveClass(/is-reporting/);
    await expect(page.locator('.portable-note')).toBeVisible();
    await expect(noteText(page)).toHaveText(NOTE.unreadable);
    // Reporting only: no tray button comes back within reach.
    await expect(save).toBeHidden();
    await expect(load).toBeHidden();
    expect((await exportWorld(page)).json).toBe(before);
  });

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('undo puts the pre-import meadow back', async ({ page }) => {
  test.setTimeout(60_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);

  const starterIds = (await readMeadow(page)).pieces.map((piece) => piece.id);

  await test.step('an import lands as one undoable change', async () => {
    await openTray(page);
    await importFile(page, JSON.stringify(alternateSnapshot));
    await expect(noteText(page)).toHaveText(NOTE.imported);
    expect((await readMeadow(page)).pieces.map((piece) => piece.id)).toEqual([
      'piece-1',
      'piece-2',
    ]);
  });

  await test.step('one take-back restores the meadow that was there', async () => {
    const undo = page.locator('.undo-toggle');
    await expect(undo).toBeVisible();
    await undo.click();
    expect((await readMeadow(page)).pieces.map((piece) => piece.id)).toEqual(starterIds);
  });

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('importing mid-ride stops the train before the meadow changes, even for the same meadow', async ({
  page,
}) => {
  test.setTimeout(180_000); // the two mid-ride journeys' budgets, summed
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);

  await test.step('a different meadow lands only after the ride has stopped', async () => {
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
    expect((await readMeadow(page)).pieces.map((piece) => piece.id)).toEqual([
      'piece-1',
      'piece-2',
    ]);
  });

  await test.step('the very same meadow still stops the ride explicitly', async () => {
    const ride = page.locator('.ride-toggle');
    // Dismiss the report-only tray the first import left on screen.
    await tapOutside(page);
    await ride.click();
    await expect(ride).toHaveClass(/is-riding/, { timeout: 15_000 });

    // Identical pieces: the ride controller's own subscription sees no edit, so
    // only `deps.isRiding() → deps.stopRide()` can end the ride before the import.
    const riding = await exportWorld(page);

    await importFile(page, riding.json);
    await expect(noteText(page)).toHaveText(NOTE.imported);

    await expect(ride).not.toHaveClass(/is-riding/);
    await expect(ride).toHaveAttribute('aria-label', 'Ride the train');
    // The world did not change into something else — it is the same meadow.
    expect((await exportWorld(page)).json).toBe(riding.json);
  });

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
