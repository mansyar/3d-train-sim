import { expect, type Page, test } from '@playwright/test';

import { clearMeadow, watchConsoleErrors } from './helpers';

/**
 * Progressive disclosure (phase 3: persistence, migration, measurement).
 *
 * Fresh installs see basics only, three completed rides reveal the advanced
 * tier, reload keeps it, a parent-gated reset clears it, and a pre-tier
 * world holding an advanced piece loads unlocked with the piece intact —
 * all with a clean console. Muted + reduced-motion hands get the same
 * unlocked toybox revealed silently and still (AC-5).
 */

const waitForReady = (page: Page) =>
  page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );

const buildLoop = (page: Page) =>
  page.evaluate(() => {
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
    for (const [cell, rotation] of corners) {
      if (world.place('corner', cell, rotation) !== 'placed') {
        throw new Error('loop corner failed');
      }
    }
  });

/** The drawer toggle flips it, and remembers the tab it was last on. */
const drawerOpen = async (page: Page) =>
  (await page.locator('[data-drawer="toys"]').getAttribute('aria-expanded')) === 'true';
const openDrawer = async (page: Page) => {
  if (!(await drawerOpen(page))) await page.click('[data-drawer="toys"]');
};
const closeDrawer = async (page: Page) => {
  if (await drawerOpen(page)) await page.click('[data-drawer="toys"]');
};

/** Show a drawer tab without re-tapping the open one (which would close it). */
const showTab = async (page: Page, tab: string) => {
  if (await page.locator(`.drawer-panel[data-panel="${tab}"]`).isHidden()) {
    await page.locator(`.drawer-tab[data-tab="${tab}"]`).click();
  }
};

const completeRide = async (page: Page) => {
  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
  await page.waitForTimeout(2000);
  await page.click('.ride-toggle');
  await expect(page.locator('.ride-toggle')).not.toHaveClass(/is-riding/);
  await page.waitForTimeout(400);
};

const rideThreeTimes = async (page: Page) => {
  await clearMeadow(page);
  await buildLoop(page);
  await page.waitForTimeout(800);
  await completeRide(page);
  await completeRide(page);
  await completeRide(page);
  // Let the unlock autosave settle (and any tab bounce finish).
  await page.waitForTimeout(800);
};

test('basics stay hidden until the third ride, then survive one reload', async ({ page }) => {
  test.setTimeout(90_000);
  const consoleErrors = watchConsoleErrors(page);

  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));

  await page.goto('/');
  await waitForReady(page);
  // Let the render loop and GLB loads settle before interacting.
  await page.waitForTimeout(1500);

  await test.step('a fresh install hides the advanced slots but keeps basics usable', async () => {
    await openDrawer(page);
    await showTab(page, 'adventure');
    await expect(page.locator('.piece-slot[data-piece="switch-3way"]')).toBeHidden();
    await expect(page.locator('.piece-slot[data-piece="switch-slip"]')).toBeHidden();
    await showTab(page, 'town');
    await expect(page.locator('.scenery-slot[data-scenery="station"]')).toBeHidden();
    // The drawer itself works — basics slots stay visible, not everything.
    await expect(page.locator('.scenery-slot[data-scenery="house"]')).toBeVisible();
    await closeDrawer(page);
  });

  await test.step('three completed rides reveal the advanced tier', async () => {
    await rideThreeTimes(page);

    await openDrawer(page);
    await showTab(page, 'adventure');
    await expect(page.locator('.piece-slot[data-piece="switch-3way"]')).toBeVisible();
    await expect(page.locator('.piece-slot[data-piece="switch-slip"]')).toBeVisible();
    await showTab(page, 'town');
    await expect(page.locator('.scenery-slot[data-scenery="station"]')).toBeVisible();
    await closeDrawer(page);

    const kinds = await page.evaluate(() => {
      const world = (
        window as unknown as { __tinyTracksWorld?: { pieces: () => { type: string }[] } }
      ).__tinyTracksWorld;
      if (!world) throw new Error('dev world handle missing');
      return world.pieces().map((piece) => piece.type);
    });
    expect(kinds).toHaveLength(4);
  });

  await test.step('the unlocked tier survives one reload with nothing leaving the page', async () => {
    await page.reload();
    await waitForReady(page);
    await page.waitForTimeout(1500);

    await openDrawer(page);
    await showTab(page, 'adventure');
    await expect(page.locator('.piece-slot[data-piece="switch-3way"]')).toBeVisible();
    await showTab(page, 'town');
    await expect(page.locator('.scenery-slot[data-scenery="station"]')).toBeVisible();

    const origin = new URL(page.url()).origin;
    const external = requestUrls.filter((url) => new URL(url).origin !== origin);
    expect(external, `external requests: ${external.join(', ')}`).toEqual([]);
    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });
});

