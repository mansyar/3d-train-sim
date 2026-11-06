import { expect, type Page, test } from '@playwright/test';
import { CONTENT_SECURITY_POLICY } from '../src/core/security-headers';
import { watchConsoleErrors } from './helpers';

/**
 * Runtime guarantees, proven against the built app.
 *
 * `playwright.config.ts` starts `vite preview` on 5198 for every run, so these
 * specs navigate to that origin explicitly and keep the tablet/phone profiles
 * (portrait viewport, touch, device pixel ratio). The built bundle has no dev
 * handles — `__tinyTracksWorld` and friends are `import.meta.env.DEV` only — so
 * every assertion below is something a parent could see on screen.
 *
 * Why Chromium: Playwright's WebKit build cannot emulate a dead network for a
 * service-worker-controlled page. `context.setOffline(true)` makes the offline
 * navigation itself fail ("WebKit encountered an internal error"), a worker
 * cache read rejects with "Load failed", and the route-based alternative
 * corrupts the origin of textures decoded from worker-cached GLBs. The offline
 * round trip therefore runs the same device profile on Chromium, which honours
 * `setOffline`; the headers themselves come from the server, so their proof is
 * engine-independent.
 */
test.use({ browserName: 'chromium' });

const PREVIEW_ORIGIN = 'http://localhost:5198';

/** Schemes that never leave the device: object URLs for decoded textures and
 *  inline data the scene builds itself. Anything else must be same-origin. */
const SAME_DEVICE_SCHEMES = new Set(['blob:', 'data:', 'about:', 'devtools:']);

/** A window flag that only a fresh document can lack. */
const FRESH_DOCUMENT_PROBE = '__runtimeGuaranteesFresh';

/** A page that has installed the service worker and is controlled by it. */
async function warmWorker(page: Page): Promise<void> {
  await page.goto(`${PREVIEW_ORIGIN}/`);
  // `ready` resolves once the first worker is active; the reload then gives the
  // page a controller so the offline navigation is served from the precache.
  await page.waitForFunction(async () => {
    await navigator.serviceWorker.ready;
    return true;
  });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}

/** Reload with the network off, marking the current document first. */
async function reloadOffline(page: Page): Promise<void> {
  await page.evaluate((probe) => {
    (window as unknown as Record<string, unknown>)[probe] = true;
  }, FRESH_DOCUMENT_PROBE);
  await page.reload();
}

/**
 * The offline boot must be a new document, and its navigation must have been
 * answered by the service worker rather than the network (`workerStart` is
 * non-zero only when a worker handled the request).
 */
async function expectFreshOfflineDocument(page: Page): Promise<void> {
  const { marker, workerStart } = await page.evaluate((probe) => {
    const navigation = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    return {
      marker: (window as unknown as Record<string, unknown>)[probe],
      workerStart: navigation?.workerStart ?? 0,
    };
  }, FRESH_DOCUMENT_PROBE);
  expect(marker, 'the offline boot must be a fresh document').toBeUndefined();
  expect(
    workerStart,
    'the offline document must be served by the service worker, not the network',
  ).toBeGreaterThan(0);
}

/**
 * Drag the bridge from the toy drawer onto the meadow.
 *
 * The canvas centre projects to the meadow's heart, which the river crosses, so
 * a bridge — the one piece legal on water — always has a legal cell there and
 * the drop cannot silently land on an occupied or dry cell.
 */
async function placeBridge(page: Page): Promise<void> {
  await page.locator('[data-drawer="toys"]').click();
  await page.locator('.drawer-tab[data-tab="adventure"]').click();
  const slot = page.locator('.drawer-panel[data-panel="adventure"] [data-piece="bridge"]');
  await expect(slot).toBeVisible();
  const slotBox = await slot.boundingBox();
  const canvasBox = await page.locator('.scene-canvas').boundingBox();
  if (!slotBox || !canvasBox) throw new Error('drawer slot or canvas has no box to drag from');

  await page.mouse.move(slotBox.x + slotBox.width / 2, slotBox.y + slotBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2, {
    steps: 10,
  });
  await page.mouse.up();

  // The undo strip only appears when the world store has a step to undo, which
  // proves the drag committed a placement rather than bouncing back.
  await expect(page.locator('.undo-toggle')).toBeVisible();
}

/** Press ride, prove the label flipped, then stop and prove it flipped back. */
async function rideAndStop(page: Page): Promise<void> {
  const ride = page.locator('.ride-toggle');
  await ride.click();
  await expect(ride).toHaveAttribute('aria-label', 'Stop the train');
  await ride.click();
  await expect(ride).toHaveAttribute('aria-label', 'Ride the train');
}

/** The first precache URL in the built worker that matches `pattern`. */
function firstPrecachedUrl(swSource: string, pattern: RegExp): string {
  const match = pattern.exec(swSource);
  const url = match?.[1];
  if (!url) throw new Error(`no precache entry matching ${pattern}`);
  return url;
}

function assertPolicy(headers: Record<string, string>, subject: string): void {
  expect(headers['content-security-policy'], subject).toBe(CONTENT_SECURITY_POLICY);
  expect(headers['x-content-type-options'], subject).toBe('nosniff');
  expect(headers['referrer-policy'], subject).toBe('no-referrer');
}

