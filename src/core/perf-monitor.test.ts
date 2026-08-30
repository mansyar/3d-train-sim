import { describe, expect, it } from 'vitest';

import {
  createPerfMonitor,
  createQualityController,
  PERF_HEALTHY_FPS,
  PERF_SAMPLE_CAPACITY,
  PERF_STRAINED_FPS,
  PERF_WINDOW_SECONDS,
} from './perf-monitor';

const FRAME_60FPS = 1 / 60;
const FRAME_35FPS = 1 / 35;
const FRAME_20FPS = 1 / 20;

function feed(monitor: ReturnType<typeof createPerfMonitor>, delta: number, frames: number) {
  for (let i = 0; i < frames; i += 1) monitor.sample(delta);
}

describe('createPerfMonitor', () => {
  it('starts healthy before enough samples accumulate', () => {
    const monitor = createPerfMonitor();

    expect(monitor.verdict()).toBe('healthy');
    feed(monitor, FRAME_60FPS, 10);
    expect(monitor.verdict()).toBe('healthy');
  });

  it('reports healthy at 60 fps and strained below the healthy threshold', () => {
    const monitor = createPerfMonitor();

    feed(monitor, FRAME_60FPS, PERF_SAMPLE_CAPACITY);
    expect(monitor.averageFps()).toBeGreaterThanOrEqual(PERF_HEALTHY_FPS);
    expect(monitor.verdict()).toBe('healthy');

    feed(monitor, FRAME_35FPS, PERF_SAMPLE_CAPACITY);
    const strainedFps = monitor.averageFps();
    expect(strainedFps).toBeLessThan(PERF_HEALTHY_FPS);
    expect(strainedFps).toBeGreaterThanOrEqual(PERF_STRAINED_FPS);
    expect(monitor.verdict()).toBe('strained');
  });

  it('reports critical below the strained threshold', () => {
    const monitor = createPerfMonitor();

    feed(monitor, FRAME_20FPS, PERF_SAMPLE_CAPACITY);
    expect(monitor.averageFps()).toBeLessThan(PERF_STRAINED_FPS);
    expect(monitor.verdict()).toBe('critical');
  });

  it('keeps the rolling window at roughly the verdict horizon', () => {
    const monitor = createPerfMonitor();

    // Two full capacities of 60 fps frames: everything older than the window
    // must fall out, so the average stays at 60 fps, not a blend with history.
    feed(monitor, FRAME_60FPS, PERF_SAMPLE_CAPACITY);
    feed(monitor, FRAME_20FPS, PERF_SAMPLE_CAPACITY);
    expect(monitor.averageFps()).toBeLessThan(PERF_STRAINED_FPS);
  });

  it('wraps its preallocated ring buffer without growing the sample store', () => {
    const monitor = createPerfMonitor({ capacity: 4 });

    feed(monitor, FRAME_60FPS, 4);
    feed(monitor, FRAME_60FPS, 8);
    expect(monitor.verdict()).toBe('healthy');
    expect(monitor.averageFps()).toBeCloseTo(60, 0);
  });

  it('ignores samples entirely while paused', () => {
    const monitor = createPerfMonitor();

    feed(monitor, FRAME_60FPS, PERF_SAMPLE_CAPACITY);
    monitor.setPaused(true);
    feed(monitor, FRAME_20FPS, PERF_SAMPLE_CAPACITY);
    expect(monitor.averageFps()).toBeGreaterThanOrEqual(PERF_HEALTHY_FPS);

    monitor.setPaused(false);
    feed(monitor, FRAME_60FPS, 1);
    expect(monitor.averageFps()).toBeGreaterThanOrEqual(PERF_HEALTHY_FPS);
  });

  it('does not let the hidden-tab resume gap poison the next verdict', () => {
    const monitor = createPerfMonitor();

    feed(monitor, FRAME_60FPS, PERF_SAMPLE_CAPACITY);
    monitor.setPaused(true);
    monitor.setPaused(false);
    // First frame after resume carries the whole paused duration in its delta.
    monitor.sample(30);
    feed(monitor, FRAME_60FPS, 60);
    expect(monitor.verdict()).toBe('healthy');
  });

  it('clamps runaway frame deltas so a single stutter cannot fake critical', () => {
    const monitor = createPerfMonitor();

    feed(monitor, FRAME_60FPS, PERF_SAMPLE_CAPACITY);
    monitor.sample(5);
    feed(monitor, FRAME_60FPS, PERF_SAMPLE_CAPACITY);
    expect(monitor.verdict()).not.toBe('critical');
  });

  it('exposes the window and capacity constants used by the verdict', () => {
    const monitor = createPerfMonitor();
    expect(monitor.capacity).toBe(PERF_SAMPLE_CAPACITY);
    expect(PERF_WINDOW_SECONDS).toBeGreaterThan(0);
  });
});

