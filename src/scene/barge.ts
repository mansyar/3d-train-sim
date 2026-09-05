import type { Object3D, Scene } from 'three';
import { Group } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { riverDriftPath } from '../core/river';
import type { Cell } from '../core/track-graph';
import { disposeObject } from './dispose-object';
import { BEDTIME_NIGHT, type DuckMood, FROZEN_SNOW } from './duck';
import { SURFACE_LIFT } from './river-water';
import { enableCastShadows } from './shadows';

/**
 * The river's one cargo barge: it drifts the same S-curve as the duck —
 * slower, a heavy old paddler — bobs on the swell, and keeps its head low
 * through the trestle bridges (the approved low-profile deviation: the
 * barge passes bridge cells at water level, the duck's shipped precedent).
 * Night is bedtime and a frozen river ices it in; the bob never stops
 * (a sleeping barge still rides the swell). The GLB is authored on the
 * waterline contract — its origin IS the water surface — so the model
 * rides at y ≈ 0.04 (a small lift above the plane so the shallow-decked
 * hull never dips under the water and flickers against it). Motion
 * writes straight onto transforms — no allocations in the frame path.
 */

/** A heavy hull: less than half the duck's paddle speed (cells/second). */
const DRIFT_CELLS_PER_SECOND = 0.15;
/** The bob: a slow, easy ride for a heavy craft. */
const BOB_AMPLITUDE = 0.02;
const BOB_PERIOD_SECONDS = 2.6;
/**
 * Resting height above the water plane. The GLB's red deck sits only
 * 0.02 above its waterline origin, so an unlifted hull lets the swell
 * dip the deck below the opaque water plane — the deck and the water
 * slice through each other and flicker red/blue. Lift + reduced swell
 * keep the deck ≥ 0.02 clear at every bob phase while the barge's high
 * point stays under its previously verified bridge-pass height.
 */
const RIDE_HEIGHT = 0.02;
/** The stern paddle wheel's gentle churn (radians/second, travel-scaled). */
const WHEEL_SPIN = 0.9;
const BARGE_URL = '/assets/train-kit/barge.glb';

export interface Barge {
  /** Advance drift, bob, and wheel. Allocates nothing per frame. */
  update(dt: number, mood?: DuckMood): void;
  dispose(): void;
}

export function createBarge(
  scene: Scene,
  /** The meadow's cell→world mapping, shared with the track renderer. */
  cellToWorld: (cell: Cell) => { x: number; z: number },
): Barge {
  // The root exists from the first frame so the barge already rests at
  // the river's north end while its GLB is still loading.
  const model = new Group();
  scene.add(model);

  // Waypoints along the S-curve, world-space, computed once at init.
  const path = riverDriftPath().map(cellToWorld);
  let segment = 0; // Index into path; the barge travels path[segment] → path[segment + 1].
  let t = 0; // 0..1 along the current segment.
  let direction = 1; // Ping-pong: the barge drifts down the S and back again.
  let elapsed = 0;
  let wheel: Object3D | null = null;

  // Spawn on the river's north end — even a bedtime/iced-in barge rests
  // there, not at the world origin.
  const first = path[0];
  if (first) {
    model.position.x = first.x;
    model.position.z = first.z;
    model.position.y = SURFACE_LIFT + RIDE_HEIGHT;
  }

  new GLTFLoader().load(
    BARGE_URL,
    (gltf) => {
      // The barge is authored on the waterline contract (origin = water
      // surface, bow on −z) — no anchor math, no scaling.
      model.add(gltf.scene);
      enableCastShadows(gltf.scene);
      wheel = gltf.scene.getObjectByName('barge_wheel') ?? null;
    },
    undefined,
    () => {
      // Asset unavailable — the world keeps working, the barge stays absent.
    },
  );

  const stepDrift = (dt: number): void => {
    const from = path[segment];
    const to = path[segment + 1];
    if (!from || !to) return;
    t += dt * DRIFT_CELLS_PER_SECOND * direction;
    if (t >= 1) {
      if (segment + 2 < path.length) {
        segment += 1;
        t -= 1;
      } else {
        direction = -1; // South end — turn around.
        t = 1;
      }
    } else if (t <= 0) {
      if (segment > 0) {
        segment -= 1;
        t += 1;
      } else {
        direction = 1; // North end — turn around.
        t = 0;
      }
    }
    const a = path[segment];
    const b = path[segment + 1];
    if (!a || !b) return;
    model.position.x = a.x + (b.x - a.x) * t;
    model.position.z = a.z + (b.z - a.z) * t;
    // Face the travel direction (the model's forward is −z).
    model.rotation.y = Math.atan2(-(b.x - a.x) * direction, -(b.z - a.z) * direction);
  };

  return {
    update(dt, mood) {
      elapsed += dt;
      const bedtime = (mood?.night ?? 0) >= BEDTIME_NIGHT;
      const frozen = (mood?.snow ?? 0) >= FROZEN_SNOW;

      // Drift and paddle pause for bedtime and ice; the bob never stops
      // (a sleeping barge still rides the swell; an iced-in barge sits on
      // the frozen surface).
      const moving = !bedtime && !frozen;
      if (moving) stepDrift(dt);
      if (moving && wheel) wheel.rotation.x += dt * WHEEL_SPIN * direction;

      const bob = Math.sin(elapsed * ((Math.PI * 2) / BOB_PERIOD_SECONDS)) * BOB_AMPLITUDE;
      model.position.y = SURFACE_LIFT + RIDE_HEIGHT + bob;
    },
    dispose() {
      scene.remove(model);
      disposeObject(model);
    },
  };
}
