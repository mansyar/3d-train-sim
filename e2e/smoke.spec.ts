import { expect, test } from '@playwright/test';

import { clearMeadow, watchConsoleErrors } from './helpers';

/**
 * The smoke journey — ten tests where there were twenty.
 *
 * Each merged test boots once and names its phases with `test.step`, so a
 * failure points at the action rather than at a sixty-second body. The @smoke
 * tests are the fast lane (`pnpm e2e`): boot with a clean console and zero
 * external requests, the build journey, ride and stop, the autosave round trip
 * and the parent gate. The @ci frame-rate canary stays its own test because it
 * is skipped locally, and folding it in would skip a whole journey.
 */

const waitForReady = (page: import('@playwright/test').Page) =>
  page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );

test('app boots on a tablet with a clean console and zero external requests @smoke', async ({
  page,
}) => {
  const consoleErrors = watchConsoleErrors(page);

  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await page.goto('/');

  await test.step('the shell, the canvas and both rail slots appear', async () => {
    await expect(page).toHaveTitle('Tiny Tracks');
    await expect(page.locator('.scene-canvas')).toBeVisible();
    await expect(page.locator('.toy-slot')).toHaveCount(2);
  });

  await test.step('every train pick sticks and the whistle toots for each', async () => {
    await page.click('[data-drawer="trains"]');
    await expect(page.locator('.train-slot')).toHaveCount(6);
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
  });

  await test.step('nothing left the page and the console stayed silent', async () => {
    // Let the render loop and asset loads (locomotive GLB, texture) settle.
    await page.waitForTimeout(1000);

    const origin = new URL(page.url()).origin;
    const external = requestUrls.filter((url) => new URL(url).origin !== origin);
    expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });
});

