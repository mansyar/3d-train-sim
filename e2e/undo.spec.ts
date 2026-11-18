import { expect, test } from '@playwright/test';

import { clearMeadow, watchConsoleErrors } from './helpers';

/**
 * Oops-proof building smoke: the ↩️ take-back joins the rail after a change,
 * reverses it, then hides — and a reload restores the exact world with no ↩️
 * in sight (session-only undo).
 *
 * Store-level reversals (relocate/rotate round-trips, crate-ledger safety,
 * failed placements arming nothing) are proven at the unit level
 * (world.test.ts); here the rail binding, the outside-board removal recovery
 * path, and the reload interplay must hold with the console as the witness.
 */

type WorldHandle = {
  place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
  remove: (id: string) => void;
  pieces: () => { id: string }[];
};

type SceneHandle = {
  cellFromPoint: (x: number, y: number) => unknown;
  cellToScreen: (cell: { x: number; y: number }) => { x: number; y: number } | null;
};

const ready = (page: import('@playwright/test').Page) =>
  page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );

const pieceCount = (page: import('@playwright/test').Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld?.pieces()
        .length ?? -1,
  );

/** A canvas point past the board edge, used for the outside removal gesture. */
const outsideBoardPoint = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.scene-canvas');
    if (!canvas) throw new Error('scene canvas missing');
    const rect = canvas.getBoundingClientRect();
    const scene = (window as unknown as { __tinyTracksScene?: SceneHandle }).__tinyTracksScene;
    if (!scene) throw new Error('dev scene handle missing');
    for (const point of [
      { x: rect.right - 12, y: rect.top + 12 },
      { x: rect.left + rect.width / 2, y: rect.top + 12 },
    ]) {
      if (scene.cellFromPoint(point.x, point.y) !== null) continue;
      if (document.elementFromPoint(point.x, point.y)?.closest('.toybox-rail')) continue;
      return point;
    }
    throw new Error('no point beyond the board found');
  });

test('taking back a placement removes the toy and hides the undo', async ({ page }) => {
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await ready(page);
  await clearMeadow(page);

  await page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    if (world.place('straight', { x: 2, y: 1 }, 0) !== 'placed') {
      throw new Error('placement failed');
    }
  });

  // The rail gains its take-back the moment the meadow changes.
  const undo = page.locator('.undo-toggle');
  await expect(undo).toBeVisible();

  await undo.click();
  await expect(undo).toBeHidden();
  expect(await pieceCount(page)).toBe(0);

  // A bad drop arms nothing: the refused placement leaves no undo behind.
  await page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    if (world.place('straight', { x: 2, y: 1 }, 0) !== 'placed') {
      throw new Error('setup placement failed');
    }
    // Same cell, still occupied — refused, so no undo may arm.
    if (world.place('straight', { x: 2, y: 1 }, 0) === 'placed') {
      throw new Error('double placement should have been refused');
    }
  });
  await expect(undo).toBeVisible(); // Armed by the setup place, not the refusal.
  await undo.click();
  expect(await pieceCount(page)).toBe(0);

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('a toy dragged beyond the board comes back, and a reload keeps the world with no undo', async ({
  page,
}) => {
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await ready(page);
  await clearMeadow(page);

  await page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    if (world.place('straight', { x: 2, y: 1 }, 0) !== 'placed') {
      throw new Error('placement failed');
    }
  });

  const start = await page.evaluate(() => {
    const scene = (window as unknown as { __tinyTracksScene?: SceneHandle }).__tinyTracksScene;
    if (!scene) throw new Error('dev scene handle missing');
    const point = scene.cellToScreen({ x: 2, y: 1 });
    if (!point) throw new Error('cell (2,1) not visible on screen');
    return point;
  });
  const outside = await outsideBoardPoint(page);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 16, start.y + 16, { steps: 3 });
  await page.mouse.move(outside.x, outside.y, { steps: 10 });
  await expect(page.locator('.removal-preview')).toBeVisible();
  await page.mouse.up();
  await expect(page.locator('.removal-preview')).toBeHidden();
  expect(await pieceCount(page)).toBe(0);

  const undo = page.locator('.undo-toggle');
  await expect(undo).toBeVisible();
  await undo.click();
  await expect(undo).toBeHidden();
  expect(await pieceCount(page)).toBe(1);

  // The recovered world autosaves; the reload restores it exactly, with the
  // session-only undo gone.
  await page.waitForTimeout(1000);
  await page.reload();
  await ready(page);
  expect(await pieceCount(page)).toBe(1);
  await expect(undo).toBeHidden();

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
