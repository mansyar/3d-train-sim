/**
 * Greeting director — decides *when* a clock phase greets the child, never how
 * it looks or sounds. Pure state (no DOM, no timers, no three.js): the scene
 * feeds phase transitions from the day clock into `observe()` and advances the
 * settle window with `tick(dt)` from the frame loop; the fired event names the
 * greeting the later phases render.
 *
 * FR-1: a greeting fires once the phase has been still for `SETTLE_MS`.
 * FR-8: rapid taps keep restarting that window, so only the resting phase
 * greets, and there is only ever one voice — a new transition yields the
 * in-flight greeting immediately instead of stacking another on top of it.
 */

import type { DayPhase } from '../core/day-clock';

/** The quiet time after the last clock change before a phase greets. */
export const SETTLE_MS = 1_000;

/** One stable id per phase's greeting; the scene/audio phases render these. */
export type Greeting =
  | 'dawn-chorus'
  | 'morning-butterflies'
  | 'noon-full-sun'
  | 'dusk-windows'
  | 'night-fireflies';

/**
 * The phase→greeting map (AC-1). Keyed by `DayPhase`, so adding a clock phase
 * is a type error here rather than a greeting that silently never fires.
 */
export const PHASE_GREETINGS: Record<DayPhase, Greeting> = {
  dawn: 'dawn-chorus',
  morning: 'morning-butterflies',
  noon: 'noon-full-sun',
  dusk: 'dusk-windows',
  night: 'night-fireflies',
};

/** The greeting for a settled phase — the single source of truth for the map. */
export function greetingForPhase(phase: DayPhase): Greeting {
  return PHASE_GREETINGS[phase];
}

export interface GreetingEvent {
  kind: 'greeting';
  phase: DayPhase;
  greeting: Greeting;
}

export interface RitualDirector {
  /** The phase waiting to settle, or null when no transition is pending. */
  readonly pendingPhase: DayPhase | null;
  /** The one greeting currently holding the voice, or null. */
  readonly activeGreeting: Greeting | null;
  /** Record a clock phase transition; restarts the settle window. */
  observe(phase: DayPhase): void;
  /** Advance the settle window by `dt` ms; fires once when it elapses. */
  tick(dt: number): void;
  /** Mark the active greeting's voice finished. */
  release(): void;
  subscribe(listener: (event: GreetingEvent) => void): () => void;
}

export function createRitualDirector(): RitualDirector {
  let pendingPhase: DayPhase | null = null;
  let elapsed = 0;
  let activeGreeting: Greeting | null = null;
  const listeners = new Set<(event: GreetingEvent) => void>();

  return {
    get pendingPhase() {
      return pendingPhase;
    },
    get activeGreeting() {
      return activeGreeting;
    },
    observe(phase) {
      // Every new transition cancels whatever was waiting or sounding: spam
      // can only ever end in one greeting, for the last phase left standing.
      pendingPhase = phase;
      elapsed = 0;
      activeGreeting = null;
    },
    tick(dt) {
      if (pendingPhase === null) return;
      elapsed += dt;
      if (elapsed < SETTLE_MS) return;
      const phase = pendingPhase;
      pendingPhase = null;
      elapsed = 0;
      const greeting = greetingForPhase(phase);
      activeGreeting = greeting;
      const event: GreetingEvent = { kind: 'greeting', phase, greeting };
      for (const listener of listeners) listener(event);
    },
    release() {
      activeGreeting = null;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
