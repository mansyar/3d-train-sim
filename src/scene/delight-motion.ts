/**
 * Delight-toy motion: the windmill's turning sails, the carousel's spin,
 * and the hot-air balloon's wander over its base.
 *
 * Scene layer only — the wander brain is pure core (`balloon-wander.ts`).
 * One applier record per placed toy, keyed by scenery id; the track
 * renderer attaches/detaches on reconcile and pumps `update` per frame
 * (the updateCrossings precedent). Reduced motion freezes every toy: the
 * steam/confetti precedent — the world stays beautiful, just still.
 *
 * Node contracts (Blender recipes, greppable): `windmill_sails` sweeps the
 * vertical plane — glTF export flips the authored +y hub to −z, so the
 * scene turns it about local z; `carousel_spin`'s authored +z became glTF
 * +y, so the scene turns it about local y; `balloon_basket` is the wander
 * anchor the scene repositions.
 */
import type { Object3D } from 'three';
import { type BalloonWanderer, createBalloonWanderer } from '../core/balloon-wander';
import { MEADOW_CELLS } from '../core/track-graph';
import { GROUND_SIZE } from './ground';

const CELL_SIZE = GROUND_SIZE / MEADOW_CELLS;
/** Spec'd charm rates: windmill ~0.5 rev/s, carousel ~0.25 rev/s. */
const WINDMILL_SPIN = Math.PI;
const CAROUSEL_SPIN = Math.PI / 2;
/** Balloon drift eases in cells; a slow pirouette sells the sway. */
const BALLOON_YAW = 0.35;

type DelightKind = 'windmill' | 'carousel' | 'balloon';

interface WindmillMotion {
  kind: 'windmill';
  sails: Object3D | undefined;
}

interface CarouselMotion {
  kind: 'carousel';
  spin: Object3D | undefined;
}

interface BalloonMotion {
  kind: 'balloon';
  root: Object3D;
  /** The node's authored rest position (ground anchor of its cell). */
  base: { x: number; y: number; z: number };
  wanderer: BalloonWanderer;
}

type Motion = WindmillMotion | CarouselMotion | BalloonMotion;

export function isDelightKind(kind: string): kind is DelightKind {
  return kind === 'windmill' || kind === 'carousel' || kind === 'balloon';
}

export interface DelightMotion {
  /** Watch a placed toy's model (no-op when the model hasn't loaded yet). */
  attach(id: string, kind: DelightKind, model: Object3D | undefined): void;
  /** Stop animating a removed toy. */
  detach(id: string): void;
  /** Advance every attached toy one frame. */
  update(dt: number, reducedMotion: boolean): void;
  dispose(): void;
}

export function createDelightMotion(): DelightMotion {
  const motions = new Map<string, Motion>();
  let disposed = false;

  function attach(id: string, kind: DelightKind, model: Object3D | undefined): void {
    if (!model || motions.has(id)) return;
    if (kind === 'windmill') {
      motions.set(id, { kind, sails: model.getObjectByName('windmill_sails') });
    } else if (kind === 'carousel') {
      motions.set(id, { kind, spin: model.getObjectByName('carousel_spin') });
    } else {
      const root = model.getObjectByName('balloon_basket');
      if (!root) return;
      motions.set(id, {
        kind,
        root,
        base: { x: root.position.x, y: root.position.y, z: root.position.z },
        wanderer: createBalloonWanderer(),
      });
    }
  }

  function detach(id: string): void {
    motions.delete(id);
  }

  function update(dt: number, reducedMotion: boolean): void {
    if (disposed) return;
    for (const motion of motions.values()) {
      if (reducedMotion) continue; // The world keeps its toys, just still.
      if (motion.kind === 'windmill') {
        // The hub rides the authored +y axis, which glTF export flips to -z.
        if (motion.sails) motion.sails.rotation.z -= WINDMILL_SPIN * dt;
      } else if (motion.kind === 'carousel') {
        if (motion.spin) motion.spin.rotation.y += CAROUSEL_SPIN * dt;
      } else {
        const pose = motion.wanderer.step(dt);
        motion.root.position.set(
          motion.base.x + pose.x * CELL_SIZE,
          motion.base.y + pose.altitude * CELL_SIZE,
          motion.base.z + pose.z * CELL_SIZE,
        );
        motion.root.rotation.y += BALLOON_YAW * dt;
      }
    }
  }

  function dispose(): void {
    disposed = true;
    motions.clear();
  }

  return { attach, detach, update, dispose };
}