test('the build journey: drag-place, rotate, lift, trash and take back @smoke', async ({
  page,
}) => {
  test.setTimeout(180_000); // the six folded journeys' default budgets, summed
  const consoleErrors = watchConsoleErrors(page);

  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await page.goto('/');
  // Let the render loop and GLB loads settle before interacting.
  await page.waitForTimeout(1500);

  // The 🧸 toggle flips the drawer, and remembers the tab it was last on.
  const drawerOpen = async () =>
    (await page.locator('[data-drawer="toys"]').getAttribute('aria-expanded')) === 'true';
  const closeDrawer = async () => {
    if (await drawerOpen()) await page.click('[data-drawer="toys"]');
  };

  await test.step('drag a track piece out of the Rails tab onto the meadow', async () => {
    // The drawer is closed at boot and opens on Rails — its first tab.
    await closeDrawer();
    await page.click('[data-drawer="toys"]');

    const before = await page.screenshot();

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
  });

  await test.step('drag a tree from the Nature tab onto the meadow', async () => {
    await closeDrawer();
    await page.click('[data-drawer="toys"]');
    await page.click('.drawer-tab[data-tab="nature"]');

    // The starter meadow already holds scenery, so the witness is "exactly one
    // more toy, at the cell we aimed at" — not "the scenery list equals one".
    const countScenery = () =>
      page.evaluate(() => {
        const world = (
          window as unknown as {
            __tinyTracksWorld?: { scenery: () => readonly unknown[] };
          }
        ).__tinyTracksWorld;
        if (!world) throw new Error('dev world handle missing');
        return world.scenery().length;
      });
    const beforeCount = await countScenery();

    // Drop on a known free cell, not on the piece the last step just placed: a
    // cell is held by either a piece or a scenery toy, so a second drop at the
    // same point is refused and wobble-returns, which a screenshot cannot tell
    // apart from a placement once the drawer has also opened.
    const point = await page.evaluate(
      (cell) => {
        const sceneHandle = (
          window as unknown as {
            __tinyTracksScene?: {
              cellToScreen: (c: { x: number; y: number }) => { x: number; y: number } | null;
            };
          }
        ).__tinyTracksScene;
        const projected = sceneHandle?.cellToScreen(cell) ?? null;
        if (!projected) throw new Error('cell (2,2) not visible on screen');
        return projected;
      },
      { x: 2, y: 2 },
    );

    const slot = page.locator('.drawer-panel[data-panel="nature"] .scenery-slot').first();
    const box = await slot.boundingBox();
    if (!box) throw new Error('drawer scenery slot visible');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(point.x, point.y, { steps: 10 });
    await page.mouse.up();
    // Let the scene sync and the drop-ping animation finish.
    await page.waitForTimeout(600);

    const scenery = await page.evaluate(() => {
      const world = (
        window as unknown as {
          __tinyTracksWorld?: {
            scenery: () => { kind: string; cell: { x: number; y: number } }[];
          };
        }
      ).__tinyTracksWorld;
      if (!world) throw new Error('dev world handle missing');
      return world.scenery().map((toy) => ({ kind: toy.kind, cell: toy.cell }));
    });
    // A refused drop leaves a wobbling chip and no toy, so this is the witness.
    expect(scenery).toHaveLength(beforeCount + 1);
    expect(scenery.filter((toy) => toy.cell.x === 2 && toy.cell.y === 2)).toEqual([
      { kind: 'tree', cell: { x: 2, y: 2 } },
    ]);
  });

  await test.step('a quick tap on a placed toy rotates it 90 degrees in place', async () => {
    // Hand the drawer back on Rails, the tab a fresh boot opens on.
    if (!(await drawerOpen())) await page.click('[data-drawer="toys"]');
    if (
      (await page.locator('.drawer-tab[data-tab="rails"]').getAttribute('aria-pressed')) !== 'true'
    ) {
      await page.click('.drawer-tab[data-tab="rails"]');
    }
    await closeDrawer();
    await clearMeadow(page);

    // Deterministically place a straight piece at a known cell.
    await page.evaluate(() => {
      const world = (
        window as unknown as {
          __tinyTracksWorld?: {
            place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
          };
        }
      ).__tinyTracksWorld;
      if (!world) throw new Error('dev world handle missing');
      world.place('straight', { x: 2, y: 8 }, 0);
    });

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
      const point = sceneHandle.cellToScreen({ x: 2, y: 8 });
      if (!point) throw new Error('cell (2,8) not visible on screen');
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
  });

  await test.step('lifting a placed toy shows a ✕ chip that deletes it on tap', async () => {
    await clearMeadow(page);

    await page.evaluate(() => {
      const world = (
        window as unknown as {
          __tinyTracksWorld?: {
            place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
          };
        }
      ).__tinyTracksWorld;
      if (!world) throw new Error('dev world handle missing');
      world.place('straight', { x: 2, y: 8 }, 0);
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
      const point = sceneHandle.cellToScreen({ x: 2, y: 8 });
      if (!point) throw new Error('cell (2,8) not visible on screen');
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
  });

  await test.step('drag-to-trash deletes a lifted toy over the rail, and undo takes it back', async () => {
    await clearMeadow(page);

    await page.evaluate(() => {
      const world = (
        window as unknown as {
          __tinyTracksWorld?: {
            place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
          };
        }
      ).__tinyTracksWorld;
      if (!world) throw new Error('dev world handle missing');
      world.place('straight', { x: 6, y: 8 }, 0);
    });

    // Drag the toy straight down into the trash bin on the rail.
    const start = await page.evaluate(() => {
      const sceneHandle = (
        window as unknown as {
          __tinyTracksScene?: {
            cellToScreen: (cell: { x: number; y: number }) => { x: number; y: number } | null;
          };
        }
      ).__tinyTracksScene;
      if (!sceneHandle) throw new Error('dev scene handle missing');
      const point = sceneHandle.cellToScreen({ x: 6, y: 8 });
      if (!point) throw new Error('cell (6,8) not visible on screen');
      return point;
    });
    const trash = await page.locator('.trash-slot').boundingBox();
    if (!trash) throw new Error('trash slot not visible');

    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    // Lift over the threshold, then travel to the trash bin's center.
    await page.mouse.move(start.x + 16, start.y + 16, { steps: 3 });
    await page.mouse.move(trash.x + trash.width / 2, trash.y + trash.height / 2, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(400);

    const trashed = await page.evaluate(() => {
      const world = (
        window as unknown as {
          __tinyTracksWorld?: { pieces: () => unknown[]; scenery: () => unknown[] };
        }
      ).__tinyTracksWorld;
      if (!world) throw new Error('dev world handle missing');
      return { pieces: world.pieces().length, scenery: world.scenery().length };
    });
    expect(trashed.pieces).toBe(0);
    expect(trashed.scenery).toBe(0);

    // The bin is one take-back on the rail: the trashed toy comes back.
    const undo = page.locator('.undo-toggle');
    await expect(undo).toBeVisible();
    await undo.click();
    await expect(undo).toBeHidden();

    const takenBack = await page.evaluate(() => {
      const world = (
        window as unknown as {
          __tinyTracksWorld?: { pieces: () => unknown[]; scenery: () => unknown[] };
        }
      ).__tinyTracksWorld;
      if (!world) throw new Error('dev world handle missing');
      return { pieces: world.pieces().length, scenery: world.scenery().length };
    });
    expect(takenBack.pieces).toBe(1);
    expect(takenBack.scenery).toBe(0);
  });

  await test.step('walk the toybox tabs, place a critter and a station, then ride', async () => {
    await clearMeadow(page);

    // The toybox starts closed; the 🧸 toggle opens it on the Rails tab.
    await expect(page.locator('.toy-drawer')).toBeHidden();
    await page.click('[data-drawer="toys"]');
    await expect(page.locator('.toy-drawer')).toBeVisible();
    await expect(page.locator('.drawer-tab[data-tab="rails"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('.drawer-panel[data-panel="rails"]')).toBeVisible();

    // Progressive disclosure: a fresh profile locks the advanced tier
    // (three-way, double-slip, station). Three completed rides unlock it —
    // the drawer listens to the world store, which this seeds directly so
    // the journey below can place a station.
    await page.evaluate(() => {
      const world = (
        window as unknown as {
          __tinyTracksWorld?: { recordRide: () => boolean };
        }
      ).__tinyTracksWorld;
      if (!world) throw new Error('dev world handle missing');
      world.recordRide();
      world.recordRide();
      world.recordRide();
    });

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
    await expect(page.locator('.drawer-panel[data-panel="critter"] .scenery-slot')).toHaveCount(4);

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
    await dragFrom(
      '.drawer-panel[data-panel="critter"] [data-scenery="sheep"]',
      meadow.x,
      meadow.y,
    );

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
  });

  await test.step('nothing left the page and the console stayed silent', async () => {
    const origin = new URL(page.url()).origin;
    const external = requestUrls.filter((url) => new URL(url).origin !== origin);
    expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });
});

test('pressing play rides the track, and a loop with a station stops and rolls on @smoke', async ({
  page,
}) => {
  test.setTimeout(90_000); // two default budgets, summed
  const consoleErrors = watchConsoleErrors(page);

  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await page.goto('/');
  // Let the render loop and GLB loads (locomotive included) settle.
  await page.waitForTimeout(1500);

  await test.step('ride a two-piece straight line', async () => {
    // Lay a two-piece straight via the dev-only world handle, then ride it.
    await clearMeadow(page);
    await page.evaluate(() => {
      const world = (
        window as unknown as {
          __tinyTracksWorld?: {
            place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
          };
        }
      ).__tinyTracksWorld;
      if (!world) throw new Error('dev world handle missing');
      world.place('straight', { x: 2, y: 7 }, 0);
      world.place('straight', { x: 2, y: 8 }, 0);
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
  });

  await test.step('stop the ride before laying the next layout', async () => {
    // The originals each built their layout on a fresh, idle meadow.
    await page.click('.ride-toggle');
    await expect(page.locator('.ride-toggle')).not.toHaveClass(/is-riding/);
  });

  await test.step('ride a loop with a station, stop at it and roll on cleanly', async () => {
    // A four-corner loop with a station beside one cell, via the dev handle.
    await clearMeadow(page);
    await page.evaluate(() => {
      const world = (
        window as unknown as {
          __tinyTracksWorld?: {
            place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
            placeScenery: (
              kind: string,
              cell: { x: number; y: number },
              rotation: number,
            ) => string;
          };
        }
      ).__tinyTracksWorld;
      if (!world) throw new Error('dev world handle missing');
      world.place('corner', { x: 1, y: 7 }, 90);
      world.place('corner', { x: 2, y: 7 }, 180);
      world.place('corner', { x: 2, y: 8 }, 270);
      world.place('corner', { x: 1, y: 8 }, 0);
      if (world.placeScenery('station', { x: 3, y: 7 }, 0) !== 'placed') {
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
  });

  await test.step('nothing left the page and the console stayed silent', async () => {
    const origin = new URL(page.url()).origin;
    const external = requestUrls.filter((url) => new URL(url).origin !== origin);
    expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });
});

test('steam puffs at the chimney: a whistle burst, a ride, and the whole fleet', async ({
  page,
}) => {
  test.setTimeout(90_000); // the puffs' 60 s budget plus the whistle's default
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);

  // A closed loop so the train can ride; the whistle is pressed before the
  // ride starts so only the burst — not the chug — can produce puffs.
  await test.step('a whistle burst puffs at the chimney, then dissipates', async () => {
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
        [{ x: 1, y: 7 }, 90],
        [{ x: 2, y: 7 }, 180],
        [{ x: 2, y: 8 }, 270],
        [{ x: 1, y: 8 }, 0],
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
  });

  await test.step('the ride puffs, stops cleanly, and every engine takes a turn', async () => {
    // The fleet loop swaps six engines (three of them first-time GLB loads), so
    // the puffs test carries a 60 s budget: the loop must outlive its loads.
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
    for (const train of ['diesel', 'tram', 'steam', 'express', 'freight', 'bullet']) {
      await page.locator(`.train-slot[data-train="${train}"]`).click();
      await expect(page.locator(`.train-slot[data-train="${train}"]`)).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await page.waitForTimeout(300);
    }
  });

  await test.step('the console stayed silent', async () => {
    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });
});

test('the chosen train, the chosen sound and the placed toys survive one reload @smoke', async ({
  page,
  context,
}) => {
  test.setTimeout(90_000); // three default budgets, summed
  const consoleErrors = watchConsoleErrors(page);

  await context.clearCookies();
  await page.goto('/');
  await waitForReady(page);
  await page.waitForTimeout(1500);

  await test.step('place a piece and a tree, choose tram over steam, and mute', async () => {
    await clearMeadow(page);
    await page.evaluate(() => {
      const world = (
        window as unknown as {
          __tinyTracksWorld?: {
            place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
            placeScenery: (
              kind: string,
              cell: { x: number; y: number },
              rotation: number,
            ) => string;
          };
        }
      ).__tinyTracksWorld;
      if (!world) throw new Error('dev world handle missing');
      if (world.place('straight', { x: 2, y: 7 }, 0) !== 'placed') {
        throw new Error('track placement failed');
      }
      if (world.placeScenery('tree', { x: 3, y: 7 }, 90) !== 'placed') {
        throw new Error('scenery placement failed');
      }
    });
    await page.waitForTimeout(500);

    await page.click('[data-drawer="trains"]');
    await page.locator('.train-slot[data-train="steam"]').click();
    await page.waitForTimeout(100);
    await page.locator('.train-slot[data-train="tram"]').click();
    await page.waitForTimeout(300);

    // The mute toggle flips its pressed state (sound starts on, session-only).
    const mute = page.locator('.mute-toggle');
    await expect(mute).toHaveAttribute('aria-pressed', 'false');
    await mute.click();
    await expect(mute).toHaveAttribute('aria-pressed', 'true');
    // Let the preference save settle before reloading.
    await page.waitForTimeout(400);
  });

  await test.step('reload once, after the autosave settles', async () => {
    await page.waitForTimeout(500);
    await page.reload();
    await page.waitForTimeout(1500);
  });

  await test.step('the train, the mute and both toys came back', async () => {
    await page.click('[data-drawer="trains"]');
    await expect(page.locator('.train-slot[data-train="tram"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('.mute-toggle')).toHaveAttribute('aria-pressed', 'true');

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
});

test('the parent gate clears the world only after hold and confirm, and the day and mute toggles answer @smoke', async ({
  page,
}) => {
  test.setTimeout(90_000); // the gate's, the ambience's and the sound box's defaults
  const consoleErrors = watchConsoleErrors(page);

  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await page.goto('/');
  // Let the render loop and asset loads settle.
  await page.waitForTimeout(1500);

  const gate = page.locator('.parent-gate');
  const holdLabel = 'Parent gate — press and hold to reset the world';

  await test.step('build a meadow and read the gate', async () => {
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
      world.place('straight', { x: 2, y: 7 }, 0);
      world.selectTrain('diesel');
    });
    await page.waitForTimeout(400);

    await expect(gate).toHaveAttribute('aria-label', holdLabel);
  });

  const gateBox = await gate.boundingBox();
  if (!gateBox) throw new Error('parent gate visible');
  const cx = gateBox.x + gateBox.width / 2;
  const cy = gateBox.y + gateBox.height / 2;

  await test.step('a quick toddler press releases early and cancels silently', async () => {
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
  });

  await test.step('a tap anywhere else dismisses the armed confirm', async () => {
    await page.mouse.click(400, 400);
    await expect(gate).toHaveAttribute('aria-label', holdLabel);
  });

  await test.step('hold, confirm, and the meadow returns to its factory default', async () => {
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
  });

  await test.step('the fresh empty world is what autosave keeps', async () => {
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
  });

  await test.step('the idle meadow keeps drifting on its own', async () => {
    await waitForReady(page);

    // No ride, no touches: the pure ambience alone (sky lerp, drifting clouds,
    // sun arc) must keep the scene visibly changing for a long idle stretch.
    await page.waitForTimeout(10_000);
    const a = await page.screenshot();
    await page.waitForTimeout(1500);
    const b = await page.screenshot();
    expect(Buffer.compare(a, b)).not.toBe(0);
  });

  await test.step('the sound box mounts: a toot and a mute flip', async () => {
    // A big friendly toot — safe to press anytime.
    const whistle = page.locator('.whistle-toot');
    await expect(whistle).toBeVisible();
    await whistle.click();

    const mute = page.locator('.mute-toggle');
    await expect(mute).toHaveAttribute('aria-pressed', 'false');
    await mute.click();
    await expect(mute).toHaveAttribute('aria-pressed', 'true');
    await mute.click();
    await expect(mute).toHaveAttribute('aria-pressed', 'false');
  });

  await test.step('the day toggle turns the page and previews the next phase', async () => {
    const dayPhase = () =>
      page.evaluate(() =>
        (
          window as unknown as { __tinyTracksScene?: { dayPhase: () => string } }
        ).__tinyTracksScene?.dayPhase(),
      );
    const before = await dayPhase();
    await page.locator('.day-toggle').click();
    await page.waitForFunction(
      (previous) =>
        (
          window as unknown as { __tinyTracksScene?: { dayPhase: () => string } }
        ).__tinyTracksScene?.dayPhase() !== previous,
      before,
    );

    // Dusk counts as night: the sun is already on its way down.
    const turned = await page.evaluate(() => ({
      phase:
        (
          window as unknown as { __tinyTracksScene?: { dayPhase: () => string } }
        ).__tinyTracksScene?.dayPhase() ?? '',
      icon: document.querySelector('.day-toggle')?.textContent ?? '',
    }));
    expect(turned.phase).not.toBe(before);
    expect(turned.icon).toBe(['noon', 'dusk'].includes(turned.phase) ? '🌙' : '☀️');
  });

  await test.step('nothing left the page and the console stayed silent', async () => {
    const origin = new URL(page.url()).origin;
    const external = requestUrls.filter((url) => new URL(url).origin !== origin);
    expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });
});

test('tablet emulation keeps an ambient frame rate with a clean console @ci', async ({ page }) => {
  test.skip(
    !process.env.CI,
    'throughput canary runs in CI, where software rendering is the baseline',
  );
  const consoleErrors = watchConsoleErrors(page);

  // The measurement itself is short, but a contended machine (the second
  // worker loading GLBs) can starve the page's main thread long enough that the
  // evaluate call never returns inside the default 30 s. That reported "wedge"
  // says nothing about the render loop, so give the sample room and let the FPS
  // floor be the judge.
  test.setTimeout(90_000);

  await page.goto('/');
  await waitForReady(page);
  await page.waitForTimeout(2000); // Settle asset loads (locomotive GLB).

  await test.step('count animation frames over 5 s of idle ambience', async () => {
    // A floor check, not a 60 FPS guarantee. Locally ≥10 FPS; CI runners render
    // on software GL and only sustain ~4–5 FPS, so there the floor drops to 2 —
    // still enough to catch a dead or blocked render loop (which scores ~0).
    const fpsFloor = process.env.CI ? 2 : 10;
    const fps = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let frames = 0;
          const start = performance.now();
          const tick = () => {
            frames += 1;
            if (performance.now() - start < 5000) requestAnimationFrame(tick);
            else resolve(frames / 5);
          };
          requestAnimationFrame(tick);
        }),
    );
    expect(fps, `ambient FPS: ${fps.toFixed(1)}`).toBeGreaterThanOrEqual(fpsFloor);
    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });
});

test('cargo wagons ride along, survive a train switch and a reload', async ({ page }) => {
  const consoleErrors = watchConsoleErrors(page);

  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await page.goto('/');
  await waitForReady(page);

  type SceneProbe = { wagonCount: () => number };
  const wagonCount = (): Promise<number | undefined> =>
    page.evaluate(() =>
      (
        window as unknown as { __tinyTracksScene?: { wagonCount: () => number } }
      ).__tinyTracksScene?.wagonCount(),
    );

  await test.step('build the corner loop and wait for both wagons to couple', async () => {
    // A 2x2 corner loop to ride, via the dev handle.
    await clearMeadow(page);
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
        { cell: { x: 1, y: 7 }, rotation: 90 },
        { cell: { x: 2, y: 7 }, rotation: 180 },
        { cell: { x: 2, y: 8 }, rotation: 270 },
        { cell: { x: 1, y: 8 }, rotation: 0 },
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
  });

  await test.step('mid-lap the whole little train is out there with two wagons', async () => {
    await page.click('.ride-toggle');
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
    // Mid-lap: the whole little train is out there riding — still two wagons.
    await page.waitForTimeout(2500);
    expect(await wagonCount()).toBe(2);
  });

  await test.step('switching trains mid-ride keeps the new engine and its wagons', async () => {
    // Switching trains mid-ride keeps every train rolling (spec R3): the new
    // engine takes over in place — no restart, same wagons still coupled.
    await page.evaluate(() => {
      const world = (
        window as unknown as {
          __tinyTracksWorld?: { selectTrain: (kind: string) => boolean };
        }
      ).__tinyTracksWorld;
      if (!world) throw new Error('dev world handle missing');
      if (!world.selectTrain('diesel')) throw new Error('train selection failed');
    });
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
    await page.waitForTimeout(800);
    expect(await wagonCount()).toBe(2);
  });

  await test.step('the world and the wagon set come back unchanged on reload', async () => {
    // The world — and the wagon set with it — comes back unchanged on reload.
    await page.reload();
    await waitForReady(page);
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
  });

  await test.step('nothing left the page and the console stayed silent', async () => {
    const origin = new URL(page.url()).origin;
    const external = requestUrls.filter((url) => new URL(url).origin !== origin);
    expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });
});

test('a single loop rides one train and the 🎥 button cycles chase, driver, overview @smoke', async ({
  page,
}) => {
  const consoleErrors = watchConsoleErrors(page);

  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await page.goto('/');
  await waitForReady(page);

  await test.step('lay one corner loop and start the ride', async () => {
    // A single 2×2 corner loop, via the dev handle.
    await clearMeadow(page);
    await page.evaluate(() => {
      const world = (
        window as unknown as {
          __tinyTracksWorld?: {
            place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
          };
        }
      ).__tinyTracksWorld;
      if (!world) throw new Error('dev world handle missing');
      const loop = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ];
      const rotations = [90, 180, 270, 0];
      loop.forEach(({ x, y }, i) => {
        if (world.place('corner', { x, y }, rotations[i] ?? 0) !== 'placed') {
          throw new Error(`loop corner placement failed at ${x},${y}`);
        }
      });
    });
    await page.waitForTimeout(700);

    // Before the ride starts (zero trains), the 🎥 button stays away.
    await expect(page.locator('.film-toggle')).toBeHidden();

    await page.click('.ride-toggle');
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

    // One train rides — exactly one, never a second.
    await page.waitForFunction(() => {
      const scene = (
        window as unknown as { __tinyTracksScene?: { ridingTrainCount: () => number } }
      ).__tinyTracksScene;
      return scene?.ridingTrainCount() === 1;
    });

    // One train rides — the 🎥 button joins the rail next to 🎺.
    await expect(page.locator('.film-toggle')).toBeVisible();
  });

  await test.step('each tap cycles chase, driver, overview, and wraps', async () => {
    const filmedAnchor = () =>
      page.evaluate(() => {
        const scene = (
          window as unknown as { __tinyTracksScene?: { filmedAnchor: () => string | null } }
        ).__tinyTracksScene;
        if (!scene) throw new Error('dev scene handle missing');
        return scene.filmedAnchor();
      });
    const filmedView = () =>
      page.evaluate(() => {
        const scene = (
          window as unknown as {
            __tinyTracksScene?: { filmedView: () => 'overview' | 'chase' | 'driver' };
          }
        ).__tinyTracksScene;
        if (!scene) throw new Error('dev scene handle missing');
        return scene.filmedView();
      });
    const starting = await filmedAnchor();
    expect(starting).not.toBeNull();
    expect(await filmedView()).toBe('chase');

    // Chase → driver: same train, now from the cab.
    await page.locator('.film-toggle').click();
    expect(await filmedView()).toBe('driver');
    expect(await filmedAnchor()).toBe(starting);

    // The driver eye sits at the cab, near the train — not the chase offset.
    await page.waitForFunction(() => {
      const scene = (
        window as unknown as {
          __tinyTracksScene?: {
            cameraSpot: () => { x: number; y: number; z: number };
            primarySpot: () => { x: number; z: number } | null;
          };
        }
      ).__tinyTracksScene;
      const cam = scene?.cameraSpot();
      const spot = scene?.primarySpot();
      if (!cam || !spot) return false;
      return Math.hypot(cam.x - spot.x, cam.z - spot.z) < 4 && cam.y > 1 && cam.y < 5;
    });

    // Driver → overview.
    await page.locator('.film-toggle').click();
    expect(await filmedView()).toBe('overview');
    expect(await filmedAnchor()).toBeNull();

    // Overview → chase wraps around to the train the ride started with.
    await page.locator('.film-toggle').click();
    expect(await filmedView()).toBe('chase');
    expect(await filmedAnchor()).toBe(starting);
  });

  await test.step('nothing left the page and the console stayed silent', async () => {
    const origin = new URL(page.url()).origin;
    const external = requestUrls.filter((url) => new URL(url).origin !== origin);
    expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });
});

test('an open line rides the open line and stop returns to overview @smoke', async ({ page }) => {
  const consoleErrors = watchConsoleErrors(page);

  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await page.goto('/');
  await waitForReady(page);

  await test.step('lay an open two-piece line and start the ride', async () => {
    await clearMeadow(page);
    await page.evaluate(() => {
      const world = (
        window as unknown as {
          __tinyTracksWorld?: {
            place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
          };
        }
      ).__tinyTracksWorld;
      if (!world) throw new Error('dev world handle missing');
      if (world.place('straight', { x: 2, y: 7 }, 0) !== 'placed') {
        throw new Error('open-line placement failed at 2,7');
      }
      if (world.place('straight', { x: 2, y: 8 }, 0) !== 'placed') {
        throw new Error('open-line placement failed at 2,8');
      }
    });
    await page.waitForTimeout(700);

    await expect(page.locator('.film-toggle')).toBeHidden();

    await page.click('.ride-toggle');
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);

    // The open line rides — one train on it.
    await page.waitForFunction(() => {
      const scene = (
        window as unknown as { __tinyTracksScene?: { ridingTrainCount: () => number } }
      ).__tinyTracksScene;
      return scene?.ridingTrainCount() === 1;
    });

    await expect(page.locator('.film-toggle')).toBeVisible();
  });

  await test.step('the driver view drops into the cab, then stop eases home', async () => {
    const filmedView = () =>
      page.evaluate(() => {
        const scene = (
          window as unknown as {
            __tinyTracksScene?: { filmedView: () => 'overview' | 'chase' | 'driver' };
          }
        ).__tinyTracksScene;
        if (!scene) throw new Error('dev scene handle missing');
        return scene.filmedView();
      });
    expect(await filmedView()).toBe('chase');

    await page.locator('.film-toggle').click();
    expect(await filmedView()).toBe('driver');
    await page.waitForFunction(() => {
      const scene = (
        window as unknown as {
          __tinyTracksScene?: {
            cameraSpot: () => { x: number; y: number; z: number };
            primarySpot: () => { x: number; z: number } | null;
          };
        }
      ).__tinyTracksScene;
      const cam = scene?.cameraSpot();
      const spot = scene?.primarySpot();
      if (!cam || !spot) return false;
      return Math.hypot(cam.x - spot.x, cam.z - spot.z) < 4 && cam.y > 1 && cam.y < 5;
    });

    // Stop returns to the overview and the 🎥 button leaves the rail.
    await page.click('.ride-toggle');
    await expect(page.locator('.ride-toggle')).not.toHaveClass(/is-riding/);
    await expect(page.locator('.film-toggle')).toBeHidden();
    expect(await filmedView()).toBe('overview');

    // Starting again re-films the chase view.
    await page.click('.ride-toggle');
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
    await expect(page.locator('.film-toggle')).toBeVisible();
    expect(await filmedView()).toBe('chase');
  });

  await test.step('nothing left the page and the console stayed silent', async () => {
    const origin = new URL(page.url()).origin;
    const external = requestUrls.filter((url) => new URL(url).origin !== origin);
    expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });
});