// The first test pays the cold transform for the file; the rest follow the
// house budget for real-time specs.
test('the preview server sends the full policy on every asset class', async ({ page }) => {
  test.setTimeout(120_000);

  const response = await page.goto(`${PREVIEW_ORIGIN}/`);
  if (!response) throw new Error('the preview navigation returned no response');
  assertPolicy(response.headers(), 'the document');

  const worker = await page.request.get(`${PREVIEW_ORIGIN}/sw.js`);
  expect(worker.status(), '/sw.js').toBe(200);
  const manifest = await worker.text();

  // Pull one of each class out of the precache manifest, so the test never
  // hardcodes a content hash.
  const hashedScript = firstPrecachedUrl(manifest, /url:"(assets\/index-[^"]+\.js)"/);
  const glb = firstPrecachedUrl(manifest, /url:"([^"]+\.glb)"/);
  const woff2 = firstPrecachedUrl(manifest, /url:"([^"]+\.woff2)"/);

  for (const assetUrl of [hashedScript, glb, woff2]) {
    const asset = await page.request.get(`${PREVIEW_ORIGIN}/${assetUrl}`);
    expect(asset.status(), assetUrl).toBe(200);
    assertPolicy(asset.headers(), assetUrl);
  }

  // The security include must not have clobbered the cache rules. `vite
  // preview` (sirv in etag mode) answers `no-cache` for every static file; the
  // hashed-immutable rule is nginx-only and lives in `nginx.conf`, guarded by
  // `src/core/nginx-headers.test.ts` because preview cannot serve it.
  const indexHtml = await page.request.get(`${PREVIEW_ORIGIN}/index.html`);
  expect(indexHtml.headers()['cache-control'], '/index.html').toBe('no-cache');
  expect(worker.headers()['cache-control'], '/sw.js').toBe('no-cache');
  const script = await page.request.get(`${PREVIEW_ORIGIN}/${hashedScript}`);
  expect(script.headers()['cache-control'], hashedScript).toBe('no-cache');
});

test('the meadow boots, places a toy and rides with the network off', async ({ page, context }) => {
  test.setTimeout(90_000);
  const consoleErrors = watchConsoleErrors(page);

  await warmWorker(page);
  // Scope the console assertion to the offline boot; the online load has its
  // own coverage in `prod.spec.ts`.
  consoleErrors.length = 0;

  try {
    await context.setOffline(true);
    await reloadOffline(page);

    await expect(page.locator('.scene-canvas')).toBeVisible();
    await expectFreshOfflineDocument(page);
    await expect(page.locator('.toybox-rail')).toBeVisible();
    await expect(page.locator('.app-version')).toHaveText(/^v\d+\.\d+\.\d+/);

    await placeBridge(page);
    await rideAndStop(page);
  } finally {
    // A failure must not leave the context offline for the next test.
    await context.setOffline(false);
  }

  expect(consoleErrors, `offline console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('nothing leaves the app origin during boot, placement and ride', async ({ page, context }) => {
  test.setTimeout(90_000);
  const requestedUrls: string[] = [];
  page.on('request', (request) => requestedUrls.push(request.url()));

  await warmWorker(page);
  try {
    await context.setOffline(true);
    await reloadOffline(page);
    await expect(page.locator('.scene-canvas')).toBeVisible();
    await expectFreshOfflineDocument(page);
    await placeBridge(page);
    await rideAndStop(page);
  } finally {
    await context.setOffline(false);
  }

  const foreign = requestedUrls.filter((url) => {
    const parsed = new URL(url);
    if (SAME_DEVICE_SCHEMES.has(parsed.protocol)) return false;
    return parsed.origin !== PREVIEW_ORIGIN;
  });
  expect(foreign, `requests that left the origin: ${foreign.join(' | ')}`).toEqual([]);
});

test('an injected inline script is refused while the app bundle runs', async ({ page }) => {
  test.setTimeout(60_000);
  const refusals: string[] = [];
  page.on('console', (message) => {
    if (message.text().includes('Content Security Policy')) refusals.push(message.text());
  });

  await page.goto(`${PREVIEW_ORIGIN}/`);
  // Same-origin code from the bundle still runs: the meadow mounted.
  await expect(page.locator('.scene-canvas')).toBeVisible();
  await expect(page.locator('.toybox-rail')).toBeVisible();

  await page.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = 'window.__cspProbe = 1';
    document.head.append(script);
  });

  // Wait for the browser's own refusal report, which proves `script-src 'self'`
  // is doing work instead of merely being present on the response.
  await expect.poll(() => refusals.length).toBeGreaterThan(0);
  const probe = await page.evaluate(
    () => (window as unknown as { __cspProbe?: number }).__cspProbe,
  );
  expect(probe).toBeUndefined();
  const refusal = refusals[0] ?? '';
  expect(refusal, 'the refusal must come from the Content Security Policy').toContain(
    'Content Security Policy',
  );
  test.info().annotations.push({ type: 'csp-refusal', description: refusal });
});
