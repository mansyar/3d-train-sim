import { expect, type Page, test } from '@playwright/test';

import { watchConsoleErrors } from './helpers';

/**
 * AC-8 / FR-10: the built app must keep its sun/moon behaviour with the network
 * off, and a greeting must not reach for a foreign origin. The generic offline
 * guarantee lives in `runtime-guarantees.spec.ts`; this adds the rituals path —
 * tapping the control and letting the settle rule fire — to that same prod
 * profile. There are no dev handles in the built bundle, so the observable
 * contract is the toggle's phase icon and the request log.
 *
 * Chromium mirrors `runtime-guarantees.spec.ts`: Playwright's WebKit build
 * cannot emulate a dead network for a service-worker-controlled page.
 */
test.use({ browserName: 'chromium' });

const PREVIEW_ORIGIN = 'http://localhost:5198';
const SAME_DEVICE_SCHEMES = new Set(['blob:', 'data:', 'about:', 'devtools:']);

/** Warm the service worker, then reload so the page has a controller. */
async function warmWorker(page: Page): Promise<void> {
  await page.goto(`${PREVIEW_ORIGIN}/`);
  await page.waitForFunction(async () => {
    await navigator.serviceWorker.ready;
    return true;
  });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}

test('the offline prod build keeps sun/moon behaviour and greetings device-only', async ({
  page,
  context,
}) => {
  test.setTimeout(120_000);
  const consoleErrors = watchConsoleErrors(page);
  const requestedUrls: string[] = [];
  page.on('request', (request) => requestedUrls.push(request.url()));

  await warmWorker(page);
  // Scope both assertions to the offline round trip; the online load is
  // covered by `prod.spec.ts`.
  consoleErrors.length = 0;
  requestedUrls.length = 0;

  try {
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('.scene-canvas')).toBeVisible();
    await expect(page.locator('.toybox-rail')).toBeVisible();

    const toggle = page.locator('.day-toggle');
    await expect(toggle).toBeVisible();
    const before = await toggle.textContent();
    expect(before, 'the toggle must show a phase icon').toBeTruthy();

    // Tap through two transitions (the second settles while still offline).
    await toggle.click();
    await expect(toggle).not.toHaveText(before ?? '');
    await page.waitForTimeout(1_400); // settle + the start of a greeting
    await toggle.click();
    await page.waitForTimeout(400);
  } finally {
    await context.setOffline(false).catch(() => undefined);
  }

  const foreign = requestedUrls.filter((url) => {
    const parsed = new URL(url);
    if (SAME_DEVICE_SCHEMES.has(parsed.protocol)) return false;
    return parsed.origin !== PREVIEW_ORIGIN;
  });
  expect(foreign, `requests that left the device: ${foreign.join(' | ')}`).toEqual([]);
  expect(consoleErrors, `offline console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
