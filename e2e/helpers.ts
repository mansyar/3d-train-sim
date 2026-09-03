import type { Page } from '@playwright/test';

/**
 * Empties the meadow through the same store call the parent gate uses.
 *
 * Fresh boots now seed a rideable starter railway (an ordinary autosaved
 * world), so specs that build their own fixed layout must clear the meadow
 * first instead of assuming empty grass.
 */
export async function clearMeadow(page: Page): Promise<void> {
  await page.evaluate(() => {
    const world = (
      window as unknown as { __tinyTracksWorld?: { reset: () => void } }
    ).__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    world.reset();
  });
}