describe('createQualityController', () => {
  // Binary-exact step (2^-6 s): frame-like updates whose repeated sums hit
  // the 2s/4s/6s timing thresholds exactly instead of drifting under them.
  const STEP = 1 / 64;
  function feedVerdict(
    controller: ReturnType<typeof createQualityController>,
    verdict: 'healthy' | 'strained' | 'critical',
    seconds: number,
  ) {
    for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += STEP) {
      controller.update(verdict, STEP);
    }
  }

  function driveToStrainLevel2(controller: ReturnType<typeof createQualityController>) {
    // 2s sustained strain -> L1, 4s cooldown, 2s more -> L2.
    feedVerdict(controller, 'strained', 2);
    feedVerdict(controller, 'strained', 4);
    feedVerdict(controller, 'strained', 2);
  }

  it('starts at full quality (L0)', () => {
    const controller = createQualityController();
    expect(controller.level).toBe(0);
  });

  it('ignores single-verdict strain dips', () => {
    const controller = createQualityController();

    feedVerdict(controller, 'strained', 0.5);
    feedVerdict(controller, 'healthy', 1);
    feedVerdict(controller, 'strained', 0.5);
    expect(controller.level).toBe(0);
  });

  it('degrades L0 -> L1 -> L2 only after sustained strain', () => {
    const controller = createQualityController();

    feedVerdict(controller, 'strained', 1.9);
    expect(controller.level).toBe(0);
    feedVerdict(controller, 'strained', 0.2);
    expect(controller.level).toBe(1);

    driveToStrainLevel2(controller);
    expect(controller.level).toBe(2);
  });

  it('resets strain progress when health returns mid-streak', () => {
    const controller = createQualityController();

    feedVerdict(controller, 'strained', 1.9);
    feedVerdict(controller, 'healthy', 0.1);
    feedVerdict(controller, 'strained', 1.9);
    expect(controller.level).toBe(0);
  });

  it('holds a cooldown after a level change so nothing flaps', () => {
    const controller = createQualityController();

    feedVerdict(controller, 'strained', 2);
    expect(controller.level).toBe(1);

    // Sustained strain straight through the cooldown window: no change.
    feedVerdict(controller, 'strained', 4);
    expect(controller.level).toBe(1);

    // Only after the cooldown does the next sustained stretch apply.
    feedVerdict(controller, 'strained', 2);
    expect(controller.level).toBe(2);
  });

  it('recovers more slowly than it degrades, one level at a time', () => {
    const controller = createQualityController();
    driveToStrainLevel2(controller);
    expect(controller.level).toBe(2);

    // Recovery hold is longer than the 2s degradation hold, and the
    // post-change cooldown freezes progress for its first 4s.
    feedVerdict(controller, 'healthy', 2);
    expect(controller.level).toBe(2);
    feedVerdict(controller, 'healthy', 2);
    expect(controller.level).toBe(2);
    feedVerdict(controller, 'healthy', 2);
    expect(controller.level).toBe(2);
    feedVerdict(controller, 'healthy', 2);
    expect(controller.level).toBe(2);

    feedVerdict(controller, 'healthy', 2);
    expect(controller.level).toBe(1);
    expect(controller.level).not.toBe(0);

    // Cooldown after the L1 change, then the recovery hold again.
    feedVerdict(controller, 'healthy', 4);
    expect(controller.level).toBe(1);
    feedVerdict(controller, 'healthy', 6);
    expect(controller.level).toBe(0);
  });

  it('emits a callback only when the level actually changes', () => {
    const levels: number[] = [];
    const controller = createQualityController({
      onLevelChange: (level) => levels.push(level),
    });

    feedVerdict(controller, 'strained', 2);
    feedVerdict(controller, 'strained', 0.5);
    feedVerdict(controller, 'healthy', 0.5);
    expect(levels).toEqual([1]);

    feedVerdict(controller, 'strained', 6);
    expect(levels).toEqual([1, 2]);
  });
});
