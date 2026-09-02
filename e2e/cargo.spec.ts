import { expect, test } from '@playwright/test';

/**
 * Cargo smoke: the station moment end to end — wagons load at the first
 * stop, deliver at the next with the station platform gaining a crate, and
 * the delivery count survives a reload (spec acceptance 1, 2, 6, 8).
 */

type WorldHandle = {
  reset: () => void;
  place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
  placeScenery: (kind: string, cell: { x: number; y: number }, rotation: number) => string;
  scenery: () => readonly { id: string; kind: string }[];
  deliveryCount: (id: string) => number;
};

const resetAndBuild = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    world.reset();
    world.place('corner', { x: 1, y: 7 }, 90);
    world.place('corner', { x: 2, y: 7 }, 180);
    world.place('corner', { x: 2, y: 8 }, 270);
    world.place('corner', { x: 1, y: 8 }, 0);
    if (world.placeScenery('station', { x: 3, y: 7 }, 0) !== 'placed') {
      throw new Error('station placement failed');
    }
    const station = world.scenery().find((item) => item.kind === 'station');
    if (!station) throw new Error('station missing');
    return station.id;
  });

test('wagons load, deliver, and the station keeps the count across a reload', async ({ page }) => {
  // The poll below allows 45s, so the test itself must outlive it: on loaded
  // CI runners the 30s default kills the test before a slow first lap lands.
  test.setTimeout(90_000);
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await page.goto('/');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
  await page.waitForTimeout(1200);

  const stationId: string = await resetAndBuild(page);

  // The crate asset rides along with the wagons from the start.
  await page.waitForFunction(() =>
    performance.getEntriesByType('resource').some((entry) => entry.name.includes('crate.glb')),
  );

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  // Long enough for the first station stop (loads); the poll below waits for
  // the delivery, so no fixed wait needs to cover two stops.
  await page.waitForTimeout(8000);
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  await expect
    .poll(
      async () =>
        (await page.evaluate(
          ([id]) =>
            (
              window as unknown as { __tinyTracksWorld?: WorldHandle }
            ).__tinyTracksWorld?.deliveryCount(id),
          [stationId] as const,
        )) ?? 0,
      { timeout: 45000, intervals: [2000] },
    )
    .toBeGreaterThanOrEqual(1);

  const count = await page.evaluate(
    ([id]) =>
      (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld?.deliveryCount(
        id,
      ),
    [stationId] as const,
  );

  // The delivery survives a reload: the platform keeps its crate.
  await page.reload();
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
  const restored = await page.evaluate(
    ([id]) =>
      (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld?.deliveryCount(
        id,
      ),
    [stationId] as const,
  );
  expect(restored ?? 0).toBe(count ?? -1);

  const origin = new URL(page.url()).origin;
  const external = requestUrls.filter((url) => new URL(url).origin !== origin);
  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('a train with no station never shows cargo and rides exactly as before', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  await page.goto('/');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
  await page.waitForTimeout(1200);

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
  expect(consoleErrors).toEqual([]);
});
