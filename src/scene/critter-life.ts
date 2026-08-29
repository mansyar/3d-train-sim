import type { Object3D } from 'three';
import { MEADOW_CELLS } from '../core/track-graph';
import { GROUND_SIZE } from './ground';

/** Idle breathe: a ±1% scale sway (spec FR3) on a slow, sleepy rhythm. */
const BREATHE_AMPLITUDE = 0.01;
const BREATHE_PERIOD_SECONDS = 1.4;
/** Hops trigger while the riding train is within ~1–2 cells (spec FR3). */
const HOP_RADIUS = 1.5 * (GROUND_SIZE / MEADOW_CELLS);
const HOP_RADIUS_SQUARED = HOP_RADIUS * HOP_RADIUS;
/** One hop: a quick anticipation squash, then a stretchy bounce. */
const HOP_SECONDS = 0.6;
const HOP_HEIGHT = 0.5;
/** Cooldown after a hop so a passing train reads as one hop, not a buzz. */
const HOP_COOLDOWN_SECONDS = 2.5;
/** Fraction of the hop spent crouching before the bounce. */
const HOP_ANTICIPATION = 0.2;

interface Critter {
  model: Object3D;
  /** Resting transform, captured once so sway/hop always restore it. */
  baseY: number;
  baseScaleX: number;
  baseScaleY: number;
  baseScaleZ: number;
  /** Random phase offset so a row of critters never breathes in unison. */
  phase: number;
  /** Elapsed time when the current hop started; -1 while idle. */
  hopStart: number;
  /** Elapsed time after which the critter may hop again. */
  cooldownUntil: number;
}

export interface CritterLife {
  /** Begin animating a placed critter clone (no-op if already tracked). */
  track(model: Object3D, id: string): void;
  /** Stop animating (the model leaves the scene or the renderer tears down). */
  forget(id: string): void;
  /** Advance idle sway and hops by dt seconds. Allocates nothing per frame. */
  update(dt: number, trainX: number | null, trainZ: number | null): void;
  dispose(): void;
}

/**
 * Procedural critter life (spec FR3): every critter breathes so the meadow
 * feels alive before ▶, and squash-stretch hops when the riding train
 * passes close by. Motion is written straight onto each model's transform —
 * no vectors, no closures, no allocations in the frame path.
 */
export function createCritterLife(): CritterLife {
  const critters = new Map<string, Critter>();
  let elapsed = 0;

  return {
    track(model, id) {
      if (critters.has(id)) return;
      critters.set(id, {
        model,
        baseY: model.position.y,
        baseScaleX: model.scale.x,
        baseScaleY: model.scale.y,
        baseScaleZ: model.scale.z,
        phase: Math.random() * Math.PI * 2,
        hopStart: -1,
        cooldownUntil: 0,
      });
    },

    forget(id) {
      critters.delete(id);
    },

    update(dt, trainX, trainZ) {
      elapsed += dt;
      for (const critter of critters.values()) {
        let scaleY: number;
        let scaleXZ: number;
        let hopY = 0;
        const hopT = critter.hopStart >= 0 ? (elapsed - critter.hopStart) / HOP_SECONDS : -1;
        if (hopT >= 0 && hopT < 1) {
          if (hopT < HOP_ANTICIPATION) {
            // Crouch: squash down (and widen a touch) before the bounce.
            const k = hopT / HOP_ANTICIPATION;
            scaleY = 1 - 0.25 * k;
            scaleXZ = 1 + 0.12 * k;
          } else {
            // Airborne: stretch along the bounce, compress sideways.
            const k = (hopT - HOP_ANTICIPATION) / (1 - HOP_ANTICIPATION);
            const stretch = Math.sin(Math.PI * k);
            hopY = HOP_HEIGHT * stretch;
            scaleY = 1 + 0.2 * stretch;
            scaleXZ = 1 - 0.1 * stretch;
          }
        } else {
          if (critter.hopStart >= 0) critter.hopStart = -1; // Landed.
          const breathe =
            Math.sin(elapsed * ((Math.PI * 2) / BREATHE_PERIOD_SECONDS) + critter.phase) *
            BREATHE_AMPLITUDE;
          scaleY = 1 + breathe;
          scaleXZ = 1 - breathe / 2;
        }

        // A riding train passing close triggers one hop per cooldown.
        if (
          critter.hopStart < 0 &&
          trainX !== null &&
          trainZ !== null &&
          elapsed >= critter.cooldownUntil
        ) {
          const dx = critter.model.position.x - trainX;
          const dz = critter.model.position.z - trainZ;
          if (dx * dx + dz * dz <= HOP_RADIUS_SQUARED) {
            critter.hopStart = elapsed;
            critter.cooldownUntil = elapsed + HOP_COOLDOWN_SECONDS;
          }
        }

        critter.model.scale.set(
          critter.baseScaleX * scaleXZ,
          critter.baseScaleY * scaleY,
          critter.baseScaleZ * scaleXZ,
        );
        critter.model.position.y = critter.baseY + hopY;
      }
    },

    dispose() {
      critters.clear();
    },
  };
}
