import { expect, test } from '@playwright/test';

/**
 * Wagon workshop flow: a tap dresses the selected locomotive's pair, each
 * train keeps its own preset, cargo still loads and delivers behind the new
 * wagons, the consist rides loops and switch shuttles, and a reload restores
 * every train's choice (spec acceptance 1-5).
 */

type WorldHandle = {
  reset: () => void;
  place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
  placeScenery: (kind: string, cell: { x: number; y: number }, rotation: number) => string;
  scenery: () => readonly { id: string; kind: string }[];
  consistFor: (train: string) => string;
  deliveryCount: (id: string) => number;
};

// Store methods live in the page — probe them there. (page.evaluate
// serializes its return, so calling handle.consistFor on the Node side
// would find the functions stripped off.)
const consistOf = (page: import('@playwright/test').Page, train: string) =>
  page.evaluate(
    ([name]) => {
      const handle = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
      if (!handle) throw new Error('dev world handle missing');
      return handle.consistFor(name);
    },
    [train] as const,
  );

const consistAll = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const handle = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!handle) throw new Error('dev world handle missing');
    return [
      handle.consistFor('steam'),
      handle.consistFor('diesel'),
      handle.consistFor('tram'),
    ] as const;
  });

const boot = async (page: import('@playwright/test').Page) => {
  await page.goto('/');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
  await page.waitForTimeout(1200);
};

// The cargo loop: a 2x2 corner square with a station beside it.
const buildCargoLoop = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const handle = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!handle) throw new Error('dev world handle missing');
    handle.reset();
    handle.place('corner', { x: 1, y: 7 }, 90);
    handle.place('corner', { x: 2, y: 7 }, 180);
    handle.place('corner', { x: 2, y: 8 }, 270);
    handle.place('corner', { x: 1, y: 8 }, 0);
    if (handle.placeScenery('station', { x: 3, y: 7 }, 0) !== 'placed') {
      throw new Error('station placement failed');
    }
    const station = handle.scenery().find((item) => item.kind === 'station');
    if (!station) throw new Error('station missing');
    return station.id;
  });

test('per-train presets ride, deliver cargo, and survive a reload', async ({ page }) => {
  // The delivery poll below allows 45s, so the test must outlive it.
  test.setTimeout(120_000);
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await boot(page);
  const stationId: string = await buildCargoLoop(page);

  // Steam dresses in coal, diesel in tank — one tap each, through the UI.
  await page.click('[data-drawer="trains"]');
  await page.locator('.wagon-slot[data-wagon="coal"]').click();
  await expect(page.locator('.wagon-slot[data-wagon="coal"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.locator('.train-slot[data-train="diesel"]').click();
  await page.locator('.wagon-slot[data-wagon="tank"]').click();
  await expect(page.locator('.wagon-slot[data-wagon="tank"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  // Switching locos re-aims the row: back on steam, coal shows pressed.
  await page.locator('.train-slot[data-train="steam"]').click();
  await expect(page.locator('.wagon-slot[data-wagon="coal"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(await consistAll(page)).toEqual(['coal', 'tank', 'classic']);

  // The coal pair hauls crates: ride until the first delivery lands.
  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  await expect
    .poll(
      async () =>
        page.evaluate(
          ([id]) =>
            (
              window as unknown as { __tinyTracksWorld?: WorldHandle }
            ).__tinyTracksWorld?.deliveryCount(id) ?? 0,
          [stationId] as const,
        ),
      { timeout: 45000, intervals: [2000] },
    )
    .toBeGreaterThanOrEqual(1);
  // Still riding in coal after the station stop.
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  await expect.poll(() => consistOf(page, 'steam')).toBe('coal');

  // A reload restores every train's choice.
  await page.reload();
  await boot(page);
  await expect.poll(() => consistAll(page)).toEqual(['coal', 'tank', 'classic']);
  await page.click('[data-drawer="trains"]');
  await expect(page.locator('.wagon-slot[data-wagon="coal"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  const origin = new URL(page.url()).origin;
  const external = requestUrls.filter((url) => new URL(url).origin !== origin);
  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('the chosen pair rides a switch shuttle without a ripple', async ({ page }) => {
  test.setTimeout(90_000);
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await boot(page);
  await page.evaluate(() => {
    const handle = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!handle) throw new Error('dev world handle missing');
    handle.reset();
    for (const [type, cell] of [
      ['straight', { x: 2, y: 1 }],
      ['switch', { x: 2, y: 2 }],
      ['straight', { x: 2, y: 3 }],
    ] as const) {
      if (handle.place(type, cell, 0) !== 'placed') {
        throw new Error(`placement failed: ${type}`);
      }
    }
  });

  await page.click('[data-drawer="trains"]');
  await page.locator('.wagon-slot[data-wagon="container"]').click();
  await expect(page.locator('.wagon-slot[data-wagon="container"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  // A full alternating cycle over both switch roads with dead-end turnarounds.
  await page.waitForTimeout(12000);
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  const a = await page.screenshot();
  await page.waitForTimeout(1200);
  const b = await page.screenshot();
  expect(Buffer.compare(a, b)).not.toBe(0);
  await expect.poll(() => consistOf(page, 'steam')).toBe('container');

  const origin = new URL(page.url()).origin;
  const external = requestUrls.filter((url) => new URL(url).origin !== origin);
  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
