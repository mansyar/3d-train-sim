import { expect, test } from '@playwright/test';

import { clearMeadow } from './helpers';

/**
 * TEMPORARY Phase 2 acceptance probe (hills-phase2 track): every new GLB
 * loads through the dev handle with a clean console. Deleted before merge —
 * Phase 4 writes the real `e2e/hills-phase2.spec.ts` (ride + reload).
 */

type WorldHandle = {
  place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
};

const GLBS = [
  'hill-bump-up.glb',
  'hill-hill-half.glb',
  'hill-bump-down.glb',
  'hill-corner-up.glb',
  'hill-hill-corner.glb',
  'hill-corner-down.glb',
];

test('phase-2 pieces load their GLBs cleanly (temporary probe)', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  await page.goto('/');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );

  await clearMeadow(page);
  const result = await page.evaluate(() => {
    try {
      const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
      if (!world) throw new Error('dev world handle missing');
      const types = ['bump-up', 'hill-half', 'bump-down', 'corner-up', 'hill-corner', 'corner-down'];
    const candidates: { x: number; y: number }[] = [];
    for (let y = 2; y <= 6; y += 1) {
      for (let x = 1; x <= 6; x += 1) candidates.push({ x, y });
    }
    const outcomes: string[] = [];
    let placed = 0;
    for (const cell of candidates) {
      if (placed >= types.length) break;
      const type = types[placed] as string;
      let result: string;
      try {
        result = world.place(type, cell, 0);
      } catch (error) {
        result = `THROW:${String(error)} :: ${(error as Error)?.stack ?? 'no-stack'}`;
      }
      if (result === 'placed') {
        outcomes.push(`${type}=${cell.x},${cell.y}`);
        placed += 1;
      }
    }
    return { outcomes };
    } catch (error) {
      return { failed: String(error), stack: (error as Error)?.stack ?? null };
    }
  });
  console.log(`PLACE RESULT: ${JSON.stringify(result)}`);
  expect(result.outcomes).toHaveLength(6);

  for (const glb of GLBS) {
    await page.waitForFunction(
      (name) =>
        performance.getEntriesByType('resource').some((entry) => entry.name.includes(name)),
      glb,
    );
  }
  // Let the renderer settle (template wiring, shadow flags) before judging.
  await page.waitForTimeout(1500);

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);

  // Phase 3 ride smoke: a bump run rides end to end and keeps rolling.
  await clearMeadow(page);
  await page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    const run: [string, { x: number; y: number }][] = [
      ['bump-up', { x: 2, y: 4 }],
      ['hill-half', { x: 2, y: 3 }],
      ['bump-down', { x: 2, y: 2 }],
    ];
    for (const [type, cell] of run) {
      if (world.place(type, cell, 0) !== 'placed') {
        throw new Error(`bump-run placement failed: ${type} at ${cell.x},${cell.y}`);
      }
    }
  });
  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  await page.waitForTimeout(6000);
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  const a = await page.screenshot();
  await page.waitForTimeout(1200);
  const b = await page.screenshot();
  expect(Buffer.compare(a, b)).not.toBe(0);

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
