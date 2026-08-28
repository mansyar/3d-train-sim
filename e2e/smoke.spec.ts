import { expect, test } from '@playwright/test';

test('app boots on a tablet with a clean console and zero external requests', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await page.goto('/');

  await expect(page).toHaveTitle('Tiny Tracks');
  await expect(page.locator('.scene-canvas')).toBeVisible();
  await expect(page.locator('.toy-slot')).toHaveCount(3);

  await page.click('[data-drawer="trains"]');
  await expect(page.locator('.train-slot')).toHaveCount(3);
  await page.locator('.train-slot[data-train="diesel"]').click();
  await expect(page.locator('.train-slot[data-train="diesel"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  // Let the render loop and asset loads (locomotive GLB, texture) settle.
  await page.waitForTimeout(1000);

  const origin = new URL(page.url()).origin;
  const external = requestUrls.filter((url) => new URL(url).origin !== origin);
  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('selected train survives a reload through local autosave', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
  await page.click('[data-drawer="trains"]');
  await page.locator('.train-slot[data-train="steam"]').click();
  await page.waitForTimeout(100);
  await page.locator('.train-slot[data-train="tram"]').click();
  await page.waitForTimeout(300);
  await page.reload();
  await page.waitForTimeout(1200);
  await page.click('[data-drawer="trains"]');
  await expect(page.locator('.train-slot[data-train="tram"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('drag-placing a track piece renders it in the world', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await page.goto('/');
  // Let the render loop and GLB loads settle before interacting.
  await page.waitForTimeout(1500);

  const before = await page.screenshot();

  // Open the track drawer and drag a piece onto the meadow.
  await page.click('[data-drawer="track"]');
  const slot = page.locator('.piece-slot').first();
  const box = await slot.boundingBox();
  if (!box) throw new Error('drawer piece slot visible');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(640, 380, { steps: 10 });
  await page.mouse.up();
  // Let the scene sync and the drop-ping animation finish.
  await page.waitForTimeout(600);

  const after = await page.screenshot();
  expect(Buffer.compare(before, after)).not.toBe(0);

  const origin = new URL(page.url()).origin;
  const external = requestUrls.filter((url) => new URL(url).origin !== origin);
  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('drag-placing scenery decorates the meadow', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await page.goto('/');
  // Let the render loop and GLB loads settle before interacting.
  await page.waitForTimeout(1500);

  const before = await page.screenshot();

  // Open the scenery drawer and drag a tree onto the meadow.
  await page.click('[data-drawer="scenery"]');
  const slot = page.locator('.scenery-slot').first();
  const box = await slot.boundingBox();
  if (!box) throw new Error('drawer scenery slot visible');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(640, 380, { steps: 10 });
  await page.mouse.up();
  // Let the scene sync and the drop-ping animation finish.
  await page.waitForTimeout(600);

  const after = await page.screenshot();
  expect(Buffer.compare(before, after)).not.toBe(0);

  const origin = new URL(page.url()).origin;
  const external = requestUrls.filter((url) => new URL(url).origin !== origin);
  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('track and scenery survive a reload through local autosave', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  await page.goto('/');
  await page.waitForTimeout(1500);

  await page.evaluate(() => {
    const world = (
      window as unknown as {
        __tinyTracksWorld?: {
          place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
          placeScenery: (kind: string, cell: { x: number; y: number }, rotation: number) => string;
        };
      }
    ).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    if (world.place('straight', { x: 7, y: 7 }, 0) !== 'placed') {
      throw new Error('track placement failed');
    }
    if (world.placeScenery('tree', { x: 8, y: 7 }, 90) !== 'placed') {
      throw new Error('scenery placement failed');
    }
  });
  await page.waitForTimeout(500);
  await page.reload();
  await page.waitForTimeout(1500);

  const restored = await page.evaluate(() => {
    const world = (
      window as unknown as {
        __tinyTracksWorld?: {
          pieces: () => readonly unknown[];
          scenery: () => readonly unknown[];
        };
      }
    ).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    return { pieces: world.pieces(), scenery: world.scenery() };
  });
  expect(restored.pieces).toHaveLength(1);
  expect(restored.scenery).toHaveLength(1);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('the sound box mounts: toot, mute flip, silent console', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  await page.goto('/');
  // Let the render loop and asset loads settle.
  await page.waitForTimeout(1500);

  // A big friendly toot — safe to press anytime.
  const whistle = page.locator('.whistle-toot');
  await expect(whistle).toBeVisible();
  await whistle.click();

  // The mute toggle flips its pressed state (sound starts on, session-only).
  const mute = page.locator('.mute-toggle');
  await expect(mute).toHaveAttribute('aria-pressed', 'false');
  await mute.click();
  await expect(mute).toHaveAttribute('aria-pressed', 'true');
  await mute.click();
  await expect(mute).toHaveAttribute('aria-pressed', 'false');

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('pressing play rides the train along the placed track', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await page.goto('/');
  // Let the render loop and GLB loads (locomotive included) settle.
  await page.waitForTimeout(1500);

  // Lay a two-piece straight via the dev-only world handle, then ride it.
  await page.evaluate(() => {
    const world = (
      window as unknown as {
        __tinyTracksWorld?: {
          place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
        };
      }
    ).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    world.place('straight', { x: 7, y: 7 }, 0);
    world.place('straight', { x: 7, y: 8 }, 0);
  });
  await page.waitForTimeout(800);

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  // Let the camera ease onto the chase and the train get moving, then
  // sample two frames — riding must visibly change the scene.
  await page.waitForTimeout(2500);
  const a = await page.screenshot();
  await page.waitForTimeout(1200);
  const b = await page.screenshot();
  expect(Buffer.compare(a, b)).not.toBe(0);

  const origin = new URL(page.url()).origin;
  const external = requestUrls.filter((url) => new URL(url).origin !== origin);
  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
