/**
 * Dusk and night greetings — the mirror of `rituals/day.ts`. The Phase 1
 * director decides *when*; this stage renders *what*: dusk warms the windows
 * while the last critters settle, night lifts a surge of fireflies, lights the
 * engines' beams and fires the one lullaby hook Phase 4 will fill with audio.
 *
 * The clock already drives a quiet ambient night (fireflies, window glow,
 * headlights). This stage adds the short greeting on top of that bed and
 * restores the ambient values when the moment ends, so the two owners never
 * fight over the same material state.
 *
 * Under reduced motion the update path is inert: `applyResting()` paints each
 * greeting's frozen pose instantly (same seam as the day stage). Motifs still
 * fire — reduced motion rests bodies, not sound (music-box precedent).
 */

import type { Scene } from 'three';
import type { DayPhase } from '../../core/day-clock';
import type { Greeting, RitualDirector } from '../../state/rituals';
import {
  createRisingFireflies,
  createSettlingCritters,
  type DuskCritters,
  type NightFireflies,
} from '../actors/dusk-night-actors';
import type { Headlight } from '../headlight';
import { setGlowNight } from '../window-glow';
import { GREETING_MS, greetingEnvelope } from './day';

const DUSK_NIGHT_GREETINGS: readonly Greeting[] = ['dusk-windows', 'night-fireflies'];

/** Extra window glow at the peak of each greeting (added to the ambient night). */
const DUSK_WARMTH = 0.45;
const NIGHT_WARMTH = 0.15;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/** A Phase 4 attachment point: called once when the night greeting fires. */
export type LullabyHook = () => void;

/** Dev/e2e witness for the in-scene dusk/night greeting and its cap counts. */
export interface DuskNightWitness {
  activeGreeting: Greeting | null;
  /** The frozen greeting under reduced motion (the director never ticks there). */
  restingGreeting: Greeting | null;
  pendingPhase: DayPhase | null;
  level: number;
  /** Boosted window-glow factor actually painted this frame (0..1). */
  windowWarmth: number;
  settledCritterCount: number;
  fireflyRise: number;
  fireflyCount: number;
  /** Boosted headlight factor actually painted this frame (0..1). */
  headlightLevel: number;
  lullabyHooks: number;
  lullabyFires: number;
}

export interface DuskNightRituals {
  /** Advance the greeting stage. `dt` is seconds, as delivered by the RAF loop. */
  update(dt: number): void;
  /** Paint a greeting's frozen resting pose instantly (reduced-motion seam). */
  applyResting(greeting: Greeting, fireHook?: boolean): void;
  /** Register the night lullaby attachment point; returns an unregister fn. */
  registerLullabyHook(hook: LullabyHook): () => void;
  probe(): DuskNightWitness;
  dispose(): void;
}

export interface DuskNightOptions {
  scene: Scene;
  director: RitualDirector;
  /** The clock's ambient night factor — the bed the greeting adds to. */
  nightFactor: () => number;
  /** The fleet's headlights — the same instances the ambience drives. */
  headlights: ReadonlyArray<Headlight>;
  reducedMotion: boolean;
}

/** The inert stand-in used if actor authoring throws at boot: the toy still runs. */
function inertRituals(options: DuskNightOptions): DuskNightRituals {
  const hooks = new Set<LullabyHook>();
  return {
    update: () => undefined,
    applyResting: () => undefined,
    registerLullabyHook(hook) {
      hooks.add(hook);
      return () => hooks.delete(hook);
    },
    probe: () => ({
      activeGreeting: options.director.activeGreeting,
      restingGreeting: null,
      pendingPhase: options.director.pendingPhase,
      level: 0,
      windowWarmth: options.nightFactor(),
      settledCritterCount: 0,
      fireflyRise: 0,
      fireflyCount: 0,
      headlightLevel: options.nightFactor(),
      lullabyHooks: hooks.size,
      lullabyFires: 0,
    }),
    dispose: () => hooks.clear(),
  };
}