test('a parent reset clears the unlock, and a pre-tier advanced world loads unlocked intact', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);
  await page.waitForTimeout(1500);

  await test.step('three rides unlock the tier', async () => {
    await rideThreeTimes(page);

    await openDrawer(page);
    await showTab(page, 'town');
    await expect(page.locator('.scenery-slot[data-scenery="station"]')).toBeVisible();
    await closeDrawer(page);
  });

  await test.step('hold plus confirm resets the world back to basics', async () => {
    const gate = page.locator('.parent-gate');
    const box = await gate.boundingBox();
    if (!box) throw new Error('parent gate visible');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(2400);
    await page.mouse.up();
    await expect(gate).toHaveAttribute('aria-label', /Confirm/i);
    await gate.click({ force: true });
    await page.waitForTimeout(400);

    const kinds = await page.evaluate(() => {
      const world = (
        window as unknown as { __tinyTracksWorld?: { pieces: () => { type: string }[] } }
      ).__tinyTracksWorld;
      if (!world) throw new Error('dev world handle missing');
      return world.pieces().map((piece) => piece.type);
    });
    expect(kinds).toHaveLength(0);

    await openDrawer(page);
    await showTab(page, 'town');
    await expect(page.locator('.scenery-slot[data-scenery="station"]')).toBeHidden();
    await closeDrawer(page);
  });

  await test.step('a stored advanced piece grandfathers the reload unlocked', async () => {
    await page.evaluate(() => {
      const world = (
        window as unknown as {
          __tinyTracksWorld?: {
            place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
          };
        }
      ).__tinyTracksWorld;
      if (!world) throw new Error('dev world handle missing');
      if (world.place('switch-3way', { x: 2, y: 7 }, 0) !== 'placed') {
        throw new Error('advanced placement failed');
      }
    });
    // Let the autosave settle before reloading.
    await page.waitForTimeout(800);
    await page.reload();
    await waitForReady(page);
    await page.waitForTimeout(1500);

    // The piece survived the round trip (NFR-4: no piece loss in migration).
    const kinds = await page.evaluate(() => {
      const world = (
        window as unknown as { __tinyTracksWorld?: { pieces: () => { type: string }[] } }
      ).__tinyTracksWorld;
      if (!world) throw new Error('dev world handle missing');
      return world.pieces().map((piece) => piece.type);
    });
    expect(kinds).toEqual(['switch-3way']);

    // …and its presence unlocked the tier without any new rides.
    await openDrawer(page);
    await showTab(page, 'adventure');
    await expect(page.locator('.piece-slot[data-piece="switch-3way"]')).toBeVisible();
    await showTab(page, 'town');
    await expect(page.locator('.scenery-slot[data-scenery="station"]')).toBeVisible();

    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });
});

test('muted plus reduced-motion hands get a silent static reveal', async ({ page }) => {
  test.setTimeout(90_000);
  const consoleErrors = watchConsoleErrors(page);

  // Sampled once at boot: the reveal must stay silent and still for these hands.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await waitForReady(page);
  await page.waitForTimeout(1500);

  await test.step('mute, then ride three times', async () => {
    const mute = page.locator('.mute-toggle');
    await expect(mute).toHaveAttribute('aria-pressed', 'false');
    await mute.click();
    await expect(mute).toHaveAttribute('aria-pressed', 'true');

    await rideThreeTimes(page);
  });

  await test.step('the tier reveals with no bounce and no ding', async () => {
    await openDrawer(page);
    await showTab(page, 'adventure');
    await expect(page.locator('.piece-slot[data-piece="switch-3way"]')).toBeVisible();
    await showTab(page, 'town');
    await expect(page.locator('.scenery-slot[data-scenery="station"]')).toBeVisible();

    // Static: the unlock bounce never ran on either gated tab.
    await expect(page.locator('.drawer-tab.pop')).toHaveCount(0);
    // Silent: the ding path is muted-and-still guarded (see celebrateUnlock),
    // and the console stayed clean through all three ride ends.
    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });
});
