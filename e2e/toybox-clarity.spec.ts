import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { drawerTabs, tabForKind } from '../src/core/drawer';
import { PIECE_TYPES } from '../src/core/pieces';
import { clearMeadow, watchConsoleErrors } from './helpers';

/**
 * Toybox clarity on small screens: dense tabs page by dots and swipes, a
 * lifted placed toy is removed by dragging past the board, and there is no
 * bin on the rail. Every test is @smoke so the phone project picks it up.
 */

type Cell = { x: number; y: number };
type Point = { x: number; y: number };
type WorldHandle = {
  place: (type: string, cell: Cell, rotation: number) => string;
  pieces: () => { id: string }[];
  scenery: () => { id: string }[];
};
type SceneHandle = {
  cellFromPoint: (x: number, y: number) => unknown;
  cellToScreen: (cell: Cell) => Point | null;
};

const ready = (page: import('@playwright/test').Page) =>
  page.waitForFunction(() =>
    Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
  );

const counts = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const world = (
      window as unknown as {
        __tinyTracksWorld?: WorldHandle;
      }
    ).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    return { pieces: world.pieces().length, scenery: world.scenery().length };
  });

const boardPoint = (page: import('@playwright/test').Page, cell: Cell) =>
  page.evaluate((target) => {
    const scene = (window as unknown as { __tinyTracksScene?: SceneHandle }).__tinyTracksScene;
    if (!scene) throw new Error('dev scene handle missing');
    const point = scene.cellToScreen(target);
    if (!point) throw new Error(`cell (${target.x},${target.y}) not visible on screen`);
    return point;
  }, cell);

/** A canvas point the board raycast cannot resolve — the outside-drop zone. */
const outsidePoint = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.scene-canvas');
    if (!canvas) throw new Error('scene canvas missing');
    const rect = canvas.getBoundingClientRect();
    const scene = (window as unknown as { __tinyTracksScene?: SceneHandle }).__tinyTracksScene;
    if (!scene) throw new Error('dev scene handle missing');
    for (const point of [
      { x: rect.right - 12, y: rect.top + 12 },
      { x: rect.left + rect.width / 2, y: rect.top + 12 },
      { x: rect.right - 12, y: rect.top + rect.height / 2 },
    ]) {
      if (scene.cellFromPoint(point.x, point.y) !== null) continue;
      if (document.elementFromPoint(point.x, point.y)?.closest('.toybox-rail')) continue;
      return point;
    }
    throw new Error('no point beyond the board found');
  });

/** Slots whose centres actually intersect the drawer viewport right now. */
const slotsInViewport = (page: import('@playwright/test').Page, tab: string) =>
  page.locator(`.drawer-panel[data-panel="${tab}"]`).evaluate((panel) => {
    const scroller = panel.querySelector('.drawer-pages');
    if (!scroller) throw new Error('drawer pages missing');
    const view = scroller.getBoundingClientRect();
    return [
      ...panel.querySelectorAll<HTMLElement>(
        '.piece-slot:not([hidden]), .scenery-slot:not([hidden])',
      ),
    ]
      .filter((slot) => {
        const box = slot.getBoundingClientRect();
        const center = box.left + box.width / 2;
        return center >= view.left && center <= view.right;
      })
      .map((slot) => slot.dataset.piece ?? slot.dataset.scenery ?? 'unknown');
  });

const openToys = async (page: import('@playwright/test').Page) => {
  if ((await page.locator('[data-drawer="toys"]').getAttribute('aria-expanded')) !== 'true') {
    await page.click('[data-drawer="toys"]');
  }
  await expect(page.locator('[data-drawer="toys"]')).toHaveAttribute('aria-expanded', 'true');
};

const drag = async (page: import('@playwright/test').Page, from: Point, to: Point) => {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 16, from.y + 16, { steps: 3 });
  await page.mouse.move(to.x, to.y, { steps: 10 });
};