function build(options: DuskNightOptions): DuskNightRituals {
  const { scene, director, nightFactor, headlights, reducedMotion } = options;
  const critters: DuskCritters = createSettlingCritters(scene);
  const fireflies: NightFireflies = createRisingFireflies(scene);

  const hooks = new Set<LullabyHook>();
  let active: Greeting | null = null;
  let restingGreeting: Greeting | null = null;
  let elapsed = 0;
  let level = 0;
  let windowWarmth = nightFactor();
  let fireflyRise = 0;
  let headlightLevel = nightFactor();
  let lullabyFires = 0;

  const fireLullaby = (): void => {
    lullabyFires += 1;
    for (const hook of hooks) hook();
  };

  /** Return the shared night bed to the clock's paint (no greeting on stage). */
  const restoreAmbient = (dt: number): void => {
    const night = nightFactor();
    critters.update(dt, 0, 0);
    fireflies.update(dt, 0, 0);
    windowWarmth = night;
    fireflyRise = 0;
    headlightLevel = night;
    setGlowNight(night);
    for (const light of headlights) light.update(night);
  };

  const unsubscribe = director.subscribe((event) => {
    if (DUSK_NIGHT_GREETINGS.includes(event.greeting)) {
      active = event.greeting;
      restingGreeting = null;
      elapsed = 0;
      level = 0;
      if (event.greeting === 'night-fireflies') fireLullaby();
      return;
    }
    // A day-family greeting owns the voice now. Mirror `applyResting`'s
    // non-owning branch so the night bed — not a stale surge — is on screen.
    active = null;
    restingGreeting = null;
    level = 0;
    restoreAmbient(0);
  });

  return {
    update(dt) {
      if (reducedMotion) return; // The resting seam owns this path.
      if (active === null) {
        restoreAmbient(dt);
        return;
      }
      elapsed += dt * 1_000;
      if (elapsed >= GREETING_MS) {
        // Release only the voice this stage still owns; a night timer that
        // outlives its handoff to dawn must not clear the day greeting.
        if (director.activeGreeting === active) director.release();
        active = null;
        level = 0;
        restoreAmbient(dt);
        return;
      }
      level = greetingEnvelope(elapsed);
      const night = nightFactor();
      if (active === 'dusk-windows') {
        // Liveliness falls with the envelope: the flock flutters in, then
        // settles onto the meadow as the windows warm.
        critters.update(dt, level, Math.max(0, 1 - level));
        fireflies.update(dt, 0, 0);
        windowWarmth = clamp01(night + level * DUSK_WARMTH);
        headlightLevel = night;
      } else {
        critters.update(dt, 0, 0);
        fireflyRise = level;
        fireflies.update(dt, level, fireflyRise);
        windowWarmth = clamp01(night + level * NIGHT_WARMTH);
        headlightLevel = clamp01(night + level);
      }
      setGlowNight(windowWarmth);
      for (const light of headlights) light.update(headlightLevel);
    },
    applyResting(greeting, fireHook = false) {
      if (!DUSK_NIGHT_GREETINGS.includes(greeting)) {
        active = null;
        restingGreeting = null;
        level = 0;
        restoreAmbient(0);
        return;
      }
      active = greeting;
      restingGreeting = greeting;
      level = 1;
      elapsed = 0;
      const night = nightFactor();
      if (greeting === 'dusk-windows') {
        critters.update(0, 0.9, 0); // frozen, already settled
        fireflies.update(0, 0, 0);
        windowWarmth = clamp01(night + DUSK_WARMTH);
        headlightLevel = night;
        fireflyRise = 0;
      } else {
        critters.update(0, 0, 0);
        fireflyRise = 1; // frozen at full hover
        fireflies.update(0, 0.9, fireflyRise);
        windowWarmth = clamp01(night + NIGHT_WARMTH);
        headlightLevel = 1;
        if (fireHook) fireLullaby();
      }
      setGlowNight(windowWarmth);
      for (const light of headlights) light.update(headlightLevel);
    },
    registerLullabyHook(hook) {
      hooks.add(hook);
      return () => hooks.delete(hook);
    },
    probe() {
      return {
        activeGreeting: director.activeGreeting,
        restingGreeting,
        pendingPhase: director.pendingPhase,
        level,
        windowWarmth,
        settledCritterCount: critters.visibleCount(),
        fireflyRise,
        fireflyCount: fireflies.visibleCount(),
        headlightLevel,
        lullabyHooks: hooks.size,
        lullabyFires,
      };
    },
    dispose() {
      unsubscribe();
      hooks.clear();
      critters.dispose();
      fireflies.dispose();
    },
  };
}

/**
 * Procedural actors have no async load, so failure is limited to a broken
 * canvas or GL context. If that happens the greetings simply do not show —
 * the scene and its frame contract stay intact (fail-safe, no thrown boot).
 */
export function createDuskNightRituals(options: DuskNightOptions): DuskNightRituals {
  try {
    return build(options);
  } catch {
    return inertRituals(options);
  }
}
