import { expect, type Page, test } from '@playwright/test';

import { watchConsoleErrors } from './helpers';

const PAINT_IDS = ['cherry', 'tangerine', 'sunshine', 'clover', 'sky', 'grape'] as const;
const STICKER_IDS = ['star', 'heart', 'flower', 'bolt'] as const;

async function openTrainDrawer(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(
    () => (window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady === true,
  );
  await page.click('[data-drawer="trains"]');
  await expect(page.locator('.livery-section')).toBeVisible();
}

/**
 * Taps from inside one browser task, so the measured elapsed time is the
 * handler's own work — not Playwright's actionability round-trips. NFR-1 is a
 * <100 ms visible reaction, asserted on the attribute the handler writes.
 */
async function tapAndTime(
  page: Page,
  selector: string,
): Promise<{ ms: number; pressed: string | null }> {
  return page.evaluate((sel) => {
    const button = document.querySelector(sel);
    if (!(button instanceof HTMLButtonElement)) throw new Error(`missing button: ${sel}`);
    const start = performance.now();
    button.click();
    return { ms: performance.now() - start, pressed: button.getAttribute('aria-pressed') };
  }, selector);
}

test('the drawer shows an icon-only livery tray with 64px targets', async ({ page }) => {
  const errors = watchConsoleErrors(page);
  await openTrainDrawer(page);

  const section = page.locator('.livery-section');
  await expect(section).toHaveAttribute('data-target', 'steam:loco');
  await expect(section.locator('[data-paint]')).toHaveCount(6);
  await expect(section.locator('[data-sticker]')).toHaveCount(4);
  await expect(section.locator('[data-restore]')).toHaveCount(1);
  await expect(section.locator('button')).toHaveCount(11);

  const buttons = await section.locator('button').all();
  for (const button of buttons) {
    const label = await button.getAttribute('aria-label');
    expect(label, 'every livery control needs an accessible name').toBeTruthy();
    const box = await button.boundingBox();
    expect(box, `bounding box for ${label ?? 'unnamed control'}`).not.toBeNull();
    expect(box?.width ?? 0, `width for ${label ?? 'unnamed control'}`).toBeGreaterThanOrEqual(64);
    expect(box?.height ?? 0, `height for ${label ?? 'unnamed control'}`).toBeGreaterThanOrEqual(64);
    // No reading required: at most a one-glyph face, never a visible word.
    const visibleText = await button.evaluate((el) => el.textContent?.trim() ?? '');
    expect(
      visibleText.length,
      `visible text for ${label ?? 'unnamed control'}`,
    ).toBeLessThanOrEqual(2);
  }
  // Screen-reader names come from the shared catalogue, not a duplicate table.
  await expect(section.locator('[data-paint="cherry"]')).toHaveAttribute(
    'aria-label',
    'Cherry red',
  );
  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
});

test('each paint swatch taps with immediate visible selection and a clean console', async ({
  page,
}) => {
  const errors = watchConsoleErrors(page);
  await openTrainDrawer(page);
  const section = page.locator('.livery-section');

  for (const paint of PAINT_IDS) {
    const swatch = section.locator(`[data-paint="${paint}"]`);
    const result = await tapAndTime(page, `.livery-section [data-paint="${paint}"]`);
    expect(result.pressed, `${paint} aria-pressed after tap`).toBe('true');
    expect(result.ms, `${paint} feedback latency`).toBeLessThan(100);
    await expect(swatch).toHaveAttribute('aria-pressed', 'true');
    // The highlight is drawn, not just announced: a visible outline appears.
    const outline = await swatch.evaluate((el) => getComputedStyle(el).outlineWidth);
    expect(outline, `${paint} selection outline`).toBe('4px');
  }
  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
});

test('sticker taps arm, engine taps stamp, cap at four, restore clears everything', async ({
  page,
}) => {
  const errors = watchConsoleErrors(page);
  await openTrainDrawer(page);
  const section = page.locator('.livery-section');

  let expected = 0;
  for (const sticker of STICKER_IDS) {
    // Arming is instant feedback but stamps nothing yet (FR-3: sticker-then-vehicle).
    const result = await tapAndTime(page, `.livery-section [data-sticker="${sticker}"]`);
    expect(result.ms, `${sticker} arming latency`).toBeLessThan(100);
    await expect(section).toHaveAttribute('data-armed', sticker);
    await expect(section).toHaveAttribute('data-sticker-count', String(expected));
    // Tapping the engine stamps the armed shape onto it.
    await page.click('.train-slot[data-train="steam"]');
    expected += 1;
    await expect(section).toHaveAttribute('data-armed', '');
    await expect(section).toHaveAttribute('data-sticker-count', String(expected));
    await expect(section.locator('[data-livery-tally] > span')).toHaveCount(expected);
  }
  // A fifth stamp evicts the oldest and keeps the four-anchor cap.
  await tapAndTime(page, '.livery-section [data-sticker="star"]');
  await expect(section).toHaveAttribute('data-armed', 'star');
  await page.click('.train-slot[data-train="steam"]');
  await expect(section).toHaveAttribute('data-armed', '');
  await expect(section).toHaveAttribute('data-sticker-count', '4');
  await expect(section.locator('[data-livery-tally] > span')).toHaveCount(4);

  await tapAndTime(page, '.livery-section [data-paint="grape"]');
  await expect(section.locator('[data-paint="grape"]')).toHaveAttribute('aria-pressed', 'true');

  const restore = await tapAndTime(page, '.livery-section [data-restore]');
  expect(restore.ms, 'restore feedback latency').toBeLessThan(100);
  await expect(section).toHaveAttribute('data-sticker-count', '0');
  await expect(section.locator('[data-livery-tally] > span')).toHaveCount(0);
  for (const paint of PAINT_IDS) {
    await expect(section.locator(`[data-paint="${paint}"]`)).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  }
  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
});

test('the tray follows the selected train and keeps each train its own livery', async ({
  page,
}) => {
  const errors = watchConsoleErrors(page);
  await openTrainDrawer(page);
  const section = page.locator('.livery-section');

  await tapAndTime(page, '.livery-section [data-paint="cherry"]');
  await tapAndTime(page, '.livery-section [data-sticker="heart"]');
  await expect(section).toHaveAttribute('data-armed', 'heart');
  await page.click('.train-slot[data-train="steam"]');
  await expect(section).toHaveAttribute('data-armed', '');
  await expect(section).toHaveAttribute('data-sticker-count', '1');

  await page.click('.train-slot[data-train="diesel"]');
  await expect(section).toHaveAttribute('data-target', 'diesel:loco');
  await expect(section.locator('[data-paint="cherry"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(section).toHaveAttribute('data-sticker-count', '0');

  await page.click('.train-slot[data-train="steam"]');
  await expect(section).toHaveAttribute('data-target', 'steam:loco');
  await expect(section.locator('[data-paint="cherry"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(section).toHaveAttribute('data-sticker-count', '1');
  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
});
