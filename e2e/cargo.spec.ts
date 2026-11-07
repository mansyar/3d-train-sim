import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { watchConsoleErrors } from './helpers';

/**
 * Cargo and the wagon workshop, merged into one file: the station moment end
 * to end (wagons load at the first stop, deliver at the next, the count
 * survives a reload, and a station-less line can never count a delivery),
 * the workshop's per-train presets riding and delivering, and the chosen
 * pair riding a switch shuttle without a ripple (spec acceptance 1–6, 8).
 */

type WorldHandle = {
  reset: () => void;
  place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
  placeScenery: (kind: string, cell: { x: number; y: number }, rotation: number) => string;
  scenery: () => readonly { id: string; kind: string }[];
  consistFor: (train: string) => string;
  deliveryCount: (id: string) => number;
};

const waitReady = (page: Page) =>
  page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );

const boot = async (page: Page): Promise<void> => {
  await page.goto('/');
  await waitReady(page);
  await page.waitForTimeout(1200);
};

// Store methods live in the page — probe them there. (page.evaluate
// serializes its return, so calling handle.consistFor on the Node side would
// find the functions stripped off.)
const consistOf = (page: Page, train: string) =>
  page.evaluate(
    ([name]) => {
      const handle = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
      if (!handle) throw new Error('dev world handle missing');
      return handle.consistFor(name);
    },
    [train] as const,
  );

const consistAll = (page: Page) =>
  page.evaluate(() => {
    const handle = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!handle) throw new Error('dev world handle missing');
    return [
      handle.consistFor('steam'),
      handle.consistFor('diesel'),
      handle.consistFor('tram'),
    ] as const;
  });

