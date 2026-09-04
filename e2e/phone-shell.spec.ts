import { expect, test } from '@playwright/test';

import { watchConsoleErrors } from './helpers';

test('phone viewport: shell fits without horizontal clipping', async ({ page }) => {
  const consoleErrors = watchConsoleErrors(page);

  // The phone project uses an iPhone viewport; pad it to assert the ≥360px floor.
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/');

  await expect(page).toHaveTitle('Tiny Tracks');

  // The scene canvas and the toybox rail are mounted.
  await expect(page.locator('.scene-canvas')).toBeVisible();
  await expect(page.locator('.toybox-rail')).toBeVisible();
  await expect(page.locator('.toy-slot')).toHaveCount(2);

  // The rail must never overflow the viewport horizontally (no clipped bin).
  const overflow = await page.evaluate(() => {
    const rail = document.querySelector('.toybox-rail');
    if (!rail) return { rail: 0, buttons: 0, scrollWidth: 0, clientWidth: 0, clipped: [] };
    const rect = rail.getBoundingClientRect();
    const buttons = [...rail.querySelectorAll('button')];
    const clipped = buttons.filter((button) => {
      const r = button.getBoundingClientRect();
      return r.right > window.innerWidth + 1 || r.left < -1;
    });
    return {
      rail: rect.width,
      buttons: buttons.length,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      clipped: clipped.map((button) => button.className),
    };
  });

  expect(overflow.clipped, `clipped buttons: ${overflow.clipped.join(', ')}`).toEqual([]);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

  // Open both drawers and assert no horizontal clipping either.
  await page.click('[data-drawer="toys"]');
  await expect(page.locator('.toy-drawer')).toBeVisible();
  const drawersOpen = await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('.drawer-tab')];
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      clippedTabs: tabs.filter((tab) => {
        const r = tab.getBoundingClientRect();
        return r.right > window.innerWidth + 1 || r.left < -1;
      }).length,
    };
  });
  expect(drawersOpen.clippedTabs).toBe(0);
  expect(drawersOpen.scrollWidth).toBeLessThanOrEqual(drawersOpen.clientWidth);

  // Switch to the train drawer and assert it fits too.
  await page.click('[data-drawer="trains"]');
  await expect(page.locator('.train-drawer')).toBeVisible();
  const trainFit = await page.evaluate(() => {
    const rect = document.querySelector('.train-drawer')?.getBoundingClientRect();
    return rect
      ? { left: rect.left, right: rect.right, width: window.innerWidth }
      : { left: 0, right: 0, width: 0 };
  });
  expect(trainFit.left).toBeGreaterThanOrEqual(-1);
  expect(trainFit.right).toBeLessThanOrEqual(trainFit.width + 1);

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
