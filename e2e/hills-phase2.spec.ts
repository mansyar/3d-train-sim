import { expect, test } from '@playwright/test';

import { clearMeadow } from './helpers';

/**
 * Hills Phase 2 smoke: the bump half-run and the elevated corner run drag
 * in like any track piece, load their own GLBs, ride end to end (forward
 * and shuttled back) with a clean console, and survive a reload through the
 * real autosave path (spec acceptance: standard smoke).
 */

type WorldHandle = {
  place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
  pieces: () => readonly unknown[];
};

const placeLine = (
  page: import('@playwright/test').Page,
  cells: [string, { x: number; y: number }, number?][],
) =>
  page.evaluate((line) => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    for (const [type, cell, rotation] of line) {
      if (world.place(type, cell, rotation ?? 0) !== 'placed') {
        throw new Error(`placement failed: ${type} at ${cell.x},${cell.y}`);
      }
    }
  }, cells);

const collectConsole = (page: import('@playwright/test').Page): string[] => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));
  return consoleErrors;
};

const boot = async (page: import('@playwright/test').Page): Promise<void> => {
  await page.goto('/');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
  await clearMeadow(page);
};

const expectCleanRide = async (
  page: import('@playwright/test').Page,
  consoleErrors: string[],
  rideMs: number,
): Promise<void> => {
  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  await page.waitForTimeout(rideMs);
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  const a = await page.screenshot();
  await page.waitForTimeout(1200);
  const b = await page.screenshot();
  expect(Buffer.compare(a, b)).not.toBe(0);

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
};

test('the bump run loads its GLBs and rides up and over cleanly', async ({ page }) => {
  const consoleErrors = collectConsole(page);
  await boot(page);

  await placeLine(page, [
    ['bump-up', { x: 2, y: 4 }],
    ['hill-half', { x: 2, y: 3 }],
    ['bump-down', { x: 2, y: 2 }],
  ]);

  for (const glb of ['hill-bump-up.glb', 'hill-hill-half.glb', 'hill-bump-down.glb']) {
    await page.waitForFunction(
      (name) =>
        performance.getEntriesByType('resource').some((entry) => entry.name.includes(name)),
      glb,
    );
  }

  // Long enough to hump over, shuttle back, and hump over again.
  await expectCleanRide(page, consoleErrors, 8000);
});

test('the elevated corner run loads its GLBs and banks through cleanly', async ({ page }) => {
  const consoleErrors = collectConsole(page);
  await boot(page);

  // A little shuttle dogleg: straight → banked corner → straight.
  await placeLine(page, [
    ['straight', { x: 2, y: 2 }],
    ['corner-up', { x: 2, y: 3 }],
    ['straight', { x: 3, y: 3 }, 90],
  ]);

  for (const glb of ['hill-corner-up.glb']) {
    await page.waitForFunction(
      (name) =>
        performance.getEntriesByType('resource').some((entry) => entry.name.includes(name)),
      glb,
    );
  }

  await expectCleanRide(page, consoleErrors, 6000);
});

test('phase-2 pieces survive a reload', async ({ page }) => {
  const consoleErrors = collectConsole(page);
  await boot(page);

  await placeLine(page, [
    ['bump-up', { x: 2, y: 4 }],
    ['hill-half', { x: 2, y: 3 }],
    ['bump-down', { x: 2, y: 2 }],
    ['straight', { x: 3, y: 3 }],
    ['hill-corner', { x: 3, y: 4 }],
    ['straight', { x: 3, y: 5 }],
  ]);
  await page.waitForTimeout(800);

  await page.reload();
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
  const restored = await page.evaluate(
    () =>
      (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld?.pieces()
        .length ?? 0,
  );
  expect(restored).toBe(6);

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
