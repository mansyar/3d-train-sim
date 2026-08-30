import type { Vector3 } from 'three';

/**
 * Attract camera — the slow, dreamy drift the overview camera wanders into
 * while the meadow sits idle. Purely additive: when no drift is active the
 * desired pose is exactly the base overview, so the existing camera ease
 * behaves as before. No per-frame allocations — writes into caller-owned
 * vectors.
 */

/** How fast the drift fades in/out (1 - exp(-k·dt) style). */
const EASE_SPEED = 1.5;
/** Below this the drift is indistinguishable from base — snap to base. */
const EPSILON = 0.0001;

export interface AttractCameraOptions {
  /** Slow period of one full drift cycle in seconds. */
  periodSec?: number;
  /** Peak wander distance from the base position (world units). */
  amplitude?: number;
  /** Reduced motion: the drift never engages. */
  reducedMotion?: boolean;
}

export interface AttractCamera {
  /** Begin easing into the drift (fired by the idle cue). */
  enterIdle(): void;
  /** Begin easing back to the plain overview (fired by activity). */
  exitIdle(): void;
  /**
   * Advance the drift clock and write the current desired pose into
   * `outPosition` / `outLook`. Use the exact `basePosition` / `baseLook`
   * passed at construction — they must not alias the output vectors.
   */
  update(dt: number, outPosition: Vector3, outLook: Vector3): void;
}

export function createAttractCamera(
  basePosition: Vector3,
  baseLook: Vector3,
  options: AttractCameraOptions = {},
): AttractCamera {
  const periodSec = options.periodSec ?? 40;
  const amplitude = options.amplitude ?? 3;
  const reducedMotion = options.reducedMotion ?? false;

  let idle = false;
  let intensity = 0;
  let timeSec = 0;

  return {
    enterIdle() {
      idle = true;
    },
    exitIdle() {
      idle = false;
    },
    update(dt, outPosition, outLook) {
      const target = idle && !reducedMotion ? 1 : 0;
      intensity += (target - intensity) * (1 - Math.exp(-EASE_SPEED * dt));
      const drift = intensity;
      if (drift < EPSILON) {
        outPosition.copy(basePosition);
        outLook.copy(baseLook);
        return;
      }
      timeSec += dt;
      // A slow Lissajous wander: the camera drifts on x/z while the look
      // point counter-wanders on different phases — an orbiting "someone's
      // watching the world breathe" feel, always inside the meadow.
      const w = (2 * Math.PI) / periodSec;
      outPosition.copy(basePosition);
      outPosition.x += Math.sin(timeSec * w) * amplitude * drift;
      outPosition.z += Math.cos(timeSec * w * 0.8) * amplitude * 0.6 * drift;
      outLook.copy(baseLook);
      outLook.x += Math.cos(timeSec * w * 1.1) * amplitude * 0.35 * drift;
      outLook.z += Math.sin(timeSec * w * 0.7) * amplitude * 0.25 * drift;
    },
  };
}
