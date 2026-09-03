import { expect, test } from '@playwright/test';

/**
 * Build-to-ride flow & toybox clarity: riding hides the build tools and
 * returns them on stop, the drawer shows five tabs with a swipeable
 * Adventure row, and closing a loop celebrates on the ride button —
 * all with a clean console.
 *
 * The loop detector itself is proven at the unit level (ride-ready.test.ts);
 * here the rail binding, the tab/panel wiring, and the celebration classes
 * must hold with the console as the witness.
 */

type WorldHandle = {
  place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
  pieces: () => { id: string }[];
};

const ready = (page: import('@playwright/test').Page) =>
  page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );

const devWorld = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    return true;
  });

const place = (
  page: import('@playwright/test').Page,
  type: string,
  cell: { x: number; y: number },
  rotation: number,
) =>
  page.evaluate(
    ([t, c, r]) => {
      const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
      if (!world) throw new Error('dev world handle missing');
      if (world.place(t, c, r) !== 'placed') throw new Error(`placement failed: ${t}`);
    },
    [type, cell, rotation] as const,
  );

const watchConsole = (page: import('@playwright/test').Page) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));
  return consoleErrors;
};

test('riding hides the build tools and stopping returns them', async ({ page }) => {
  const consoleErrors = watchConsole(page);
  await page.goto('/');
  await ready(page);
  await devWorld(page);

  await place(page, 'straight', { x: 2, y: 1 }, 0);
  await place(page, 'straight', { x: 2, y: 2 }, 0);

  // The dev placements arm the undo, so it starts visible.
  const ride = page.locator('.ride-toggle');
  const toys = page.locator('[data-drawer="toys"]');
  const trains = page.locator('[data-drawer="trains"]');
  const trash = page.locator('.trash-slot');
  const undo = page.locator('.undo-toggle');
  await expect(undo).toBeVisible();

  await ride.click();
  await expect(ride).toHaveClass(/is-riding/);
  // Build tools hide; the whistle, mute, and gate stay for the ride.
  await expect(toys).toBeHidden();
  await expect(trains).toBeHidden();
  await expect(trash).toBeHidden();
  await expect(undo).toBeHidden();
  await expect(page.locator('.whistle-toot')).toBeVisible();
  await expect(page.locator('.mute-toggle')).toBeVisible();

  await ride.click();
  await expect(ride).not.toHaveClass(/is-riding/);
  // Everything returns and the world is exact.
  await expect(toys).toBeVisible();
  await expect(trains).toBeVisible();
  await expect(trash).toBeVisible();
  await expect(undo).toBeVisible();
  const count = await page.evaluate(
    () =>
      (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld?.pieces()
        .length ?? -1,
  );
  expect(count).toBe(2);

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('five tabs hold their toys; the adventure row swipes on phones', async ({ page }) => {
  const consoleErrors = watchConsole(page);
  await page.goto('/');
  await ready(page);

  await page.locator('[data-drawer="toys"]').click();
  const tabs = page.locator('.drawer-tab');
  await expect(tabs).toHaveCount(5);

  const counts: Record<string, number> = {
    rails: 3,
    adventure: 6,
    nature: 3,
    town: 3,
    critter: 3,
  };
  for (const [tab, count] of Object.entries(counts)) {
    const panel = page.locator(`.drawer-panel[data-panel="${tab}"]`);
    // Re-tapping the open tab closes it, so only tap when it is shut —
    // the drawer wakes on Rails, making the first tap a close.
    if (await panel.isHidden()) {
      await page.locator(`.drawer-tab[data-tab="${tab}"]`).click();
    }
    await expect(panel).toBeVisible();
    await expect(panel.locator('.piece-slot, .scenery-slot')).toHaveCount(count);
  }

  // The 6-toy Adventure row overflows narrow phones and swipes instead of
  // wrapping; roomy viewports fit it whole.
  await page.locator('.drawer-tab[data-tab="adventure"]').click();
  const adventure = page.locator('.drawer-panel[data-panel="adventure"]');
  await expect(adventure).toBeVisible();
  const narrow = (page.viewportSize()?.width ?? 999) < 500;
  const overflow = await page
    .locator('.drawer-panel[data-panel="adventure"]')
    .evaluate((panel) => panel.scrollWidth > panel.clientWidth + 1);
  expect(overflow).toBe(narrow);

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('first piece invites, loop closure pops, slots are all pictures', async ({ page }) => {
  const consoleErrors = watchConsole(page);
  await page.goto('/');
  await ready(page);
  await devWorld(page);

  // Record celebration animations — the pop class is gone within half a
  // second, so observe rather than race it.
  await page.evaluate(() => {
    const seen: string[] = [];
    (window as unknown as { __seenAnims?: string[] }).__seenAnims = seen;
    document.querySelector('.ride-toggle')?.addEventListener('animationstart', (event) => {
      seen.push((event as AnimationEvent).animationName);
    });
  });

  await place(page, 'corner', { x: 1, y: 7 }, 90);
  await expect(page.locator('.ride-toggle')).toHaveClass(/is-ready-pulse/);

  await place(page, 'corner', { x: 2, y: 7 }, 180);
  await place(page, 'corner', { x: 2, y: 8 }, 270);
  await place(page, 'corner', { x: 1, y: 8 }, 0);
  await page.waitForTimeout(800);
  const seen = await page.evaluate(
    () => (window as unknown as { __seenAnims?: string[] }).__seenAnims ?? [],
  );
  expect(seen).toContain('ride-pop');

  // Every toy and train slot shows a picture, never an emoji box.
  const slotHtml = await page.evaluate(() =>
    [...document.querySelectorAll('.piece-slot, .scenery-slot, .train-slot')].map(
      (slot) => slot.innerHTML,
    ),
  );
  expect(slotHtml.length).toBeGreaterThan(0);
  for (const html of slotHtml) expect(html).toContain('<svg');

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
