/**
 * Idle attract clock — decides when the meadow should come alive on its own.
 *
 * Pure logic (no DOM, no timers, no three.js): the caller feeds it time via
 * `tick()`, activity via `notifyActivity()`, and an optional RNG/clock for
 * deterministic tests. The scene and audio layers subscribe to its events.
 */

/** Meadow sounds the attract mode may chirp (volume is capped in the audio layer). */
export const CRITTER_SOUNDS = ['oink-pig', 'baa-sheep', 'woof-pug', 'ribbit-frog'] as const;

export type CritterSound = (typeof CRITTER_SOUNDS)[number];

/** Smallest/largest gap between idle chirps (ms). */
const CHIRP_MIN_MS = 15_000;
const CHIRP_MAX_MS = 45_000;

export type AttractEvent =
  /** The meadow entered or left its idle state. */
  | { kind: 'state'; state: 'active' | 'idle' }
  /** Camera-drift cue, emitted once per idle entry (suppressed under reduced motion). */
  | { kind: 'drift' }
  /** A critter should chirp. */
  | { kind: 'chirp'; critter: CritterSound };

export interface AttractClockOptions {
  /** Clock provider (injected for deterministic tests). */
  now: () => number;
  /** RNG provider returning [0, 1) — defaults to Math.random. */
  random?: () => number;
  /** Reduced motion disables the camera drift cue but not the chirps. */
  reducedMotion?: boolean;
}

export interface AttractClock {
  readonly state: 'active' | 'idle';
  /** Feed on any touch/pointer/button activity; resets the idle timer. */
  notifyActivity(): void;
  /** Advance the clock — call once per animation frame or on visibility resume. */
  tick(): void;
  /** Subscribe to attract events; returns an unsubscribe function. */
  subscribe(listener: (event: AttractEvent) => void): () => void;
}

/** One RNG draw decides both the critter and when it chirps. */
function drawChirp(random: () => number): { delayMs: number; critter: CritterSound } {
  const t = random();
  const index = Math.min(Math.floor(t * CRITTER_SOUNDS.length), CRITTER_SOUNDS.length - 1);
  // The clamp keeps index in range; the fallback only guards a malformed RNG
  // (e.g. NaN), which noUncheckedIndexedAccess cannot prove away.
  const critter = CRITTER_SOUNDS[index] ?? 'oink-pig';
  const delayMs = CHIRP_MIN_MS + t * (CHIRP_MAX_MS - CHIRP_MIN_MS);
  return { delayMs, critter };
}

export function createAttractClock(
  thresholdMs: number,
  options: AttractClockOptions,
): AttractClock {
  const random = options.random ?? Math.random;
  const reducedMotion = options.reducedMotion ?? false;

  let state: 'active' | 'idle' = 'active';
  /** Timestamp of the last activity (or clock start). */
  let lastActivityAt = options.now();
  /** Absolute timestamp of the next scheduled chirp (null while active). */
  let nextChirpAt: number | null = null;
  /** Critter chosen for the next scheduled chirp. */
  let nextChirpCritter: CritterSound = CRITTER_SOUNDS[0];
  const listeners = new Set<(event: AttractEvent) => void>();

  function emit(event: AttractEvent): void {
    for (const listener of listeners) listener(event);
  }

  function scheduleChirp(now: number): void {
    const { delayMs, critter } = drawChirp(random);
    nextChirpAt = now + delayMs;
    nextChirpCritter = critter;
  }

  function enterIdle(now: number): void {
    state = 'idle';
    scheduleChirp(now);
    emit({ kind: 'state', state: 'idle' });
    if (!reducedMotion) emit({ kind: 'drift' });
  }

  function enterActive(): void {
    state = 'active';
    nextChirpAt = null;
    emit({ kind: 'state', state: 'active' });
  }

  return {
    get state() {
      return state;
    },

    notifyActivity() {
      lastActivityAt = options.now();
      if (state === 'idle') enterActive();
    },

    tick() {
      const now = options.now();
      if (state === 'active') {
        if (now - lastActivityAt >= thresholdMs) enterIdle(now);
        return;
      }
      // Idle: fire any due chirp and reschedule the next one.
      if (nextChirpAt !== null && now >= nextChirpAt) {
        emit({ kind: 'chirp', critter: nextChirpCritter });
        scheduleChirp(now);
      }
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
