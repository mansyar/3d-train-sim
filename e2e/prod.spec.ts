import { expect, test } from '@playwright/test';

import { watchConsoleErrors } from './helpers';

/**
 * Production-build assertions (run only on the `prod` project against the
 * `vite preview` server). The full smoke suite depends on the dev-only
 * `__tinyTracksWorld`/`__tinyTracksScene` handles, so prod keeps its own
 * lean spec here.
 */
test('production build mounts no debug grid toggle and keeps the shell', async ({ page }) => {
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');

  // The debug grid toggle is dev-only — production must never mount one.
  await expect(page.locator('.grid-toggle')).toHaveCount(0);

  // The kid-facing shell is fully present.
  await expect(page.locator('.scene-canvas')).toBeVisible();
  await expect(page.locator('.toybox-rail')).toBeVisible();
  await expect(page.locator('.toy-slot')).toHaveCount(2);
  await expect(page.locator('.parent-gate')).toBeVisible();
  await expect(page.locator('.trash-slot')).toBeVisible();

  // The app boots with a clean console.
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
