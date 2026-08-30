import type { Scene } from 'three';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry } from 'three';
import { riverDriftPath } from '../core/river';
import { type Cell, MEADOW_CELLS } from '../core/track-graph';
import { GROUND_SIZE } from './ground';
import { enableCastShadows } from './shadows';

/**
 * The river's one little duck: it drifts the S-curve, bobs on the water, and
 * throws a happy tail-wiggle when a riding train puffs past (spec FR8).
 * Unlike the land critters it loves the rain — but night is bedtime and a
 * frozen river means it parks on the ice (spec FR6). Procedural kit-style
 * geometry, no downloaded asset; motion writes straight onto transforms —
 * no allocations in the frame path.
 */

/** Gentle paddle speed in cells per second (a cell is ~3.75 world units). */
const DRIFT_CELLS_PER_SECOND = 0.35;
/**
 * The kit renders at 1 unit ≈ 1 cell; this duck is authored small (body
 * radius 0.28), so scale it up to a clearly visible ~2 world units — bigger
 * than a bush, smaller than a sheep.
 */
const DUCK_SCALE = 2.5;
/** The bob: a slow, small ride on the water's swell. */
const BOB_AMPLITUDE = 0.04;
const BOB_PERIOD_SECONDS = 1.8;
/** The train's passing excites the duck within ~1.5 cells (critter radius). */
const WIGGLE_RADIUS = 1.5 * (GROUND_SIZE / MEADOW_CELLS);
/** One tail-wiggle celebration, then a rest before the next one. */
const WIGGLE_SECONDS = 0.9;
const WIGGLE_COOLDOWN_SECONDS = 3;
/** Above this night factor the duck tucks in (same bedtime as the critters). */
const BEDTIME_NIGHT = 0.6;
/** At this settled-snow the surface is ice: the duck stands down. */
const FROZEN_SNOW = 0.5;

export { FROZEN_SNOW };

export interface DuckMood {
  /** 0..1 — night is bedtime: no drifting, no wiggles. */
  night: number;
  /** 0..1 — a frozen river parks the duck on the ice. */
  snow: number;
}

export interface Duck {
  /** Advance drift, bob, and wiggles. Allocates nothing per frame. */
  update(dt: number, trainX: number | null, trainZ: number | null, mood?: DuckMood): void;
  dispose(): void;
}

/** A toy duck in three.js primitives: yellow body, orange beak, wagging tail. */
function buildDuckModel(): { model: Group; tail: Group } {
  const model = new Group();
  const feathers = new MeshStandardMaterial({ color: 0xf7d154 });
  const beakMaterial = new MeshStandardMaterial({ color: 0xf28c28 });
  const eyeMaterial = new MeshStandardMaterial({ color: 0x2b2b2b });

  const body = new Mesh(new SphereGeometry(0.28, 14, 10), feathers);
  body.scale.set(1, 0.75, 1.3);
  model.add(body);

  const head = new Mesh(new SphereGeometry(0.16, 12, 10), feathers);
  head.position.set(0, 0.26, -0.18);
  model.add(head);

  const beak = new Mesh(new BoxGeometry(0.1, 0.05, 0.12), beakMaterial);
  beak.position.set(0, 0.24, -0.36);
  model.add(beak);

  for (const side of [-1, 1]) {
    const eye = new Mesh(new SphereGeometry(0.03, 8, 6), eyeMaterial);
    eye.position.set(0.09 * side, 0.31, -0.26);
    model.add(eye);
  }

  // The tail rides its own pivot at the rear so a wiggle is a clean yaw.
  const tail = new Group();
  tail.position.set(0, 0.1, 0.3);
  const tailFeather = new Mesh(new BoxGeometry(0.14, 0.06, 0.16), feathers);
  tailFeather.rotation.x = -0.5; // Tipped up — the classic rubber-duck tail.
  tailFeather.position.z = 0.06;
  tail.add(tailFeather);
  model.add(tail);

  enableCastShadows(model);
  return { model, tail };
}

export function createDuck(
  scene: Scene,
  /** The meadow's cell→world mapping, shared with the track renderer. */
  cellToWorld: (cell: Cell) => { x: number; z: number },
): Duck {
  const { model, tail } = buildDuckModel();
  model.scale.setScalar(DUCK_SCALE);
  scene.add(model);

  // Waypoints along the S-curve, world-space, computed once at init.
  const path = riverDriftPath().map(cellToWorld);
  let segment = 0; // Index into path; the duck travels path[segment] → path[segment + 1].
  let t = 0; // 0..1 along the current segment.
  let direction = 1; // Ping-pong: the duck drifts down the S and back again.
  let elapsed = 0;
  let wiggleStart = -1;
  let cooldownUntil = 0;
  const bobPhase = Math.random() * Math.PI * 2;

  /** The duck's resting height: belly kissing the water surface (y ≈ 0.02). */
  const baseY = 0.02 + 0.28 * 0.75 * DUCK_SCALE;

  // Spawn on the river's north end — even a bedtime/iced-in duck rests there,
  // not at the world origin.
  const first = path[0];
  if (first) {
    model.position.x = first.x;
    model.position.z = first.z;
    model.position.y = baseY;
  }

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
    update(dt, trainX, trainZ, mood) {
      elapsed += dt;
      const bedtime = (mood?.night ?? 0) >= BEDTIME_NIGHT;
      const frozen = (mood?.snow ?? 0) >= FROZEN_SNOW;

      // Drift pauses for bedtime and ice; the bob never stops (a sleeping
      // duck still rides the swell; an iced-in duck sits on the surface).
      if (!bedtime && !frozen) stepDrift(dt);

      const bob =
        Math.sin(elapsed * ((Math.PI * 2) / BOB_PERIOD_SECONDS) + bobPhase) * BOB_AMPLITUDE;
      model.position.y = baseY + bob;

      // Train passing close → one happy tail-wiggle per cooldown. Rain is
      // welcome water for a duck; only bedtime and ice calm it down.
      if (wiggleStart >= 0 && elapsed - wiggleStart >= WIGGLE_SECONDS) {
        wiggleStart = -1; // Celebration over — the tail rests.
        tail.rotation.y = 0;
      }
      if (
        wiggleStart < 0 &&
        !bedtime &&
        !frozen &&
        elapsed >= cooldownUntil &&
        trainX !== null &&
        trainZ !== null
      ) {
        const dx = model.position.x - trainX;
        const dz = model.position.z - trainZ;
        if (dx * dx + dz * dz <= WIGGLE_RADIUS * WIGGLE_RADIUS) {
          wiggleStart = elapsed;
          cooldownUntil = elapsed + WIGGLE_COOLDOWN_SECONDS;
        }
      }
      if (wiggleStart >= 0) {
        const w = (elapsed - wiggleStart) / WIGGLE_SECONDS;
        tail.rotation.y = Math.sin(elapsed * 22) * 0.6 * (1 - w);
      }
    },
    dispose() {
      scene.remove(model);
      model.traverse((child) => {
        const mesh = child as Mesh;
        if (mesh.isMesh) {
          mesh.geometry.dispose();
          (mesh.material as MeshStandardMaterial).dispose();
        }
      });
    },
  };
}
