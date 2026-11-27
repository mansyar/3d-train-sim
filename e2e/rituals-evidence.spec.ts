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

/**
 * Evidence harness for AC-4: drives all five settled greetings in one browser
 * session and captures a frame at each peak. Output lands in the gitignored
 * `.conductor/evidence/` tree so re-running the suite never dirties a tracked
 * file; the curated bundle is copied from here into the track's `evidence/`.
 *
 * The same context records video. A timing anchor is printed so the single
 * greeting-cycle clip can be trimmed from the recording with ffmpeg.
 */
test.use({
  browserName: 'chromium',
  viewport: { width: 480, height: 720 },
  // The test runner's `video` option (not the raw context `recordVideo`)
  // is what turns on per-test recording. Artifacts land in test-results/.
  video: { mode: 'on', size: { width: 480, height: 720 } },
});

const SHOTS_DIR = '.conductor/evidence/20261128-rituals-day-weather/screenshots';
const EVIDENCE_DIR = 'conductor/tracks/20261128-rituals-day-weather/evidence';
// PATH by default; FFMPEG lets a runner point at a binary installed elsewhere.
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';

/** Playwright keeps the recording in the per-test artifacts directory. */
function findVideo(): string {
  const candidates = readdirSync('test-results', { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('rituals-evidence'))
    .map((entry) => path.join('test-results', entry.name, 'video.webm'))
    .filter((video) => existsSync(video))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  const newest = candidates[0];
  if (!newest) throw new Error('no rituals evidence video found in test-results');
  return newest;
}

const ANCHOR_FILE = path.join(SHOTS_DIR, 'anchor.json');

/** Start the clip just before the greeting fires (one second settle + margin). */
function clipStartSeconds(): string {
  const anchor = JSON.parse(readFileSync(ANCHOR_FILE, 'utf8')) as { noonPeakMs: number };
  return Math.max(0, (anchor.noonPeakMs - 1_300) / 1_000).toFixed(2);
}

// Runs after the capture test, once the recording has been flushed to disk.
// Curates the five peak frames and trims one noon greeting cycle to a small
// looping GIF. This harness is temporary; the bundle it writes is the artifact.
test.afterAll(() => {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  for (const phase of ['dawn', 'morning', 'noon', 'dusk', 'night']) {
    copyFileSync(path.join(SHOTS_DIR, `${phase}.png`), path.join(EVIDENCE_DIR, `${phase}.png`));
  }
  try {
    execFileSync(
      FFMPEG,
      [
        '-y',
        '-ss',
        clipStartSeconds(),
        '-i',
        findVideo(),
        '-t',
        '5',
        '-vf',
        'fps=10,scale=400:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
        '-loop',
        '0',
        path.join(EVIDENCE_DIR, 'greeting-cycle.gif'),
      ],
      { stdio: 'pipe' },
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not run ffmpeg to build the greeting-cycle GIF. Install it on PATH or set FFMPEG to its executable path. Original error: ${detail}`,
    );
  }
});

type Greeting =
  | 'dawn-chorus'
  | 'morning-butterflies'
  | 'noon-full-sun'
  | 'dusk-windows'
  | 'night-fireflies';

type StageWitness = {
  activeGreeting: Greeting | null;
  level: number;
  [key: string]: unknown;
};

type SceneHandle = {
  dayPhase(): string;
  setDayPhase(phase: string): void;
  rituals(): StageWitness;
  nightRituals(): StageWitness;
};

type Case = {
  phase: string;
  away: string;
  greeting: Greeting;
  stage: 'day' | 'night';
};

const CASES: readonly Case[] = [
  { phase: 'dawn', away: 'noon', greeting: 'dawn-chorus', stage: 'day' },
  { phase: 'morning', away: 'dawn', greeting: 'morning-butterflies', stage: 'day' },
  { phase: 'noon', away: 'dawn', greeting: 'noon-full-sun', stage: 'day' },
  { phase: 'dusk', away: 'noon', greeting: 'dusk-windows', stage: 'night' },
  { phase: 'night', away: 'noon', greeting: 'night-fireflies', stage: 'night' },
];

const ready = (page: Page) =>
  page.waitForFunction(
    () => Boolean((window as unknown as { __tinyTracksReady?: boolean }).__tinyTracksReady),
    undefined,
    { timeout: 20_000 },
  );

/**
 * Wait until neither stage still holds a greeting. Switching phase while an
 * earlier greeting is in flight lets its `update()` call `director.release()`
 * after the next greeting has fired, clearing the shared active id and making
 * the next capture wait forever. Quiescence between captures keeps one voice
 * on stage at a time.
 */
const quiet = (page: Page) =>
  page.waitForFunction(
    () => {
      const scene = (window as unknown as { __tinyTracksScene?: SceneHandle }).__tinyTracksScene;
      const day = scene?.rituals();
      const night = scene?.nightRituals();
      return (
        day?.activeGreeting === null &&
        day.level === 0 &&
        night?.activeGreeting === null &&
        night.level === 0
      );
    },
    undefined,
    { timeout: 20_000 },
  );

test('capture all five settled greetings and one greeting cycle', async ({ page }) => {
  test.setTimeout(180_000);
  const consoleErrors = watchConsoleErrors(page);
  mkdirSync(SHOTS_DIR, { recursive: true });

  const videoStart = Date.now();
  console.log(`EVIDENCE_VIDEO ${JSON.stringify({ path: await page.video()?.path() })}`);
  await page.goto('/');
  await ready(page);
  await quiet(page);

  for (const greetingCase of CASES) {
    await page.evaluate(
      ({ target, other }) => {
        const scene = (window as unknown as { __tinyTracksScene?: SceneHandle }).__tinyTracksScene;
        if (!scene) throw new Error('dev scene handle missing');
        scene.setDayPhase(other);
        scene.setDayPhase(target);
      },
      { target: greetingCase.phase, other: greetingCase.away },
    );

    await page.waitForFunction(
      ({ expected, stage }) => {
        const scene = (window as unknown as { __tinyTracksScene?: SceneHandle }).__tinyTracksScene;
        const witness = stage === 'day' ? scene?.rituals() : scene?.nightRituals();
        return witness?.activeGreeting === expected && witness.level > 0.8;
      },
      { expected: greetingCase.greeting, stage: greetingCase.stage },
      { timeout: 20_000 },
    );

    const atMs = Date.now() - videoStart;
    await page.screenshot({ path: `${SHOTS_DIR}/${greetingCase.phase}.png` });
    if (greetingCase.phase === 'noon') {
      writeFileSync(ANCHOR_FILE, JSON.stringify({ noonPeakMs: atMs }));
    }
    console.log(`EVIDENCE_ANCHOR ${JSON.stringify({ phase: greetingCase.phase, ms: atMs })}`);
    await quiet(page);
  }

  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});
