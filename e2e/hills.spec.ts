import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { clearMeadow, watchConsoleErrors } from './helpers';

/**
 * Hill smoke, merged into one file: the hill run climbs, crosses and comes
 * back down with its own GLBs; the phase-2 shapes (bumps, a banked corner)
 * ride up and over cleanly; and both layouts survive a reload through the
 * real autosave path. The console and the network are the witnesses
 * (spec acceptance 8).
 */

type WorldHandle = {
  place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
  pieces: () => readonly unknown[];
};

const waitReady = (page: Page) =>
  page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );

const boot = async (page: Page): Promise<void> => {
  await page.goto('/');
  await waitReady(page);
};

const placeLine = (page: Page, cells: [string, { x: number; y: number }, number?][]) =>
  page.evaluate((line) => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    for (const [type, cell, rotation] of line) {
      if (world.place(type, cell, rotation ?? 0) !== 'placed') {
        throw new Error(`placement failed: ${type} at ${cell.x},${cell.y}`);
      }
    }
  }, cells);

const waitForGlb = (page: Page, asset: string) =>
  page.waitForFunction(
    (name) => performance.getEntriesByType('resource').some((entry) => entry.name.includes(name)),
    asset,
  );

const startRide = async (page: Page): Promise<void> => {
  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
};

const stopRide = async (page: Page): Promise<void> => {
  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).not.toHaveClass(/is-riding/);
};

const expectSceneChanging = async (page: Page): Promise<void> => {
  const a = await page.screenshot();
  await page.waitForTimeout(1200);
  const b = await page.screenshot();
  expect(Buffer.compare(a, b)).not.toBe(0);
};

const expectClean = (consoleErrors: string[]): void => {
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
};

const expectNoExternalRequests = (page: Page, requestUrls: string[]): void => {
  const origin = new URL(page.url()).origin;
  const external = requestUrls.filter((url) => new URL(url).origin !== origin);
  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
};

const pieceCount = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld?.pieces()
        .length ?? 0,
  );

test('the hill run climbs, crests, descends, and survives a reload', async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors = watchConsoleErrors(page);
  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await test.step('place the hill run on dry land', async () => {
    await boot(page);
    await clearMeadow(page);
    // slope-up → hill → slope-down on dry land, via the dev handle.
    await placeLine(page, [
      ['slope-up', { x: 2, y: 6 }],
      ['hill', { x: 2, y: 7 }],
      ['slope-down', { x: 2, y: 8 }],
    ]);

    // The pieces' own GLBs arrive only when a hill is placed.
    await waitForGlb(page, 'hill-slope-up.glb');
    await waitForGlb(page, 'hill-hill.glb');
  });

  await test.step('ride over the crest', async () => {
    await startRide(page);

    // Long enough to climb, cross the crest, and coast down — the ride must
    // survive the whole transit and keep rolling.
    await page.waitForTimeout(6000);
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
    await expectSceneChanging(page);

    expectNoExternalRequests(page, requestUrls);
    expectClean(consoleErrors);
  });

  await test.step('place a graded run flanked by straights', async () => {
    await stopRide(page);
    await clearMeadow(page);
    // A hill run flanked by straights — climb, crest, descent, at grade.
    await placeLine(page, [
      ['straight', { x: 2, y: 5 }],
      ['slope-up', { x: 2, y: 6 }],
      ['hill', { x: 2, y: 7 }],
      ['slope-down', { x: 2, y: 8 }],
      ['straight', { x: 2, y: 9 }],
    ]);
    await page.waitForTimeout(800);
  });

  await test.step('ride the graded run', async () => {
    await startRide(page);
    await page.waitForTimeout(5000);
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  });

  await test.step('reload and keep all five pieces', async () => {
    // The world comes back with its hills through the real autosave path.
    await page.reload();
    await waitReady(page);
    expect(await pieceCount(page)).toBe(5);

    expectClean(consoleErrors);
  });
});

test('the phase-2 shapes ride and survive a reload', async ({ page }) => {
  test.setTimeout(180_000);
  const consoleErrors = watchConsoleErrors(page);

  await test.step('boot the meadow', async () => {
    await boot(page);
    await clearMeadow(page);
  });

  await test.step('place the bump run and load its three GLBs', async () => {
    await placeLine(page, [
      ['bump-up', { x: 2, y: 4 }],
      ['hill-half', { x: 2, y: 3 }],
      ['bump-down', { x: 2, y: 2 }],
    ]);

    for (const glb of ['hill-bump-up.glb', 'hill-hill-half.glb', 'hill-bump-down.glb']) {
      await waitForGlb(page, glb);
    }
  });

  await test.step('ride up and over the bumps', async () => {
    await startRide(page);
    // Long enough to hump over, shuttle back, and hump over again.
    await page.waitForTimeout(8000);
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
    await expectSceneChanging(page);
    expectClean(consoleErrors);
  });

  await test.step('place the banked corner run and load its GLB', async () => {
    await stopRide(page);
    await clearMeadow(page);
    // A little shuttle dogleg: straight → banked corner → straight.
    await placeLine(page, [
      ['straight', { x: 2, y: 2 }],
      ['corner-up', { x: 2, y: 3 }],
      ['straight', { x: 3, y: 3 }, 90],
    ]);
    await waitForGlb(page, 'hill-corner-up.glb');
  });

  await test.step('bank through the corner', async () => {
    await startRide(page);
    await page.waitForTimeout(6000);
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
    await expectSceneChanging(page);
    expectClean(consoleErrors);
  });

  await test.step('place the mixed phase-2 layout', async () => {
    await stopRide(page);
    await clearMeadow(page);
    await placeLine(page, [
      ['bump-up', { x: 2, y: 4 }],
      ['hill-half', { x: 2, y: 3 }],
      ['bump-down', { x: 2, y: 2 }],
      ['straight', { x: 3, y: 3 }],
      ['hill-corner', { x: 3, y: 4 }],
      ['straight', { x: 3, y: 5 }],
    ]);
    await page.waitForTimeout(800);
  });

  await test.step('reload and keep all six pieces', async () => {
    await page.reload();
    await waitReady(page);
    expect(await pieceCount(page)).toBe(6);

    expectClean(consoleErrors);
  });
});
