import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { expect, type Page, test } from '@playwright/test';
import { watchConsoleErrors } from './helpers';

test.use({
  browserName: 'chromium',
  viewport: { width: 480, height: 720 },
  video: { mode: 'on', size: { width: 480, height: 720 } },
});

const KINDS = ['steam', 'diesel', 'tram', 'express', 'freight', 'bullet'] as const;
const PAINTS = [
  { id: 'cherry', hex: '#e8553f' },
  { id: 'tangerine', hex: '#f49b32' },
  { id: 'sunshine', hex: '#f5cf3f' },
  { id: 'clover', hex: '#59b45a' },
  { id: 'sky', hex: '#3f9bd8' },
  { id: 'grape', hex: '#9b6bd6' },
] as const;
const STICKERS = ['star', 'heart', 'flower', 'bolt'] as const;

const SHOTS_DIR = '.conductor/evidence/20261128-expression-liveries/screenshots';
const EVIDENCE_DIR = 'conductor/tracks/20261128-expression-liveries/evidence';
const ANCHOR_FILE = '.conductor/evidence/20261128-expression-liveries/cycle-anchor.json';
const PREVIEW_ORIGIN = 'http://localhost:5198';
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';

type StickerWitness = {
  visible: string[];
  anchors: string[];
  stamps: number;
  pops: number;
  animations: number;
  frames: number;
};
type LiveryProbe = {
  bodyHex(id: string): string | null;
  stickers(id: string): StickerWitness;
};

function paintAt(index: number): (typeof PAINTS)[number] {
  const paint = PAINTS[index % PAINTS.length];
  if (!paint) throw new Error(`no paint for index ${index}`);
  return paint;
}

async function ready(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const handle = window as unknown as { __tinyTracksReady?: boolean };
      return handle.__tinyTracksReady === true;
    },
    undefined,
    { timeout: 30_000 },
  );
  await expect(page.locator('.scene-canvas')).toBeVisible();
}

async function witnessReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const handle = window as unknown as { __tinyTracksLivery?: { bodyHex?: unknown } };
      return typeof handle.__tinyTracksLivery?.bodyHex === 'function';
    },
    undefined,
    { timeout: 20_000 },
  );
}

async function probe(page: Page, ids: readonly string[]) {
  return page.evaluate(
    (vehicleIds) => {
      const witness = (window as unknown as { __tinyTracksLivery?: LiveryProbe })
        .__tinyTracksLivery;
      if (!witness || typeof witness.stickers !== 'function') return null;
      const result: Record<string, { hex: string | null; stickers: StickerWitness }> = {};
      for (const id of vehicleIds) {
        result[id] = { hex: witness.bodyHex(id), stickers: witness.stickers(id) };
      }
      return result;
    },
    [...ids],
  );
}

/** The committed bytes are the strongest proof of an AC-2 round trip. */
async function readPersistedLiveries(page: Page): Promise<unknown> {
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
      if (typeof value !== 'object' || value === null) return null;
      const preferences = (value as { preferences?: { liveries?: unknown } }).preferences;
      return preferences?.liveries ?? null;
    } finally {
      db.close();
    }
  });
}

async function waitForPersistedLiveries(page: Page, count: number): Promise<void> {
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
        const preferences = (value as { preferences?: { liveries?: Record<string, unknown> } })
          .preferences;
        return Object.keys(preferences?.liveries ?? {}).length >= expected;
      } finally {
        db.close();
      }
    },
    count,
    { timeout: 30_000 },
  );
}

/** Prod has no dev handles: retry taps until the gate is confirmed open. */
async function tapPaint(page: Page, kind: string, paint: string): Promise<void> {
  const selector = `.livery-section [data-paint="${paint}"]`;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.click(`.train-slot[data-train="${kind}"]`);
    await page.click(selector);
    if ((await page.locator(selector).getAttribute('aria-pressed')) === 'true') return;
    await page.waitForTimeout(300);
  }
  throw new Error(`paint ${paint} did not apply to ${kind}`);
}

