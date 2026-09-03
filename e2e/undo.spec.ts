import { expect, test } from '@playwright/test';

/**
 * Oops-proof building smoke: the ↩️ take-back joins the rail after a change,
 * reverses it, then hides — and a reload restores the exact world with no ↩️
 * in sight (session-only undo).
 *
 * Store-level reversals (relocate/rotate round-trips, crate-ledger safety,
 * failed placements arming nothing) are proven at the unit level
 * (world.test.ts); here the rail binding, the trash recovery path, and the
 * reload interplay must hold with the console as the witness.
 */

type WorldHandle = {
  place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
  remove: (id: string) => void;
  pieces: () => { id: string }[];
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

test('taking back a placement removes the toy and hides the undo', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  await page.goto('/');
  await ready(page);

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

test('a trashed toy comes back, and a reload keeps the world with no undo', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  await page.goto('/');
  await ready(page);

  await page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    if (world.place('straight', { x: 2, y: 1 }, 0) !== 'placed') {
      throw new Error('placement failed');
    }
    // The trash path bins through the same store call a drag uses.
    const id = world.pieces()[0]?.id;
    if (!id) throw new Error('placed piece missing');
    world.remove(id);
  });
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
