import { describe, expect, it } from 'vitest';

import {
  PERF_HEALTHY_FPS,
  PERF_SAMPLE_CAPACITY,
  PERF_STRAINED_FPS,
  PERF_WINDOW_SECONDS,
  createPerfMonitor,
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
