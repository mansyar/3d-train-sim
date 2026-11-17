import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

/**
 * The axe sweep (Phase 2): four representative tablet states must be clean
 * under WCAG 2.0/2.1 A + AA. The `viewport` rule is the single documented
 * exception — kid mode is intentionally zoom-free, and parent zoom is asserted
 * directly while the tray is visible. `color-contrast` stays enabled.
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
  // exactly like a real finger would hold again (insights/park-spot specs).
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

/** One scan with the project's single documented rule exception. */
const scan = (page: Page) =>
  new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    // Kid mode is intentionally zoom-free by default, so axe's WCAG 2 AA
    // viewport rule (axe-core 4.14 id: `meta-viewport`) would always fail;
    // parent zoom is asserted directly below while the tray is visible.
    // This is the ONLY disabled rule; color-contrast stays enabled.
    .disableRules(['meta-viewport'])
    .analyze();

/** Walk the tab order until the representative control has keyboard focus. */
async function tabTo(page: Page, selector: string): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await page.keyboard.press('Tab');
    if ((await page.locator(`${selector}:focus`).count()) > 0) return;
  }
  throw new Error(`could not reach ${selector} by keyboard`);
}

test('four tablet states are axe-clean with visible focus and parent-only zoom @smoke', async ({
  page,
}) => {
  // Shader compiles on four WebGL boots and four axe passes are slow here.
  test.setTimeout(180_000);

  await page.goto('/');
  await waitForReady(page);

  await test.step('AC-4: idle state has zero axe violations', async () => {
    const results = await scan(page);
    expect(results.violations).toEqual([]);
  });

  await test.step('AC-4: toy drawer open state has zero axe violations', async () => {
    await page.click('[data-drawer="toys"]');
    await expect(page.locator('.toy-drawer')).toBeVisible();
    const results = await scan(page);
    expect(results.violations).toEqual([]);
    await page.click('[data-drawer="toys"]');
    await expect(page.locator('.toy-drawer')).toBeHidden();
  });

  await test.step('AC-4: parent tray open state is clean and enables zoom only while visible', async () => {
    await holdGate(page);
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
      'content',
      /user-scalable=yes/,
    );
    const results = await scan(page);
    expect(results.violations).toEqual([]);
  });

  await test.step('AC-4: riding state has zero axe violations behind a real ride', async () => {
    // Fresh boot: the tray disarms on reload and the kid-safe viewport returns.
    await page.reload();
    await waitForReady(page);
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
      'content',
      /user-scalable=no/,
    );

    // Existing test route: clear the seeded meadow, lay a 2x2 corner loop via
    // the dev world handle, then start the real ride (smoke.spec.ts).
    await page.evaluate(() => {
      const world = (
        window as unknown as {
          __tinyTracksWorld?: {
            reset: () => void;
            place: (type: string, cell: { x: number; y: number }, rotation: number) => string;
          };
        }
      ).__tinyTracksWorld;
      if (!world) throw new Error('dev world handle missing');
      world.reset();
      const corners = [
        [{ x: 1, y: 7 }, 90],
        [{ x: 2, y: 7 }, 180],
        [{ x: 2, y: 8 }, 270],
        [{ x: 1, y: 8 }, 0],
      ] as const;
      for (const [cell, rotation] of corners) world.place('corner', cell, rotation);
    });
    await page.waitForTimeout(800);

    await page.click('.ride-toggle');
    await expect(page.locator('.ride-toggle')).toHaveClass(/is-riding/);
    await page.waitForFunction(() => {
      const scene = (
        window as unknown as { __tinyTracksScene?: { ridingTrainCount: () => number } }
      ).__tinyTracksScene;
      return (scene?.ridingTrainCount() ?? 0) === 1;
    });

    const results = await scan(page);
    expect(results.violations).toEqual([]);
  });

  await test.step('AC-2: keyboard focus rings, pointer taps stay quiet', async () => {
    // A fresh boot keeps this check independent of the ride state.
    await page.reload();
    await waitForReady(page);

    const probe = '.whistle-toot'; // representative, always-visible rail button
    await tabTo(page, probe);
    const ring = await page.locator(probe).evaluate((element) => {
      const style = getComputedStyle(element);
      return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
    });
    expect(ring.outlineStyle, 'keyboard focus outline style').toBe('solid');
    expect(ring.outlineWidth, 'keyboard focus outline width').toBe('3px');

    // The same control, reached by pointer, must not match :focus-visible.
    await page.locator(probe).click();
    const focusVisible = await page
      .locator(probe)
      .evaluate((element) => element.matches(':focus-visible'));
    expect(focusVisible, 'pointer tap must stay visually quiet').toBe(false);
  });
});
