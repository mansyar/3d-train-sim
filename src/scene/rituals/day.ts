/**
 * Day greetings — renders the Phase 1 director's settled day phases as short,
 * in-scene moments. The director decides *when*; this module only decides
 * *how long* the greeting shows and which families take the stage.
 *
 * Daylight greetings are the dawn chorus, the morning butterflies and the noon
 * sun glow. Dusk/night greetings belong to a later phase; their events are
 * ignored here, so this module never releases a voice it does not own.
 */

import type { Scene } from 'three';
import type { DayPhase } from '../../core/day-clock';
import type { Greeting, RitualDirector } from '../../state/rituals';
import {
  createButterflies,
  createChorusCritters,
  createNoonGlow,
  type DayFlier,
  type NoonGlow,
} from '../actors/day-fliers';

/** Total stage time of one day greeting, in milliseconds. */
export const GREETING_MS = 3_600;
const FADE_IN_MS = 250;
const FADE_OUT_MS = 900;

/**
 * Ease a greeting in, hold it, then ease it out. Pure so the envelope can be
 * unit-tested without a renderer; clamped at both ends for a late frame.
 */
export function greetingEnvelope(elapsedMs: number): number {
  const fadeIn = Math.min(1, Math.max(0, elapsedMs) / FADE_IN_MS);
  const fadeOut = Math.min(1, Math.max(0, GREETING_MS - elapsedMs) / FADE_OUT_MS);
  return Math.max(0, Math.min(fadeIn, fadeOut));
}

const DAY_GREETINGS: readonly Greeting[] = ['dawn-chorus', 'morning-butterflies', 'noon-full-sun'];

/** Dev/e2e witness for the in-scene greeting, with the NFR-1 cap counts. */
export interface RitualWitness {
  activeGreeting: Greeting | null;
  /** The frozen greeting under reduced motion (the director never ticks there). */
  restingGreeting: Greeting | null;
  pendingPhase: DayPhase | null;
  /** Envelope of the current greeting (0 when nothing is on stage). */
  level: number;
  chorusCount: number;
  butterflyCount: number;
  glowLevel: number;
}

export interface DayRituals {
  /** Advance the greeting stage. `dt` is seconds, as delivered by the RAF loop. */
  update(dt: number): void;
  /** Paint a greeting's frozen resting pose instantly (reduced-motion seam). */
  applyResting(greeting: Greeting): void;
  probe(): RitualWitness;
  dispose(): void;
}

export interface DayRitualOptions {
  scene: Scene;
  director: RitualDirector;
  reducedMotion: boolean;
}

/** The inert stand-in used if actor authoring throws at boot: the toy still runs. */
function inertRituals(director: RitualDirector): DayRituals {
  return {
    update: () => undefined,
    applyResting: () => undefined,
    probe: () => ({
      activeGreeting: director.activeGreeting,
      restingGreeting: null,
      pendingPhase: director.pendingPhase,
      level: 0,
      chorusCount: 0,
      butterflyCount: 0,
      glowLevel: 0,
    }),
    dispose: () => undefined,
  };
}

function build(options: DayRitualOptions): DayRituals {
  const { scene, director, reducedMotion } = options;
  const chorus: DayFlier = createChorusCritters(scene);
  const butterflies: DayFlier = createButterflies(scene);
  const glow: NoonGlow = createNoonGlow(scene);

  let active: Greeting | null = null;
  let restingGreeting: Greeting | null = null;
  let elapsed = 0;
  let level = 0;
  let glowLevel = 0;

  const unsubscribe = director.subscribe((event) => {
    if (!DAY_GREETINGS.includes(event.greeting)) return;
    active = event.greeting;
    restingGreeting = null;
    elapsed = 0;
    level = 0;
  });

  const apply = (dt: number): void => {
    level = greetingEnvelope(elapsed);
    const chorusLevel =
      active === 'dawn-chorus' ? level : active === 'noon-full-sun' ? level * 0.85 : 0;
    const butterflyLevel = active === 'morning-butterflies' ? level : 0;
    glowLevel = active === 'noon-full-sun' ? level : 0;
    // Noon is the critters' liveliest moment; dawn just woke up.
    const liveliness = active === 'noon-full-sun' ? 1.9 : 1;
    chorus.update(dt, chorusLevel, liveliness);
    butterflies.update(dt, butterflyLevel, liveliness);
    glow.update(glowLevel);
  };

  /** Frozen poses for every day greeting — dt 0, no liveliness, no envelope. */
  const applyResting = (greeting: Greeting): void => {
    if (!DAY_GREETINGS.includes(greeting)) {
      active = null;
      restingGreeting = null;
      level = 0;
      glowLevel = 0;
      chorus.update(0, 0, 1);
      butterflies.update(0, 0, 1);
      glow.update(0);
      return;
    }
    active = greeting;
    restingGreeting = greeting;
    level = 1;
    elapsed = 0;
    const chorusLevel = greeting === 'dawn-chorus' ? 0.9 : greeting === 'noon-full-sun' ? 0.76 : 0;
    chorus.update(0, chorusLevel, 0);
    butterflies.update(0, greeting === 'morning-butterflies' ? 0.9 : 0, 0);
    glowLevel = greeting === 'noon-full-sun' ? 0.9 : 0;
    glow.update(glowLevel);
  };

  return {
    update(dt) {
      if (reducedMotion || active === null) return;
      elapsed += dt * 1_000;
      if (elapsed >= GREETING_MS) {
        active = null;
        level = 0;
        glowLevel = 0;
        chorus.update(dt, 0, 1);
        butterflies.update(dt, 0, 1);
        glow.update(0);
        restingGreeting = null;
        director.release();
        return;
      }
      apply(dt);
    },
    applyResting,
    probe() {
      return {
        activeGreeting: director.activeGreeting,
        restingGreeting,
        pendingPhase: director.pendingPhase,
        level,
        chorusCount: chorus.visibleCount(),
        butterflyCount: butterflies.visibleCount(),
        glowLevel,
      };
    },
    dispose() {
      unsubscribe();
      chorus.dispose();
      butterflies.dispose();
      glow.dispose();
    },
  };
}

/**
 * Procedural actors have no async load, so failure is limited to a broken
 * canvas or GL context. If that happens the greetings simply do not show —
 * the scene and its frame contract stay intact (fail-safe, no thrown boot).
 */
export function createDayRituals(options: DayRitualOptions): DayRituals {
  try {
    return build(options);
  } catch {
    return inertRituals(options.director);
  }
}