function findCycleVideo(): string {
  const videos = readdirSync('test-results', { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        entry.name.startsWith('liveries-evidence-integrat') &&
        !entry.name.includes('offline'),
    )
    .map((entry) => path.join('test-results', entry.name, 'video.webm'))
    .filter((video) => existsSync(video))
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs);
  const newest = videos[0];
  if (!newest) throw new Error('no integrated livery evidence video found in test-results');
  return newest;
}

test.afterAll(() => {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  for (const kind of KINDS) {
    copyFileSync(path.join(SHOTS_DIR, `${kind}.png`), path.join(EVIDENCE_DIR, `${kind}.png`));
  }
  const anchor = JSON.parse(readFileSync(ANCHOR_FILE, 'utf8')) as { cycleStartMs: number };
  const start = Math.max(0, anchor.cycleStartMs / 1000).toFixed(2);
  const gif = path.join(EVIDENCE_DIR, 'livery-cycle.gif');
  try {
    execFileSync(
      FFMPEG,
      [
        '-y',
        '-ss',
        start,
        '-i',
        findCycleVideo(),
        '-t',
        '6',
        '-vf',
        'fps=10,scale=400:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
        '-loop',
        '0',
        gif,
      ],
      { stdio: 'pipe' },
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not render the livery cycle GIF with ${FFMPEG}: ${detail}`);
  }
});

test('integrated livery flow: six consists, screenshots, byte-identical reload', async ({
  page,
}) => {
  // Six consists with sticker cycles, screenshots and video capture, plus a
  // reload round-trip: video recording on software GL needs a bigger budget.
  test.setTimeout(480_000);
  mkdirSync(SHOTS_DIR, { recursive: true });
  const videoStart = Date.now();
  const errors = watchConsoleErrors(page);

  await page.goto('/');
  await ready(page);
  await page.click('[data-drawer="trains"]');
  const section = page.locator('.livery-section');
  await expect(section).toBeVisible();
  await witnessReady(page);

  // Anchor the short GIF on the first paint tap of the cycle.
  writeFileSync(ANCHOR_FILE, JSON.stringify({ cycleStartMs: Date.now() - videoStart }));

  for (const [index, kind] of KINDS.entries()) {
    const paint = paintAt(index);
    await page.click(`.train-slot[data-train="${kind}"]`);
    await page.click(`.livery-section [data-paint="${paint.id}"]`);

    const consist = [`${kind}:loco`, `${kind}:lead`, `${kind}:rear`];
    const painted = await probe(page, consist);
    expect(painted, `${kind}: livery witness missing`).not.toBeNull();
    for (const id of consist) {
      expect(painted?.[id]?.hex, `${id} repainted`).toBe(paint.hex);
    }

    for (const sticker of STICKERS) {
      await page.click(`.livery-section [data-sticker="${sticker}"]`);
      await expect(section).toHaveAttribute('data-armed', sticker);
      await page.click(`.train-slot[data-train="${kind}"]`);
      await expect(section).toHaveAttribute('data-armed', '');
    }

    const stamped = await probe(page, [`${kind}:loco`]);
    expect(stamped?.[`${kind}:loco`]?.stickers.visible, `${kind} stickers`).toEqual([...STICKERS]);
    await page.screenshot({ path: path.join(SHOTS_DIR, `${kind}.png`) });
  }

  await waitForPersistedLiveries(page, KINDS.length);
  const before = await readPersistedLiveries(page);
  expect(before, 'liveries reached storage').not.toBeNull();

  await page.reload();
  await ready(page);
  await witnessReady(page);
  await page.click('[data-drawer="trains"]');
  await expect(section).toBeVisible();

  const after = await readPersistedLiveries(page);
  expect(JSON.stringify(after), 'AC-2: reload round-trips byte-identically').toBe(
    JSON.stringify(before),
  );

  for (const [index, kind] of KINDS.entries()) {
    const paint = paintAt(index);
    await page.click(`.train-slot[data-train="${kind}"]`);
    await expect(section.locator(`[data-paint="${paint.id}"]`)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(section).toHaveAttribute('data-sticker-count', String(STICKERS.length));
    const restored = await probe(page, [`${kind}:loco`, `${kind}:lead`, `${kind}:rear`]);
    for (const id of [`${kind}:loco`, `${kind}:lead`, `${kind}:rear`]) {
      expect(restored?.[id]?.hex, `${id} restored`).toBe(paint.hex);
    }
    expect(restored?.[`${kind}:loco`]?.stickers.visible).toEqual([...STICKERS]);
  }

  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
});

test('offline prod build keeps the full livery flow precache-neutral', async ({
  page,
  context,
}) => {
  // Full six-consist flow twice over plus reloads on the prod build: same
  // software-GL headroom as the integrated flow above.
  test.setTimeout(480_000);
  const errors = watchConsoleErrors(page);
  const requested: string[] = [];
  page.on('request', (request) => requested.push(request.url()));

  await page.goto(`${PREVIEW_ORIGIN}/`);
  await expect(page.locator('.scene-canvas')).toBeVisible();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
    timeout: 30_000,
  });
  await page.reload();
  await expect(page.locator('.scene-canvas')).toBeVisible();

  const sw = await page.request.get(`${PREVIEW_ORIGIN}/sw.js`);
  expect(sw.status()).toBe(200);
  const manifest = await sw.text();
  const urls = [...manifest.matchAll(/url:"([^"]+)"/g)].map((match) => match[1] ?? '');
  expect(urls.length, 'precache manifest has entries').toBeGreaterThan(0);
  const liveryEntries = urls.filter((url) => /liver|sticker|paint|decal/i.test(url));
  expect(liveryEntries, `new precache entries: ${liveryEntries.join(' | ')}`).toEqual([]);
  expect(
    urls.some((url) => /\.glb$/.test(url)),
    'models still precached',
  ).toBe(true);
  expect(
    urls.some((url) => /\.woff2$/.test(url)),
    'fonts still precached',
  ).toBe(true);

  errors.length = 0;
  requested.length = 0;
  try {
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('.scene-canvas')).toBeVisible();
    await page.waitForTimeout(1000);
    await page.click('[data-drawer="trains"]');
    const section = page.locator('.livery-section');
    await expect(section).toBeVisible();

    for (const [index, kind] of KINDS.entries()) {
      const paint = paintAt(index);
      await tapPaint(page, kind, paint.id);
      for (const sticker of STICKERS) {
        await page.click(`.livery-section [data-sticker="${sticker}"]`);
        await expect(section).toHaveAttribute('data-armed', sticker);
        await page.click(`.train-slot[data-train="${kind}"]`);
        await expect(section).toHaveAttribute('data-armed', '');
      }
      await expect(section).toHaveAttribute('data-sticker-count', String(STICKERS.length));
    }

    await page.reload();
    await expect(page.locator('.scene-canvas')).toBeVisible();
    await page.waitForTimeout(1000);
    await page.click('[data-drawer="trains"]');
    await expect(section).toBeVisible();
    for (const [index, kind] of KINDS.entries()) {
      const paint = paintAt(index);
      await page.click(`.train-slot[data-train="${kind}"]`);
      await expect(section.locator(`[data-paint="${paint.id}"]`)).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(section).toHaveAttribute('data-sticker-count', String(STICKERS.length));
    }
  } finally {
    await context.setOffline(false);
  }

  const foreign = requested.filter(
    (url) =>
      !url.startsWith(PREVIEW_ORIGIN) &&
      !url.startsWith('blob:') &&
      !url.startsWith('data:') &&
      !url.startsWith('about:'),
  );
  expect(foreign, `offline requests escaped: ${foreign.join(' | ')}`).toEqual([]);
  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
});
