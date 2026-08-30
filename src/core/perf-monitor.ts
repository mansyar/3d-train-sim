/**
 * Performance guardrails — an FPS probe and a quality-tier controller.
 *
 * The probe records frame deltas into a preallocated ring buffer (zero
 * per-frame allocations) and distills a rolling ~4 s verdict: `healthy`,
 * `strained`, or `critical`. A paused flag (fed from the visibility
 * controller) makes hidden-tab throttling invisible: paused samples are
 * ignored, and the resume frame's oversized delta is clamped so the gap
 * never poisons the next verdict.
 *
 * The controller maps sustained verdicts onto quality levels with
 * toddler-gentle rules: degrade only after sustained strain, recover only
 * after longer sustained health, never move more than one level at a time,
 * and hold a cooldown after every change so nothing flaps. It notifies via
 * `onLevelChange` only when the level actually changes.
 */

export const PERF_SAMPLE_CAPACITY = 240;
export const PERF_WINDOW_SECONDS = 4;
/** ~0.5 s of 60 fps frames before the probe is allowed to judge. */
export const PERF_MIN_SAMPLES = 30;
export const PERF_HEALTHY_FPS = 55;
export const PERF_STRAINED_FPS = 30;
/** Deltas above this are clamped — a stutter or resume gap, not steady load. */
export const PERF_MAX_FRAME_DELTA = 0.25;

export type PerfVerdict = 'healthy' | 'strained' | 'critical';

export interface PerfMonitorOptions {
  /** Ring buffer capacity in frames (defaults to a full verdict window). */
  capacity?: number;
}

export interface PerfMonitor {
  readonly capacity: number;
  /** Record one frame delta in seconds; a no-op while paused. */
  sample(deltaSeconds: number): void;
  setPaused(paused: boolean): void;
  readonly paused: boolean;
  /** Average fps over the live window, or NaN before any sample exists. */
  averageFps(): number;
  verdict(): PerfVerdict;
}

export function createPerfMonitor(options: PerfMonitorOptions = {}): PerfMonitor {
  const capacity = options.capacity ?? PERF_SAMPLE_CAPACITY;
  const deltas = new Float64Array(capacity);
  const ends = new Float64Array(capacity);
  let head = 0;
  let stored = 0;
  let clock = 0;
  let paused = false;

  // Shared scratch result — the probe is called every frame, and the
  // zero-per-frame-allocation rule covers even this small object.
  const windowScan = { valid: 0, total: 0 };
  function scanWindow(): { valid: number; total: number } {
    const cutoff = clock - PERF_WINDOW_SECONDS;
    windowScan.valid = 0;
    windowScan.total = 0;
    for (let i = 0; i < stored; i += 1) {
      const end = ends[i]!;
      const delta = deltas[i]!;
      if (end > cutoff) {
        windowScan.valid += 1;
        windowScan.total += delta;
      }
    }
    return windowScan;
  }

  return {
    capacity,

    sample(deltaSeconds) {
      if (paused) return;
      if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
      const delta = Math.min(deltaSeconds, PERF_MAX_FRAME_DELTA);
      clock += delta;
      deltas[head] = delta;
      ends[head] = clock;
      head = (head + 1) % capacity;
      if (stored < capacity) stored += 1;
    },

    setPaused(next) {
      paused = next;
    },

    get paused() {
      return paused;
    },

    averageFps() {
      const { valid, total } = scanWindow();
      if (valid === 0 || total <= 0) return NaN;
      return valid / total;
    },

    verdict() {
      const { valid, total } = scanWindow();
      if (valid < PERF_MIN_SAMPLES) return 'healthy';
      const fps = valid / total;
      if (fps >= PERF_HEALTHY_FPS) return 'healthy';
      if (fps >= PERF_STRAINED_FPS) return 'strained';
      return 'critical';
    },
  };
}

export type QualityLevel = 0 | 1 | 2;

/** Sustained strain needed to drop one level. */
export const QUALITY_STRAIN_DEGRADE_SECONDS = 2;
/** Sustained health needed to regain one level (deliberately slower). */
export const QUALITY_HEALTH_RECOVER_SECONDS = 6;
/** Quiet period after any level change during which nothing may change. */
export const QUALITY_LEVEL_COOLDOWN_SECONDS = 4;

export interface QualityControllerOptions {
  /** Fired only when the level actually changes. */
  onLevelChange?: (level: QualityLevel) => void;
}

export interface QualityController {
  readonly level: QualityLevel;
  /** Feed one frame's verdict and elapsed seconds. */
  update(verdict: PerfVerdict, dtSeconds: number): void;
}

export function createQualityController(options: QualityControllerOptions = {}): QualityController {
  let level: QualityLevel = 0;
  let strainSeconds = 0;
  let healthSeconds = 0;
  let cooldownSeconds = 0;

  function applyLevel(next: QualityLevel) {
    if (next === level) return;
    level = next;
    strainSeconds = 0;
    healthSeconds = 0;
    cooldownSeconds = QUALITY_LEVEL_COOLDOWN_SECONDS;
    options.onLevelChange?.(level);
  }

  return {
    get level() {
      return level;
    },

    update(verdict, dtSeconds) {
      // Sliced so a single large step still honors the cooldown ordering.
      let remaining = Math.max(dtSeconds, 0);
      while (remaining > 1e-9) {
        if (cooldownSeconds > 0) {
          const step = Math.min(remaining, cooldownSeconds);
          cooldownSeconds -= step;
          remaining -= step;
          continue;
        }
        const step = remaining;
        remaining = 0;
        if (verdict === 'healthy') {
          strainSeconds = 0;
          healthSeconds += step;
          if (level > 0 && healthSeconds >= QUALITY_HEALTH_RECOVER_SECONDS) {
            applyLevel((level - 1) as QualityLevel);
          }
        } else {
          healthSeconds = 0;
          strainSeconds += step;
          if (level < 2 && strainSeconds >= QUALITY_STRAIN_DEGRADE_SECONDS) {
            applyLevel((level + 1) as QualityLevel);
          }
        }
      }
    },
  };
}
