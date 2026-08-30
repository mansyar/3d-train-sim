import { expect, test } from '@playwright/test';

test('app boots on a tablet with a clean console and zero external requests', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  // Dev builds may show the debug grid toggle; production must never mount one.
  if (process.env.PROD_E2E) {
    await expect(page.locator('.grid-toggle')).toHaveCount(0);
  }

  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await page.goto('/');

  await expect(page).toHaveTitle('Tiny Tracks');
  await expect(page.locator('.scene-canvas')).toBeVisible();
  await expect(page.locator('.toy-slot')).toHaveCount(2);

  await page.click('[data-drawer="trains"]');
  await expect(page.locator('.train-slot')).toHaveCount(3);
  await page.locator('.train-slot[data-train="diesel"]').click();
  await expect(page.locator('.train-slot[data-train="diesel"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.locator('.whistle-toot').click();
  await page.locator('.train-slot[data-train="tram"]').click();
  await page.locator('.whistle-toot').click();
  await page.locator('.train-slot[data-train="steam"]').click();
  await page.locator('.whistle-toot').click();

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

  // Open the toybox (Rails tab) and drag a piece onto the meadow.
  await page.click('[data-drawer="toys"]');
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

  // Open the toybox on the Nature tab and drag a tree onto the meadow.
  await page.click('[data-drawer="toys"]');
  await page.click('.drawer-tab[data-tab="nature"]');
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

test('riding a loop with a station stops at it and rolls on cleanly', async ({ page }) => {
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

  // A four-corner loop with a station beside one cell, via the dev handle.
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
    world.place('corner', { x: 7, y: 7 }, 90);
    world.place('corner', { x: 8, y: 7 }, 180);
    world.place('corner', { x: 8, y: 8 }, 270);
    world.place('corner', { x: 7, y: 8 }, 0);
    if (world.placeScenery('station', { x: 9, y: 7 }, 0) !== 'placed') {
      throw new Error('station placement failed');
    }
  });
  await page.waitForTimeout(800);

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  // Longer than a full lap: the ~2s station stop happens and the ride goes on.
  await page.waitForTimeout(7000);
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  // Two frames after the stop window: still rolling (no dead-end freeze).
  const a = await page.screenshot();
  await page.waitForTimeout(1200);
  const b = await page.screenshot();
  expect(Buffer.compare(a, b)).not.toBe(0);

  const origin = new URL(page.url()).origin;
  const external = requestUrls.filter((url) => new URL(url).origin !== origin);
  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('the sound choice survives a reload through local autosave', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  await page.goto('/');
  // Let the render loop and asset loads settle.
  await page.waitForTimeout(1500);

  const mute = page.locator('.mute-toggle');
  await expect(mute).toHaveAttribute('aria-pressed', 'false');
  await mute.click();
  await expect(mute).toHaveAttribute('aria-pressed', 'true');
  // Let the preference save settle before reloading.
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForTimeout(1500);

  await expect(page.locator('.mute-toggle')).toHaveAttribute('aria-pressed', 'true');
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('a quick tap on a placed toy rotates it 90 degrees in place', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  await page.goto('/');
  await page.waitForTimeout(1500);

  // Deterministically place a straight piece at a known cell.
  const placed = await page.evaluate(() => {
    const world = (
      window as unknown as {
        __tinyTracksWorld?: {
          place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
        };
      }
    ).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    world.place('straight', { x: 8, y: 8 }, 0);
  });
  void placed;

  // Find the cell's screen center via the scene, then tap the toy there.
  const tapPoint = await page.evaluate(() => {
    const sceneHandle = (
      window as unknown as {
        __tinyTracksScene?: {
          cellToScreen: (cell: { x: number; y: number }) => { x: number; y: number } | null;
        };
      }
    ).__tinyTracksScene;
    if (!sceneHandle) throw new Error('dev scene handle missing');
    const point = sceneHandle.cellToScreen({ x: 8, y: 8 });
    if (!point) throw new Error('cell (8,8) not visible on screen');
    return point;
  });

  await page.mouse.click(tapPoint.x, tapPoint.y);
  await page.waitForTimeout(400);

  const rotated = await page.evaluate(() => {
    const world = (
      window as unknown as { __tinyTracksWorld?: { pieces: () => { rotation: number }[] } }
    ).__tinyTracksWorld;
    return world?.pieces()[0]?.rotation;
  });
  expect(rotated).toBe(90);

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('lifting a placed toy shows a ✕ chip that deletes it on tap', async ({ page }) => {
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
        };
      }
    ).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    world.place('straight', { x: 8, y: 8 }, 0);
  });

  const toyPoint = await page.evaluate(() => {
    const sceneHandle = (
      window as unknown as {
        __tinyTracksScene?: {
          cellToScreen: (cell: { x: number; y: number }) => { x: number; y: number } | null;
        };
      }
    ).__tinyTracksScene;
    if (!sceneHandle) throw new Error('dev scene handle missing');
    const point = sceneHandle.cellToScreen({ x: 8, y: 8 });
    if (!point) throw new Error('cell (8,8) not visible on screen');
    return point;
  });

  // Press on the toy, then move just past the lift threshold — the toy lifts
  // as a ghost and the ✕ chip appears beside it.
  await page.mouse.move(toyPoint.x, toyPoint.y);
  await page.mouse.down();
  await page.mouse.move(toyPoint.x + 20, toyPoint.y + 20, { steps: 4 });
  await expect(page.locator('.delete-chip')).toBeVisible();

  // Tapping the chip deletes the toy (silently — no ding).
  await page.locator('.delete-chip').click();
  await page.waitForTimeout(400);

  const count = await page.evaluate(() => {
    const world = (
      window as unknown as {
        __tinyTracksWorld?: { pieces: () => unknown[]; scenery: () => unknown[] };
      }
    ).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    return { pieces: world.pieces().length, scenery: world.scenery().length };
  });
  expect(count.pieces).toBe(0);
  expect(count.scenery).toBe(0);

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('the parent gate clears the world only after hold and confirm', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await page.goto('/');
  // Let the render loop and asset loads settle.
  await page.waitForTimeout(1500);

  await page.evaluate(() => {
    const world = (
      window as unknown as {
        __tinyTracksWorld?: {
          place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
          selectTrain: (kind: string) => boolean;
        };
      }
    ).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    world.place('straight', { x: 7, y: 7 }, 0);
    world.selectTrain('diesel');
  });
  await page.waitForTimeout(400);

  const gate = page.locator('.parent-gate');
  const holdLabel = 'Parent gate — press and hold to reset the world';
  await expect(gate).toHaveAttribute('aria-label', holdLabel);
  const box = await gate.boundingBox();
  if (!box) throw new Error('parent gate visible');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // A quick toddler-style press releases early and cancels silently.
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.waitForTimeout(300);
  await page.mouse.up();
  await expect(gate).toHaveAttribute('aria-label', holdLabel);

  // The full hold arms the icon-only confirm step…
  await page.mouse.down();
  await page.waitForTimeout(2400);
  await page.mouse.up();
  await expect(gate).toHaveAttribute('aria-label', /Confirm/i);

  // …and a tap anywhere else dismisses it without destroying anything.
  await page.mouse.click(400, 400);
  await expect(gate).toHaveAttribute('aria-label', holdLabel);

  // Hold → confirm → the meadow returns to its factory default.
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.waitForTimeout(2400);
  await page.mouse.up();
  await expect(gate).toHaveAttribute('aria-label', /Confirm/i);
  // The armed gate pulses (by design) — a real finger taps right through it.
  await gate.click({ force: true });

  await page.waitForTimeout(400);
  const after = await page.evaluate(() => {
    const world = (
      window as unknown as {
        __tinyTracksWorld?: { pieces: () => readonly unknown[]; train: () => string };
      }
    ).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    return { pieces: world.pieces(), train: world.train() };
  });
  expect(after.pieces).toHaveLength(0);
  expect(after.train).toBe('steam');

  // The fresh empty world is what autosave keeps.
  await page.reload();
  await page.waitForTimeout(1500);
  const restored = await page.evaluate(() => {
    const world = (
      window as unknown as {
        __tinyTracksWorld?: { pieces: () => readonly unknown[] };
      }
    ).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    return world.pieces();
  });
  expect(restored).toHaveLength(0);

  const origin = new URL(page.url()).origin;
  const external = requestUrls.filter((url) => new URL(url).origin !== origin);
  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('steam puffs emit during rides, stop cleanly, and cover the fleet', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  await page.goto('/');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
  await page.evaluate(() => {
    const world = (
      window as unknown as {
        __tinyTracksWorld?: {
          place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
        };
      }
    ).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    const corners = [
      [{ x: 7, y: 7 }, 90],
      [{ x: 8, y: 7 }, 180],
      [{ x: 8, y: 8 }, 270],
      [{ x: 7, y: 8 }, 0],
    ] as const;
    for (const [cell, rotation] of corners) world.place('corner', cell, rotation);
  });
  await page.waitForTimeout(700);
  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  await page.waitForFunction(() => {
    const scene = (window as unknown as { __tinyTracksScene?: { steamPuffCount: () => number } })
      .__tinyTracksScene;
    return (scene?.steamPuffCount() ?? 0) > 0;
  });
  const active = await page.evaluate(() =>
    (
      window as unknown as { __tinyTracksScene: { steamPuffCount: () => number } }
    ).__tinyTracksScene.steamPuffCount(),
  );
  expect(active).toBeGreaterThan(0);

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).not.toHaveClass(/is-riding/);
  await page.waitForFunction(() => {
    const scene = (window as unknown as { __tinyTracksScene?: { steamPuffCount: () => number } })
      .__tinyTracksScene;
    return scene?.steamPuffCount() === 0;
  });

  await page.click('[data-drawer="trains"]');
  for (const train of ['diesel', 'tram', 'steam']) {
    await page.locator(`.train-slot[data-train="${train}"]`).click();
    await expect(page.locator(`.train-slot[data-train="${train}"]`)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.waitForTimeout(300);
  }
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('cargo wagons ride along, survive a train switch and a reload', async ({ page }) => {
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

  type SceneProbe = { wagonCount: () => number };
  const wagonCount = (): Promise<number | undefined> =>
    page.evaluate(() =>
      (
        window as unknown as { __tinyTracksScene?: { wagonCount: () => number } }
      ).__tinyTracksScene?.wagonCount(),
    );

  // A 2x2 corner loop to ride, via the dev handle.
  await page.evaluate(() => {
    const world = (
      window as unknown as {
        __tinyTracksWorld?: {
          place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
        };
      }
    ).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    const corners = [
      { cell: { x: 7, y: 7 }, rotation: 90 },
      { cell: { x: 8, y: 7 }, rotation: 180 },
      { cell: { x: 8, y: 8 }, rotation: 270 },
      { cell: { x: 7, y: 8 }, rotation: 0 },
    ];
    for (const { cell, rotation } of corners) {
      if (world.place('corner', cell, rotation) !== 'placed') {
        throw new Error(`loop corner placement failed at ${cell.x},${cell.y}`);
      }
    }
  });

  // Both wagons couple up behind the parked engine (loads are async).
  await page.waitForFunction(() => {
    const scene = (window as unknown as { __tinyTracksScene?: SceneProbe }).__tinyTracksScene;
    return scene?.wagonCount() === 2;
  });

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  // Mid-lap: the whole little train is out there riding — still two wagons.
  await page.waitForTimeout(2500);
  expect(await wagonCount()).toBe(2);

  // Switching trains mid-ride eases the ride to a stop; the same wagon set
  // re-attaches behind the new engine — never a third wagon, never none.
  await page.evaluate(() => {
    const world = (
      window as unknown as {
        __tinyTracksWorld?: { selectTrain: (kind: string) => boolean };
      }
    ).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    if (!world.selectTrain('diesel')) throw new Error('train selection failed');
  });
  await expect(page.locator('.ride-toggle')).not.toHaveClass(/is-riding/);
  await page.waitForTimeout(800);
  expect(await wagonCount()).toBe(2);

  // The world — and the wagon set with it — comes back unchanged on reload.
  await page.reload();
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
  const restored = await page.evaluate(() => {
    const world = (
      window as unknown as {
        __tinyTracksWorld?: { pieces: () => readonly unknown[]; train: () => string };
      }
    ).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    return { pieces: world.pieces().length, train: world.train() };
  });
  expect(restored.pieces).toBe(4);
  expect(restored.train).toBe('diesel');
  await page.waitForFunction(() => {
    const scene = (window as unknown as { __tinyTracksScene?: SceneProbe }).__tinyTracksScene;
    return scene?.wagonCount() === 2;
  });

  const origin = new URL(page.url()).origin;
  const external = requestUrls.filter((url) => new URL(url).origin !== origin);
  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('tabbed toybox walkthrough: place a critter and a station, then ride', async ({ page }) => {
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

  // The toybox starts closed; the 🧸 toggle opens it on the Rails tab.
  await expect(page.locator('.toy-drawer')).toBeHidden();
  await page.click('[data-drawer="toys"]');
  await expect(page.locator('.toy-drawer')).toBeVisible();
  await expect(page.locator('.drawer-tab[data-tab="rails"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.drawer-panel[data-panel="rails"]')).toBeVisible();

  // Walk the tabs: Nature, Town (the buildings), Critters (the animals).
  await page.click('.drawer-tab[data-tab="nature"]');
  await expect(page.locator('.drawer-panel[data-panel="nature"]')).toBeVisible();
  await expect(page.locator('.drawer-panel[data-panel="nature"] .scenery-slot')).toHaveCount(3);
  await page.click('.drawer-tab[data-tab="town"]');
  await expect(page.locator('.drawer-tab[data-tab="town"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.drawer-panel[data-panel="nature"]')).toBeHidden();
  await expect(page.locator('.drawer-panel[data-panel="town"]')).toBeVisible();
  await expect(
    page.locator('.drawer-panel[data-panel="town"] [data-scenery="station"]'),
  ).toBeVisible();
  await page.click('.drawer-tab[data-tab="critter"]');
  await expect(page.locator('.drawer-panel[data-panel="critter"]')).toBeVisible();
  await expect(page.locator('.drawer-panel[data-panel="critter"] .scenery-slot')).toHaveCount(3);

  // Drag a sheep from the Critters tab onto the meadow.
  const dragFrom = async (selector: string, x: number, y: number) => {
    const box = await page.locator(selector).boundingBox();
    if (!box) throw new Error(`drawer slot not visible: ${selector}`);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(x, y, { steps: 10 });
    await page.mouse.up();
    // Let the scene sync and the drop-ping animation finish.
    await page.waitForTimeout(600);
  };
  // Drop targets are exact meadow cells via the scene — the same walkthrough
  // runs on the tablet and phone projects regardless of camera framing.
  const cellSpot = (cell: { x: number; y: number }) =>
    page.evaluate((c) => {
      const sceneHandle = (
        window as unknown as {
          __tinyTracksScene?: {
            cellToScreen: (cell: { x: number; y: number }) => { x: number; y: number } | null;
          };
        }
      ).__tinyTracksScene;
      if (!sceneHandle) throw new Error('dev scene handle missing');
      const point = sceneHandle.cellToScreen(c);
      if (!point) throw new Error(`cell (${c.x},${c.y}) not visible on screen`);
      return point;
    }, cell);
  const meadow = await cellSpot({ x: 2, y: 2 });
  await dragFrom('.drawer-panel[data-panel="critter"] [data-scenery="sheep"]', meadow.x, meadow.y);

  // Back to Town, drag the station onto a second meadow spot.
  await page.click('.drawer-tab[data-tab="town"]');
  const stationSpot = await cellSpot({ x: 13, y: 13 });
  await dragFrom(
    '.drawer-panel[data-panel="town"] [data-scenery="station"]',
    stationSpot.x,
    stationSpot.y,
  );

  // Both toys really placed — a failed drop wobble-returns and would not count.
  const toys = await page.evaluate(() => {
    const world = (
      window as unknown as {
        __tinyTracksWorld?: {
          scenery: () => { kind: string; cell: { x: number; y: number } }[];
          place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
        };
      }
    ).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    return world.scenery().map((toy) => ({ kind: toy.kind, cell: toy.cell }));
  });
  expect(toys.map((toy) => toy.kind).sort()).toEqual(['sheep', 'station']);

  // Build a 2x2 corner loop that avoids the placed toys, then ride it.
  const busy = new Set(toys.map((toy) => `${toy.cell.x},${toy.cell.y}`));
  let loop: { x: number; y: number }[] | null = null;
  for (let x = 0; x < 15 && !loop; x += 1) {
    for (let y = 0; y < 15 && !loop; y += 1) {
      const block = [
        { x, y },
        { x: x + 1, y },
        { x: x + 1, y: y + 1 },
        { x, y: y + 1 },
      ];
      if (block.every((cell) => !busy.has(`${cell.x},${cell.y}`))) loop = block;
    }
  }
  if (!loop) throw new Error('no free 2x2 block for the ride loop');
  await page.evaluate((block) => {
    const world = (
      window as unknown as {
        __tinyTracksWorld?: {
          place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
        };
      }
    ).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    const rotations = [90, 180, 270, 0];
    block.forEach((cell, i) => {
      if (world.place('corner', cell, rotations[i] ?? 0) !== 'placed') {
        throw new Error(`loop corner placement failed at ${cell.x},${cell.y}`);
      }
    });
  }, loop);
  await page.waitForTimeout(800);

  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  await page.waitForTimeout(4000);
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

  const origin = new URL(page.url()).origin;
  const external = requestUrls.filter((url) => new URL(url).origin !== origin);
  expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('whistle toots puff steam at the chimney, then dissipate', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  await page.goto('/');
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );
  // A closed loop so the train can ride; the whistle is pressed before the
  // ride starts so only the burst — not the chug — can produce puffs.
  await page.evaluate(() => {
    const world = (
      window as unknown as {
        __tinyTracksWorld?: {
          place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
        };
      }
    ).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    const corners = [
      [{ x: 7, y: 7 }, 90],
      [{ x: 8, y: 7 }, 180],
      [{ x: 8, y: 8 }, 270],
      [{ x: 7, y: 8 }, 0],
    ] as const;
    for (const [cell, rotation] of corners) world.place('corner', cell, rotation);
  });
  await page.waitForTimeout(800);

  await page.click('.whistle-toot');
  // The burst fires staggered puffs from the chimney — a puff appears.
  await page.waitForFunction(() => {
    const scene = (window as unknown as { __tinyTracksScene?: { steamPuffCount: () => number } })
      .__tinyTracksScene;
    return (scene?.steamPuffCount() ?? 0) > 0;
  });
  const active = await page.evaluate(() =>
    (
      window as unknown as { __tinyTracksScene: { steamPuffCount: () => number } }
    ).__tinyTracksScene.steamPuffCount(),
  );
  expect(active).toBeGreaterThan(0);

  // Then the puffs fade out and the pool recycles.
  await page.waitForFunction(() => {
    const scene = (window as unknown as { __tinyTracksScene?: { steamPuffCount: () => number } })
      .__tinyTracksScene;
    return scene?.steamPuffCount() === 0;
  });

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
