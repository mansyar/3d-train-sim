/**
 * Day cycle clock — drives the meadow's time of day.
 *
 * Pure logic (no DOM, no timers, no three.js): the caller feeds time via
 * `tick()` (usually once per animation frame) and reads `phase`/`fraction`;
 * the scene layer lerps sky, lights and glows from those. The cycle is
 * ephemeral — every session restarts at mid-morning, nothing is persisted.
 */

/** One full in-game day, ~2.5 real minutes so a toddler sees every mood. */
export const DAY_LENGTH_MS = 150_000;

export type DayPhase = 'dawn' | 'morning' | 'noon' | 'dusk' | 'night';

/** Where each session starts: a pleasant mid-morning (a quarter into the day). */
const START_FRACTION = 0.25;

/**
 * Phase slices of the day fraction. Dawn and dusk are short — transitions
 * should feel like moments, not hours — while night gets the largest share
 * (fireflies need time to shine) and morning/noon carry the playtime light.
 */
const PHASE_BOUNDS: readonly { until: number; phase: DayPhase }[] = [
  { until: 0.12, phase: 'dawn' },
  { until: 0.45, phase: 'morning' },
  { until: 0.6, phase: 'noon' },
  { until: 0.72, phase: 'dusk' },
  { until: 1, phase: 'night' },
];

/** Map a (possibly out-of-range, will wrap) day fraction to its phase. */
export function phaseAtFraction(fraction: number): DayPhase {
  const t = fraction - Math.floor(fraction);
  for (const bound of PHASE_BOUNDS) {
    if (t < bound.until) return bound.phase;
  }
  // Unreachable — the last bound matches any t < 1 — but
  // noUncheckedIndexedAccess cannot prove the index non-undefined.
  return PHASE_BOUNDS[PHASE_BOUNDS.length - 1]?.phase ?? 'night';
}

export interface DayClock {
  readonly phase: DayPhase;
  /** Position within the day, 0..1 — drives sun/moon arc and light lerp. */
  readonly fraction: number;
  /** Advance the clock — call once per animation frame. */
  tick(): void;
  /** Subscribe to phase changes; returns an unsubscribe function. */
  subscribe(listener: (event: { kind: 'phase'; phase: DayPhase }) => void): () => void;
}

export function createDayClock(options: { now: () => number }): DayClock {
  const startedAt = options.now();
  let phase: DayPhase = phaseAtFraction(START_FRACTION);
  const listeners = new Set<(event: { kind: 'phase'; phase: DayPhase }) => void>();

  function fraction(): number {
    const elapsed = options.now() - startedAt;
    return (START_FRACTION + elapsed / DAY_LENGTH_MS) % 1;
  }

  return {
    get phase() {
      return phase;
    },
    get fraction() {
      return fraction();
    },
    tick() {
      const next = phaseAtFraction(fraction());
      if (next !== phase) {
        phase = next;
        for (const listener of listeners) listener({ kind: 'phase', phase: next });
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
