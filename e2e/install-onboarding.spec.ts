import { expect, type Page, test } from '@playwright/test';

import { watchConsoleErrors } from './helpers';

/**
 * Install onboarding (phase 3): the hint is parent-gated, absent from the DOM
 * in standalone mode, survives a reload after dismissal, and comes back with a
 * fresh meadow. The kid shell is compared on both sides of the hold so a stray
 * word or control cannot sneak into the toddler surface.
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
  // exactly like a real finger would hold again (a11y/park-spot specs).
  for (let attempt = 0; attempt < 3 && !(await tray.isVisible()); attempt++) {
    const box = await gate.boundingBox();
    if (!box) throw new Error('parent gate missing');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(2400);
    await page.mouse.up();
  }
  await expect(tray).toBeVisible();
}

/**
 * Structure and text of everything OUTSIDE the parent tray. The tray is the
 * only parent-owned surface; every attribute is dropped because gate labels,
 * ARIA state and canvas pixel size legitimately change while the tray arms.
 * A new kid-facing element or instruction would still change this signature.
 */
const kidShellSignature = (page: Page): Promise<string> =>
  page.evaluate(() => {
    const clone = document.body.cloneNode(true);
    if (!(clone instanceof HTMLElement)) throw new Error('body clone missing');
    for (const tray of Array.from(clone.querySelectorAll('.preset-tray'))) {
      tray.remove();
    }
    for (const element of Array.from(clone.querySelectorAll('*'))) {
      for (const attribute of Array.from(element.attributes)) {
        element.removeAttribute(attribute.name);
      }
    }
    return clone.innerHTML.replace(/\s+/g, ' ').trim();
  });

/** The existing snapshot record — no new storage key should ever appear. */
interface StoredWorld {
  preferences?: { installHintDismissed?: boolean };
}

const readStoredWorld = (page: Page): Promise<StoredWorld> =>
  page.evaluate(
    () =>
      new Promise<StoredWorld>((resolve, reject) => {
        const request = indexedDB.open('tiny-tracks');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction('worlds', 'readonly');
          const get = transaction.objectStore('worlds').get('current');
          get.onsuccess = () => {
            // Raw IndexedDB types the value as any; narrow it to the snapshot
            // shape the app writes, which the core round-trip tests assert.
            resolve(get.result as StoredWorld);
            database.close();
          };
          get.onerror = () => reject(get.error);
        };
      }),
  );

test('parent hold reveals a tray-only install hint with iOS instructions', async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);
  await page.waitForTimeout(1500);

  await test.step('AC-3: no hint before the parent hold', async () => {
    await expect(page.locator('.preset-tray')).toBeHidden();
    // The element sits in the closed parent tray; it must be unreachable, not
    // absent. Standalone/dismissed are the states that remove it from the DOM.
    await expect(page.locator('.install-hint')).toBeHidden();
  });

  const shellBefore = await kidShellSignature(page);

  await test.step('AC-3: after the hold the tray shows the icon and instruction', async () => {
    await holdGate(page);
    const hint = page.locator('.preset-tray .install-hint');
    await expect(hint).toHaveCount(1);
    await expect(hint).toBeVisible();
    await expect(hint.locator('.install-hint-icon')).toHaveText('📲');
    await expect(hint.locator('.install-hint-text')).toContainText('Add to Home Screen');
    await expect(hint.locator('.install-hint-text')).toContainText('Share');
    await expect(hint.locator('.install-hint-dismiss')).toHaveAttribute(
      'aria-label',
      /Dismiss the Add to Home Screen hint/,
    );
  });

  await test.step('AC-4: the kid shell outside the tray is unchanged', async () => {
    const shellAfter = await kidShellSignature(page);
    expect(shellAfter, 'kid-facing shell changed outside the parent tray').toBe(shellBefore);
  });

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('standalone emulation renders no hint at all', async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors = watchConsoleErrors(page);

  // Playwright has no standalone context option: wrap matchMedia before boot
  // and expose the legacy iOS flag. Other media queries still hit the real
  // implementation, so the rest of the app is untouched.
  await page.addInitScript(() => {
    const originalMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query: string): MediaQueryList => {
      if (query === '(display-mode: standalone)') {
        return {
          matches: true,
          media: query,
          onchange: null,
          addListener: () => undefined,
          removeListener: () => undefined,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          dispatchEvent: () => true,
        } as MediaQueryList;
      }
      return originalMatchMedia(query);
    };
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
  });

  await page.goto('/');
  await waitForReady(page);
  await page.waitForTimeout(1500);

  await test.step('standalone signals are active', async () => {
    const standalone = await page.evaluate(
      () => window.matchMedia('(display-mode: standalone)').matches,
    );
    expect(standalone).toBe(true);
  });

  await test.step('AC-2: no hint element before or after the hold', async () => {
    await expect(page.locator('.install-hint')).toHaveCount(0);
    await holdGate(page);
    await expect(page.locator('.install-hint')).toHaveCount(0);
  });

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('dismiss survives reload and a world reset restores the hint', async ({ page }) => {
  test.setTimeout(180_000);
  const consoleErrors = watchConsoleErrors(page);

  await page.goto('/');
  await waitForReady(page);
  await page.waitForTimeout(1500);

  await test.step('AC-5: dismiss hides the hint at once', async () => {
    await holdGate(page);
    await expect(page.locator('.preset-tray .install-hint')).toBeVisible();
    await page.locator('.install-hint-dismiss').click();
    await expect(page.locator('.install-hint')).toHaveCount(0);
  });

  await test.step('AC-5: the flag lives in the existing world snapshot', async () => {
    await page.waitForTimeout(1000);
    const stored = await readStoredWorld(page);
    expect(stored.preferences?.installHintDismissed).toBe(true);
    const localKeys = await page.evaluate(() => Object.keys(localStorage));
    expect(
      localKeys.filter((key) => /install|hint|dismiss/i.test(key)),
      'no new dismissal storage key',
    ).toEqual([]);
  });

  await test.step('AC-5: reload keeps the hint hidden', async () => {
    await page.reload();
    await waitForReady(page);
    await page.waitForTimeout(1000);
    await holdGate(page);
    await expect(page.locator('.install-hint')).toHaveCount(0);
  });

  await test.step('AC-5: a parent reset brings the hint back', async () => {
    await page.locator('.parent-gate').click({ force: true });
    await page.waitForTimeout(400);
    await holdGate(page);
    await expect(page.locator('.preset-tray .install-hint')).toBeVisible();
  });

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
