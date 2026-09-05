/**
 * The hot-air balloon's wandering mind. A pure state machine that lifts the
 * balloon off its grounded base, drifts it gently around the neighborhood,
 * lands it to rest, and sends it up again — forever, and only ever within a
 * small radius of where the kid placed it. Pure data and math: no Three.js,
 * no clock, no globals. The scene applies each returned pose as transforms;
 * a paused (reduced-motion) applier simply stops calling step().
 *
 * Units are meadow cells so the catalog scale stays the single source of
 * truth for how big a cell is.
 */

/** Where the balloon assembly is right now, relative to its placed base. */
export interface BalloonPose {
  /** Drift east/west from the base, in cells. */
  x: number;
  /** Drift north/south from the base, in cells. */
  z: number;
  /** Height above the mat, in cells (0 = landed). */
  altitude: number;
  /** True whenever the basket is off the ground. */
  flying: boolean;
}

export interface BalloonWanderer {
  /** Advance the wander by dt seconds and get the pose to display. */
  step(dt: number): BalloonPose;
}

export interface BalloonWanderOptions {
  /** How far the balloon may stray from its base, in cells (default 2.5). */
  radius?: number;
  /** Cruise ceiling, in cells (default 1.6). */
  maxHeight?: number;
  /** Base rest on the ground between flights, in seconds (default 5). */
  restSeconds?: number;
  /** Base time aloft before landing, in seconds (default 10). */
  flightSeconds?: number;
  /** Randomness source; inject a seeded rng for deterministic tests. */
  rng?: () => number;
}

type Phase = 'rest' | 'rise' | 'drift' | 'descend';

/** Ground speed while drifting, in cells per second. */
const DRIFT_SPEED = 0.6;
/** Seconds to climb to a full-mast cruise or settle back down. */
const CLIMB_SECONDS = 3;

export function createBalloonWanderer(options: BalloonWanderOptions = {}): BalloonWanderer {
  const radius = options.radius ?? 2.5;
  const maxHeight = options.maxHeight ?? 1.6;
  const restSeconds = options.restSeconds ?? 5;
  const flightSeconds = options.flightSeconds ?? 10;
  const rng = options.rng ?? Math.random;

  let phase: Phase = 'rest';
  // Counts down the remaining time in the current timed phase.
  let timer = jitter(restSeconds);
  let x = 0;
  let z = 0;
  let altitude = 0;
  // Where this climb/descend started, so easing stays smooth.
  let fromAltitude = 0;
  let phaseDuration = 1;
  let cruiseAltitude = maxHeight;
  let targetX = 0;
  let targetZ = 0;

  function jitter(seconds: number): number {
    return seconds * (0.75 + rng() * 0.5);
  }

  function pickCruise(): void {
    const angle = rng() * Math.PI * 2;
    const distance = Math.sqrt(rng()) * radius;
    targetX = Math.cos(angle) * distance;
    targetZ = Math.sin(angle) * distance;
    cruiseAltitude = maxHeight * (0.6 + rng() * 0.4);
  }

  return {
    step(dt: number): BalloonPose {
      timer -= dt;

      if (phase === 'rest') {
        altitude = 0;
        if (timer <= 0) {
          pickCruise();
          fromAltitude = 0;
          phaseDuration = (cruiseAltitude / maxHeight) * CLIMB_SECONDS;
          timer = phaseDuration;
          phase = 'rise';
        }
      } else if (phase === 'rise' || phase === 'descend') {
        const progress = 1 - Math.max(0, timer) / phaseDuration;
        const target = phase === 'rise' ? cruiseAltitude : 0;
        const eased = progress * progress * (3 - 2 * progress); // smoothstep
        altitude = fromAltitude + (target - fromAltitude) * eased;
        if (timer <= 0) {
          altitude = target;
          if (phase === 'rise') {
            phase = 'drift';
            timer = jitter(flightSeconds);
          } else {
            phase = 'rest';
            timer = jitter(restSeconds);
          }
        }
      } else {
        // drift: stroll toward the cruise target, never overshooting it.
        const dx = targetX - x;
        const dz = targetZ - z;
        const distance = Math.hypot(dx, dz);
        if (distance > 0.0001) {
          const travel = Math.min(distance, DRIFT_SPEED * dt);
          x += (dx / distance) * travel;
          z += (dz / distance) * travel;
        }
        if (timer <= 0) {
          fromAltitude = altitude;
          phaseDuration = CLIMB_SECONDS;
          timer = phaseDuration;
          phase = 'descend';
        }
      }

      return { x, z, altitude, flying: phase !== 'rest' };
    },
  };
}
