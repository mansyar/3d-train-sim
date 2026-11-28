import { expect, type Page, test } from '@playwright/test';

import { watchConsoleErrors } from './helpers';

type StickerWitness = {
  visible: string[];
};

type LiveryProbe = {
  bodyHex(id: string): string | null;
  stickers(id: string): StickerWitness;
};

type PersistedLiveries = Record<string, unknown>;

const CONSIST = ['steam:loco', 'steam:lead', 'steam:rear'] as const;

async function ready(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady === true,
    undefined,
    { timeout: 60_000 },
  );
  await expect(page.locator('.scene-canvas')).toBeVisible();
}

async function witnessReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { __tinyTracksLivery?: LiveryProbe }).__tinyTracksLivery
        ?.bodyHex === 'function',
    undefined,
    { timeout: 20_000 },
  );
}

async function openDrawer(page: Page): Promise<void> {
  await page.click('[data-drawer="trains"]');
  await expect(page.locator('.livery-section')).toBeVisible();
  await witnessReady(page);
}

/** The actual material colours and decals the child can see. */
async function sceneState(page: Page, ids: readonly string[]) {
  return page.evaluate(
    (vehicleIds) => {
      const witness = (window as unknown as { __tinyTracksLivery?: LiveryProbe })
        .__tinyTracksLivery;
      if (!witness) return null;
      const result: Record<string, { hex: string | null; stickers: StickerWitness }> = {};
      for (const id of vehicleIds) {
        result[id] = { hex: witness.bodyHex(id), stickers: witness.stickers(id) };
      }
      return result;
    },
    [...ids],
  );
}

/** Reads the SAME store singleton main.ts wired (Vite caches module URLs). */
async function storeSnapshot(page: Page): Promise<PersistedLiveries> {
  return page.evaluate(async () => {
    const modulePath: string = '/src/ui/app.ts';
    const module = (await import(modulePath)) as {
      liveryStore: { snapshot(): PersistedLiveries };
    };
    return module.liveryStore.snapshot();
  });
}

async function readStoredLiveries(page: Page): Promise<PersistedLiveries> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('tiny-tracks');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const value = await new Promise<unknown>((resolve, reject) => {
        const request = db.transaction('worlds', 'readonly').objectStore('worlds').get('current');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      if (typeof value !== 'object' || value === null) return {};
      const preferences = (value as { preferences?: { liveries?: PersistedLiveries } }).preferences;
      return preferences?.liveries ?? {};
    } finally {
      db.close();
    }
  });
}

async function waitForStoredLiveries(page: Page, count: number): Promise<void> {
  await page.waitForFunction(
    async (expected) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('tiny-tracks');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        const value = await new Promise<unknown>((resolve, reject) => {
          const request = db.transaction('worlds', 'readonly').objectStore('worlds').get('current');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        if (typeof value !== 'object' || value === null) return false;
        const preferences = (value as { preferences?: { liveries?: PersistedLiveries } })
          .preferences;
        return Object.keys(preferences?.liveries ?? {}).length === expected;
      } finally {
        db.close();
      }
    },
    count,
    { timeout: 30_000 },
  );
}

/** Reset through the dev handle — the same path the gate's confirm takes. */
async function resetWorld(page: Page): Promise<void> {
  await page.evaluate(() => {
    const world = (window as unknown as { __tinyTracksWorld?: { reset: () => void } })
      .__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    world.reset();
  });
}

test('a full reset clears the livery from the scene, the store, and storage', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchConsoleErrors(page);

  await page.goto('/');
  await ready(page);
  await openDrawer(page);

  await page.click('.livery-section [data-paint="sky"]');
  await page.click('.livery-section [data-sticker="star"]');
  await page.click('.train-slot[data-train="steam"]');

  const painted = await sceneState(page, CONSIST);
  for (const id of CONSIST) expect(painted?.[id]?.hex, `${id} painted`).toBe('#3f9bd8');
  expect(painted?.['steam:loco']?.stickers.visible).toEqual(['star']);
  expect(await storeSnapshot(page), 'store holds the fresh livery').not.toEqual({});
  await waitForStoredLiveries(page, 1);

  await resetWorld(page);

  const stock = await sceneState(page, CONSIST);
  for (const id of CONSIST) {
    expect(stock?.[id]?.hex, `${id} back to stock`).toBeNull();
    expect(stock?.[id]?.stickers.visible, `${id} stickers cleared`).toEqual([]);
  }
  expect(await storeSnapshot(page), 'store snapshot cleared').toEqual({});
  await waitForStoredLiveries(page, 0);
  expect(await readStoredLiveries(page), 'storage holds no liveries').toEqual({});

  // The stale world save must not win the race: a reload boots every vehicle
  // stock, proving the cleared snapshot is what actually landed in storage.
  await page.reload();
  await ready(page);
  await openDrawer(page);
  expect(await storeSnapshot(page), 'reload boots stock').toEqual({});
  const afterReload = await sceneState(page, CONSIST);
  for (const id of CONSIST) {
    expect(afterReload?.[id]?.hex, `${id} stock after reload`).toBeNull();
  }
  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
});

test('restoring a consist leaves the store and the scene agreeing', async ({ page }) => {
  const errors = watchConsoleErrors(page);

  await page.goto('/');
  await ready(page);
  await openDrawer(page);

  await page.click('.livery-section [data-paint="grape"]');
  const painted = await sceneState(page, CONSIST);
  for (const id of CONSIST) expect(painted?.[id]?.hex, `${id} painted by consist`).toBe('#9b6bd6');
  expect(await storeSnapshot(page)).not.toEqual({});

  await page.click('.livery-section [data-restore]');

  const restored = await sceneState(page, CONSIST);
  for (const id of CONSIST) expect(restored?.[id]?.hex, `${id} restored to stock`).toBeNull();
  expect(await storeSnapshot(page), 'store and scene agree: nothing left to persist').toEqual({});
  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
});
