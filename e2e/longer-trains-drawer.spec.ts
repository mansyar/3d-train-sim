import { expect, type Page, test } from '@playwright/test';

import { clearMeadow, watchConsoleErrors } from './helpers';

type WorldHandle = {
  consistFor: (train: string) => string;
  place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
  wagonCount: (train: string) => number;
  wagonOutfits: (train: string) => string[];
};

async function openDrawer(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(
    () => (window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady === true,
  );
  await page.click('[data-drawer="trains"]');
  await expect(page.locator('.consist-row')).toBeVisible();
}

const wagonCountOf = (page: Page, train = 'steam') =>
  page.evaluate(
    ([name]) => {
      const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
      if (!world) throw new Error('dev world handle missing');
      return world.wagonCount(name);
    },
    [train] as const,
  );

const outfitsOf = (page: Page) =>
  page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    return world.wagonOutfits('steam');
  });

const presetOf = (page: Page) =>
  page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    return world.consistFor('steam');
  });

/** Replaces the meadow with a closed loop of 4 (tiny) or 8 (roomy) cells. */
async function buildLoop(page: Page, size: 'tiny' | 'roomy'): Promise<void> {
  await clearMeadow(page);
  await page.evaluate((which) => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    const corners: { x: number; y: number; rotation: number }[] =
      which === 'tiny'
        ? [
            { x: 1, y: 7, rotation: 90 },
            { x: 2, y: 7, rotation: 180 },
            { x: 2, y: 8, rotation: 270 },
            { x: 1, y: 8, rotation: 0 },
          ]
        : [
            { x: 0, y: 7, rotation: 90 },
            { x: 3, y: 7, rotation: 180 },
            { x: 3, y: 8, rotation: 270 },
            { x: 0, y: 8, rotation: 0 },
          ];
    for (const cell of corners) {
      if (world.place('corner', { x: cell.x, y: cell.y }, cell.rotation) !== 'placed') {
        throw new Error(`corner placement failed at ${cell.x},${cell.y}`);
      }
    }
    if (which === 'roomy') {
      for (const x of [1, 2]) {
        for (const y of [7, 8]) {
          if (world.place('straight', { x, y }, 90) !== 'placed') {
            throw new Error(`straight placement failed at ${x},${y}`);
          }
        }
      }
    }
  }, size);
}

test('the + slot grows the consist to four wagons and then silently stops', async ({ page }) => {
  const errors = watchConsoleErrors(page);
  await openDrawer(page);

  const add = page.locator('[data-add-wagon]');
  const tally = page.locator('[data-wagon-tally]');
  await expect(add).toHaveAttribute('aria-label', 'Add a wagon');
  await expect(add).toHaveAttribute('aria-disabled', 'false');
  const box = await add.boundingBox();
  expect(box?.width ?? 0, '+ target width').toBeGreaterThanOrEqual(64);
  expect(box?.height ?? 0, '+ target height').toBeGreaterThanOrEqual(64);
  await expect(tally).toHaveAttribute('data-count', '2');
  await expect(page.locator('.wagon-chip:not([hidden])')).toHaveCount(2);

  await add.click();
  await expect(tally).toHaveText('3');
  expect(await wagonCountOf(page)).toBe(3);
  await expect(page.locator('.wagon-chip:not([hidden])')).toHaveCount(3);

  await add.click();
  await expect(tally).toHaveText('4');
  expect(await wagonCountOf(page)).toBe(4);
  await expect(add).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('.wagon-chip:not([hidden])')).toHaveCount(4);

  // Playwright refuses to click an aria-disabled button — dispatch the tap
  // directly to prove the handler itself is a silent no-op.
  await add.dispatchEvent('click');
  expect(await wagonCountOf(page), 'a fifth tap is a silent no-op').toBe(4);

  await page
    .locator('.train-drawer')
    .screenshot({ path: '.conductor/media/20261128-longer-trains/plus-tap-states.png' });
  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
});

test('the + slot dims without a fitting loop and re-enables when the loop grows', async ({
  page,
}) => {
  const errors = watchConsoleErrors(page);
  await openDrawer(page);
  const add = page.locator('[data-add-wagon]');

  // Three wagons fit the starter oval (10 cells) but not the tiny 4-cell
  // loop, which holds exactly the locomotive plus two wagons.
  await add.click();
  expect(await wagonCountOf(page)).toBe(3);

  // A world reset returns to the base pair (FR-7), so clearing here — and
  // again inside buildLoop — puts the consist back at two wagons before the
  // dimmed + is tapped as a no-op.
  await clearMeadow(page);
  await expect(add, 'no closed loop yet').toHaveAttribute('aria-disabled', 'true');
  await add.dispatchEvent('click');
  expect(await wagonCountOf(page)).toBe(2);

  await buildLoop(page, 'tiny');
  await expect(add, 'a four-cell loop fits the pair with one margin wagon').toHaveAttribute(
    'aria-disabled',
    'false',
  );
  await add.click();
  expect(await wagonCountOf(page)).toBe(3);
  await expect(add, 'a third wagon leaves no margin on the four-cell loop').toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await expect(add).toHaveClass(/is-dimmed/);
  await add.dispatchEvent('click');
  expect(await wagonCountOf(page)).toBe(3);

  await buildLoop(page, 'roomy');
  await expect(add).toHaveAttribute('aria-disabled', 'false');
  await expect(add).not.toHaveClass(/is-dimmed/);
  await add.click();
  expect(await wagonCountOf(page)).toBe(3);
  await add.click();
  expect(await wagonCountOf(page)).toBe(4);
  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
});

test('wagon taps select for dressing and tapping the last wagon removes it', async ({ page }) => {
  const errors = watchConsoleErrors(page);
  await openDrawer(page);

  await page.locator('[data-add-wagon]').click();
  const first = page.locator('[data-wagon-index="0"]');
  const middle = page.locator('[data-wagon-index="1"]');
  const last = page.locator('[data-wagon-index="2"]');
  await expect(page.locator('.wagon-chip:not([hidden])')).toHaveCount(3);

  await middle.click();
  await expect(middle).toHaveAttribute('aria-pressed', 'true');
  await expect(first).toHaveAttribute('aria-pressed', 'false');
  await expect(last).toHaveAttribute('aria-pressed', 'false');

  await page.click('.wagon-row [data-wagon="coal"]');
  const dressed = await outfitsOf(page);
  expect(dressed[0], 'the unselected wagon keeps its outfit').toBe('classic');
  expect(dressed[1], 'the selected wagon takes the preset').toBe('coal');
  expect(dressed[2], 'other wagons keep their outfits').toBe('classic');
  expect(await presetOf(page), 'the legacy pair preset is untouched').toBe('classic');
  await expect(page.locator('.wagon-row [data-wagon="coal"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await last.click();
  expect(await wagonCountOf(page)).toBe(2);
  await expect(last).toBeHidden();
  await middle.click();
  expect(await wagonCountOf(page)).toBe(1);
  await expect(first).toBeVisible();
  await expect(middle).toBeHidden();
  await first.click();
  expect(await wagonCountOf(page), 'the final wagon cannot be removed').toBe(1);

  await page.click('.train-slot[data-train="diesel"]');
  await expect(first).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.wagon-row [data-wagon="classic"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(await wagonCountOf(page, 'diesel')).toBe(1);
  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
});
