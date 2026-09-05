import { expect, test } from '@playwright/test';

import { watchConsoleErrors } from './helpers';

// The fleet expansion: the three new engines load from the vendored kit,
// swap in place, toot their family whistle, and the choice survives a reload.
test('the six-engine fleet rides, toots, and remembers the chosen engine', async ({ page }) => {
  const consoleErrors = watchConsoleErrors(page);

  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await page.goto('/');
  const origin = new URL(page.url()).origin;
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );

  await page.click('[data-drawer="trains"]');
  await expect(page.locator('.train-slot')).toHaveCount(6);

  for (const train of ['express', 'freight', 'bullet']) {
    await page.locator(`.train-slot[data-train="${train}"]`).click();
    await expect(page.locator(`.train-slot[data-train="${train}"]`)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.locator('.whistle-toot').click();
  }

  // Reload: the last engine comes back without touching the meadow.
  await page.reload();
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
  await page.click('[data-drawer="trains"]');
  await expect(page.locator('.train-slot[data-train="bullet"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  const external = requestUrls.filter((url) => new URL(url).origin !== origin);
  expect(external, `external requests: ${external.join(' | ')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
