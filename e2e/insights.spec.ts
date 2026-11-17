import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

/**
 * Local insights (Phase 3): a read-only panel inside the existing 2 s-hold
 * parent tray. This journey proves the values are hidden before the hold,
 * present in six labelled rows after it, survive resets and a reload, and add
 * no network traffic. The counters are device diagnostics, not the clarity
 * audit's human-observed measures — no timing or storage size is asserted.
 */

const waitForReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(
    () => (window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady === true,
    undefined,
    { timeout: 20_000 },
  );
};

/** The established ~2 s parent hold, via real pointer input (never a custom event). */
async function holdGate(page: Page): Promise<void> {
  const gate = page.locator('.parent-gate');
  const tray = page.locator('.preset-tray');
  // Shader-compile jank can delay the arm timer past our release — retry,
  // exactly like a real finger would hold again (park-spot spec).
  for (let attempt = 0; attempt < 3 && !(await tray.isVisible()); attempt++) {
    const box = await gate.boundingBox();
    if (!box) throw new Error('parent gate missing');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(2400);
    await page.mouse.up();
  }
  await expect(tray).toBeVisible();
  await expect(page.locator('.insights-panel')).toBeVisible();
}

/** Read one value cell by its stable data-insights key. */
const readValue = async (page: Page, key: string): Promise<string> =>
  (await page.locator(`[data-insights="${key}"]`).innerText()).trim();

/** Reset the world N times through the dev handle — the same path as the gate's confirm. */
async function resetViaDevHandle(page: Page, times: number): Promise<void> {
  await waitForReady(page);
  await page.evaluate((count) => {
    const world = (window as unknown as { __tinyTracksWorld?: { reset: () => void } })
      .__tinyTracksWorld;
    if (!world) throw new Error('dev world handle missing');
    for (let index = 0; index < count; index += 1) world.reset();
  }, times);
}

/** A tap on the canvas disarms the tray without touching any parent control. */
async function disarmTray(page: Page): Promise<void> {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('no viewport');
  await page.mouse.click(viewport.width / 2, viewport.height / 2);
  await expect(page.locator('.preset-tray')).toBeHidden();
}

test('insights stay behind the hold gate, persist, and send nothing off-device', async ({
  page,
}) => {
  // Three ~2 s holds plus two WebGL page loads; shader compiles are slow here.
  test.setTimeout(180_000);
  // Attached before navigation so the whole boot → reload journey is covered.
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));

  await page.goto('/');
  await waitForReady(page);

  await test.step('before the hold, the tray and every diagnostic row are hidden', async () => {
    await expect(page.locator('.preset-tray')).toBeHidden();
    await expect(page.locator('.insights-panel')).toBeHidden();
    await expect(page.locator('.insights-panel [data-insights="sessions"]')).toBeHidden();
  });

  await holdGate(page);

  await test.step('the armed tray shows six labelled, read-only rows with local values', async () => {
    const panel = page.locator('.insights-panel');
    const labels = [
      'Sessions',
      'Longest session',
      'Resets',
      'Unexpected closes',
      'Storage',
      'Last save',
    ];
    for (const label of labels) {
      await expect(panel.locator('dt', { hasText: label })).toHaveCount(1);
    }
    // Read-only: no control of any kind lives inside the panel.
    expect(await panel.locator('button, input, select, textarea, [role="button"]').count()).toBe(0);

    const keys = ['sessions', 'longestSession', 'resets', 'uncleanExits', 'storage', 'lastSave'];
    for (const key of keys) {
      expect(await readValue(page, key), `empty value for ${key}`).not.toBe('');
    }
  });

  const resetsBefore = Number.parseInt(await readValue(page, 'resets'), 10);
  expect(Number.isNaN(resetsBefore)).toBe(false);

  await test.step('three parent resets raise Resets, and the counter survives a reload', async () => {
    await resetViaDevHandle(page, 3);
    await page.waitForTimeout(400); // let saveInsights settle before the reload

    // The provider is lazy, so re-arm to make it read the fresh counter.
    await disarmTray(page);
    await holdGate(page);
    const resetsAfter = Number.parseInt(await readValue(page, 'resets'), 10);
    expect(resetsAfter).toBe(resetsBefore + 3);

    await page.waitForTimeout(400);
    await page.reload();
    await waitForReady(page);
    await holdGate(page);
    const resetsAfterReload = Number.parseInt(await readValue(page, 'resets'), 10);
    expect(resetsAfterReload).toBe(resetsAfter);
  });

  await test.step('every HTTP(S) request stayed on the app origin', async () => {
    const appOrigin = await page.evaluate(() => location.origin);
    const external = requests.filter((url) => {
      if (url.startsWith('data:') || url.startsWith('blob:')) return false;
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return false;
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
      return parsed.origin !== appOrigin;
    });
    expect(external, `unexpected off-device requests: ${external.join(', ')}`).toEqual([]);
  });
});
