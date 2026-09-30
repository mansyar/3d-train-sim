/**
 * Day cycle clock — drives the meadow's time of day.
 *
 * Pure logic (no DOM, no timers, no three.js): the caller feeds time via
 * `tick()` (usually once per animation frame) and reads `phase`/`fraction`;
 * the scene layer lerps sky, lights and glows from those. The child can also
 * jump the day to any phase (the sun/moon button), and the phase they land on
 * is the one the app persists.
 */

/** One full in-game day, ~2.5 real minutes so a toddler sees every mood. */
export const DAY_LENGTH_MS = 150_000;

export type DayPhase = 'dawn' | 'morning' | 'noon' | 'dusk' | 'night';

/** The five moods of the day, in the order the day runs through them. */
export const DAY_PHASES = [
  'dawn',
  'morning',
  'noon',
  'dusk',
  'night',
] as const satisfies readonly DayPhase[];

/** Where each session starts: a pleasant mid-morning (a quarter into the day). */
const START_FRACTION = 0.25;

/** The phase a fresh day (and any save without a preference) begins in. */
export const DEFAULT_DAY_PHASE: DayPhase = 'morning';

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

/** The phase that follows `phase` — night turns the page back to dawn. */
export function nextPhase(phase: DayPhase): DayPhase {
  const index = DAY_PHASES.indexOf(phase);
  return DAY_PHASES[(index + 1) % DAY_PHASES.length] ?? 'dawn';
}

/**
 * The middle of each phase, derived from the same bounds — a jump lands here
 * so the tapped mood reads at its clearest, with no second source of truth.
 *
 * Centers, not starts: the sky palette keys its colors to phase midpoints, so
 * landing on a boundary would paint the *outgoing* mood's palette (jumping to
 * night showed the dusk ember horizon, maroon instead of blue).
 */
const PHASE_CENTERS: Record<DayPhase, number> = (() => {
  const centers = {} as Record<DayPhase, number>;
  let from = 0;
  for (const bound of PHASE_BOUNDS) {
    centers[bound.phase] = (from + bound.until) / 2;
    from = bound.until;
  }
  return centers;
})();

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
  /** Jump straight to a phase; no-op when the day is already there. */
  setPhase(phase: DayPhase): void;
  /** Jump to the next phase — the sun/moon button's turn-the-page tap. */
  advancePhase(): void;
  /** Subscribe to phase changes; returns an unsubscribe function. */
  subscribe(listener: (event: { kind: 'phase'; phase: DayPhase }) => void): () => void;
}

export function createDayClock(options: { now: () => number }): DayClock {
  let startedAt = options.now();
  let anchor: number = START_FRACTION;
  let phase: DayPhase = DEFAULT_DAY_PHASE;
  const listeners = new Set<(event: { kind: 'phase'; phase: DayPhase }) => void>();

  function fraction(): number {
    const elapsed = options.now() - startedAt;
    return (anchor + elapsed / DAY_LENGTH_MS) % 1;
  }

  /** Re-anchor the day at the middle of `next`; the jump reads immediately. */
  function anchorTo(next: DayPhase): void {
    anchor = PHASE_CENTERS[next];
    startedAt = options.now();
  }

  function announce(next: DayPhase): void {
    phase = next;
    for (const listener of listeners) listener({ kind: 'phase', phase: next });
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
      if (next !== phase) announce(next);
    },
    setPhase(next) {
      if (next === phase) return;
      anchorTo(next);
      announce(next);
    },
    advancePhase() {
      const next = nextPhase(phase);
      anchorTo(next);
      announce(next);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
