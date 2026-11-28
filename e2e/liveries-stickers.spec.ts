import { expect, type Page, test } from '@playwright/test';

import { watchConsoleErrors } from './helpers';

type StickerWitness = {
  /** Visible sticker ids, oldest first — one per anchor. */
  visible: string[];
  /** Anchor names in the same oldest-first order. */
  anchors: string[];
  /** Stamps applied to this vehicle. */
  stamps: number;
  /** Oldest stickers popped off by the anchor cap. */
  pops: number;
  /** Pop animations begun (zero under reduced motion). */
  animations: number;
  /** Frames that advanced a sticker animation (zero under reduced motion). */
  frames: number;
};

type LiveryProbe = {
  bodyHex(id: string): string | null;
  bounceCount(id: string): number;
  stickers(id: string): StickerWitness;
};

type Snapshot = {
  bodyHex: string | null;
  bounce: number;
  stickers: StickerWitness;
};

/** Reads the DEV witness — fail loudly if the sticker half was never wired. */
async function probe(page: Page, id: string): Promise<Snapshot | null> {
  return page.evaluate((vehicleId) => {
    const witness = (window as unknown as { __tinyTracksLivery?: LiveryProbe }).__tinyTracksLivery;
    if (!witness || typeof witness.stickers !== 'function') return null;
    return {
      bodyHex: witness.bodyHex(vehicleId),
      bounce: witness.bounceCount(vehicleId),
      stickers: witness.stickers(vehicleId),
    };
  }, id);
}

async function openDrawer(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(
    () => (window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady === true,
    undefined,
    { timeout: 60_000 },
  );
  await page.click('[data-drawer="trains"]');
  await expect(page.locator('.livery-section')).toBeVisible();
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { __tinyTracksLivery?: LiveryProbe }).__tinyTracksLivery
        ?.stickers === 'function',
    undefined,
    { timeout: 20_000 },
  );
}

/** Arm a shape in the tray, then stamp it by tapping its drawer vehicle. */
async function armAndStamp(page: Page, sticker: string, kind: string): Promise<void> {
  await page.click(`.livery-section [data-sticker="${sticker}"]`);
  await expect(page.locator('.livery-section')).toHaveAttribute('data-armed', sticker);
  await page.click(`.train-slot[data-train="${kind}"]`);
  await expect(page.locator('.livery-section')).toHaveAttribute('data-armed', '');
}

test('a sticker arms first and only stamps when a vehicle is tapped', async ({ page }) => {
  const errors = watchConsoleErrors(page);
  await openDrawer(page);
  const section = page.locator('.livery-section');

  await page.click('.livery-section [data-sticker="star"]');
  await expect(section).toHaveAttribute('data-armed', 'star');
  await expect(section.locator('[data-sticker="star"]')).toHaveAttribute('aria-pressed', 'true');
  // Armed is not stamped: the vehicle tap is the stamp.
  expect((await probe(page, 'steam:loco'))?.stickers.visible).toEqual([]);

  await page.click('.train-slot[data-train="steam"]');
  await expect(section).toHaveAttribute('data-armed', '');
  const first = await probe(page, 'steam:loco');
  expect(first?.stickers.visible).toEqual(['star']);
  expect(first?.stickers.anchors).toEqual(['left-front']);
  expect(first?.stickers.stamps).toBe(1);
  expect(first?.stickers.animations).toBe(1);
  await expect(section).toHaveAttribute('data-sticker-count', '1');

  await armAndStamp(page, 'heart', 'steam');
  const second = await probe(page, 'steam:loco');
  expect(second?.stickers.visible).toEqual(['star', 'heart']);
  expect(second?.stickers.anchors).toEqual(['left-front', 'left-rear']);
  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
});

test('a fifth stamp pops exactly the oldest and the anchor count stays capped', async ({
  page,
}) => {
  const errors = watchConsoleErrors(page);
  await openDrawer(page);

  for (const sticker of ['star', 'heart', 'flower', 'bolt', 'star']) {
    await armAndStamp(page, sticker, 'steam');
  }
  const seen = await probe(page, 'steam:loco');
  expect(seen?.stickers.visible).toEqual(['heart', 'flower', 'bolt', 'star']);
  expect(seen?.stickers.anchors).toEqual(['left-front', 'left-rear', 'right-front', 'right-rear']);
  expect(seen?.stickers.stamps).toBe(5);
  expect(seen?.stickers.pops, 'exactly one eviction pop').toBe(1);
  await expect(page.locator('.livery-section')).toHaveAttribute('data-sticker-count', '4');
  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
});

test('restore-default returns stock paint with zero stickers', async ({ page }) => {
  const errors = watchConsoleErrors(page);
  await openDrawer(page);
  const section = page.locator('.livery-section');

  await page.click('.livery-section [data-paint="grape"]');
  await armAndStamp(page, 'star', 'steam');
  await armAndStamp(page, 'heart', 'steam');
  const before = await probe(page, 'steam:loco');
  expect(before?.bodyHex).toBe('#9b6bd6');
  expect(before?.stickers.visible).toEqual(['star', 'heart']);

  await page.click('.livery-section [data-restore]');
  const after = await probe(page, 'steam:loco');
  expect(after?.bodyHex, 'stock paint has no override').toBeNull();
  expect(after?.stickers.visible, 'AC-4: zero stickers after restore').toEqual([]);
  await expect(section).toHaveAttribute('data-sticker-count', '0');
  for (const paint of ['cherry', 'tangerine', 'sunshine', 'clover', 'sky', 'grape']) {
    await expect(section.locator(`[data-paint="${paint}"]`)).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  }
  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
});

test.describe('reduced motion', () => {
  test('stickers land in their final state with no animation frames', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = watchConsoleErrors(page);
    await openDrawer(page);

    for (const sticker of ['star', 'heart', 'flower', 'bolt', 'star']) {
      await armAndStamp(page, sticker, 'steam');
    }
    const seen = await probe(page, 'steam:loco');
    expect(seen?.stickers.visible).toEqual(['heart', 'flower', 'bolt', 'star']);
    expect(seen?.stickers.pops).toBe(1);
    expect(seen?.stickers.animations, 'AC-6: no pop begins').toBe(0);
    expect(seen?.stickers.frames, 'AC-6: no animation frames').toBe(0);
    expect(seen?.bounce, 'no body bounce either').toBe(0);
    await expect(page.locator('.livery-section')).toHaveAttribute('data-sticker-count', '4');
    expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
  });
});