test('dense tabs page by dots and swipes, four slots to a viewport @smoke', async ({ page }) => {
  const consoleErrors = watchConsoleErrors(page);
  await page.goto('/');
  await ready(page);
  await openToys(page);

  const rails = page.locator('.drawer-panel[data-panel="rails"]');
  await expect(rails).toBeVisible();
  await expect(rails.locator('.page-dot:not([hidden])')).toHaveCount(3);
  await expect(rails.locator('.page-dot').first()).toHaveAttribute(
    'aria-label',
    'Toybox page 1 of 3',
  );
  await expect(rails.locator('.page-dot').nth(2)).toHaveAttribute(
    'aria-label',
    'Toybox page 3 of 3',
  );
  await expect(rails.locator('.page-dot').first()).toHaveAttribute('aria-current', 'page');
  expect(await slotsInViewport(page, 'rails')).toHaveLength(4);

  await rails.locator('.page-dot[data-dot="2"]').click();
  await expect(rails.locator('.page-dot').nth(2)).toHaveAttribute('aria-current', 'page');
  expect(await slotsInViewport(page, 'rails')).toHaveLength(2);

  // A tap returns to page one; an empty-gap swipe pages without eating slots.
  await rails.locator('.page-dot[data-dot="0"]').click();
  await expect(rails.locator('.page-dot').first()).toHaveAttribute('aria-current', 'page');
  const box = await rails.locator('.drawer-pages').boundingBox();
  if (!box) throw new Error('drawer pages not visible');
  const gap = { x: box.x + 6, y: box.y + box.height / 2 };
  await page.mouse.move(gap.x, gap.y);
  await page.mouse.down();
  await page.mouse.move(gap.x - 90, gap.y, { steps: 8 });
  await page.mouse.up();
  await expect(rails.locator('.page-dot').nth(1)).toHaveAttribute('aria-current', 'page');
  expect(await slotsInViewport(page, 'rails')).toHaveLength(4);

  // Nature and Critters are short enough to stay single-page and dotless.
  await page.click('.drawer-tab[data-tab="nature"]');
  await expect(page.locator('.drawer-panel[data-panel="nature"] .page-dot')).toHaveCount(0);
  expect(await slotsInViewport(page, 'nature')).toHaveLength(3);

  // Switching tabs and back keeps the remembered Rails page for the session.
  await page.click('.drawer-tab[data-tab="rails"]');
  await expect(rails.locator('.page-dot').nth(1)).toHaveAttribute('aria-current', 'page');
  expect(await slotsInViewport(page, 'rails')).toHaveLength(4);

  await page.click('.drawer-tab[data-tab="critter"]');
  await expect(page.locator('.drawer-panel[data-panel="critter"] .page-dot')).toHaveCount(0);

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('page memory is per tab and resets on reload, with no bin on the rail @smoke', async ({
  page,
}) => {
  const consoleErrors = watchConsoleErrors(page);
  await page.goto('/');
  await ready(page);
  await openToys(page);

  await expect(page.locator('.trash-slot')).toHaveCount(0);
  const rails = page.locator('.drawer-panel[data-panel="rails"]');
  await rails.locator('.page-dot[data-dot="2"]').click();
  await expect(rails.locator('.page-dot').nth(2)).toHaveAttribute('aria-current', 'page');

  await page.reload();
  await ready(page);
  await openToys(page);
  const fresh = page.locator('.drawer-panel[data-panel="rails"]');
  await expect(fresh.locator('.page-dot').first()).toHaveAttribute('aria-current', 'page');

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('slot presses still place toys while empty-space drags only page @smoke', async ({ page }) => {
  const consoleErrors = watchConsoleErrors(page);
  await page.goto('/');
  await ready(page);
  await clearMeadow(page);
  await openToys(page);

  const rails = page.locator('.drawer-panel[data-panel="rails"]');
  const beforeScroll = await rails.locator('.drawer-pages').evaluate((el) => el.scrollLeft);
  const slot = rails.locator('.piece-slot').first();
  const slotBox = await slot.boundingBox();
  if (!slotBox) throw new Error('piece slot not visible');
  const target = await boardPoint(page, { x: 6, y: 8 });

  await page.mouse.move(slotBox.x + slotBox.width / 2, slotBox.y + slotBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(300);

  expect(await counts(page)).toEqual({ pieces: 1, scenery: 0 });
  const afterScroll = await rails.locator('.drawer-pages').evaluate((el) => el.scrollLeft);
  expect(afterScroll).toBe(beforeScroll);

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('a lifted placed toy beyond the board previews removal and undo restores it @smoke', async ({
  page,
}) => {
  const consoleErrors = watchConsoleErrors(page);
  await page.goto('/');
  await ready(page);
  await clearMeadow(page);

  await page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    world.place('straight', { x: 6, y: 8 }, 0);
  });
  const start = await boardPoint(page, { x: 6, y: 8 });
  const outside = await outsidePoint(page);

  await drag(page, start, outside);
  await expect(page.locator('.removal-preview')).toBeVisible();
  await page.mouse.up();
  await expect(page.locator('.removal-preview')).toBeHidden();
  expect(await counts(page)).toEqual({ pieces: 0, scenery: 0 });

  const undo = page.locator('.undo-toggle');
  await expect(undo).toBeVisible();
  await undo.click();
  await expect(undo).toBeHidden();
  expect(await counts(page)).toEqual({ pieces: 1, scenery: 0 });

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('re-entry, pointer loss and new toys never remove a placed piece @smoke', async ({ page }) => {
  const consoleErrors = watchConsoleErrors(page);
  await page.goto('/');
  await ready(page);
  await clearMeadow(page);
  await page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: WorldHandle }).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    world.place('straight', { x: 4, y: 6 }, 0);
  });
  const start = await boardPoint(page, { x: 4, y: 6 });
  const outside = await outsidePoint(page);

  // Re-entry cancels the pending removal.
  await drag(page, start, outside);
  await expect(page.locator('.removal-preview')).toBeVisible();
  await page.mouse.move(start.x, start.y, { steps: 8 });
  await expect(page.locator('.removal-preview')).toBeHidden();
  await page.mouse.up();
  expect(await counts(page)).toEqual({ pieces: 1, scenery: 0 });

  // A lost pointer/blur mid-lift restores the toy instead of removing it.
  await drag(page, start, outside);
  await expect(page.locator('.removal-preview')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('.removal-preview')).toBeHidden();
  await page.mouse.up();
  expect(await counts(page)).toEqual({ pieces: 1, scenery: 0 });

  // A fresh toy dragged outside is cancelled, never removed from the world.
  await openToys(page);
  const slot = page.locator('.drawer-panel[data-panel="rails"] .piece-slot').first();
  const slotBox = await slot.boundingBox();
  if (!slotBox) throw new Error('piece slot not visible');
  await page.mouse.move(slotBox.x + slotBox.width / 2, slotBox.y + slotBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(outside.x, outside.y, { steps: 10 });
  await expect(page.locator('.removal-preview')).toBeHidden();
  await page.mouse.up();
  expect(await counts(page)).toEqual({ pieces: 1, scenery: 0 });

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

// The icon contract is also asserted against the committed source text so a
// runtime WebGL renderer or generated module can never creep back in.
test.describe('hand-authored piece icons', () => {
  const source = new URL('../src/ui/toy-icons.ts', import.meta.url);
  const text = readFileSync(source, 'utf8');
  const start = text.indexOf('export const PIECE_ICONS');
  const block = text.slice(start, text.indexOf('\n};', start));

  const icons = () => {
    const entries = new Map<string, string>();
    for (const match of block.matchAll(/^ {2}(?:'([^']+)'|([A-Za-z][\w-]*)): `([\s\S]*?)`,$/gm)) {
      const key = match[1] ?? match[2];
      const svg = match[3];
      if (key !== undefined && svg !== undefined) entries.set(key, svg);
    }
    return entries;
  };

  test('every PieceType has a hand-authored SVG', () => {
    const parsed = icons();
    for (const kind of PIECE_TYPES) {
      expect(parsed.get(kind), `no hand-authored icon for ${kind}`).toBeDefined();
    }
    expect(parsed.size).toBe(PIECE_TYPES.length);
  });

  test('no two icons on one drawer tab are identical', () => {
    const parsed = icons();
    for (const tab of drawerTabs()) {
      const seen = new Map<string, string>();
      for (const kind of PIECE_TYPES.filter((piece) => tabForKind(piece) === tab.id)) {
        const icon = parsed.get(kind);
        if (icon === undefined) throw new Error(`no hand-authored icon for ${kind}`);
        const duplicate = seen.get(icon);
        expect(duplicate, `${kind} shares its ${tab.id} icon with ${duplicate}`).toBeUndefined();
        seen.set(icon, kind);
      }
    }
  });
});