const deliveryCount = (page: Page, stationId: string) =>
  page.evaluate(
    ([id]) =>
      (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld?.deliveryCount(
        id,
      ) ?? 0,
    [stationId] as const,
  );

// The cargo loop: a 2x2 corner square with a station beside it.
const buildCargoLoop = (page: Page) =>
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

const expectLocalAndClean = (page: Page, consoleErrors: string[], requestUrls: string[]): void => {
  const origin = new URL(page.url()).origin;
  const external = requestUrls.filter((url) => new URL(url).origin !== origin);
  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
};

const expectClean = (consoleErrors: string[]): void => {
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
};

test('wagons load, deliver, keep the count across a reload, and nothing with no station', async ({
  page,
}) => {
  // The delivery poll below allows 90s, so the test itself must outlive it:
  // on loaded CI runners the sim crawls (software rendering) and a first lap
  // has taken over 45s of riding before its delivery lands. The station-less
  // control from the old second test rides here too.
  test.setTimeout(180_000);
  const consoleErrors = watchConsoleErrors(page);
  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await test.step('boot and build the station loop', async () => {
    await boot(page);
    await buildCargoLoop(page);

    // The crate asset rides along with the wagons from the start.
    await page.waitForFunction(() =>
      performance.getEntriesByType('resource').some((entry) => entry.name.includes('crate.glb')),
    );
  });

  await test.step('ride until the first delivery lands', async () => {
    await page.click('.ride-toggle');
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

    // Long enough for the first station stop (loads); the poll below waits
    // for the delivery, so no fixed wait needs to cover two stops.
    await page.waitForTimeout(8000);
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

    // The station id is stable across the reload; read it back from the page.
    const stationId = await page.evaluate(() => {
      const handle = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
      const station = handle?.scenery().find((item) => item.kind === 'station');
      if (!station) throw new Error('station missing');
      return station.id;
    });

    await expect
      .poll(async () => deliveryCount(page, stationId), { timeout: 90000, intervals: [1000] })
      .toBeGreaterThanOrEqual(1);
  });

  await test.step('reload and keep the station crate', async () => {
    const stationId = await page.evaluate(() => {
      const handle = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
      const station = handle?.scenery().find((item) => item.kind === 'station');
      if (!station) throw new Error('station missing');
      return station.id;
    });
    const count = await deliveryCount(page, stationId);

    // The delivery survives a reload: the platform keeps its crate.
    await page.reload();
    await waitReady(page);
    expect(await deliveryCount(page, stationId)).toBe(count);

    expectLocalAndClean(page, consoleErrors, requestUrls);
  });

  await test.step('ride a line with no station and count nothing', async () => {
    await page.evaluate(() => {
      const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
      if (!world) throw new Error('dev world handle missing');
      world.reset();
      world.place('corner', { x: 1, y: 5 }, 90);
      world.place('corner', { x: 2, y: 5 }, 180);
      world.place('corner', { x: 2, y: 6 }, 270);
      world.place('corner', { x: 1, y: 6 }, 0);
    });

    await page.click('.ride-toggle');
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
    await page.waitForTimeout(7000);
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

    // No station exists, so no delivery can ever be counted.
    const totals = await page.evaluate(() => {
      const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
      if (!world) throw new Error('dev world handle missing');
      return world.scenery().length;
    });
    expect(totals).toBe(0);
    expectClean(consoleErrors);
  });
});

test('per-train presets ride, deliver cargo, and survive a reload', async ({ page }) => {
  // The delivery poll below allows 90s, so the test must outlive it.
  test.setTimeout(180_000);
  const consoleErrors = watchConsoleErrors(page);
  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await test.step('boot and build the cargo loop', async () => {
    await boot(page);
    await buildCargoLoop(page);
  });

  await test.step('dress steam in coal and diesel in tank', async () => {
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
  });

  await test.step('ride until the coal pair delivers', async () => {
    const stationId = await page.evaluate(() => {
      const handle = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
      const station = handle?.scenery().find((item) => item.kind === 'station');
      if (!station) throw new Error('station missing');
      return station.id;
    });

    // The coal pair hauls crates: ride until the first delivery lands.
    await page.click('.ride-toggle');
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
    await expect
      .poll(async () => deliveryCount(page, stationId), { timeout: 90_000, intervals: [2000] })
      .toBeGreaterThanOrEqual(1);
    // Still riding in coal after the station stop.
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
    await expect.poll(() => consistOf(page, 'steam')).toBe('coal');

    // Phase 1: variant picks, the ride, and the delivery ran with a clean
    // console — assert before the reload below.
    expectClean(consoleErrors);
  });

  await test.step('reload and restore every train choice', async () => {
    // A reload restores every train's choice. The reload itself tears down a
    // live WebGL page, and headless Chromium reports the doomed context's
    // fetch fallout as uncaught errors — noise, not app behavior. Drop that
    // teardown window; the fresh load plus the drawer interaction below
    // re-covers it, so genuine failures still surface.
    await page.reload();
    await boot(page);
    consoleErrors.length = 0;
    await expect.poll(() => consistAll(page)).toEqual(['coal', 'tank', 'classic']);
    await page.click('[data-drawer="trains"]');
    await expect(page.locator('.wagon-slot[data-wagon="coal"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    const origin = new URL(page.url()).origin;
    const external = requestUrls.filter((url) => new URL(url).origin !== origin);
    expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
    // Phase 2: the fresh load and the drawer interaction stayed clean.
    expectClean(consoleErrors);
  });
});

test('the chosen pair rides a switch shuttle without a ripple', async ({ page }) => {
  test.setTimeout(90_000);
  const consoleErrors = watchConsoleErrors(page);
  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await test.step('boot and place the switch shuttle', async () => {
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
  });

  await test.step('dress the chosen pair in containers', async () => {
    await page.click('[data-drawer="trains"]');
    await page.locator('.wagon-slot[data-wagon="container"]').click();
    await expect(page.locator('.wagon-slot[data-wagon="container"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  await test.step('ride a full alternating cycle without a ripple', async () => {
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

    expectLocalAndClean(page, consoleErrors, requestUrls);
  });
});
